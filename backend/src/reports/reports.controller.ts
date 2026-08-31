import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/reports')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('profit-loss')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getProfitAndLoss(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getProfitAndLoss(organizationId, filter);
  }

  @Get('balance-sheet')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getBalanceSheet(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getBalanceSheet(organizationId, filter);
  }

  @Get('cash-flow')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getCashFlow(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getCashFlow(organizationId, filter);
  }

  @Get('ar-aging')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getArAging(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getArAging(organizationId, filter);
  }

  @Get('sales-by-customer')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getSalesByCustomer(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getSalesByCustomer(organizationId, filter);
  }

  @Get('ap-aging')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getApAging(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getApAging(organizationId, filter);
  }

  @Get('expenses-by-vendor')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getExpensesByVendor(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getExpensesByVendor(organizationId, filter);
  }

  @Get('vat-summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getVatSummary(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getVatSummary(organizationId, filter);
  }

  @Get('payroll-summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPayrollSummary(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getPayrollSummary(organizationId, filter);
  }
}
