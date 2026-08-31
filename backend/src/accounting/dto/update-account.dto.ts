import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountType, AccountSubtype } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsEnum(AccountSubtype)
  subtype?: AccountSubtype;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
