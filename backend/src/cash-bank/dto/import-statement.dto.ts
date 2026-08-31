import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class ImportStatementDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  cashBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  csvContent: string;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @IsNumber()
  @IsOptional()
  closingBalance?: number;
}
