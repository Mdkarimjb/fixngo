import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
import {
  imageUploadOptions,
  imageUrls,
} from '../../common/uploads/image-upload';

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
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateCustomerDto) {
    return this.customers.updateProfile(user.id, dto);
  }

  @Post('listings')
  @UseInterceptors(FilesInterceptor('images', 4, imageUploadOptions))
  createListing(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateListingDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.customers.createListing(user.id, dto, imageUrls(files));
  }

  @Get('listings')
  myListings(@CurrentUser() user: AuthUser) {
    return this.customers.listMyListings(user.id);
  }
}
