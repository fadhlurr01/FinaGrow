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

export class StockTransferLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateStockTransferDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsDateString()
  transferDate: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferLineDto)
  lines: StockTransferLineDto[];
}
