import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getServiceLocation } from '../../common/utils/service-locations';
import {
  NearbyQueryDto,
  UpdateAvailabilityDto,
  UpdateLocationDto,
  UpdateTechnicianProfileDto,
} from './dto/technician.dto';

interface NearbyTechnician {
  id: string;
  fullName: string;
  rating: number;
  distanceKm: number;
}
export type { NearbyTechnician };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight IST on the day containing `from`, expressed as a correct UTC instant. */
function startOfIstDay(from: Date): Date {
  const shifted = new Date(from.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/** The 1st of the IST calendar month containing `from`, as a correct UTC instant. */
function startOfIstMonth(from: Date): Date {
  const shifted = new Date(from.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) -
      IST_OFFSET_MS,
  );
}

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const tech = await this.prisma.technician.findUnique({
      where: { userId },
      include: { user: { select: { phone: true, email: true } } },
    });
    if (!tech) {
      throw new NotFoundException('Technician profile not found');
    }
    return tech;
  }

  async updateProfile(userId: string, dto: UpdateTechnicianProfileDto) {
    const current = await this.getProfile(userId);
    const city = dto.city ?? current.city;
    const locationName = dto.location ?? current.location;
    const location = getServiceLocation(city, locationName);
    if (!location) {
      throw new BadRequestException(
        'The selected location does not belong to the selected city',
      );
    }
    const skills = dto.skills?.map((skill) => skill.trim()).filter(Boolean);
    try {
      return await this.prisma.technician.update({
        where: { userId },
        data: {
          fullName: dto.fullName?.trim(),
          skills: skills ? [...new Set(skills)] : undefined,
          bio: dto.bio?.trim(),
          experienceYears: dto.experienceYears,
          serviceArea: dto.serviceArea?.trim(),
          city: dto.city,
          location: dto.location,
          lastLat:
            dto.city !== undefined || dto.location !== undefined
              ? location.lat
              : undefined,
          lastLng:
            dto.city !== undefined || dto.location !== undefined
              ? location.lng
              : undefined,
          locationUpdatedAt:
            dto.city !== undefined || dto.location !== undefined
              ? new Date()
              : undefined,
          // Omit the field to leave email unchanged; send "" or null to clear it.
          user:
            dto.email === undefined
              ? undefined
              : {
                  update: { email: dto.email?.trim().toLowerCase() || null },
                },
        },
        include: { user: { select: { phone: true, email: true } } },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This email is already in use by another account',
        );
      }
      throw err;
    }
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    await this.getProfile(userId);
    return this.prisma.technician.update({
      where: { userId },
      data: {
        lastLat: dto.lat,
        lastLng: dto.lng,
        locationUpdatedAt: new Date(),
      },
    });
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    await this.getProfile(userId);
    return this.prisma.technician.update({
      where: { userId },
      data: { isAvailable: dto.isAvailable, availabilityUpdatedAt: new Date() },
    });
  }

  async getDashboard(userId: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { userId },
      select: { id: true, rating: true },
    });
    if (!technician) {
      throw new NotFoundException('Technician profile not found');
    }
    const technicianId = technician.id;

    // Boundaries are computed in IST (the app's only locale) regardless of
    // the server process's own timezone, so "today" matches what the
    // technician sees on screen rather than the host's local midnight.
    const now = new Date();
    const today = startOfIstDay(now);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const week = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const month = startOfIstMonth(now);

    const paidEarnings = (from?: Date) =>
      this.prisma.payment.aggregate({
        where: {
          status: 'PAID',
          job: {
            technicianId,
            status: 'COMPLETED',
            ...(from ? { completedAt: { gte: from } } : {}),
          },
        },
        _sum: { amount: true },
      });

    const [
      totalJobsCount,
      activeCount,
      completedTodayCount,
      completedTotalCount,
      todayCount,
      earningsToday,
      earningsWeek,
      earningsMonth,
      earningsTotal,
      ratedCount,
      arrivalStats,
      assignmentGroups,
    ] = await Promise.all([
      // Cancelled jobs are excluded from the completion-rate base — a job an
      // admin calls off (e.g. the customer backed out) isn't the
      // technician's fault and shouldn't permanently depress their rate.
      this.prisma.job.count({
        where: { technicianId, status: { not: 'CANCELLED' } },
      }),
      this.prisma.job.count({
        where: { technicianId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.job.count({
        where: {
          technicianId,
          status: 'COMPLETED',
          completedAt: { gte: today },
        },
      }),
      this.prisma.job.count({ where: { technicianId, status: 'COMPLETED' } }),
      // A job's "activity date" falls back scheduledAt -> assignedAt -> createdAt,
      // matching whichever timestamp is actually populated for that job.
      this.prisma.job.count({
        where: {
          technicianId,
          OR: [
            { scheduledAt: { gte: today, lt: tomorrow } },
            { scheduledAt: null, assignedAt: { gte: today, lt: tomorrow } },
            {
              scheduledAt: null,
              assignedAt: null,
              createdAt: { gte: today, lt: tomorrow },
            },
          ],
        },
      }),
      paidEarnings(today),
      paidEarnings(week),
      paidEarnings(month),
      paidEarnings(),
      this.prisma.job.count({
        where: { technicianId, status: 'COMPLETED', rating: { not: null } },
      }),
      this.prisma.$queryRaw<{ arrived: bigint; onTime: bigint }[]>`
        SELECT
          COUNT(*) AS arrived,
          COUNT(*) FILTER (WHERE "onSiteAt" <= "scheduledAt") AS "onTime"
        FROM "Job"
        WHERE "technicianId" = ${technicianId}
          AND "status" = 'COMPLETED'
          AND "scheduledAt" IS NOT NULL
          AND "onSiteAt" IS NOT NULL
      `,
      this.prisma.jobAssignment.groupBy({
        by: ['status'],
        where: { technicianId },
        _count: { _all: true },
      }),
    ]);

    const arrived = Number(arrivalStats[0]?.arrived ?? 0);
    const onTime = Number(arrivalStats[0]?.onTime ?? 0);
    const responses = Object.fromEntries(
      assignmentGroups.map((group) => [group.status, group._count._all]),
    );
    const accepted = Number(responses.ACCEPTED ?? 0);
    const declined = Number(responses.DECLINED ?? 0);

    return {
      jobs: {
        today: todayCount,
        active: activeCount,
        completedToday: completedTodayCount,
        completedTotal: completedTotalCount,
      },
      earnings: {
        todayPaise: earningsToday._sum.amount ?? 0,
        weekPaise: earningsWeek._sum.amount ?? 0,
        monthPaise: earningsMonth._sum.amount ?? 0,
        totalPaise: earningsTotal._sum.amount ?? 0,
        currency: 'INR',
      },
      performance: {
        rating: technician.rating,
        ratingCount: ratedCount,
        acceptanceRate:
          accepted + declined > 0
            ? Math.round((accepted / (accepted + declined)) * 100)
            : null,
        onTimeRate: arrived > 0 ? Math.round((onTime / arrived) * 100) : null,
        completionRate:
          totalJobsCount > 0
            ? Math.round((completedTotalCount / totalJobsCount) * 100)
            : null,
      },
    };
  }

  async listForAdmin() {
    return this.prisma.technician.findMany({
      where: { user: { isActive: true } },
      select: {
        id: true,
        fullName: true,
        skills: true,
        isAvailable: true,
        rating: true,
        isVerified: true,
        experienceYears: true,
        serviceArea: true,
        city: true,
        location: true,
        points: true,
        lastLat: true,
        lastLng: true,
        _count: { select: { jobs: true } },
      },
      orderBy: [
        { isAvailable: 'desc' },
        { rating: 'desc' },
        { fullName: 'asc' },
      ],
    });
  }

  /**
   * Nearby available technicians via PostGIS ST_DWithin on geography points.
   * Uses SRID 4326 to match the GiST index (Technician_geo_gist).
   * Parameterized query — never string-interpolate coordinates.
   */
  async findNearby(dto: NearbyQueryDto): Promise<NearbyTechnician[]> {
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    const radiusMeters = (Number(dto.radiusKm) || 10) * 1000;
    return this.prisma.$queryRaw<NearbyTechnician[]>`
      SELECT id,
             "fullName",
             rating,
             ST_Distance(
               ST_SetSRID(ST_MakePoint("lastLng", "lastLat"), 4326)::geography,
               ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography
             ) / 1000 AS "distanceKm"
      FROM "Technician"
      WHERE "isAvailable" = true
        AND "lastLat" IS NOT NULL
        AND ST_DWithin(
              ST_SetSRID(ST_MakePoint("lastLng", "lastLat"), 4326)::geography,
              ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
              ${radiusMeters}::double precision
            )
      ORDER BY "distanceKm" ASC
      LIMIT 20;
    `;
  }
}
