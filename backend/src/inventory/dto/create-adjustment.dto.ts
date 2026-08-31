import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockAdjustmentType } from '@prisma/client';

export class StockAdjustmentLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;
}

export class CreateStockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsDateString()
  adjustmentDate: string;

  @IsEnum(StockAdjustmentType)
  adjustmentType: StockAdjustmentType;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentLineDto)
  lines: StockAdjustmentLineDto[];
}
