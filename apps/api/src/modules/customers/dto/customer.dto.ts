import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

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

  @IsInt()
  @Min(0)
  pricePaise!: number;
}
