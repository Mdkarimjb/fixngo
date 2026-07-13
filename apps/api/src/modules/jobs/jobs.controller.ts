import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JobsService } from './jobs.service';
import {
  AssignJobDto,
  CancelJobDto,
  CreateJobDto,
  DeclineJobDto,
  RateJobDto,
  UpdateJobStatusDto,
} from './dto/job.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
    return this.jobs.create(user.id, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.jobs.listForCustomer(user.id);
  }

  @Roles(Role.TECHNICIAN)
  @Get('assigned')
  assigned(@CurrentUser() user: AuthUser) {
    return this.jobs.listForTechnician(user.id);
  }

  @Roles(Role.ADMIN)
  @Get()
  all() {
    return this.jobs.listAll();
  }

  @Roles(Role.ADMIN)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignJobDto) {
    return this.jobs.assign(id, dto);
  }

  @Roles(Role.TECHNICIAN)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobs.updateStatus(user.id, id, dto);
  }

  @Roles(Role.TECHNICIAN)
  @Post(':id/decline')
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeclineJobDto,
  ) {
    return this.jobs.decline(user.id, id, dto);
  }

  @Roles(Role.CUSTOMER)
  @Patch(':id/rate')
  rate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RateJobDto,
  ) {
    return this.jobs.rate(user.id, id, dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelJobDto) {
    return this.jobs.cancel(id, dto);
  }
}
