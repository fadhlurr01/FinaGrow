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

export class DeliveryLineDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsOptional()
  salesInvoiceLineId?: string;

  @IsNumber()
  @Min(0.0001)
  quantityDelivered: number;
}

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  salesInvoiceId?: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsDateString()
  deliveryDate: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryLineDto)
  lines: DeliveryLineDto[];
}
