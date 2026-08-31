import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ChangePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['FREE', 'STARTER', 'PRO', 'ENTERPRISE', 'Free', 'Starter', 'Pro', 'Enterprise'])
  planCode: string;
}
