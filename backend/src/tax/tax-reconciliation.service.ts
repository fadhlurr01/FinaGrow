// ===================================================================
// Phase 8 — TaxReconciliationService
// Compares TaxTransaction sub-ledger totals with GL account balances.
// Reports discrepancies for audit.
// ===================================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TaxReconciliationService {
  private readonly logger = new Logger(TaxReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────
  // TAX-TO-GL RECONCILIATION
  // For a given entity, period year/month:
  //   1. Sum TaxTransaction.taxAmount by direction (sub-ledger)
  //   2. Sum JournalLine balances for the linked GL accounts (GL)
  //   3. Report differences
  // ──────────────────────────────────────────────────────────────────

  async reconcile(
    organizationId: string,
    entityId: string,
    periodYear: number,
    periodMonth: number,
  ) {
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId },
    });
    if (!settings) throw new NotFoundException('AccountingSettings not found for entity');

    // ── Sub-ledger totals by tax type & direction ────────────────────
    const allTxns = await this.prisma.taxTransaction.findMany({
      where: {
        organizationId,
        entityId,
        status: { in: ['POSTED', 'REPORTED'] },
        taxPeriod: { periodYear, periodMonth },
      },
      include: { taxCode: { select: { taxType: true } } },
    });

    let slOutput = new Decimal(0);
    let slInput = new Decimal(0);
    let slPPh23 = new Decimal(0);
    let slPPh4_2 = new Decimal(0);

    for (const t of allTxns) {
      const amt = new Decimal(t.taxAmount);
      if (t.taxCode?.taxType === 'VAT') {
        if (t.direction === 'OUTPUT') slOutput = slOutput.plus(amt);
        else if (t.direction === 'INPUT') slInput = slInput.plus(amt);
      } else if (t.taxCode?.taxType === 'PPH23' && t.direction === 'WITHHOLDING_PAYABLE') {
        slPPh23 = slPPh23.plus(amt.absoluteValue());
      } else if (t.taxCode?.taxType === 'PPH4_2' && t.direction === 'WITHHOLDING_PAYABLE') {
        slPPh4_2 = slPPh4_2.plus(amt.absoluteValue());
      }
    }

    // ── GL balances (net credit for liability accounts, net debit for asset) ──
    const startDate = new Date(periodYear, periodMonth - 1, 1);
    const endDate = new Date(periodYear, periodMonth, 0);

    const glOutput = settings.outputTaxAccountId
      ? await this.getAccountNetBalance(settings.outputTaxAccountId, startDate, endDate)
      : new Decimal(0);

    const glInput = settings.inputTaxAccountId
      ? await this.getAccountNetBalance(settings.inputTaxAccountId, startDate, endDate)
      : new Decimal(0);

    const glPPh23 = settings.pph23PayableAccountId
      ? await this.getAccountNetBalance(settings.pph23PayableAccountId, startDate, endDate)
      : new Decimal(0);

    const glPPh4_2 = settings.pph4_2PayableAccountId
      ? await this.getAccountNetBalance(settings.pph4_2PayableAccountId, startDate, endDate)
      : new Decimal(0);

    // ── Differences ────────────────────────────────────────────────────
    const diffOutput = slOutput.minus(glOutput.absoluteValue());
    const diffInput = slInput.minus(glInput.absoluteValue());
    const diffPPh23 = slPPh23.minus(glPPh23.absoluteValue());
    const diffPPh4_2 = slPPh4_2.minus(glPPh4_2.absoluteValue());

    const lines = [
      {
        label: 'Output VAT (PPN Keluaran)',
        glAccountId: settings.outputTaxAccountId,
        subLedger: slOutput,
        gl: glOutput.absoluteValue(),
        difference: diffOutput,
        isBalanced: diffOutput.absoluteValue().lessThanOrEqualTo(1), // ≤ Rp 1 tolerance
      },
      {
        label: 'Input VAT (PPN Masukan)',
        glAccountId: settings.inputTaxAccountId,
        subLedger: slInput,
        gl: glInput.absoluteValue(),
        difference: diffInput,
        isBalanced: diffInput.absoluteValue().lessThanOrEqualTo(1),
      },
      {
        label: 'PPh 23 Payable',
        glAccountId: settings.pph23PayableAccountId,
        subLedger: slPPh23,
        gl: glPPh23.absoluteValue(),
        difference: diffPPh23,
        isBalanced: diffPPh23.absoluteValue().lessThanOrEqualTo(1),
      },
      {
        label: 'PPh 4(2) Payable',
        glAccountId: settings.pph4_2PayableAccountId,
        subLedger: slPPh4_2,
        gl: glPPh4_2.absoluteValue(),
        difference: diffPPh4_2,
        isBalanced: diffPPh4_2.absoluteValue().lessThanOrEqualTo(1),
      },
    ];

    const allBalanced = lines.every((l) => l.isBalanced);

    this.logger.log(
      `Tax-to-GL Reconciliation ${entityId} ${periodYear}-${periodMonth}: balanced=${allBalanced}`,
    );

    return {
      entityId,
      periodYear,
      periodMonth,
      isFullyReconciled: allBalanced,
      lines,
      generatedAt: new Date(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────

  private findAgg(agg: any[], direction: string): Decimal {
    const row = agg.find((r) => r.direction === direction);
    return new Decimal(row?._sum?.taxAmount ?? 0);
  }

  /**
   * Returns NET balance of an account for a date range.
   * Positive = net debit, Negative = net credit.
   */
  private async getAccountNetBalance(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Decimal> {
    const result = await this.prisma.journalLine.aggregate({
      where: {
        accountId,
        journalEntry: {
          status: 'POSTED',
          entryDate: { gte: startDate, lte: endDate },
        },
      },
      _sum: { debit: true, credit: true },
    });

    const debit = new Decimal(result._sum.debit ?? 0);
    const credit = new Decimal(result._sum.credit ?? 0);
    return debit.minus(credit);
  }
}
