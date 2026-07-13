import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobStatus } from './job-status.enum';
import {
  AssignJobDto,
  CreateJobDto,
  RateJobDto,
  UpdateJobStatusDto,
} from './dto/job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { userId },
    });
    return this.prisma.job.create({
      data: {
        customerId: customer.id,
        serviceType: dto.serviceType,
        description: dto.description,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async listForCustomer(userId: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { userId },
    });
    return this.prisma.job.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForTechnician(userId: string) {
    const tech = await this.prisma.technician.findUniqueOrThrow({
      where: { userId },
    });
    return this.prisma.job.findMany({
      where: { technicianId: tech.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll() {
    return this.prisma.job.findMany({
      include: {
        customer: {
          select: {
            fullName: true,
            address: true,
            user: { select: { phone: true } },
          },
        },
        technician: {
          select: {
            id: true,
            fullName: true,
            rating: true,
            skills: true,
            isAvailable: true,
          },
        },
        payment: {
          select: { amount: true, currency: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assign(jobId: string, dto: AssignJobDto) {
    const existingJob = await this.getOrThrow(jobId);
    if (
      existingJob.status === 'COMPLETED' ||
      existingJob.status === 'CANCELLED'
    ) {
      throw new BadRequestException('Closed jobs cannot be assigned');
    }

    const technician = await this.prisma.technician.findUnique({
      where: { id: dto.technicianId },
      include: { user: { select: { id: true, isActive: true } } },
    });
    if (!technician || !technician.user.isActive) {
      throw new NotFoundException('Technician not found');
    }
    if (!technician.isAvailable) {
      throw new BadRequestException('Technician is currently unavailable');
    }

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { technicianId: dto.technicianId, status: JobStatus.ASSIGNED },
      include: {
        customer: {
          select: {
            fullName: true,
            address: true,
            user: { select: { phone: true } },
          },
        },
        technician: {
          select: {
            id: true,
            fullName: true,
            rating: true,
            skills: true,
            isAvailable: true,
          },
        },
        payment: {
          select: { amount: true, currency: true, status: true },
        },
      },
    });
    await this.notifications.sendPush(
      technician.user.id,
      'New job assigned',
      job.serviceType,
    );
    return job;
  }

  /** Technician updates status; only the assigned technician may do so. */
  async updateStatus(
    userId: string,
    jobId: string,
    dto: UpdateJobStatusDto,
  ) {
    const tech = await this.prisma.technician.findUniqueOrThrow({
      where: { userId },
    });
    const job = await this.getOrThrow(jobId);
    if (job.technicianId !== tech.id) {
      throw new ForbiddenException('Not your job');
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: dto.status },
    });
  }

  /** Customer rates a completed job; only the owning customer may rate. */
  async rate(userId: string, jobId: string, dto: RateJobDto) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { userId },
    });
    const job = await this.getOrThrow(jobId);
    if (job.customerId !== customer.id) {
      throw new ForbiddenException('Not your job');
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: { rating: dto.rating, feedback: dto.feedback },
    });
  }

  private async getOrThrow(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
