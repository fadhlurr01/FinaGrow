import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SalesInvoiceStatus, InvoicePostingStatus } from '@prisma/client';

export class InvoiceFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsEnum(SalesInvoiceStatus)
  status?: SalesInvoiceStatus;

  @IsOptional()
  @IsEnum(InvoicePostingStatus)
  postingStatus?: InvoicePostingStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ARFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
