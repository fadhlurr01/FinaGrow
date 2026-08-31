// ===================================================================
// Phase 8 — TaxEngineService
// Pure calculation core: resolves versioned TaxRule and computes
// DPP / tax amounts using Decimal arithmetic. No GL side effects.
// ===================================================================
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TaxCalculationMethod, TaxRoundingMethod } from '@prisma/client';

export interface TaxCalculationResult {
  taxCodeId: string;
  taxRuleId: string;
  taxCodeCode: string;
  taxCodeName: string;
  taxType: string;
  direction: string;
  legalRate: Decimal;
  dppFactor: Decimal;
  baseAmount: Decimal;
  /** DPP = baseAmount * dppFactor */
  dppAmount: Decimal;
  /** taxAmount = dppAmount * legalRate  (rounded) */
  taxAmount: Decimal;
  calculationMethod: string;
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────
  // 1. RESOLVE EFFECTIVE TAX RULE BY DATE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Returns the active TaxRule for a TaxCode on a given date.
   * Selects the rule with validFrom <= transactionDate AND
   * (validTo IS NULL OR validTo >= transactionDate).
   * If multiple match, picks the most-recently-started one.
   */
  async getEffectiveTaxRule(taxCodeId: string, transactionDate: Date) {
    const date = transactionDate;

    const rule = await this.prisma.taxRule.findFirst({
      where: {
        taxCodeId,
        isActive: true,
        validFrom: { lte: date },
        OR: [{ validTo: null }, { validTo: { gte: date } }],
      },
      orderBy: { validFrom: 'desc' },
      include: { taxCode: true },
    });

    if (!rule) {
      throw new NotFoundException(
        `No active TaxRule found for TaxCode ${taxCodeId} on date ${date.toISOString().split('T')[0]}`,
      );
    }

    return rule;
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. COMPUTE TAX (Decimal arithmetic — no floating point)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Calculates tax for a given amount using the effective rule on transactionDate.
   * DPP = baseAmount * dppFactor
   * taxAmount = round(DPP * legalRate)
   */
  async calculateTax(
    taxCodeId: string,
    transactionDate: Date,
    baseAmount: Decimal,
    organizationId: string,
  ): Promise<TaxCalculationResult> {
    if (baseAmount.isNegative()) {
      throw new BadRequestException('baseAmount must be non-negative');
    }

    const rule = await this.getEffectiveTaxRule(taxCodeId, transactionDate);
    const taxCode = rule.taxCode;

    // Verify org-level ownership
    if (taxCode.organizationId !== organizationId) {
      throw new BadRequestException('TaxCode does not belong to this organization');
    }

    const base = new Decimal(baseAmount);
    const legalRate = new Decimal(rule.legalRate);
    const dppFactor = new Decimal(rule.dppFactor);

    let dppAmount: Decimal;
    let taxAmount: Decimal;

    switch (rule.calculationMethod as TaxCalculationMethod) {
      case 'PERCENT_OF_BASE':
        dppAmount = base;
        taxAmount = base.times(legalRate);
        break;

      case 'RATE_TIMES_DPP_FACTOR':
        // Indonesian Standard VAT: effective rate = legalRate * dppFactor
        // e.g. 0.12 * (11/12) = 0.11 → tax = base * 0.11
        dppAmount = base.times(dppFactor);
        taxAmount = base.times(legalRate).times(dppFactor);
        break;

      case 'FIXED_AMOUNT':
        dppAmount = base;
        taxAmount = legalRate; // fixed amount in legalRate field
        break;

      default:
        dppAmount = base;
        taxAmount = base.times(legalRate);
    }

    // Apply rounding
    taxAmount = this.applyRounding(taxAmount, rule.roundingMethod as TaxRoundingMethod);

    this.logger.debug(
      `calculateTax: code=${taxCode.code} base=${base} dppFactor=${dppFactor} ` +
        `legalRate=${legalRate} dpp=${dppAmount} tax=${taxAmount}`,
    );

    return {
      taxCodeId,
      taxRuleId: rule.id,
      taxCodeCode: taxCode.code,
      taxCodeName: taxCode.name,
      taxType: taxCode.taxType,
      direction: taxCode.direction,
      legalRate,
      dppFactor,
      baseAmount: base,
      dppAmount,
      taxAmount,
      calculationMethod: rule.calculationMethod,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. ROUNDING
  // ──────────────────────────────────────────────────────────────────

  private applyRounding(amount: Decimal, method: TaxRoundingMethod): Decimal {
    switch (method) {
      case 'ROUND_HALF_UP':
        return amount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
      case 'ROUND_DOWN':
        return amount.toDecimalPlaces(0, Decimal.ROUND_DOWN);
      case 'ROUND_UP':
        return amount.toDecimalPlaces(0, Decimal.ROUND_UP);
      default:
        return amount.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. TAX CODE CRUD
  // ──────────────────────────────────────────────────────────────────

  async getTaxCodes(organizationId: string, entityId?: string) {
    return this.prisma.taxCode.findMany({
      where: {
        organizationId,
        ...(entityId ? { OR: [{ entityId }, { entityId: null }] } : {}),
      },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: { validFrom: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ taxType: 'asc' }, { code: 'asc' }],
    });
  }

  async getTaxCode(id: string, organizationId: string) {
    const code = await this.prisma.taxCode.findFirst({
      where: { id, organizationId },
      include: {
        rules: { orderBy: { validFrom: 'desc' } },
      },
    });
    if (!code) throw new NotFoundException('TaxCode not found');
    return code;
  }

  async createTaxCode(organizationId: string, dto: any) {
    const existing = await this.prisma.taxCode.findFirst({
      where: { organizationId, code: dto.code },
    });
    if (existing) throw new BadRequestException(`TaxCode with code '${dto.code}' already exists`);

    return this.prisma.taxCode.create({
      data: {
        organizationId,
        entityId: dto.entityId ?? null,
        code: dto.code,
        name: dto.name,
        taxType: dto.taxType,
        direction: dto.direction,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTaxCode(id: string, organizationId: string, dto: any) {
    await this.getTaxCode(id, organizationId);
    return this.prisma.taxCode.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. TAX RULE CRUD
  // ──────────────────────────────────────────────────────────────────

  async createTaxRule(organizationId: string, dto: any) {
    // Validate taxCode belongs to org
    const taxCode = await this.prisma.taxCode.findFirst({
      where: { id: dto.taxCodeId, organizationId },
    });
    if (!taxCode) throw new NotFoundException('TaxCode not found');

    return this.prisma.taxRule.create({
      data: {
        taxCodeId: dto.taxCodeId,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        legalRate: new Decimal(dto.legalRate),
        dppFactor: dto.dppFactor != null ? new Decimal(dto.dppFactor) : new Decimal(1),
        calculationMethod: dto.calculationMethod ?? 'PERCENT_OF_BASE',
        roundingMethod: dto.roundingMethod ?? 'ROUND_HALF_UP',
        notes: dto.notes,
      },
    });
  }
}
