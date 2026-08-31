import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { CashBankAccountType } from '@prisma/client';

export class CreateCashBankAccountDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CashBankAccountType)
  @IsOptional()
  type?: CashBankAccountType;

  @IsString()
  @IsNotEmpty()
  coaAccountId: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;
}

export class UpdateCashBankAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(CashBankAccountType)
  @IsOptional()
  type?: CashBankAccountType;

  @IsString()
  @IsOptional()
  coaAccountId?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
