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
import { PurchasesService } from './purchases.service';
import { VendorsService } from './vendors.service';
import { OrdersService } from './orders.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CreateOrderDto, UpdateOrderDto } from './dto/create-order.dto';
import { CreateBillDto, UpdateBillDto } from './dto/create-bill.dto';
import { OrderFilterDto, BillFilterDto, APFilterDto } from './dto/order-filter.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/purchases')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class PurchasesController {
  constructor(
    private purchasesService: PurchasesService,
    private vendorsService: VendorsService,
    private ordersService: OrdersService,
  ) {}

  // ==========================================
  // VENDOR ENDPOINTS
  // ==========================================

  @Get('vendors')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getVendors(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActive = activeOnly !== undefined ? activeOnly === 'true' : undefined;
    return this.vendorsService.getVendors(organizationId, entityId, search, isActive);
  }

  @Get('vendors/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getVendorById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.vendorsService.getVendorById(id, organizationId);
  }

  @Post('vendors')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createVendor(
    @Body() dto: CreateVendorDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorsService.createVendor(dto, organizationId, userId);
  }

  @Patch('vendors/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateVendor(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorsService.updateVendor(id, dto, organizationId, userId);
  }

  @Post('vendors/:id/deactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  async deactivateVendor(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vendorsService.deactivateVendor(id, organizationId, userId);
  }

  // ==========================================
  // PURCHASE ORDER ENDPOINTS
  // ==========================================

  @Get('orders')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getOrders(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: OrderFilterDto,
  ) {
    return this.ordersService.getOrders(organizationId, filter);
  }

  @Get('orders/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getOrderById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.ordersService.getOrderById(id, organizationId);
  }

  @Post('orders')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.createOrder(dto, organizationId, userId);
  }

  @Patch('orders/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.updateOrder(id, dto, organizationId, userId);
  }

  @Post('orders/:id/approve')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async approveOrder(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.approveOrder(id, organizationId, userId);
  }

  @Post('orders/:id/cancel')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async cancelOrder(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.cancelOrder(id, organizationId, userId);
  }

  @Post('orders/:id/create-bill')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createBillFromPO(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.createBillFromPO(id, organizationId, userId);
  }

  // ==========================================
  // VENDOR BILL ENDPOINTS
  // ==========================================

  @Get('bills')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getBills(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: BillFilterDto,
  ) {
    return this.purchasesService.getBills(organizationId, filter);
  }

  @Get('bills/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getBillById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.purchasesService.getBillById(id, organizationId);
  }

  @Post('bills')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createBill(
    @Body() dto: CreateBillDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.createBill(dto, organizationId, userId);
  }

  @Patch('bills/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateBill(
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.updateBill(id, dto, organizationId, userId);
  }

  @Post('bills/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postBill(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.postBill(id, organizationId, userId);
  }

  @Post('bills/:id/cancel')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async cancelBill(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.purchasesService.cancelBill(id, organizationId, userId);
  }

  // ==========================================
  // AP & RECONCILIATION ENDPOINTS
  // ==========================================

  @Get('ap/summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAPSummary(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: APFilterDto,
  ) {
    return this.purchasesService.getAPSummary(organizationId, filter);
  }

  @Get('ap/aging')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAPAging(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: APFilterDto,
  ) {
    return this.purchasesService.getAPAging(organizationId, filter);
  }

  @Get('ap/reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async getAPControlReconciliation(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
  ) {
    return this.purchasesService.getAPControlReconciliation(organizationId, entityId);
  }
}
