import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { DepreciationMethod } from '@prisma/client';

export class CreateAssetCategoryDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  fixedAssetAccountId: string;

  @IsString()
  @IsNotEmpty()
  accumulatedDepreciationAccountId: string;

  @IsString()
  @IsNotEmpty()
  depreciationExpenseAccountId: string;

  @IsString()
  @IsNotEmpty()
  gainOnDisposalAccountId: string;

  @IsString()
  @IsNotEmpty()
  lossOnDisposalAccountId: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  defaultUsefulLifeMonths?: number;

  @IsEnum(DepreciationMethod)
  @IsOptional()
  defaultDepreciationMethod?: DepreciationMethod;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultResidualValuePercent?: number;
}

export class UpdateAssetCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fixedAssetAccountId?: string;

  @IsString()
  @IsOptional()
  accumulatedDepreciationAccountId?: string;

  @IsString()
  @IsOptional()
  depreciationExpenseAccountId?: string;

  @IsString()
  @IsOptional()
  gainOnDisposalAccountId?: string;

  @IsString()
  @IsOptional()
  lossOnDisposalAccountId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  defaultUsefulLifeMonths?: number;

  @IsEnum(DepreciationMethod)
  @IsOptional()
  defaultDepreciationMethod?: DepreciationMethod;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultResidualValuePercent?: number;
}
