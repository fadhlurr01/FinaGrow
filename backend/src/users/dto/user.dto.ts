import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, IsObject } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  newPassword?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  enabledModules?: Record<string, boolean>;
}
