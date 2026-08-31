// ===================================================================
// Phase 8 — TaxPeriodService
// Lifecycle: OPEN → PREPARED → FILED / PARTIALLY_PAID → PAID → CLOSED
// ===================================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TaxPeriodStatus, TaxType, Prisma } from '@prisma/client';
import { TaxPeriodFilterDto } from './dto/tax.dto';

@Injectable()
export class TaxPeriodService {
  private readonly logger = new Logger(TaxPeriodService.name);

  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────
  // 1. GET OR CREATE
  // ──────────────────────────────────────────────────────────────────

  async getOrCreatePeriod(
    organizationId: string,
    entityId: string,
    taxType: TaxType,
    periodYear: number,
    periodMonth: number,
  ) {
    const existing = await this.prisma.taxPeriod.findUnique({
      where: {
        entityId_taxType_periodYear_periodMonth: {
          entityId,
          taxType,
          periodYear,
          periodMonth,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.taxPeriod.create({
      data: {
        organizationId,
        entityId,
        taxType,
        periodYear,
        periodMonth,
        status: 'OPEN',
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. LIST
  // ──────────────────────────────────────────────────────────────────

  async getPeriods(organizationId: string, filter: TaxPeriodFilterDto) {
    const where: Prisma.TaxPeriodWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.taxType) where.taxType = filter.taxType as TaxType;
    if (filter.periodYear) where.periodYear = filter.periodYear;
    if (filter.periodMonth) where.periodMonth = filter.periodMonth;
    if (filter.status) where.status = filter.status as TaxPeriodStatus;

    return this.prisma.taxPeriod.findMany({
      where,
      include: {
        filedBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: { taxTransactions: true, taxDocuments: true, taxPayments: true },
        },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. PREPARE — compute totals from POSTED TaxTransactions
  // ──────────────────────────────────────────────────────────────────

  async preparePeriod(id: string, organizationId: string) {
    const period = await this.findOrThrow(id, organizationId);

    if (period.status === 'FILED' || period.status === 'CLOSED') {
      throw new BadRequestException(`Cannot prepare a ${period.status} period`);
    }

    // Aggregate POSTED + REPORTED transactions in this period
    const agg = await this.prisma.taxTransaction.groupBy({
      by: ['direction'],
      where: {
        organizationId,
        taxPeriodId: id,
        status: { in: ['POSTED', 'REPORTED'] },
      },
      _sum: { taxAmount: true },
    });

    let outputTax = new Decimal(0);
    let inputTax = new Decimal(0);
    let withholdingPayable = new Decimal(0);
    let withholdingReceivable = new Decimal(0);

    for (const row of agg) {
      const amt = new Decimal(row._sum.taxAmount ?? 0);
      if (row.direction === 'OUTPUT') outputTax = outputTax.plus(amt);
      else if (row.direction === 'INPUT') inputTax = inputTax.plus(amt);
      else if (row.direction === 'WITHHOLDING_PAYABLE') withholdingPayable = withholdingPayable.plus(amt);
      else if (row.direction === 'WITHHOLDING_RECEIVABLE') withholdingReceivable = withholdingReceivable.plus(amt);
    }

    const netTax = outputTax.minus(inputTax).plus(withholdingPayable).minus(withholdingReceivable);

    const updated = await this.prisma.taxPeriod.update({
      where: { id },
      data: {
        totalOutputTax: outputTax,
        totalInputTax: inputTax,
        totalWithholdingPayable: withholdingPayable,
        totalWithholdingReceivable: withholdingReceivable,
        netTax,
        status: 'PREPARED',
      },
    });

    this.logger.log(
      `Prepared TaxPeriod ${id}: outputTax=${outputTax} inputTax=${inputTax} net=${netTax}`,
    );

    return updated;
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. FILE — mark FILED; locks mutations (except controlled reopen)
  // ──────────────────────────────────────────────────────────────────

  async filePeriod(id: string, organizationId: string, userId: string) {
    const period = await this.findOrThrow(id, organizationId);

    if (period.status !== 'PREPARED' && period.status !== 'REOPENED') {
      throw new BadRequestException(
        `Period must be in PREPARED or REOPENED status to file. Current: ${period.status}`,
      );
    }

    return this.prisma.taxPeriod.update({
      where: { id },
      data: {
        status: 'FILED',
        filedAt: new Date(),
        filedById: userId,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. REOPEN
  // ──────────────────────────────────────────────────────────────────

  async reopenPeriod(id: string, organizationId: string, reason: string) {
    const period = await this.findOrThrow(id, organizationId);

    if (period.status !== 'FILED' && period.status !== 'CLOSED') {
      throw new BadRequestException(
        `Only FILED or CLOSED periods can be reopened. Current: ${period.status}`,
      );
    }

    this.logger.warn(`Reopening TaxPeriod ${id}. Reason: ${reason}`);

    return this.prisma.taxPeriod.update({
      where: { id },
      data: {
        status: 'REOPENED',
        notes: `[REOPENED] ${reason}\n\n${period.notes ?? ''}`.trim(),
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────

  private async findOrThrow(id: string, organizationId: string) {
    const period = await this.prisma.taxPeriod.findFirst({
      where: { id, organizationId },
    });
    if (!period) throw new NotFoundException('TaxPeriod not found');
    return period;
  }
}
