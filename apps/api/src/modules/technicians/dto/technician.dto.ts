import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class UpdateLocationDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;
}

export class UpdateAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}

export class NearbyQueryDto {
  // Query params arrive as strings — coerce to numbers before validation.
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  radiusKm?: number;
}
