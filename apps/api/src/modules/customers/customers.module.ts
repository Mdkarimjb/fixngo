import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  controllers: [CustomersController, MarketplaceController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
