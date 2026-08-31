import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { DepreciationMethod, AssetStatus } from '@prisma/client';

export class CreateFixedAssetDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  acquisitionDate: string;

  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  residualValue?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  usefulLifeMonths?: number;

  @IsEnum(DepreciationMethod)
  @IsOptional()
  depreciationMethod?: DepreciationMethod;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorBillId?: string;

  @IsString()
  @IsOptional()
  vendorBillLineId?: string;

  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  custodian?: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class UpdateFixedAssetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  custodian?: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class CapitalizeFixedAssetDto {
  @IsDateString()
  @IsNotEmpty()
  capitalizationDate: string;

  @IsDateString()
  @IsOptional()
  depreciationStartDate?: string;

  @IsString()
  @IsOptional()
  creditAccountId?: string; // If direct capitalization outside Vendor Bill (e.g. Bank / AP)
}
