import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderLineDto } from './create-order-line.dto';

export class CreateOrderDto {
  @IsUUID('4', { message: 'entityId must be a valid UUID' })
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @IsUUID('4', { message: 'vendorId must be a valid UUID' })
  @IsNotEmpty({ message: 'vendorId is required' })
  vendorId: string;

  @IsDateString({}, { message: 'orderDate must be an ISO 8601 date string' })
  @IsNotEmpty({ message: 'orderDate is required' })
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'lines must be an array of order lines' })
  @ArrayMinSize(1, { message: 'A Purchase Order must contain at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines: CreateOrderLineDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines?: CreateOrderLineDto[];
}
