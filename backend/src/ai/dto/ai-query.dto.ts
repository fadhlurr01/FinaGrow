import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AIQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Prompt query is required' })
  prompt: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}
