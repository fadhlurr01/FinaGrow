import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto, ARFilterDto } from './dto/invoice-filter.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/sales')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class SalesController {
  constructor(
    private salesService: SalesService,
    private customersService: CustomersService,
  ) {}

  // ==========================================
  // CUSTOMER ENDPOINTS
  // ==========================================

  @Get('customers')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getCustomers(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActive = activeOnly !== undefined ? activeOnly === 'true' : undefined;
    return this.customersService.getCustomers(organizationId, entityId, search, isActive);
  }

  @Get('customers/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getCustomerById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.customersService.getCustomerById(id, organizationId);
  }

  @Post('customers')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.createCustomer(dto, organizationId, userId);
  }

  @Patch('customers/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.updateCustomer(id, dto, organizationId, userId);
  }

  @Post('customers/:id/deactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  async deactivateCustomer(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customersService.deactivateCustomer(id, organizationId, userId);
  }

  // ==========================================
  // SALES INVOICE ENDPOINTS
  // ==========================================

  @Get('invoices')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getInvoices(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: InvoiceFilterDto,
  ) {
    return this.salesService.getInvoices(organizationId, filter);
  }

  @Get('invoices/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.salesService.getInvoiceById(id, organizationId);
  }

  @Post('invoices')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.createInvoice(dto, organizationId, userId);
  }

  @Patch('invoices/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.updateInvoice(id, dto, organizationId, userId);
  }

  @Post('invoices/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postInvoice(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.postInvoice(id, organizationId, userId);
  }

  @Post('invoices/:id/cancel')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async cancelInvoice(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.cancelInvoice(id, organizationId, userId);
  }

  // ==========================================
  // AR & RECONCILIATION ENDPOINTS
  // ==========================================

  @Get('ar/summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getARSummary(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ARFilterDto,
  ) {
    return this.salesService.getARSummary(organizationId, filter);
  }

  @Get('ar/aging')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getARAging(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ARFilterDto,
  ) {
    return this.salesService.getARAging(organizationId, filter);
  }

  @Get('ar/reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async getARControlReconciliation(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
  ) {
    return this.salesService.getARControlReconciliation(organizationId, entityId);
  }
}
