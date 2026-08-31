import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsUUID('4')
  @IsNotEmpty()
  entityId: string;

  @IsUUID('4')
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  period: string; // e.g. "2024-07", "2026-08"

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBudgetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BudgetFilterDto {
  @IsOptional()
  @IsUUID('4')
  entityId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsUUID('4')
  accountId?: string;
}
