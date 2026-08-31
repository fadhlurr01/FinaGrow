// ===================================================================
// Phase 8 — TaxModule
// ===================================================================
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { TaxEngineService } from './tax-engine.service';
import { TaxTransactionService } from './tax-transaction.service';
import { TaxPeriodService } from './tax-period.service';
import { TaxPaymentService } from './tax-payment.service';
import { TaxReconciliationService } from './tax-reconciliation.service';
import { TaxController } from './tax.controller';

@Module({
  imports: [PrismaModule, AccountingModule],
  providers: [
    TaxEngineService,
    TaxTransactionService,
    TaxPeriodService,
    TaxPaymentService,
    TaxReconciliationService,
  ],
  controllers: [TaxController],
  exports: [TaxEngineService, TaxTransactionService, TaxPeriodService],
})
export class TaxModule {}
