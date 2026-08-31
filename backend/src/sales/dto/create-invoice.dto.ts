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
import { CreateInvoiceLineDto } from './create-invoice-line.dto';

export class CreateInvoiceDto {
  @IsUUID('4', { message: 'entityId must be a valid UUID' })
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @IsUUID('4', { message: 'customerId must be a valid UUID' })
  @IsNotEmpty({ message: 'customerId is required' })
  customerId: string;

  @IsDateString({}, { message: 'invoiceDate must be an ISO 8601 date string' })
  @IsNotEmpty({ message: 'invoiceDate is required' })
  invoiceDate: string;

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
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'lines must be an array of invoice lines' })
  @ArrayMinSize(1, { message: 'An invoice must contain at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
