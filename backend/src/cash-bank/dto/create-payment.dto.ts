import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class PaymentAllocationDto {
  @IsString()
  @IsOptional()
  salesInvoiceId?: string;

  @IsString()
  @IsOptional()
  vendorBillId?: string;

  @IsNumber()
  @Min(0.0001)
  allocatedAmount: number;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsString()
  @IsNotEmpty()
  cashBankAccountId: string;

  @IsString()
  @IsOptional()
  toCashBankAccountId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @IsNumber()
  @Min(0.0001)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  externalReference?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  @IsOptional()
  allocations?: PaymentAllocationDto[];
}

export class UpdatePaymentDto {
  @IsString()
  @IsOptional()
  cashBankAccountId?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;

  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  @IsOptional()
  allocations?: PaymentAllocationDto[];
}

export class PaymentFilterDto {
  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  cashBankAccountId?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
