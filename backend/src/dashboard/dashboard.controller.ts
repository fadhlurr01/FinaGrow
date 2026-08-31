import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/dashboard')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getSummary(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: DashboardFilterDto,
  ) {
    return this.dashboardService.getSummary(organizationId, filter);
  }

  @Get('revenue-expense')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getRevenueVsExpenses(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: DashboardFilterDto,
  ) {
    return this.dashboardService.getRevenueVsExpenses(organizationId, filter);
  }

  @Get('recent-transactions')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getRecentTransactions(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: DashboardFilterDto,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getRecentTransactions(organizationId, filter, limit ? Number(limit) : 15);
  }
}
