import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJournalLineDto {
  @IsUUID('4', { message: 'accountId must be a valid UUID' })
  @IsNotEmpty({ message: 'accountId is required' })
  accountId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'debit must be a number' })
  @Min(0, { message: 'debit must be non-negative' })
  debit: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'credit must be a number' })
  @Min(0, { message: 'credit must be non-negative' })
  credit: number;
}
