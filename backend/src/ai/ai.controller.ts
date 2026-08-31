import {
  Controller,
  Post,
  Body,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { AIQueryDto } from './dto/ai-query.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@Controller('api/v1/ai')
@UseGuards(SessionAuthGuard, TenantGuard)
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('query')
  async processAIQuery(
    @Body() dto: AIQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') organizationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.aiService.processQuery(dto, userId, organizationId, ip, userAgent);
  }
}
