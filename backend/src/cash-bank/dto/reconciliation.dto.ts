import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateReconciliationDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  cashBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  periodStart: string;

  @IsString()
  @IsNotEmpty()
  periodEnd: string;

  @IsNumber()
  statementOpeningBalance: number;

  @IsNumber()
  statementClosingBalance: number;
}

export class MatchStatementLineDto {
  @IsString()
  @IsNotEmpty()
  statementLineId: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsString()
  @IsOptional()
  journalEntryId?: string;

  @IsNumber()
  @IsOptional()
  matchedAmount?: number;

  @IsString()
  @IsOptional()
  matchType?: string;
}

export class UnmatchStatementLineDto {
  @IsString()
  @IsNotEmpty()
  statementLineId: string;
}
