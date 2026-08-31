import { Module } from '@nestjs/common';
import { CashBankService } from './cash-bank.service';
import { PaymentsService } from './payments.service';
import { StatementsService } from './statements.service';
import { ReconciliationService } from './reconciliation.service';
import { CashBankController } from './cash-bank.controller';
import { PaymentsController } from './payments.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [CashBankController, PaymentsController],
  providers: [
    CashBankService,
    PaymentsService,
    StatementsService,
    ReconciliationService,
  ],
  exports: [
    CashBankService,
    PaymentsService,
    StatementsService,
    ReconciliationService,
  ],
})
export class CashBankModule {}
