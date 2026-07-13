import {
  IsEnum,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { JobStatus } from '../job-status.enum';

export class CreateJobDto {
  @IsString()
  @Length(2, 80)
  serviceType!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}

export class AssignJobDto {
  @IsString()
  technicianId!: string;
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
