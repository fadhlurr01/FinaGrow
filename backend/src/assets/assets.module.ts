import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { DepreciationService } from './depreciation.service';
import { DisposalService } from './disposal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [AssetsController],
  providers: [AssetsService, DepreciationService, DisposalService],
  exports: [AssetsService, DepreciationService, DisposalService],
})
export class AssetsModule {}
