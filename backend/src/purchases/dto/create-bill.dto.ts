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
import { CreateBillLineDto } from './create-bill-line.dto';

export class CreateBillDto {
  @IsUUID('4', { message: 'entityId must be a valid UUID' })
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @IsUUID('4', { message: 'vendorId must be a valid UUID' })
  @IsNotEmpty({ message: 'vendorId is required' })
  vendorId: string;

  @IsOptional()
  @IsUUID('4', { message: 'purchaseOrderId must be a valid UUID' })
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  vendorReference?: string;

  @IsDateString({}, { message: 'billDate must be an ISO 8601 date string' })
  @IsNotEmpty({ message: 'billDate is required' })
  billDate: string;

  @IsDateString({}, { message: 'dueDate must be an ISO 8601 date string' })
  @IsNotEmpty({ message: 'dueDate is required' })
  dueDate: string;

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
  notes?: string;

  @IsArray({ message: 'lines must be an array of bill lines' })
  @ArrayMinSize(1, { message: 'A Vendor Bill must contain at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines: CreateBillLineDto[];
}

export class UpdateBillDto {
  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsString()
  vendorReference?: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

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
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineDto)
  lines?: CreateBillLineDto[];
}
