import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AssetStatus, DisposalStatus, DisposalType, DepreciationScheduleStatus } from '@prisma/client';
import { CreateAssetDisposalDto } from './dto/lifecycle.dto';

@Injectable()
export class DisposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Execute asset disposal (Sale, Scrap, Retirement, Loss) with double-entry journal posting
   */
  async disposeAsset(
    organizationId: string,
    entityId: string,
    assetId: string,
    dto: CreateAssetDisposalDto,
    userId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch asset with category and relations
      const asset = await tx.fixedAsset.findFirst({
        where: { id: assetId, organizationId, entityId },
        include: {
          category: true,
        },
      });

      if (!asset) {
        throw new NotFoundException(`Fixed asset ${assetId} not found`);
      }

      if (asset.status === AssetStatus.DISPOSED || asset.status === AssetStatus.RETIRED) {
        throw new BadRequestException(`Asset ${asset.assetNumber} is already disposed or retired`);
      }

      if (asset.status === AssetStatus.DRAFT) {
        throw new BadRequestException(`Draft assets cannot be disposed. Only ACTIVE or FULLY_DEPRECIATED assets can be disposed.`);
      }

      // 2. Compute accurate cost, accumulated depreciation and NBV
      const cost = new Decimal(asset.acquisitionCost);
      const accumDeprec = new Decimal(asset.accumulatedDepreciation);
      const nbv = Decimal.max(new Decimal(0), cost.minus(accumDeprec));

      const proceeds = new Decimal(dto.proceeds || 0);
      const gainLoss = proceeds.minus(nbv);

      // Validate cash/bank account if proceeds > 0
      let bankCoaAccountId: string | null = null;
      if (proceeds.gt(0)) {
        if (!dto.cashBankAccountId) {
          throw new BadRequestException('cashBankAccountId is required when proceeds > 0');
        }
        const bankAcc = await tx.cashBankAccount.findFirst({
          where: { id: dto.cashBankAccountId, organizationId, entityId, isActive: true },
        });
        if (!bankAcc) {
          throw new BadRequestException('Invalid or inactive cashBankAccountId for this entity');
        }
        bankCoaAccountId = bankAcc.coaAccountId;
      }

      // 3. Construct balanced double-entry disposal journal
      const cat = asset.category;
      const journalLines: any[] = [];

      const costNum = Number(cost);
      const accumNum = Number(accumDeprec);
      const proceedsNum = Number(proceeds);
      const gainLossNum = Number(gainLoss);

      // DR Bank (Proceeds) if any
      if (proceedsNum > 0 && bankCoaAccountId) {
        journalLines.push({
          accountId: bankCoaAccountId,
          debit: proceedsNum,
          credit: 0,
          description: `Disposal proceeds for ${asset.assetNumber} - ${asset.name}`,
        });
      }

      // DR Accumulated Depreciation (clear contra asset)
      if (accumNum > 0) {
        journalLines.push({
          accountId: cat.accumulatedDepreciationAccountId,
          debit: accumNum,
          credit: 0,
          description: `Clear accumulated depreciation on disposal of ${asset.assetNumber}`,
        });
      }

      // CR Fixed Asset Cost (clear original cost)
      journalLines.push({
        accountId: cat.fixedAssetAccountId,
        debit: 0,
        credit: costNum,
        description: `Derecognition of asset cost for ${asset.assetNumber}`,
      });

      // Gain or Loss on disposal
      if (gainLossNum > 0) {
        // CR Gain on Disposal (Revenue)
        journalLines.push({
          accountId: cat.gainOnDisposalAccountId,
          debit: 0,
          credit: Math.abs(gainLossNum),
          description: `Gain on disposal of ${asset.assetNumber}`,
        });
      } else if (gainLossNum < 0) {
        // DR Loss on Disposal (Expense)
        journalLines.push({
          accountId: cat.lossOnDisposalAccountId,
          debit: Math.abs(gainLossNum),
          credit: 0,
          description: `Loss on disposal / scrap of ${asset.assetNumber}`,
        });
      }

      const journal = await this.accountingService.createJournalEntry(
        {
          entityId,
          entryDate: dto.disposalDate,
          description: `Asset Disposal (${dto.disposalType}) - ${asset.assetNumber} (${asset.name})`,
          reference: dto.disposalReference || `DISP-${asset.assetNumber}`,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      await this.accountingService.postJournalEntry(journal.id, organizationId, userId);

      // 4. Create AssetDisposal record
      const disposal = await tx.assetDisposal.create({
        data: {
          organizationId,
          entityId,
          assetId: asset.id,
          disposalDate: new Date(dto.disposalDate),
          disposalType: dto.disposalType,
          proceeds,
          buyerId: dto.buyerId || null,
          cashBankAccountId: dto.cashBankAccountId || null,
          disposalReference: dto.disposalReference || null,
          assetCost: cost,
          accumulatedDeprec: accumDeprec,
          netBookValue: nbv,
          gainLoss,
          journalEntryId: journal.id,
          status: DisposalStatus.POSTED,
          notes: dto.notes || null,
          createdById: userId,
          postedById: userId,
          postedAt: new Date(),
        },
      });

      // 5. Update asset status
      await tx.fixedAsset.update({
        where: { id: asset.id },
        data: {
          status: dto.disposalType === DisposalType.RETIREMENT ? AssetStatus.RETIRED : AssetStatus.DISPOSED,
          disposedAt: new Date(dto.disposalDate),
        },
      });

      // 6. Cancel remaining unposted schedules
      await tx.assetDepreciationSchedule.updateMany({
        where: {
          assetId: asset.id,
          status: DepreciationScheduleStatus.SCHEDULED,
        },
        data: {
          status: DepreciationScheduleStatus.REVERSED,
        },
      });

      return {
        disposalId: disposal.id,
        assetNumber: asset.assetNumber,
        disposalType: disposal.disposalType,
        proceeds: proceeds.toNumber(),
        netBookValue: nbv.toNumber(),
        gainLoss: gainLoss.toNumber(),
        journalEntryId: journal.id,
        status: disposal.status,
      };
    });
  }

  /**
   * List disposals
   */
  async listDisposals(organizationId: string, entityId: string) {
    return await this.prisma.assetDisposal.findMany({
      where: { organizationId, entityId },
      include: {
        asset: true,
        buyer: true,
        cashBankAccount: true,
        journalEntry: true,
      },
      orderBy: { disposalDate: 'desc' },
    });
  }
}
