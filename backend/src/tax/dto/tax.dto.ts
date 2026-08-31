// ===================================================================
// Phase 8 — Tax Engine DTOs
// ===================================================================
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Enums (re-exported for convenience) ───────────────────────────
export enum TaxTypeDto {
  VAT = 'VAT',
  PPH23 = 'PPH23',
  PPH4_2 = 'PPH4_2',
  PPH21 = 'PPH21',
  PPH26 = 'PPH26',
  PPNBM = 'PPNBM',
  OTHER = 'OTHER',
}

export enum TaxDirectionDto {
  OUTPUT = 'OUTPUT',
  INPUT = 'INPUT',
  WITHHOLDING_PAYABLE = 'WITHHOLDING_PAYABLE',
  WITHHOLDING_RECEIVABLE = 'WITHHOLDING_RECEIVABLE',
}

export enum TaxCalculationMethodDto {
  PERCENT_OF_BASE = 'PERCENT_OF_BASE',
  RATE_TIMES_DPP_FACTOR = 'RATE_TIMES_DPP_FACTOR',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  SPECIAL_FORMULA = 'SPECIAL_FORMULA',
}

export enum TaxRoundingMethodDto {
  ROUND_HALF_UP = 'ROUND_HALF_UP',
  ROUND_DOWN = 'ROUND_DOWN',
  ROUND_UP = 'ROUND_UP',
}

// ─── TaxCode DTOs ──────────────────────────────────────────────────

export class CreateTaxCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TaxTypeDto)
  taxType: TaxTypeDto;

  @IsEnum(TaxDirectionDto)
  direction: TaxDirectionDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxCodeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── TaxRule DTOs ──────────────────────────────────────────────────

export class CreateTaxRuleDto {
  @IsString()
  @IsNotEmpty()
  taxCodeId: string;

  @IsDateString()
  validFrom: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  /** e.g. 0.12 for 12% legal rate */
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  legalRate: number;

  /**
   * DPP factor:
   *  1.0   = full DPP (standard method for most taxes)
   *  11/12 = for Indonesian standard VAT (non-luxury)
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(1)
  dppFactor?: number;

  @IsOptional()
  @IsEnum(TaxCalculationMethodDto)
  calculationMethod?: TaxCalculationMethodDto;

  @IsOptional()
  @IsEnum(TaxRoundingMethodDto)
  roundingMethod?: TaxRoundingMethodDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── TaxCalculation Preview DTO ────────────────────────────────────

export class TaxCalculationRequestDto {
  @IsString()
  @IsNotEmpty()
  taxCodeId: string;

  @IsDateString()
  transactionDate: string;

  /** Base amount (before DPP adjustment) */
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  baseAmount: number;

  @IsOptional()
  @IsString()
  entityId?: string;
}

// ─── TaxTransaction Filter ─────────────────────────────────────────

export class TaxTransactionFilterDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  taxCodeId?: string;

  @IsOptional()
  @IsEnum(TaxTypeDto)
  taxType?: TaxTypeDto;

  @IsOptional()
  @IsEnum(TaxDirectionDto)
  direction?: TaxDirectionDto;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  periodMonth?: number;
}

// ─── TaxPeriod DTOs ────────────────────────────────────────────────

export class GetOrCreateTaxPeriodDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsEnum(TaxTypeDto)
  taxType: TaxTypeDto;

  @IsNumber()
  @Min(2000)
  @Max(2100)
  periodYear: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  periodMonth: number;
}

export class TaxPeriodFilterDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(TaxTypeDto)
  taxType?: TaxTypeDto;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  periodYear?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  periodMonth?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ReopenTaxPeriodDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// ─── TaxDocument DTOs ──────────────────────────────────────────────

export class CreateTaxDocumentDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  taxPeriodId?: string;

  @IsOptional()
  @IsString()
  taxCodeId?: string;

  @IsOptional()
  @IsString()
  taxTransactionId?: string;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  counterpartyNpwp?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxableBase: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── TaxPayment DTOs ───────────────────────────────────────────────

export class CreateTaxPaymentDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  taxPeriodId: string;

  @IsDateString()
  paymentDate: string;

  @IsEnum(TaxTypeDto)
  taxType: TaxTypeDto;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  cashBankAccountId: string;

  @IsOptional()
  @IsString()
  ntpn?: string;

  @IsOptional()
  @IsString()
  sspNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TaxPaymentFilterDto {
  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(TaxTypeDto)
  taxType?: TaxTypeDto;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
