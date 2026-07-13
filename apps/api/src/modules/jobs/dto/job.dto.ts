import {
  IsEnum,
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
