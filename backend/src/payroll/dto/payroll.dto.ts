import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollRunDto {
  @IsUUID('4')
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  payPeriod: string; // e.g. "July 2024", "2026-08"

  @IsDateString()
  @IsNotEmpty()
  runDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalGross?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalTaxes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalNet?: number;

  @IsOptional()
  @IsString()
  status?: string; // 'Scheduled', 'In Progress', 'Completed', 'Cancelled'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  employeeCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayrollRunDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalGross?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalTaxes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalNet?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayrollEmployeeDto {
  @IsUUID('4')
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowances?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allowances?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
