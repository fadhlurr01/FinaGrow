import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  fromCashBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  toCashBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  transferDate: string;

  @IsNumber()
  @Min(0.0001)
  amount: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
