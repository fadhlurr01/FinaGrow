import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { VendorsService } from './vendors.service';
import { OrdersService } from './orders.service';
import { PurchasesController } from './purchases.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, VendorsService, OrdersService],
  exports: [PurchasesService, VendorsService, OrdersService],
})
export class PurchasesModule {}
