import { IsInt, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  jobId!: string;

  // Amount in paise (e.g. 49900 = ₹499).
  @IsInt()
  @Min(100)
  amount!: number;
}
