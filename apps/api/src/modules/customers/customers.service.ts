import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto, UpdateCustomerDto } from './dto/customer.dto';
import { nextReferenceCode } from '../../common/utils/reference-code';

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

  async createListing(
    userId: string,
    dto: CreateListingDto,
    imageUrls: string[] = [],
  ) {
    const customer = await this.getProfile(userId);
    const { city: requestedCity, ...listing } = dto;
    return this.prisma.$transaction(async (tx) => {
      const reference = await nextReferenceCode(tx, requestedCity, 'SEL');
      return tx.productListing.create({
        data: { ...listing, ...reference, imageUrls, customerId: customer.id },
      });
    });
  }

  async listMyListings(userId: string) {
    const customer = await this.getProfile(userId);
    return this.prisma.productListing.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPublicListings() {
    return this.prisma.productListing.findMany({
      where: { sold: false },
      select: {
        id: true,
        referenceCode: true,
        city: true,
        title: true,
        description: true,
        imageUrls: true,
        pricePaise: true,
        createdAt: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
