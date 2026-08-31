import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
  CreatePayrollRunDto,
  UpdatePayrollRunDto,
  CreatePayrollEmployeeDto,
  UpdatePayrollEmployeeDto,
} from './dto/payroll.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/payroll')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  // ─── PAYROLL RUNS ───

  @Get('runs')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPayrollRuns(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.payrollService.getPayrollRuns(organizationId, entityId);
  }

  @Get('metrics')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getMetrics(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.payrollService.getMetrics(organizationId, entityId);
  }

  @Get('runs/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPayrollRunById(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getPayrollRunById(id, organizationId);
  }

  @Post('runs')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createPayrollRun(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.payrollService.createPayrollRun(organizationId, dto, userId);
  }

  @Patch('runs/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updatePayrollRun(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollRunDto,
  ) {
    return this.payrollService.updatePayrollRun(id, organizationId, dto, userId);
  }

  @Delete('runs/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async deletePayrollRun(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.deletePayrollRun(id, organizationId, userId);
  }

  // ─── EMPLOYEES ───

  @Get('employees')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getEmployees(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.payrollService.getEmployees(organizationId, entityId);
  }

  @Post('employees')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createEmployee(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayrollEmployeeDto,
  ) {
    return this.payrollService.createEmployee(organizationId, dto, userId);
  }

  @Patch('employees/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateEmployee(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollEmployeeDto,
  ) {
    return this.payrollService.updateEmployee(id, organizationId, dto, userId);
  }

  @Delete('employees/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async deleteEmployee(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.deleteEmployee(id, organizationId, userId);
  }
}
