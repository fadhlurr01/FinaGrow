import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalEntryStatus } from '@prisma/client';
import { CreateJournalLineDto } from './create-journal-line.dto';

export class CreateJournalEntryDto {
  @IsUUID('4', { message: 'entityId must be a valid UUID' })
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @IsDateString({}, { message: 'entryDate must be an ISO 8601 date string (e.g. 2026-08-30)' })
  @IsNotEmpty({ message: 'entryDate is required' })
  entryDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Journal description is required' })
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @IsArray({ message: 'lines must be an array of journal lines' })
  @ArrayMinSize(2, { message: 'A journal entry must contain at least 2 lines (debit and credit)' })
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];
}
