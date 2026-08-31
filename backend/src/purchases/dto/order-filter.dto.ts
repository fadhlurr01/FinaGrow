import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PurchaseOrderStatus, VendorBillStatus, InvoicePostingStatus } from '@prisma/client';

export class OrderFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

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

export class BillFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsEnum(VendorBillStatus)
  status?: VendorBillStatus;

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

export class APFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
