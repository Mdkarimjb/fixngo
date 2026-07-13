import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class RegisterDto {
  // E.164-ish Indian mobile validation.
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone!: string;

  @IsString()
  @Length(2, 80)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(8, 128)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
