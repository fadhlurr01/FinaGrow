import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
