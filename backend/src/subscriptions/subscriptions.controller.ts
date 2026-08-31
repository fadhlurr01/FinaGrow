import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ChangePlanDto } from './dto/subscription.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/subscriptions')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getCurrentSubscription(@CurrentTenant('id') organizationId: string) {
    return this.subscriptionsService.getCurrentSubscription(organizationId);
  }

  @Post('change-plan')
  @Roles(Role.OWNER, Role.ADMIN)
  async changePlan(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(organizationId, dto, userId);
  }
}
