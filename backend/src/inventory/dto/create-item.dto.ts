import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ItemType, ValuationMethod } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

  @IsString()
  @IsOptional()
  unitOfMeasureId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;

  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @IsString()
  @IsOptional()
  salesAccountId?: string;

  @IsString()
  @IsOptional()
  purchaseAccountId?: string;

  @IsEnum(ValuationMethod)
  @IsOptional()
  valuationMethod?: ValuationMethod;

  @IsBoolean()
  @IsOptional()
  isInventoryTracked?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;
}

export class UpdateInventoryItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  unitOfMeasureId?: string;

  @IsString()
  @IsOptional()
  inventoryAccountId?: string;

  @IsString()
  @IsOptional()
  cogsAccountId?: string;

  @IsString()
  @IsOptional()
  salesAccountId?: string;

  @IsString()
  @IsOptional()
  purchaseAccountId?: string;

  @IsBoolean()
  @IsOptional()
  isInventoryTracked?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ItemFilterDto {
  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

  @IsBoolean()
  @IsOptional()
  activeOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  lowStockOnly?: boolean;
}
