import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return customer;
  }

  async updateProfile(userId: string, dto: UpdateCustomerDto) {
    await this.getProfile(userId);
    return this.prisma.customer.update({
      where: { userId },
      data: dto,
    });
  }

  async createListing(userId: string, dto: CreateListingDto) {
    const customer = await this.getProfile(userId);
    return this.prisma.productListing.create({
      data: { ...dto, customerId: customer.id },
    });
  }

  async listMyListings(userId: string) {
    const customer = await this.getProfile(userId);
    return this.prisma.productListing.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
