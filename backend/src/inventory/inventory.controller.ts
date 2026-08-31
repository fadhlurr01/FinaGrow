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
import { InventoryService } from './inventory.service';
import { ReceiptsService } from './receipts.service';
import { DeliveriesService } from './deliveries.service';
import { TransfersService } from './transfers.service';
import { AdjustmentsService } from './adjustments.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  ItemFilterDto,
} from './dto/create-item.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateStockTransferDto } from './dto/create-transfer.dto';
import { CreateStockAdjustmentDto } from './dto/create-adjustment.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/inventory')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private receiptsService: ReceiptsService,
    private deliveriesService: DeliveriesService,
    private transfersService: TransfersService,
    private adjustmentsService: AdjustmentsService,
  ) {}

  // ==========================================
  // INVENTORY ITEMS
  // ==========================================

  @Get('items')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getItems(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ItemFilterDto,
  ) {
    return this.inventoryService.getItems(organizationId, filter);
  }

  @Get('items/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getItemById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.inventoryService.getItemById(id, organizationId);
  }

  @Post('items')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createItem(
    @Body() dto: CreateInventoryItemDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createItem(dto, organizationId, userId);
  }

  @Patch('items/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.updateItem(id, dto, organizationId, userId);
  }

  @Post('items/:id/deactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  async deactivateItem(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.deactivateItem(id, organizationId, userId);
  }

  // ==========================================
  // WAREHOUSES
  // ==========================================

  @Get('warehouses')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getWarehouses(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.inventoryService.getWarehouses(organizationId, entityId);
  }

  @Post('warehouses')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.createWarehouse(dto, organizationId, userId);
  }

  // ==========================================
  // GOODS RECEIPTS
  // ==========================================

  @Get('receipts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getReceipts(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.receiptsService.getReceipts(organizationId, entityId);
  }

  @Get('receipts/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getReceiptById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.receiptsService.getReceiptById(id, organizationId);
  }

  @Post('receipts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createReceipt(
    @Body() dto: CreateGoodsReceiptDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.receiptsService.createGoodsReceipt(dto, organizationId, userId);
  }

  @Post('receipts/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postReceipt(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.receiptsService.postGoodsReceipt(id, organizationId, userId);
  }

  @Post('receipts/:id/reverse')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async reverseReceipt(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.receiptsService.reverseGoodsReceipt(id, organizationId, userId);
  }

  // ==========================================
  // DELIVERIES
  // ==========================================

  @Get('deliveries')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getDeliveries(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.deliveriesService.getDeliveries(organizationId, entityId);
  }

  @Get('deliveries/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getDeliveryById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.deliveriesService.getDeliveryById(id, organizationId);
  }

  @Post('deliveries')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createDelivery(
    @Body() dto: CreateDeliveryDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveriesService.createDelivery(dto, organizationId, userId);
  }

  @Post('deliveries/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postDelivery(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveriesService.postDelivery(id, organizationId, userId);
  }

  @Post('deliveries/:id/reverse')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async reverseDelivery(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveriesService.reverseDelivery(id, organizationId, userId);
  }

  // ==========================================
  // TRANSFERS
  // ==========================================

  @Get('transfers')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTransfers(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.transfersService.getTransfers(organizationId, entityId);
  }

  @Post('transfers')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createTransfer(
    @Body() dto: CreateStockTransferDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.createTransfer(dto, organizationId, userId);
  }

  // ==========================================
  // ADJUSTMENTS
  // ==========================================

  @Get('adjustments')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAdjustments(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.adjustmentsService.getAdjustments(organizationId, entityId);
  }

  @Post('adjustments')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createAdjustment(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.adjustmentsService.createAdjustment(dto, organizationId, userId);
  }

  // ==========================================
  // REPORTS & RECONCILIATIONS
  // ==========================================

  @Get('stock-card')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getStockCard(
    @CurrentTenant('id') organizationId: string,
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.inventoryService.getStockCard(organizationId, itemId, warehouseId, dateFrom, dateTo);
  }

  @Get('valuation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getValuationReport(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getValuationReport(organizationId, entityId, warehouseId);
  }

  @Get('reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async getInventoryReconciliation(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
  ) {
    return this.inventoryService.getInventoryReconciliation(organizationId, entityId);
  }

  @Get('grni/reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async getGrniReconciliation(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
  ) {
    return this.inventoryService.getGrniReconciliation(organizationId, entityId);
  }
}
