import {
  IsEnum,
  IsDateString,
  IsInt,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '../job-status.enum';
import { SUPPORTED_CITIES } from '../../../common/utils/reference-code';
import { SERVICE_LOCATION_NAMES } from '../../../common/utils/service-locations';

export class CreateJobDto {
  @IsString()
  @Length(2, 80)
  serviceType!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CITIES)
  @Length(2, 80)
  city?: string;

  @IsString()
  @IsIn(SERVICE_LOCATION_NAMES)
  @Length(2, 80)
  location!: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}

export class AssignJobDto {
  @IsString()
  technicianId!: string;
}

export class InviteTechniciansDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  technicianIds!: string[];
}

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status!: JobStatus;
}

export class DeclineJobDto {
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class CancelJobDto {
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class RateJobDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  feedback?: string;
}
