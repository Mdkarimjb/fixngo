import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEmail,
  IsInt,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { SUPPORTED_CITIES } from '../../../common/utils/reference-code';
import { SERVICE_LOCATION_NAMES } from '../../../common/utils/service-locations';

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

export class UpdateTechnicianProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  fullName?: string;

  // Omit the field to leave email unchanged; send "" to clear it — an empty
  // string is intentionally not run through @IsEmail so clearing isn't rejected.
  @IsOptional()
  @ValidateIf((dto) => dto.email !== undefined && dto.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(15)
  skills?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  serviceArea?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CITIES)
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(SERVICE_LOCATION_NAMES)
  location?: string;
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
