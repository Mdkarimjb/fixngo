import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobStatus } from './job-status.enum';
import {
  AssignJobDto,
  CancelJobDto,
  CreateJobDto,
  DeclineJobDto,
  RateJobDto,
  UpdateJobStatusDto,
} from './dto/job.dto';

const CLOSED_STATUSES: JobStatus[] = [JobStatus.COMPLETED, JobStatus.CANCELLED];

/** Statuses in which a technician still owns the job and can back out of it. */
const TECHNICIAN_ACTIVE_STATUSES: JobStatus[] = [
  JobStatus.ASSIGNED,
  JobStatus.ACCEPTED,
  JobStatus.ON_SITE,
  JobStatus.IN_PROGRESS,
];

const JOB_CUSTOMER_INCLUDE = {
  customer: {
    select: {
      fullName: true,
      address: true,
      user: { select: { id: true, phone: true } },
    },
  },
} satisfies Prisma.JobInclude;

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
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    if (scheduledAt && scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }
    return this.prisma.job.create({
      data: {
        customerId: customer.id,
        serviceType: dto.serviceType,
        description: dto.description,
        scheduledAt,
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
      include: {
        customer: {
          select: {
            fullName: true,
            address: true,
            user: { select: { phone: true } },
          },
        },
        payment: {
          select: { amount: true, currency: true, status: true },
        },
      },
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
    if (CLOSED_STATUSES.includes(existingJob.status as JobStatus)) {
      throw new BadRequestException('Completed or cancelled jobs cannot be assigned');
    }
    if (existingJob.technicianId === dto.technicianId) {
      throw new BadRequestException(
        'Job is already assigned to this technician',
      );
    }

    const { job, technicianUserId } = await this.prisma.$transaction(async (tx) => {
      // Lock the technician row first so a concurrent assign() targeting the
      // same technician blocks here instead of both transactions reading the
      // same (possibly stale) isAvailable value.
      await tx.$queryRaw`SELECT id FROM "Technician" WHERE id = ${dto.technicianId} FOR UPDATE`;
      const technician = await tx.technician.findUnique({
        where: { id: dto.technicianId },
        include: { user: { select: { id: true, isActive: true } } },
      });
      if (!technician || !technician.user.isActive) {
        throw new NotFoundException('Technician not found');
      }
      if (!technician.isAvailable) {
        throw new BadRequestException('Technician is currently unavailable');
      }

      await this.guardedUpdate(tx, {
        where: { id: jobId, status: existingJob.status },
        data: {
          technicianId: dto.technicianId,
          status: JobStatus.ASSIGNED,
          assignedAt: new Date(),
          acceptedAt: null,
          onSiteAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
        },
      });
      // Void any assignment left over from a previous technician, whether it
      // was still awaiting a response or had already been accepted.
      await this.voidActiveAssignments(tx, jobId, { status: 'CANCELLED' });
      await tx.jobAssignment.create({
        data: { jobId, technicianId: dto.technicianId },
      });
      const updatedJob = await tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          ...JOB_CUSTOMER_INCLUDE,
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
      return { job: updatedJob, technicianUserId: technician.user.id };
    });
    await this.notifications.sendPush(
      technicianUserId,
      'New job assigned',
      job.serviceType,
    );
    return job;
  }

  /** Technician updates status; only the assigned technician may do so. */
  async updateStatus(userId: string, jobId: string, dto: UpdateJobStatusDto) {
    const tech = await this.prisma.technician.findUniqueOrThrow({
      where: { userId },
    });
    const job = await this.getOrThrow(jobId);
    if (job.technicianId !== tech.id) {
      throw new ForbiddenException('Not your job');
    }
    const allowedNext: Partial<Record<JobStatus, JobStatus>> = {
      [JobStatus.ASSIGNED]: JobStatus.ACCEPTED,
      [JobStatus.ACCEPTED]: JobStatus.ON_SITE,
      [JobStatus.ON_SITE]: JobStatus.IN_PROGRESS,
      [JobStatus.IN_PROGRESS]: JobStatus.COMPLETED,
    };
    if (allowedNext[job.status as JobStatus] !== dto.status) {
      throw new BadRequestException(
        `Job cannot move from ${job.status} to ${dto.status}`,
      );
    }

    const now = new Date();
    const timestamp: {
      acceptedAt?: Date;
      onSiteAt?: Date;
      startedAt?: Date;
      completedAt?: Date;
    } = {};
    if (dto.status === JobStatus.ACCEPTED) timestamp.acceptedAt = now;
    if (dto.status === JobStatus.ON_SITE) timestamp.onSiteAt = now;
    if (dto.status === JobStatus.IN_PROGRESS) timestamp.startedAt = now;
    if (dto.status === JobStatus.COMPLETED) timestamp.completedAt = now;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, {
        where: { id: jobId, technicianId: tech.id, status: job.status },
        data: { status: dto.status, ...timestamp },
      });
      if (dto.status === JobStatus.ACCEPTED) {
        await tx.jobAssignment.updateMany({
          where: { jobId, technicianId: tech.id, status: 'PENDING' },
          data: { status: 'ACCEPTED', respondedAt: now },
        });
      }
      return tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: {
          ...JOB_CUSTOMER_INCLUDE,
          payment: { select: { amount: true, currency: true, status: true } },
        },
      });
    });
    await this.notifications.sendPush(
      updated.customer.user.id,
      `Job ${dto.status.toLowerCase().replace('_', ' ')}`,
      updated.serviceType,
    );
    return updated;
  }

  /** Technician backs out of a job they hold, before it's completed; it returns to the pool. */
  async decline(userId: string, jobId: string, dto: DeclineJobDto) {
    const tech = await this.prisma.technician.findUniqueOrThrow({
      where: { userId },
    });
    const job = await this.getOrThrow(jobId);
    if (job.technicianId !== tech.id) {
      throw new ForbiddenException('Not your job');
    }
    if (!TECHNICIAN_ACTIVE_STATUSES.includes(job.status as JobStatus)) {
      throw new BadRequestException(
        'This job can no longer be declined or cancelled',
      );
    }
    // Only a flat refusal before ever accepting counts against acceptance
    // rate; backing out after accepting/arriving is a different failure mode.
    const assignmentOutcome = job.status === JobStatus.ASSIGNED ? 'DECLINED' : 'CANCELLED';

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, {
        where: { id: jobId, technicianId: tech.id, status: job.status },
        data: {
          technicianId: null,
          status: JobStatus.REQUESTED,
          assignedAt: null,
          // acceptedAt/onSiteAt/startedAt are left in place — they're a real
          // record of how far the previous technician got before backing
          // out. A future assign() to someone else will reset them then.
        },
      });
      await this.voidActiveAssignments(tx, jobId, {
        status: assignmentOutcome,
        technicianId: tech.id,
        reason: dto.reason?.trim() || null,
      });
      return tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: JOB_CUSTOMER_INCLUDE,
      });
    });
    await this.notifications.sendPush(
      updated.customer.user.id,
      'Technician unavailable',
      'Your job is back in the queue and will be reassigned shortly.',
    );
    return updated;
  }

  /** Admin terminates a job entirely; used when it can no longer be fulfilled. */
  async cancel(jobId: string, dto: CancelJobDto) {
    const job = await this.getOrThrow(jobId);
    if (CLOSED_STATUSES.includes(job.status as JobStatus)) {
      throw new BadRequestException('This job is already closed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, {
        where: { id: jobId, status: job.status },
        data: { status: JobStatus.CANCELLED, cancelledAt: new Date() },
      });
      await this.voidActiveAssignments(tx, jobId, {
        status: 'CANCELLED',
        reason: dto.reason?.trim() || null,
      });
      return tx.job.findUniqueOrThrow({
        where: { id: jobId },
        include: JOB_CUSTOMER_INCLUDE,
      });
    });
    await this.notifications.sendPush(
      updated.customer.user.id,
      'Job cancelled',
      updated.serviceType,
    );
    return updated;
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
    if (job.status !== JobStatus.COMPLETED || !job.technicianId) {
      throw new BadRequestException('Only completed jobs can be rated');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id: jobId },
        data: { rating: dto.rating, feedback: dto.feedback },
      });
      const aggregate = await tx.job.aggregate({
        where: {
          technicianId: job.technicianId,
          status: JobStatus.COMPLETED,
          rating: { not: null },
        },
        _avg: { rating: true },
      });
      await tx.technician.update({
        where: { id: job.technicianId! },
        data: { rating: aggregate._avg.rating ?? 0 },
      });
      return updated;
    });
  }

  private async getOrThrow(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  /**
   * Optimistic-concurrency guard shared by every status-mutating method:
   * the `where` clause must include whichever fields (status, technicianId)
   * this transition depends on, so a stale/concurrent write loses the race
   * instead of silently clobbering it.
   */
  private async guardedUpdate(
    tx: Prisma.TransactionClient,
    args: {
      where: Prisma.JobWhereUniqueInput & Record<string, unknown>;
      data: Prisma.JobUncheckedUpdateManyInput;
    },
  ) {
    const result = await tx.job.updateMany(args);
    if (result.count !== 1) {
      throw new BadRequestException('Job status changed; refresh and try again');
    }
    return result;
  }

  /**
   * Voids whatever assignment is currently open on a job (PENDING or already
   * ACCEPTED) whenever the job itself is reassigned, declined, or cancelled —
   * called from assign/decline/cancel so the two tables can't drift apart.
   */
  private async voidActiveAssignments(
    tx: Prisma.TransactionClient,
    jobId: string,
    options: {
      status: AssignmentStatus;
      technicianId?: string;
      reason?: string | null;
    },
  ) {
    await tx.jobAssignment.updateMany({
      where: {
        jobId,
        ...(options.technicianId ? { technicianId: options.technicianId } : {}),
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      data: {
        status: options.status,
        declineReason: options.reason,
        respondedAt: new Date(),
      },
    });
  }
}
