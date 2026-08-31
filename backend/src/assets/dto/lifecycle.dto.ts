import { IsInt, Min, Max, IsNotEmpty, IsDateString, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { DisposalType } from '@prisma/client';

export class CreateDepreciationRunDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;
}

export class CreateAssetMovementDto {
  @IsString()
  @IsNotEmpty()
  toLocation: string;

  @IsString()
  @IsOptional()
  toCustodian?: string;

  @IsDateString()
  @IsNotEmpty()
  movementDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateAssetDisposalDto {
  @IsDateString()
  @IsNotEmpty()
  disposalDate: string;

  @IsEnum(DisposalType)
  @IsNotEmpty()
  disposalType: DisposalType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  proceeds?: number;

  @IsString()
  @IsOptional()
  buyerId?: string;

  @IsString()
  @IsOptional()
  cashBankAccountId?: string;

  @IsString()
  @IsOptional()
  disposalReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
