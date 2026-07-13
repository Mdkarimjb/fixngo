import { IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone!: string;
}

export class VerifyOtpDto {
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
