import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoodsReceiptLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsOptional()
  purchaseOrderLineId?: string;

  @IsNumber()
  @Min(0.0001)
  quantityReceived: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreateGoodsReceiptDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsDateString()
  receiptDate: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines: GoodsReceiptLineDto[];
}
