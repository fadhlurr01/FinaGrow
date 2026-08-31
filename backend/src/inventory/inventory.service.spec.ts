import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { ValuationService } from './valuation.service';
import { ReceiptsService } from './receipts.service';
import { DeliveriesService } from './deliveries.service';
import { TransfersService } from './transfers.service';
import { AdjustmentsService } from './adjustments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ItemType,
  ValuationMethod,
  GoodsReceiptStatus,
  DeliveryStatus,
  StockMovementType,
  StockMovementStatus,
  StockAdjustmentType,
  StockAdjustmentStatus,
  AccountType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Inventory, Valuation, GoodsReceipt, Delivery, Transfer & Adjustment (Phase 6 Perpetual Engine)', () => {
  let inventoryService: InventoryService;
  let valuationService: ValuationService;
  let receiptsService: ReceiptsService;
  let deliveriesService: DeliveriesService;
  let transfersService: TransfersService;
  let adjustmentsService: AdjustmentsService;

  let prisma: any;
  let auditService: any;
  let accountingService: any;

  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  const mockItemFifo = {
    id: 'item-fifo-1',
    organizationId: orgId,
    entityId,
    sku: 'ITM-LAPTOP-01',
    name: 'Laptop Pro 15',
    itemType: ItemType.INVENTORY,
    valuationMethod: ValuationMethod.FIFO,
    isInventoryTracked: true,
    reorderLevel: new Decimal(5),
    sellingPrice: new Decimal(18500000),
    purchasePrice: new Decimal(14000000),
    inventoryAccountId: 'acc-inv',
    cogsAccountId: 'acc-cogs',
    salesAccountId: 'acc-sales',
    isActive: true,
  };

  const mockItemAvco = {
    id: 'item-avco-1',
    organizationId: orgId,
    entityId,
    sku: 'ITM-MOUSE-01',
    name: 'Wireless Mouse',
    itemType: ItemType.INVENTORY,
    valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
    isInventoryTracked: true,
    reorderLevel: new Decimal(20),
    sellingPrice: new Decimal(350000),
    purchasePrice: new Decimal(220000),
    inventoryAccountId: 'acc-inv',
    cogsAccountId: 'acc-cogs',
    salesAccountId: 'acc-sales',
    isActive: true,
  };

  const mockWarehouseA = {
    id: 'wh-jkt',
    organizationId: orgId,
    entityId,
    code: 'WH-JKT',
    name: 'Gudang Jakarta',
    isActive: true,
  };

  const mockWarehouseB = {
    id: 'wh-sby',
    organizationId: orgId,
    entityId,
    code: 'WH-SBY',
    name: 'Gudang Surabaya',
    isActive: true,
  };

  const mockSettings = {
    id: 'settings-1',
    organizationId: orgId,
    entityId,
    arAccountId: 'acc-ar',
    apAccountId: 'acc-ap',
    inventoryAccountId: 'acc-inv',
    cogsAccountId: 'acc-cogs',
    grniAccountId: 'acc-grni',
    inventoryAdjustmentAccountId: 'acc-adj-loss',
    inventoryAdjustmentGainAccountId: 'acc-adj-gain',
  };

  beforeEach(async () => {
    prisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: entityId, organizationId: orgId, baseCurrency: 'IDR' }),
      },
      warehouse: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      accountingSettings: {
        findUnique: jest.fn().mockResolvedValue(mockSettings),
      },
      stockMovement: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      inventoryValuationLayer: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      goodsReceipt: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      goodsReceiptLine: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      delivery: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      deliveryLine: {
        update: jest.fn(),
      },
      stockTransfer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      stockAdjustment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      journalLine: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    accountingService = {
      createJournalEntry: jest.fn().mockResolvedValue({ id: 'je-auto-1', entryNumber: 'JE-2026-000088' }),
      voidJournalEntry: jest.fn().mockResolvedValue({ id: 'je-rev-1', entryNumber: 'JE-2026-000089' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        ValuationService,
        ReceiptsService,
        DeliveriesService,
        TransfersService,
        AdjustmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: AccountingService, useValue: accountingService },
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    valuationService = module.get<ValuationService>(ValuationService);
    receiptsService = module.get<ReceiptsService>(ReceiptsService);
    deliveriesService = module.get<DeliveriesService>(DeliveriesService);
    transfersService = module.get<TransfersService>(TransfersService);
    adjustmentsService = module.get<AdjustmentsService>(AdjustmentsService);
  });

  // ==========================================
  // SECTION 1: VALUATION ENGINE (FIFO & WEIGHTED AVERAGE)
  // ==========================================

  it('TEST 1: should calculate FIFO layer consumption accurately across multiple price tiers', async () => {
    // Available: 10 units @ 100,000 and 10 units @ 120,000 (Total 20 units = 2,200,000)
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(20), totalCost: new Decimal(2200000) },
    ]);

    prisma.inventoryValuationLayer.findMany.mockResolvedValue([
      { id: 'layer-1', quantityRemaining: new Decimal(10), unitCost: new Decimal(100000) },
      { id: 'layer-2', quantityRemaining: new Decimal(10), unitCost: new Decimal(120000) },
    ]);

    // Issue 15 units -> Should consume 10 @ 100,000 + 5 @ 120,000 = 1,600,000 total cost
    const result = await valuationService.consumeInventoryValue(
      orgId,
      entityId,
      'item-fifo-1',
      'wh-jkt',
      new Decimal(15),
      ValuationMethod.FIFO,
      prisma,
    );

    expect(result.totalQuantity.toNumber()).toBe(15);
    expect(result.totalCost.toNumber()).toBe(1600000);
    expect(result.consumedLayers.length).toBe(2);
    expect(prisma.inventoryValuationLayer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'layer-1' },
        data: { quantityRemaining: new Decimal(0) },
      }),
    );
    expect(prisma.inventoryValuationLayer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'layer-2' },
        data: { quantityRemaining: new Decimal(5) },
      }),
    );
  });

  it('TEST 2: should calculate Moving Weighted Average consumption accurately', async () => {
    // 10 units @ 100 + 10 units @ 120 = 20 units total value 2,200 (Average = 110/unit)
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(20), totalCost: new Decimal(2200) },
    ]);

    // Issue 5 units -> Cost = 5 * 110 = 550
    const result = await valuationService.consumeInventoryValue(
      orgId,
      entityId,
      'item-avco-1',
      'wh-jkt',
      new Decimal(5),
      ValuationMethod.WEIGHTED_AVERAGE,
      prisma,
    );

    expect(result.totalQuantity.toNumber()).toBe(5);
    expect(result.effectiveUnitCost.toNumber()).toBe(110);
    expect(result.totalCost.toNumber()).toBe(550);
  });

  it('TEST 3: should reject stock issue when insufficient inventory exists', async () => {
    // Available 5 units
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(5), totalCost: new Decimal(500000) },
    ]);

    // Attempt to issue 10 units -> REJECT
    await expect(
      valuationService.consumeInventoryValue(
        orgId,
        entityId,
        'item-fifo-1',
        'wh-jkt',
        new Decimal(10),
        ValuationMethod.FIFO,
        prisma,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // SECTION 2: GOODS RECEIPT & GRNI ACCOUNTING
  // ==========================================

  it('TEST 4: should post Goods Receipt, increase stock and post DR Inventory / CR GRNI', async () => {
    const mockReceipt = {
      id: 'gr-1',
      organizationId: orgId,
      entityId,
      receiptNumber: 'GR-2026-000001',
      warehouseId: 'wh-jkt',
      receiptDate: new Date('2026-08-30'),
      status: GoodsReceiptStatus.DRAFT,
      totalValue: new Decimal(14000000),
      warehouse: mockWarehouseA,
      lines: [
        {
          id: 'gr-line-1',
          itemId: mockItemFifo.id,
          quantityReceived: new Decimal(1),
          unitCost: new Decimal(14000000),
          totalCost: new Decimal(14000000),
          item: mockItemFifo,
        },
      ],
    };

    prisma.goodsReceipt.findUnique.mockResolvedValue(mockReceipt);
    prisma.goodsReceipt.update.mockImplementation(({ data }: any) => ({ ...mockReceipt, ...data }));
    prisma.stockMovement.create.mockResolvedValue({ id: 'mov-gr-1' });

    const posted = await receiptsService.postGoodsReceipt('gr-1', orgId, userId);

    expect(posted.status).toBe(GoodsReceiptStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-inv', description: expect.any(String), debit: 14000000, credit: 0 },
          { accountId: 'acc-grni', description: expect.any(String), debit: 0, credit: 14000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // SECTION 3: SALES DELIVERY & COGS
  // ==========================================

  it('TEST 5: should post Delivery, decrease stock, consume FIFO layer, and post DR COGS / CR Inventory', async () => {
    const mockDelivery = {
      id: 'del-1',
      organizationId: orgId,
      entityId,
      deliveryNumber: 'DEL-2026-000001',
      warehouseId: 'wh-jkt',
      deliveryDate: new Date('2026-08-30'),
      status: DeliveryStatus.DRAFT,
      warehouse: mockWarehouseA,
      lines: [
        {
          id: 'del-line-1',
          itemId: mockItemFifo.id,
          quantityDelivered: new Decimal(1),
          item: mockItemFifo,
        },
      ],
    };

    prisma.delivery.findUnique.mockResolvedValue(mockDelivery);
    prisma.delivery.update.mockImplementation(({ data }: any) => ({ ...mockDelivery, ...data }));
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(10), totalCost: new Decimal(140000000) },
    ]);
    prisma.inventoryValuationLayer.findMany.mockResolvedValue([
      { id: 'layer-1', quantityRemaining: new Decimal(10), unitCost: new Decimal(14000000) },
    ]);
    prisma.stockMovement.create.mockResolvedValue({ id: 'mov-del-1' });

    const posted = await deliveriesService.postDelivery('del-1', orgId, userId);

    expect(posted.status).toBe(DeliveryStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-cogs', description: expect.any(String), debit: 14000000, credit: 0 },
          { accountId: 'acc-inv', description: expect.any(String), debit: 0, credit: 14000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // SECTION 4: WAREHOUSE TRANSFERS
  // ==========================================

  it('TEST 6: should execute inter-warehouse transfer with zero Revenue/Expense impact and preserved cost', async () => {
    prisma.warehouse.findUnique
      .mockResolvedValueOnce(mockWarehouseA)
      .mockResolvedValueOnce(mockWarehouseB);

    prisma.inventoryItem.findUnique.mockResolvedValue(mockItemFifo);
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(10), totalCost: new Decimal(140000000) },
    ]);
    prisma.inventoryValuationLayer.findMany.mockResolvedValue([
      { id: 'layer-src', quantityRemaining: new Decimal(10), unitCost: new Decimal(14000000) },
    ]);
    prisma.stockMovement.create.mockResolvedValue({ id: 'mov-trf-1' });
    prisma.stockTransfer.create.mockImplementation(({ data }: any) => ({ id: 'trf-1', ...data }));

    const transfer = await transfersService.createTransfer(
      {
        entityId,
        fromWarehouseId: 'wh-jkt',
        toWarehouseId: 'wh-sby',
        transferDate: '2026-08-30',
        lines: [{ itemId: mockItemFifo.id, quantity: 2 }],
      },
      orgId,
      userId,
    );

    expect(transfer.totalCost.toNumber()).toBe(28000000);
    // Transfers within the same legal entity do NOT touch Revenue or Expense
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
  });

  // ==========================================
  // SECTION 5: INVENTORY ADJUSTMENTS
  // ==========================================

  it('TEST 7: should post positive inventory adjustment (surplus) posting DR Inventory / CR Gain', async () => {
    prisma.warehouse.findUnique.mockResolvedValue(mockWarehouseA);
    prisma.inventoryItem.findUnique.mockResolvedValue(mockItemFifo);
    prisma.stockMovement.create.mockResolvedValue({ id: 'mov-adj-1' });
    prisma.stockAdjustment.create.mockImplementation(({ data }: any) => ({ id: 'adj-1', ...data }));

    await adjustmentsService.createAdjustment(
      {
        entityId,
        warehouseId: 'wh-jkt',
        adjustmentDate: '2026-08-30',
        adjustmentType: StockAdjustmentType.INCREASE,
        reason: 'Physical count surplus',
        lines: [{ itemId: mockItemFifo.id, quantity: 1, unitCost: 14000000 }],
      },
      orgId,
      userId,
    );

    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-inv', description: expect.any(String), debit: 14000000, credit: 0 },
          { accountId: 'acc-adj-gain', description: expect.any(String), debit: 0, credit: 14000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // SECTION 6: INVENTORY-TO-GL RECONCILIATION
  // ==========================================

  it('TEST 8: should reconcile sub-ledger valuation layer value to GL Inventory Control Account balance', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([mockItemFifo]);
    // 10 units @ 14m = 140m inventory layer value
    prisma.stockMovement.findMany.mockResolvedValue([
      { movementType: StockMovementType.PURCHASE_RECEIPT, quantity: new Decimal(10), totalCost: new Decimal(140000000) },
    ]);
    // GL Journal Lines: DR 140,000,000
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(140000000), credit: new Decimal(0) },
    ]);

    const recon = await inventoryService.getInventoryReconciliation(orgId, entityId);

    expect(recon.subledgerValue).toBe(140000000);
    expect(recon.glBalance).toBe(140000000);
    expect(recon.difference).toBe(0);
    expect(recon.isReconciled).toBe(true);
  });
});
