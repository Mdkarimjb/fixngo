import { Controller, Get } from '@nestjs/common';
import { CustomersService } from './customers.service';

/** Public, read-only marketplace catalogue. Seller contact details stay private. */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly customers: CustomersService) {}

  @Get('listings')
  listings() {
    return this.customers.listPublicListings();
  }
}
