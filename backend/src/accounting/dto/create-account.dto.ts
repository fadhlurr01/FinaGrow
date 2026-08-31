import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountType, AccountSubtype } from '@prisma/client';

export class CreateAccountDto {
  @IsUUID('4', { message: 'entityId must be a valid UUID' })
  @IsNotEmpty({ message: 'entityId is required' })
  entityId: string;

  @IsString()
  @IsNotEmpty({ message: 'Account code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Account name is required' })
  name: string;

  @IsEnum(AccountType, { message: 'type must be ASSET, LIABILITY, EQUITY, REVENUE, or EXPENSE' })
  @IsNotEmpty({ message: 'Account type is required' })
  type: AccountType;

  @IsOptional()
  @IsEnum(AccountSubtype, { message: 'Invalid account subtype' })
  subtype?: AccountSubtype;

  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
