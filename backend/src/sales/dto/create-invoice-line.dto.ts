import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineDto {
  @IsString()
  @IsNotEmpty({ message: 'Line description is required' })
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001, { message: 'quantity must be greater than zero' })
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'unitPrice must be non-negative' })
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsUUID('4', { message: 'revenueAccountId must be a valid UUID' })
  revenueAccountId?: string;
}
