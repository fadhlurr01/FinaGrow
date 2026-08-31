import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CustomersService } from './customers.service';
import { SalesController } from './sales.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [SalesController],
  providers: [SalesService, CustomersService],
  exports: [SalesService, CustomersService],
})
export class SalesModule {}
