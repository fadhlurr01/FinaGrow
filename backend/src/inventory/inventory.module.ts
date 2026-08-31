import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ValuationService } from './valuation.service';
import { ReceiptsService } from './receipts.service';
import { DeliveriesService } from './deliveries.service';
import { TransfersService } from './transfers.service';
import { AdjustmentsService } from './adjustments.service';
import { InventoryController } from './inventory.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    ValuationService,
    ReceiptsService,
    DeliveriesService,
    TransfersService,
    AdjustmentsService,
  ],
  exports: [
    InventoryService,
    ValuationService,
    ReceiptsService,
    DeliveriesService,
    TransfersService,
    AdjustmentsService,
  ],
})
export class InventoryModule {}
