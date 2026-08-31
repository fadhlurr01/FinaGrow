import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  periodPreset?: string; // e.g. "THIS_MONTH", "THIS_YEAR", "LAST_MONTH"
}
