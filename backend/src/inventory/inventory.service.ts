import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ValuationService } from './valuation.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  ItemFilterDto,
} from './dto/create-item.dto';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from './dto/create-warehouse.dto';
import {
  ItemType,
  AccountType,
  JournalEntryStatus,
  StockMovementStatus,
  StockMovementType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private valuationService: ValuationService,
  ) {}

  // ==========================================
  // ITEMS MASTER
  // ==========================================

  async getItems(organizationId: string, filter: ItemFilterDto) {
    const where: any = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.itemType) where.itemType = filter.itemType;
    if (filter.activeOnly !== undefined) where.isActive = filter.activeOnly;

    if (filter.search) {
      where.OR = [
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        unitOfMeasure: true,
        inventoryAccount: { select: { id: true, code: true, name: true } },
        cogsAccount: { select: { id: true, code: true, name: true } },
        salesAccount: { select: { id: true, code: true, name: true } },
      },
      orderBy: { sku: 'asc' },
    });

    // Attach real-time stock balances
    const itemsWithBalance = await Promise.all(
      items.map(async (item) => {
        if (!item.isInventoryTracked || item.itemType !== ItemType.INVENTORY) {
          return {
            ...item,
            quantityOnHand: 0,
            inventoryValue: 0,
            averageCost: 0,
            isLowStock: false,
          };
        }

        const bal = await this.valuationService.getInventoryBalance(item.id);
        const isLowStock = bal.quantityOnHand.lte(item.reorderLevel);

        return {
          ...item,
          quantityOnHand: bal.quantityOnHand.toNumber(),
          inventoryValue: bal.inventoryValue.toNumber(),
          averageCost: bal.averageCost.toNumber(),
          isLowStock,
        };
      }),
    );

    if (filter.lowStockOnly) {
      return itemsWithBalance.filter((i) => i.isLowStock);
    }

    return itemsWithBalance;
  }

  async getItemById(id: string, organizationId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        unitOfMeasure: true,
        inventoryAccount: true,
        cogsAccount: true,
        salesAccount: true,
        purchaseAccount: true,
      },
    });

    if (!item || item.organizationId !== organizationId) {
      throw new NotFoundException('Inventory Item not found.');
    }

    const bal = await this.valuationService.getInventoryBalance(item.id);

    return {
      ...item,
      quantityOnHand: bal.quantityOnHand.toNumber(),
      inventoryValue: bal.inventoryValue.toNumber(),
      averageCost: bal.averageCost.toNumber(),
      isLowStock: bal.quantityOnHand.lte(item.reorderLevel),
    };
  }

  async createItem(
    dto: CreateInventoryItemDto,
    organizationId: string,
    userId: string,
  ) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Invalid entity selection.');
    }

    // Check SKU uniqueness
    const existing = await this.prisma.inventoryItem.findUnique({
      where: {
        entityId_sku: {
          entityId: dto.entityId,
          sku: dto.sku.trim().toUpperCase(),
        },
      },
    });
    if (existing) {
      throw new BadRequestException(`SKU '${dto.sku}' already exists in this entity.`);
    }

    // Validate account overrides if provided
    if (dto.inventoryAccountId) {
      const invAcc = await this.prisma.account.findUnique({ where: { id: dto.inventoryAccountId } });
      if (!invAcc || invAcc.organizationId !== organizationId || invAcc.entityId !== dto.entityId || invAcc.type !== AccountType.ASSET) {
        throw new BadRequestException('Inventory Account override must be an active ASSET account of this entity.');
      }
    }
    if (dto.cogsAccountId) {
      const cogsAcc = await this.prisma.account.findUnique({ where: { id: dto.cogsAccountId } });
      if (!cogsAcc || cogsAcc.organizationId !== organizationId || cogsAcc.entityId !== dto.entityId || cogsAcc.type !== AccountType.EXPENSE) {
        throw new BadRequestException('COGS Account override must be an active EXPENSE account of this entity.');
      }
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        categoryId: dto.categoryId,
        itemType: dto.itemType || ItemType.INVENTORY,
        unitOfMeasureId: dto.unitOfMeasureId,
        inventoryAccountId: dto.inventoryAccountId,
        cogsAccountId: dto.cogsAccountId,
        salesAccountId: dto.salesAccountId,
        purchaseAccountId: dto.purchaseAccountId,
        valuationMethod: dto.valuationMethod || 'FIFO',
        isInventoryTracked: dto.isInventoryTracked !== undefined ? dto.isInventoryTracked : true,
        reorderLevel: new Decimal(dto.reorderLevel || 0),
        sellingPrice: new Decimal(dto.sellingPrice || 0),
        purchasePrice: new Decimal(dto.purchasePrice || 0),
      },
      include: {
        category: true,
        unitOfMeasure: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'INVENTORY_ITEM_CREATED',
      resourceType: 'InventoryItem',
      resourceId: item.id,
      metadata: { sku: item.sku, name: item.name },
    });

    return item;
  }

  async updateItem(
    id: string,
    dto: UpdateInventoryItemDto,
    organizationId: string,
    userId: string,
  ) {
    const item = await this.getItemById(id, organizationId);

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        unitOfMeasureId: dto.unitOfMeasureId !== undefined ? dto.unitOfMeasureId : undefined,
        inventoryAccountId: dto.inventoryAccountId !== undefined ? dto.inventoryAccountId : undefined,
        cogsAccountId: dto.cogsAccountId !== undefined ? dto.cogsAccountId : undefined,
        salesAccountId: dto.salesAccountId !== undefined ? dto.salesAccountId : undefined,
        purchaseAccountId: dto.purchaseAccountId !== undefined ? dto.purchaseAccountId : undefined,
        reorderLevel: dto.reorderLevel !== undefined ? new Decimal(dto.reorderLevel) : undefined,
        sellingPrice: dto.sellingPrice !== undefined ? new Decimal(dto.sellingPrice) : undefined,
        purchasePrice: dto.purchasePrice !== undefined ? new Decimal(dto.purchasePrice) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'INVENTORY_ITEM_UPDATED',
      resourceType: 'InventoryItem',
      resourceId: updated.id,
      metadata: { sku: updated.sku },
    });

    return updated;
  }

  async deactivateItem(id: string, organizationId: string, userId: string) {
    const item = await this.getItemById(id, organizationId);
    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'INVENTORY_ITEM_DEACTIVATED',
      resourceType: 'InventoryItem',
      resourceId: updated.id,
      metadata: { sku: updated.sku },
    });

    return { message: 'Inventory item deactivated successfully.', item: updated };
  }

  // ==========================================
  // WAREHOUSES
  // ==========================================

  async getWarehouses(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.warehouse.findMany({
      where,
      include: {
        locations: true,
        _count: { select: { movements: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createWarehouse(
    dto: CreateWarehouseDto,
    organizationId: string,
    userId: string,
  ) {
    const entity = await this.prisma.entity.findUnique({ where: { id: dto.entityId } });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Invalid entity selection.');
    }

    const existing = await this.prisma.warehouse.findUnique({
      where: {
        entityId_code: {
          entityId: dto.entityId,
          code: dto.code.trim().toUpperCase(),
        },
      },
    });
    if (existing) {
      throw new BadRequestException(`Warehouse code '${dto.code}' already exists.`);
    }

    const wh = await this.prisma.warehouse.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        address: dto.address?.trim(),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'WAREHOUSE_CREATED',
      resourceType: 'Warehouse',
      resourceId: wh.id,
      metadata: { code: wh.code, name: wh.name },
    });

    return wh;
  }

  // ==========================================
  // STOCK CARD QUERY
  // ==========================================

  async getStockCard(
    organizationId: string,
    itemId: string,
    warehouseId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const item = await this.getItemById(itemId, organizationId);

    const where: any = {
      organizationId,
      itemId,
      status: StockMovementStatus.POSTED,
    };

    if (warehouseId) where.warehouseId = warehouseId;
    if (dateFrom || dateTo) {
      where.movementDate = {};
      if (dateFrom) where.movementDate.gte = new Date(dateFrom);
      if (dateTo) where.movementDate.lte = new Date(dateTo);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });

    let runningQty = new Decimal(0);
    let runningVal = new Decimal(0);

    const cardLines = movements.map((m) => {
      const isIncrease = (
        [
          StockMovementType.OPENING,
          StockMovementType.PURCHASE_RECEIPT,
          StockMovementType.TRANSFER_IN,
          StockMovementType.ADJUSTMENT_IN,
          StockMovementType.RETURN_IN,
        ] as StockMovementType[]
      ).includes(m.movementType);

      const qty = m.quantity;
      const totalCost = m.totalCost;

      if (isIncrease) {
        runningQty = runningQty.plus(qty);
        runningVal = runningVal.plus(totalCost);
      } else {
        runningQty = runningQty.minus(qty);
        runningVal = runningVal.minus(totalCost);
      }

      return {
        id: m.id,
        movementDate: m.movementDate,
        movementNumber: m.movementNumber,
        movementType: m.movementType,
        reference: m.reference,
        warehouse: m.warehouse,
        inQuantity: isIncrease ? qty.toNumber() : 0,
        outQuantity: isIncrease ? 0 : qty.toNumber(),
        unitCost: m.unitCost.toNumber(),
        totalCost: totalCost.toNumber(),
        runningQuantity: runningQty.toNumber(),
        runningValue: Decimal.max(0, runningVal).toNumber(),
      };
    });

    return {
      item,
      lines: cardLines,
      closingQuantity: runningQty.toNumber(),
      closingValue: Decimal.max(0, runningVal).toNumber(),
    };
  }

  // ==========================================
  // INVENTORY VALUATION REPORT
  // ==========================================

  async getValuationReport(organizationId: string, entityId?: string, warehouseId?: string) {
    const where: any = {
      organizationId,
      itemType: ItemType.INVENTORY,
      isActive: true,
    };
    if (entityId) where.entityId = entityId;

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        unitOfMeasure: true,
      },
      orderBy: { sku: 'asc' },
    });

    let totalValuation = new Decimal(0);

    const itemReports = await Promise.all(
      items.map(async (item) => {
        const bal = await this.valuationService.getInventoryBalance(item.id, warehouseId);
        totalValuation = totalValuation.plus(bal.inventoryValue);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category?.name || 'General',
          unit: item.unitOfMeasure?.code || 'PCS',
          valuationMethod: item.valuationMethod,
          quantityOnHand: bal.quantityOnHand.toNumber(),
          averageCost: bal.averageCost.toNumber(),
          inventoryValue: bal.inventoryValue.toNumber(),
        };
      }),
    );

    return {
      totalValuation: totalValuation.toNumber(),
      items: itemReports,
    };
  }

  // ==========================================
  // INVENTORY-TO-GL RECONCILIATION
  // ==========================================

  async getInventoryReconciliation(organizationId: string, entityId: string) {
    // 1. Calculate sub-ledger inventory layer value
    const valReport = await this.getValuationReport(organizationId, entityId);
    const subledgerValue = new Decimal(valReport.totalValuation);

    // 2. Fetch Entity Inventory Control Account from settings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId },
    });

    if (!settings || !settings.inventoryAccountId) {
      return {
        subledgerValue: subledgerValue.toNumber(),
        glBalance: 0,
        difference: subledgerValue.toNumber(),
        isReconciled: false,
        warning: 'Inventory Control Account not configured in Entity Accounting Settings.',
      };
    }

    // 3. Calculate GL Inventory Account balance (Sum Dr - Sum Cr for POSTED journals)
    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: settings.inventoryAccountId,
        journalEntry: {
          organizationId,
          status: JournalEntryStatus.POSTED,
        },
      },
      select: { debit: true, credit: true },
    });

    let glBalance = new Decimal(0);
    for (const line of glLines) {
      glBalance = glBalance.plus(line.debit).minus(line.credit);
    }

    const difference = subledgerValue.minus(glBalance);

    return {
      subledgerValue: subledgerValue.toNumber(),
      glBalance: glBalance.toNumber(),
      difference: difference.toNumber(),
      isReconciled: difference.isZero(),
    };
  }

  // ==========================================
  // GRNI (GOODS RECEIVED NOT INVOICED) RECONCILIATION
  // ==========================================

  async getGrniReconciliation(organizationId: string, entityId: string) {
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId },
    });

    if (!settings || !settings.grniAccountId) {
      return {
        unbilledReceiptsValue: 0,
        glGrniBalance: 0,
        difference: 0,
        isReconciled: false,
        warning: 'GRNI Clearing Account not configured in Entity Accounting Settings.',
      };
    }

    // 1. Calculate unbilled goods receipt lines
    const receiptLines = await this.prisma.goodsReceiptLine.findMany({
      where: {
        goodsReceipt: {
          organizationId,
          entityId,
          status: 'POSTED',
        },
      },
      include: {
        vendorBillLines: {
          where: { vendorBill: { status: { not: 'CANCELLED' } } },
        },
      },
    });

    let unbilledValue = new Decimal(0);
    for (const line of receiptLines) {
      let billedQty = new Decimal(0);
      for (const bLine of line.vendorBillLines) {
        billedQty = billedQty.plus(bLine.quantity);
      }
      const unbilledQty = Decimal.max(0, line.quantityReceived.minus(billedQty));
      unbilledValue = unbilledValue.plus(unbilledQty.times(line.unitCost));
    }

    // 2. Calculate GL GRNI account balance (Credit normal balance)
    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: settings.grniAccountId,
        journalEntry: {
          organizationId,
          status: JournalEntryStatus.POSTED,
        },
      },
      select: { debit: true, credit: true },
    });

    let glGrniBalance = new Decimal(0);
    for (const line of glLines) {
      glGrniBalance = glGrniBalance.plus(line.credit).minus(line.debit);
    }

    const difference = unbilledValue.minus(glGrniBalance);

    return {
      unbilledReceiptsValue: unbilledValue.toNumber(),
      glGrniBalance: glGrniBalance.toNumber(),
      difference: difference.toNumber(),
      isReconciled: difference.isZero(),
    };
  }
}
