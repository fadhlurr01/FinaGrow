import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class LedgerFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsUUID('4')
  accountId?: string;

  @IsOptional()
  @IsString()
  accountCode?: string;

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

export class TrialBalanceFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
