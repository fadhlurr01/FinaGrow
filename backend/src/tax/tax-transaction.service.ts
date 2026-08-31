// ===================================================================
// Phase 8 — TaxTransactionService
// Authoritative tax sub-ledger. Creates, queries, and reverses
// TaxTransaction records. Assigns to TaxPeriod automatically.
// ===================================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaxEngineService, TaxCalculationResult } from './tax-engine.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TaxDirection, TaxTransactionStatus, TaxSourceType, Prisma } from '@prisma/client';
import { TaxTransactionFilterDto } from './dto/tax.dto';

export interface CreateTaxTransactionInput {
  taxCodeId: string;
  entityId: string;
  transactionDate: Date;
  baseAmount: Decimal;
  sourceType: TaxSourceType;
  salesInvoiceId?: string;
  vendorBillId?: string;
  paymentId?: string;
  journalEntryId?: string;
  notes?: string;
}

@Injectable()
export class TaxTransactionService {
  private readonly logger = new Logger(TaxTransactionService.name);

  constructor(
    private prisma: PrismaService,
    private taxEngine: TaxEngineService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // 1. CREATE TAX TRANSACTION
  // ──────────────────────────────────────────────────────────────────

  async createTaxTransaction(
    organizationId: string,
    input: CreateTaxTransactionInput,
  ) {
    const { taxCodeId, entityId, transactionDate, baseAmount, sourceType } = input;

    // Calculate tax
    const calc: TaxCalculationResult = await this.taxEngine.calculateTax(
      taxCodeId,
      transactionDate,
      baseAmount,
      organizationId,
    );

    // Resolve or create TaxPeriod
    const taxPeriod = await this.getOrCreatePeriodForDate(
      organizationId,
      entityId,
      calc.taxType as any,
      transactionDate,
    );

    // Guard: FILED period blocks new transactions
    if (taxPeriod.status === 'FILED' || taxPeriod.status === 'CLOSED') {
      throw new BadRequestException(
        `TaxPeriod for ${calc.taxType} ${transactionDate.getFullYear()}-${transactionDate.getMonth() + 1} is ${taxPeriod.status}. Reopen before adding transactions.`,
      );
    }

    const txn = await this.prisma.taxTransaction.create({
      data: {
        organizationId,
        entityId,
        taxCodeId,
        taxRuleId: calc.taxRuleId,
        taxPeriodId: taxPeriod.id,
        sourceType,
        salesInvoiceId: input.salesInvoiceId ?? null,
        vendorBillId: input.vendorBillId ?? null,
        paymentId: input.paymentId ?? null,
        transactionDate,
        baseAmount: calc.baseAmount,
        dppAmount: calc.dppAmount,
        taxAmount: calc.taxAmount,
        legalRate: calc.legalRate,
        dppFactor: calc.dppFactor,
        direction: calc.direction as TaxDirection,
        status: 'DRAFT',
        journalEntryId: input.journalEntryId ?? null,
        notes: input.notes,
      },
      include: {
        taxCode: { select: { code: true, name: true, taxType: true } },
        taxRule: { select: { legalRate: true, dppFactor: true } },
      },
    });

    this.logger.log(
      `Created TaxTransaction ${txn.id}: ${calc.direction} ${calc.taxType} amount=${calc.taxAmount}`,
    );

    return txn;
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. POST TRANSACTION (mark POSTED — call after GL journal is posted)
  // ──────────────────────────────────────────────────────────────────

  async postTaxTransaction(id: string, organizationId: string, journalEntryId?: string) {
    const txn = await this.findOneOrThrow(id, organizationId);

    if (txn.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot post TaxTransaction in status ${txn.status}`);
    }

    return this.prisma.taxTransaction.update({
      where: { id },
      data: {
        status: 'POSTED',
        journalEntryId: journalEntryId ?? txn.journalEntryId,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. REVERSE TRANSACTION (immutable — creates reversal record)
  // ──────────────────────────────────────────────────────────────────

  async reverseTaxTransaction(
    originalId: string,
    organizationId: string,
    entityId: string,
    notes?: string,
  ) {
    const original = await this.findOneOrThrow(originalId, organizationId);

    if (original.status === 'REVERSED') {
      throw new BadRequestException('TaxTransaction is already reversed');
    }

    // Check if the period is filed
    if (original.taxPeriodId) {
      const period = await this.prisma.taxPeriod.findUnique({
        where: { id: original.taxPeriodId },
      });
      if (period && (period.status === 'FILED' || period.status === 'CLOSED')) {
        throw new ForbiddenException(
          `Cannot reverse TaxTransaction: TaxPeriod is ${period.status}`,
        );
      }
    }

    // Create reversal entry with negated amounts
    const reversalTxn = await this.prisma.taxTransaction.create({
      data: {
        organizationId,
        entityId: original.entityId,
        taxCodeId: original.taxCodeId,
        taxRuleId: original.taxRuleId,
        taxPeriodId: original.taxPeriodId,
        sourceType: original.sourceType,
        salesInvoiceId: original.salesInvoiceId,
        vendorBillId: original.vendorBillId,
        paymentId: original.paymentId,
        transactionDate: original.transactionDate,
        baseAmount: new Decimal(original.baseAmount).negated(),
        dppAmount: new Decimal(original.dppAmount).negated(),
        taxAmount: new Decimal(original.taxAmount).negated(),
        legalRate: original.legalRate,
        dppFactor: original.dppFactor,
        direction: original.direction,
        status: 'POSTED',
        reversalOfId: original.id,
        notes: notes ?? `Reversal of TaxTransaction ${original.id}`,
      },
    });

    // Mark original as reversed
    await this.prisma.taxTransaction.update({
      where: { id: originalId },
      data: { status: 'REVERSED' },
    });

    this.logger.log(`Reversed TaxTransaction ${originalId} → reversal ${reversalTxn.id}`);

    return reversalTxn;
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. QUERY
  // ──────────────────────────────────────────────────────────────────

  async getTransactions(organizationId: string, filter: TaxTransactionFilterDto) {
    const where: Prisma.TaxTransactionWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.taxCodeId) where.taxCodeId = filter.taxCodeId;
    if (filter.direction) where.direction = filter.direction as TaxDirection;
    if (filter.status) where.status = filter.status as TaxTransactionStatus;

    if (filter.taxType) {
      where.taxCode = { taxType: filter.taxType as any };
    }

    if (filter.dateFrom || filter.dateTo) {
      where.transactionDate = {};
      if (filter.dateFrom) (where.transactionDate as any).gte = new Date(filter.dateFrom);
      if (filter.dateTo) (where.transactionDate as any).lte = new Date(filter.dateTo);
    }

    if (filter.periodYear && filter.periodMonth) {
      where.taxPeriod = {
        periodYear: filter.periodYear,
        periodMonth: filter.periodMonth,
      };
    }

    return this.prisma.taxTransaction.findMany({
      where,
      include: {
        taxCode: { select: { code: true, name: true, taxType: true, direction: true } },
        taxRule: { select: { legalRate: true, dppFactor: true, calculationMethod: true } },
        taxPeriod: { select: { periodYear: true, periodMonth: true, status: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. VAT SUMMARY (for Output/Input VAT reconciliation)
  // ──────────────────────────────────────────────────────────────────

  async getVATSummary(organizationId: string, entityId: string, year: number, month: number) {
    const transactions = await this.prisma.taxTransaction.findMany({
      where: {
        organizationId,
        entityId,
        status: { in: ['POSTED', 'REPORTED'] },
        taxCode: { taxType: 'VAT' },
        taxPeriod: { periodYear: year, periodMonth: month },
      },
      include: { taxCode: { select: { direction: true } } },
    });

    let outputVat = new Decimal(0);
    let inputVat = new Decimal(0);

    for (const t of transactions) {
      const amt = new Decimal(t.taxAmount);
      if (t.direction === 'OUTPUT') {
        outputVat = outputVat.plus(amt);
      } else if (t.direction === 'INPUT') {
        inputVat = inputVat.plus(amt);
      }
    }

    const netVat = outputVat.minus(inputVat);

    return {
      year,
      month,
      outputVat,
      inputVat,
      netVat,
      vatPayable: netVat.greaterThan(0) ? netVat : new Decimal(0),
      vatRefundable: netVat.lessThan(0) ? netVat.absoluteValue() : new Decimal(0),
      transactionCount: transactions.length,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. WITHHOLDING SUMMARY
  // ──────────────────────────────────────────────────────────────────

  async getWithholdingSummary(organizationId: string, entityId: string, year: number, month: number) {
    const transactions = await this.prisma.taxTransaction.findMany({
      where: {
        organizationId,
        entityId,
        status: { in: ['POSTED', 'REPORTED'] },
        direction: { in: ['WITHHOLDING_PAYABLE', 'WITHHOLDING_RECEIVABLE'] },
        taxPeriod: { periodYear: year, periodMonth: month },
      },
      include: { taxCode: { select: { code: true, name: true, taxType: true } } },
    });

    let payable = new Decimal(0);
    let receivable = new Decimal(0);

    for (const t of transactions) {
      const amt = new Decimal(t.taxAmount).absoluteValue();
      if (t.direction === 'WITHHOLDING_PAYABLE') payable = payable.plus(amt);
      else receivable = receivable.plus(amt);
    }

    return { year, month, withholdingPayable: payable, withholdingReceivable: receivable };
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────────────────────────

  private async findOneOrThrow(id: string, organizationId: string) {
    const txn = await this.prisma.taxTransaction.findFirst({
      where: { id, organizationId },
    });
    if (!txn) throw new NotFoundException('TaxTransaction not found');
    return txn;
  }

  private async getOrCreatePeriodForDate(
    organizationId: string,
    entityId: string,
    taxType: any,
    date: Date,
  ) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const existing = await this.prisma.taxPeriod.findUnique({
      where: {
        entityId_taxType_periodYear_periodMonth: {
          entityId,
          taxType,
          periodYear: year,
          periodMonth: month,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.taxPeriod.create({
      data: {
        organizationId,
        entityId,
        taxType,
        periodYear: year,
        periodMonth: month,
        status: 'OPEN',
      },
    });
  }
}
