import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { SUPPORTED_CITIES } from '../../../common/utils/reference-code';
import { SERVICE_LOCATION_NAMES } from '../../../common/utils/service-locations';

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

  @ValidateIf((dto: RegisterDto) => dto.role === Role.TECHNICIAN)
  @IsString()
  @IsIn(SUPPORTED_CITIES)
  city?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.TECHNICIAN)
  @IsString()
  @IsIn(SERVICE_LOCATION_NAMES)
  location?: string;
}
