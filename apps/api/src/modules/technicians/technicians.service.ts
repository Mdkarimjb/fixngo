import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NearbyQueryDto,
  UpdateAvailabilityDto,
  UpdateLocationDto,
} from './dto/technician.dto';

interface NearbyTechnician {
  id: string;
  fullName: string;
  rating: number;
  distanceKm: number;
}
export type { NearbyTechnician };

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const tech = await this.prisma.technician.findUnique({ where: { userId } });
    if (!tech) {
      throw new NotFoundException('Technician profile not found');
    }
    return tech;
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    await this.getProfile(userId);
    return this.prisma.technician.update({
      where: { userId },
      data: { lastLat: dto.lat, lastLng: dto.lng },
    });
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    await this.getProfile(userId);
    return this.prisma.technician.update({
      where: { userId },
      data: { isAvailable: dto.isAvailable },
    });
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
        lastLat: true,
        lastLng: true,
        _count: { select: { jobs: true } },
      },
      orderBy: [{ isAvailable: 'desc' }, { rating: 'desc' }, { fullName: 'asc' }],
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
