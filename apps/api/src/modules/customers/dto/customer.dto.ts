import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_CITIES } from '../../../common/utils/reference-code';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  address?: string;
}

export class CreateListingDto {
  @IsString()
  @Length(2, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CITIES)
  @Length(2, 80)
  city?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  pricePaise!: number;
}
