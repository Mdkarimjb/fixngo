import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { CustomersService } from './customers.service';
import { CreateListingDto, UpdateCustomerDto } from './dto/customer.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.customers.getProfile(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.updateProfile(user.id, dto);
  }

  @Post('listings')
  createListing(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.customers.createListing(user.id, dto);
  }

  @Get('listings')
  myListings(@CurrentUser() user: AuthUser) {
    return this.customers.listMyListings(user.id);
  }
}
