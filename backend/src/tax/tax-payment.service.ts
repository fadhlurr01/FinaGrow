// ===================================================================
// Phase 8 — TaxPaymentService
// Posts VAT net settlement and PPh remittance to government.
// All postings go through AccountingService for double-entry.
// ===================================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TaxPaymentStatus, TaxType, Prisma } from '@prisma/client';
import { CreateTaxPaymentDto, TaxPaymentFilterDto } from './dto/tax.dto';

@Injectable()
export class TaxPaymentService {
  private readonly logger = new Logger(TaxPaymentService.name);

  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // 1. LIST
  // ──────────────────────────────────────────────────────────────────

  async getTaxPayments(organizationId: string, filter: TaxPaymentFilterDto) {
    const where: Prisma.TaxPaymentWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.taxType) where.taxType = filter.taxType as TaxType;
    if (filter.status) where.status = filter.status as TaxPaymentStatus;
    if (filter.dateFrom || filter.dateTo) {
      where.paymentDate = {};
      if (filter.dateFrom) (where.paymentDate as any).gte = new Date(filter.dateFrom);
      if (filter.dateTo) (where.paymentDate as any).lte = new Date(filter.dateTo);
    }

    return this.prisma.taxPayment.findMany({
      where,
      include: {
        taxPeriod: { select: { periodYear: true, periodMonth: true, taxType: true } },
        cashBankAccount: { select: { name: true, code: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. CREATE (DRAFT)
  // ──────────────────────────────────────────────────────────────────

  async createTaxPayment(organizationId: string, dto: CreateTaxPaymentDto, userId: string) {
    const period = await this.prisma.taxPeriod.findFirst({
      where: { id: dto.taxPeriodId, organizationId },
    });
    if (!period) throw new NotFoundException('TaxPeriod not found');

    const cashBank = await this.prisma.cashBankAccount.findFirst({
      where: { id: dto.cashBankAccountId, organizationId },
      include: { coaAccount: true },
    });
    if (!cashBank) throw new NotFoundException('CashBankAccount not found');

    // Generate payment number
    const count = await this.prisma.taxPayment.count({ where: { organizationId } });
    const paymentNumber = `TXPAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.taxPayment.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        taxPeriodId: dto.taxPeriodId,
        paymentNumber,
        paymentDate: new Date(dto.paymentDate),
        taxType: dto.taxType as TaxType,
        amount: new Decimal(dto.amount),
        ntpn: dto.ntpn,
        sspNumber: dto.sspNumber,
        cashBankAccountId: dto.cashBankAccountId,
        status: 'DRAFT',
        notes: dto.notes,
        createdById: userId,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. POST VAT SETTLEMENT
  //    Journal: DR Output VAT + CR Input VAT + (DR/CR) VAT Payable + CR Bank
  // ──────────────────────────────────────────────────────────────────

  async postVATSettlement(id: string, organizationId: string, userId: string) {
    const taxPayment = await this.findOrThrow(id, organizationId);

    if (taxPayment.status !== 'DRAFT') {
      throw new BadRequestException(`TaxPayment is already ${taxPayment.status}`);
    }

    const period = await this.prisma.taxPeriod.findUnique({
      where: { id: taxPayment.taxPeriodId },
    });
    if (!period) throw new NotFoundException('TaxPeriod not found for this payment');

    // Load accounting settings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: taxPayment.entityId },
      include: {
        outputTaxAccount: true,
        inputTaxAccount: true,
        vatPayableAccount: true,
      },
    });

    if (!settings?.outputTaxAccount || !settings?.inputTaxAccount) {
      throw new BadRequestException(
        'AccountingSettings missing outputTaxAccountId or inputTaxAccountId',
      );
    }

    const cashBank = await this.prisma.cashBankAccount.findFirst({
      where: { id: taxPayment.cashBankAccountId, organizationId },
      include: { coaAccount: true },
    });
    if (!cashBank) throw new NotFoundException('CashBankAccount not found');

    const amount = new Decimal(taxPayment.amount);
    const outputTax = new Decimal(period.totalOutputTax);
    const inputTax = new Decimal(period.totalInputTax);
    const netTax = outputTax.minus(inputTax);

    // Build journal lines
    const lines: any[] = [];

    // DR Output VAT (clear the liability)
    if (outputTax.greaterThan(0)) {
      lines.push({
        accountId: settings.outputTaxAccountId,
        debit: outputTax.toNumber(),
        credit: 0,
        description: `Output VAT ${period.periodYear}-${period.periodMonth} settlement`,
      });
    }

    // CR Input VAT (clear the asset)
    if (inputTax.greaterThan(0)) {
      lines.push({
        accountId: settings.inputTaxAccountId,
        debit: 0,
        credit: inputTax.toNumber(),
        description: `Input VAT ${period.periodYear}-${period.periodMonth} settlement`,
      });
    }

    // CR Bank (cash outflow for net VAT payable)
    if (netTax.greaterThan(0)) {
      lines.push({
        accountId: cashBank.coaAccountId,
        debit: 0,
        credit: netTax.toNumber(),
        description: `VAT payment NTPN:${taxPayment.ntpn ?? 'N/A'} SSP:${taxPayment.sspNumber ?? 'N/A'}`,
      });
    }

    const entry = await this.accountingService.createJournalEntry(
      {
        entityId: taxPayment.entityId,
        entryDate: taxPayment.paymentDate.toISOString().split('T')[0],
        description: `VAT Settlement ${period.periodYear}-${String(period.periodMonth).padStart(2, '0')}`,
        reference: taxPayment.paymentNumber,
        lines,
      },
      organizationId,
      userId,
    );

    await this.accountingService.postJournalEntry(entry.id, organizationId, userId);

    // Mark payment as POSTED and update period totals
    const updated = await this.prisma.taxPayment.update({
      where: { id },
      data: {
        status: 'POSTED',
        journalEntryId: entry.id,
        postedById: userId,
        postedAt: new Date(),
      },
    });

    // Update period totalPaid and status
    await this.prisma.taxPeriod.update({
      where: { id: taxPayment.taxPeriodId },
      data: {
        totalPaid: { increment: amount },
        status: amount.gte(period.netTax) ? 'PAID' : 'PARTIALLY_PAID',
      },
    });

    this.logger.log(`Posted VAT Settlement TaxPayment ${id} amount=${amount}`);

    return updated;
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. POST WITHHOLDING REMITTANCE
  //    Journal: DR PPh Payable / CR Bank
  // ──────────────────────────────────────────────────────────────────

  async postWithholdingRemittance(id: string, organizationId: string, userId: string) {
    const taxPayment = await this.findOrThrow(id, organizationId);

    if (taxPayment.status !== 'DRAFT') {
      throw new BadRequestException(`TaxPayment is already ${taxPayment.status}`);
    }

    const period = await this.prisma.taxPeriod.findUnique({
      where: { id: taxPayment.taxPeriodId },
    });
    if (!period) throw new NotFoundException('TaxPeriod not found');

    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: taxPayment.entityId },
    });
    if (!settings) throw new BadRequestException('AccountingSettings not found');

    // Resolve payable account by tax type
    let payableAccountId: string | null = null;
    if (taxPayment.taxType === 'PPH23') {
      payableAccountId = settings.pph23PayableAccountId ?? null;
    } else if (taxPayment.taxType === 'PPH4_2') {
      payableAccountId = settings.pph4_2PayableAccountId ?? null;
    }

    if (!payableAccountId) {
      throw new BadRequestException(
        `AccountingSettings missing ${taxPayment.taxType} payable account ID`,
      );
    }

    const cashBank = await this.prisma.cashBankAccount.findFirst({
      where: { id: taxPayment.cashBankAccountId, organizationId },
    });
    if (!cashBank) throw new NotFoundException('CashBankAccount not found');

    const amount = new Decimal(taxPayment.amount);

    const entry = await this.accountingService.createJournalEntry(
      {
        entityId: taxPayment.entityId,
        entryDate: taxPayment.paymentDate.toISOString().split('T')[0],
        description: `${taxPayment.taxType} Remittance ${period.periodYear}-${String(period.periodMonth).padStart(2, '0')}`,
        reference: taxPayment.paymentNumber,
        lines: [
          {
            accountId: payableAccountId,
            debit: amount.toNumber(),
            credit: 0,
            description: `${taxPayment.taxType} payable cleared`,
          },
          {
            accountId: cashBank.coaAccountId,
            debit: 0,
            credit: amount.toNumber(),
            description: `Bank payment NTPN:${taxPayment.ntpn ?? 'N/A'}`,
          },
        ],
      },
      organizationId,
      userId,
    );

    await this.accountingService.postJournalEntry(entry.id, organizationId, userId);

    const updated = await this.prisma.taxPayment.update({
      where: { id },
      data: {
        status: 'POSTED',
        journalEntryId: entry.id,
        postedById: userId,
        postedAt: new Date(),
      },
    });

    await this.prisma.taxPeriod.update({
      where: { id: taxPayment.taxPeriodId },
      data: {
        totalPaid: { increment: amount },
        status: amount.gte(period.netTax) ? 'PAID' : 'PARTIALLY_PAID',
      },
    });

    this.logger.log(`Posted Withholding Remittance TaxPayment ${id} amount=${amount}`);

    return updated;
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────

  private async findOrThrow(id: string, organizationId: string) {
    const p = await this.prisma.taxPayment.findFirst({
      where: { id, organizationId },
    });
    if (!p) throw new NotFoundException('TaxPayment not found');
    return p;
  }
}
