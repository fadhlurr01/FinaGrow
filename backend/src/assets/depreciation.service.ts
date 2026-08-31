import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AssetStatus,
  DepreciationMethod,
  DepreciationScheduleStatus,
  DepreciationRunStatus,
} from '@prisma/client';

@Injectable()
export class DepreciationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Generates depreciation schedule rows for an active asset
   */
  async generateScheduleForAsset(
    tx: any,
    assetId: string,
    acquisitionCost: Decimal,
    residualValue: Decimal,
    usefulLifeMonths: number | null,
    depreciationMethod: DepreciationMethod,
    depreciationStartDate: Date,
  ) {
    // Non-depreciable asset (e.g. Land)
    if (depreciationMethod === DepreciationMethod.NONE || !usefulLifeMonths || usefulLifeMonths <= 0) {
      return [];
    }

    const costNum = Number(acquisitionCost);
    const residualNum = Number(residualValue || 0);
    const depreciableAmount = Math.max(0, costNum - residualNum);

    if (depreciableAmount <= 0) {
      return [];
    }

    // Delete existing unposted schedules if any
    await tx.assetDepreciationSchedule.deleteMany({
      where: {
        assetId,
        status: DepreciationScheduleStatus.SCHEDULED,
      },
    });

    const standardMonthly = Number((depreciableAmount / usefulLifeMonths).toFixed(2));
    let accumulated = 0;
    const scheduleRows: any[] = [];

    const startDate = new Date(depreciationStartDate);
    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth() + 1; // 1-12

    for (let m = 1; m <= usefulLifeMonths; m++) {
      let monthlyDeprec = standardMonthly;
      if (m === usefulLifeMonths) {
        // Final period reconciles any rounding discrepancies to match exact depreciable amount
        monthlyDeprec = Number((depreciableAmount - accumulated).toFixed(2));
      }

      const openingBookValue = Number((costNum - accumulated).toFixed(2));
      accumulated = Number((accumulated + monthlyDeprec).toFixed(2));
      const closingBookValue = Number((costNum - accumulated).toFixed(2));

      const periodDate = new Date(Date.UTC(currentYear, currentMonth - 1, 28));

      scheduleRows.push({
        assetId,
        periodYear: currentYear,
        periodMonth: currentMonth,
        depreciationDate: periodDate,
        openingBookValue: new Decimal(openingBookValue),
        depreciationAmount: new Decimal(monthlyDeprec),
        accumulatedDepreciation: new Decimal(accumulated),
        closingBookValue: new Decimal(closingBookValue),
        status: DepreciationScheduleStatus.SCHEDULED,
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    await tx.assetDepreciationSchedule.createMany({
      data: scheduleRows,
    });

    return scheduleRows;
  }

  /**
   * Preview / Calculate a monthly depreciation run
   */
  async calculateRun(organizationId: string, entityId: string, periodYear: number, periodMonth: number) {
    const schedules = await this.prisma.assetDepreciationSchedule.findMany({
      where: {
        periodYear,
        periodMonth,
        status: DepreciationScheduleStatus.SCHEDULED,
        asset: {
          organizationId,
          entityId,
          status: AssetStatus.ACTIVE,
        },
      },
      include: {
        asset: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        asset: {
          assetNumber: 'asc',
        },
      },
    });

    const totalDepreciation = schedules.reduce(
      (sum, s) => sum.plus(new Decimal(s.depreciationAmount)),
      new Decimal(0),
    );

    return {
      periodYear,
      periodMonth,
      assetCount: schedules.length,
      totalDepreciation: totalDepreciation.toNumber(),
      schedules: schedules.map((s) => ({
        id: s.id,
        assetId: s.assetId,
        assetNumber: s.asset.assetNumber,
        assetName: s.asset.name,
        categoryName: s.asset.category.name,
        depreciationAmount: Number(s.depreciationAmount),
        openingBookValue: Number(s.openingBookValue),
        closingBookValue: Number(s.closingBookValue),
      })),
    };
  }

  /**
   * Execute and post a month-end batch depreciation run with double-entry journal creation
   */
  async postRun(
    organizationId: string,
    entityId: string,
    periodYear: number,
    periodMonth: number,
    userId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Check existing posted run
      const existingRun = await tx.depreciationRun.findUnique({
        where: {
          entityId_periodYear_periodMonth: {
            entityId,
            periodYear,
            periodMonth,
          },
        },
      });

      if (existingRun && existingRun.status === DepreciationRunStatus.POSTED) {
        throw new BadRequestException(
          `Depreciation run for period ${periodYear}-${String(periodMonth).padStart(2, '0')} is already POSTED`,
        );
      }

      // 2. Fetch scheduled lines for the period
      const schedules = await tx.assetDepreciationSchedule.findMany({
        where: {
          periodYear,
          periodMonth,
          status: DepreciationScheduleStatus.SCHEDULED,
          asset: {
            organizationId,
            entityId,
            status: AssetStatus.ACTIVE,
          },
        },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
        },
      });

      if (schedules.length === 0) {
        throw new BadRequestException(
          `No active scheduled depreciation found for period ${periodYear}-${String(periodMonth).padStart(2, '0')}`,
        );
      }

      // 3. Group by (depreciationExpenseAccountId, accumulatedDepreciationAccountId)
      const groupMap = new Map<string, { expenseAccountId: string; accumAccountId: string; totalAmount: Decimal; categoryName: string }>();

      let totalDeprecRun = new Decimal(0);

      for (const s of schedules) {
        const cat = s.asset.category;
        const key = `${cat.depreciationExpenseAccountId}_${cat.accumulatedDepreciationAccountId}`;
        const amount = new Decimal(s.depreciationAmount);
        totalDeprecRun = totalDeprecRun.plus(amount);

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            expenseAccountId: cat.depreciationExpenseAccountId,
            accumAccountId: cat.accumulatedDepreciationAccountId,
            totalAmount: amount,
            categoryName: cat.name,
          });
        } else {
          const g = groupMap.get(key)!;
          g.totalAmount = g.totalAmount.plus(amount);
        }
      }

      // 4. Generate balanced double-entry journal entry
      const runNumber = `DEPR-${periodYear}${String(periodMonth).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
      const journalLines: any[] = [];

      for (const group of groupMap.values()) {
        const amountNum = Number(group.totalAmount);
        // DR Depreciation Expense
        journalLines.push({
          accountId: group.expenseAccountId,
          debit: amountNum,
          credit: 0,
          description: `Depreciation Expense - ${group.categoryName} (${periodYear}-${String(periodMonth).padStart(2, '0')})`,
        });
        // CR Accumulated Depreciation
        journalLines.push({
          accountId: group.accumAccountId,
          debit: 0,
          credit: amountNum,
          description: `Accumulated Depreciation - ${group.categoryName} (${periodYear}-${String(periodMonth).padStart(2, '0')})`,
        });
      }

      const endOfMonthDate = new Date(Date.UTC(periodYear, periodMonth, 0)); // last day of month

      const journal = await this.accountingService.createJournalEntry(
        {
          entityId,
          entryDate: endOfMonthDate.toISOString().split('T')[0],
          description: `Monthly Fixed Asset Depreciation Run ${periodYear}-${String(periodMonth).padStart(2, '0')}`,
          reference: runNumber,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      await this.accountingService.postJournalEntry(journal.id, organizationId, userId);

      // 5. Create or update DepreciationRun
      const run = existingRun
        ? await tx.depreciationRun.update({
            where: { id: existingRun.id },
            data: {
              status: DepreciationRunStatus.POSTED,
              totalDepreciation: totalDeprecRun,
              journalEntryId: journal.id,
              postedById: userId,
              postedAt: new Date(),
            },
          })
        : await tx.depreciationRun.create({
            data: {
              organizationId,
              entityId,
              periodYear,
              periodMonth,
              runNumber,
              status: DepreciationRunStatus.POSTED,
              totalDepreciation: totalDeprecRun,
              journalEntryId: journal.id,
              createdById: userId,
              postedById: userId,
              postedAt: new Date(),
            },
          });

      // 6. Update schedules and asset net book values
      const now = new Date();
      for (const s of schedules) {
        await tx.assetDepreciationSchedule.update({
          where: { id: s.id },
          data: {
            status: DepreciationScheduleStatus.POSTED,
            depreciationRunId: run.id,
            journalEntryId: journal.id,
            postedAt: now,
          },
        });

        // Compute updated accumulated depreciation for asset
        const postedSchedules = await tx.assetDepreciationSchedule.findMany({
          where: {
            assetId: s.assetId,
            status: DepreciationScheduleStatus.POSTED,
          },
        });

        const totalAssetAccum = postedSchedules.reduce(
          (sum, ps) => sum.plus(new Decimal(ps.depreciationAmount)),
          new Decimal(0),
        );

        const cost = new Decimal(s.asset.acquisitionCost);
        const residual = new Decimal(s.asset.residualValue);
        const nbv = Decimal.max(residual, cost.minus(totalAssetAccum));
        const depreciable = cost.minus(residual);

        const isFullyDepreciated = totalAssetAccum.gte(depreciable);

        await tx.fixedAsset.update({
          where: { id: s.assetId },
          data: {
            accumulatedDepreciation: totalAssetAccum,
            netBookValue: nbv,
            status: isFullyDepreciated ? AssetStatus.FULLY_DEPRECIATED : AssetStatus.ACTIVE,
          },
        });
      }

      return {
        runId: run.id,
        runNumber: run.runNumber,
        periodYear,
        periodMonth,
        totalDepreciation: totalDeprecRun.toNumber(),
        journalEntryId: journal.id,
        status: run.status,
      };
    });
  }

  /**
   * Reverse a posted depreciation run
   */
  async reverseRun(organizationId: string, entityId: string, runId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const run = await tx.depreciationRun.findFirst({
        where: { id: runId, organizationId, entityId },
        include: {
          schedules: {
            include: { asset: true },
          },
        },
      });

      if (!run) {
        throw new NotFoundException(`Depreciation run ${runId} not found`);
      }

      if (run.status !== DepreciationRunStatus.POSTED) {
        throw new BadRequestException(`Only POSTED depreciation runs can be reversed`);
      }

      // Void the General Ledger journal entry
      if (run.journalEntryId) {
        await this.accountingService.voidJournalEntry(run.journalEntryId, organizationId, userId);
      }

      // Revert schedules to SCHEDULED
      await tx.assetDepreciationSchedule.updateMany({
        where: { depreciationRunId: run.id },
        data: {
          status: DepreciationScheduleStatus.SCHEDULED,
          depreciationRunId: null,
          journalEntryId: null,
          postedAt: null,
        },
      });

      // Recalculate asset balances
      for (const s of run.schedules) {
        const remainingPosted = await tx.assetDepreciationSchedule.findMany({
          where: {
            assetId: s.assetId,
            status: DepreciationScheduleStatus.POSTED,
          },
        });

        const totalAssetAccum = remainingPosted.reduce(
          (sum, ps) => sum.plus(new Decimal(ps.depreciationAmount)),
          new Decimal(0),
        );

        const cost = new Decimal(s.asset.acquisitionCost);
        const residual = new Decimal(s.asset.residualValue);
        const nbv = Decimal.max(residual, cost.minus(totalAssetAccum));

        await tx.fixedAsset.update({
          where: { id: s.assetId },
          data: {
            accumulatedDepreciation: totalAssetAccum,
            netBookValue: nbv,
            status: s.asset.status === AssetStatus.FULLY_DEPRECIATED ? AssetStatus.ACTIVE : s.asset.status,
          },
        });
      }

      const updatedRun = await tx.depreciationRun.update({
        where: { id: run.id },
        data: {
          status: DepreciationRunStatus.REVERSED,
        },
      });

      return {
        runId: updatedRun.id,
        status: updatedRun.status,
        message: 'Depreciation run successfully reversed and journal entry voided',
      };
    });
  }

  /**
   * List all depreciation runs
   */
  async listRuns(organizationId: string, entityId: string) {
    return await this.prisma.depreciationRun.findMany({
      where: { organizationId, entityId },
      include: {
        journalEntry: true,
        postedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
      ],
    });
  }
}
