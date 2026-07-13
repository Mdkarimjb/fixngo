import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { TechniciansService } from './technicians.service';
import {
  NearbyQueryDto,
  UpdateAvailabilityDto,
  UpdateLocationDto,
} from './dto/technician.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Roles(Role.TECHNICIAN)
  @Get('me')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.technicians.getProfile(user.id);
  }

  @Roles(Role.TECHNICIAN)
  @Patch('me/location')
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.technicians.updateLocation(user.id, dto);
  }

  @Roles(Role.TECHNICIAN)
  @Patch('me/availability')
  updateAvailability(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.technicians.updateAvailability(user.id, dto);
  }

  // Admins dispatch jobs by finding nearby available technicians.
  @Roles(Role.ADMIN)
  @Get('nearby')
  findNearby(@Query() dto: NearbyQueryDto) {
    return this.technicians.findNearby(dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  listForAdmin() {
    return this.technicians.listForAdmin();
  }
}
