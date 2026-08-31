import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { VendorsService } from './vendors.service';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  PurchaseOrderStatus,
  VendorBillStatus,
  InvoicePostingStatus,
  JournalEntryStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('PurchasesService, VendorsService & OrdersService (Phase 4 Sub-ledger)', () => {
  let purchasesService: PurchasesService;
  let vendorsService: VendorsService;
  let ordersService: OrdersService;
  let prisma: any;
  let auditService: any;
  let accountingService: any;

  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  const mockVendor = {
    id: 'vend-1',
    organizationId: orgId,
    entityId: entityId,
    vendorCode: 'VEN-000001',
    name: 'PT Sumber Graha Logistik',
    email: 'billing@sumbergraha.co.id',
    paymentTermsDays: 30,
    creditLimit: new Decimal(200000000),
    isActive: true,
  };

  const mockInactiveVendor = {
    ...mockVendor,
    id: 'vend-inactive',
    name: 'CV Inactive Supplier',
    isActive: false,
  };

  const mockForeignVendor = {
    ...mockVendor,
    id: 'vend-foreign',
    organizationId: 'foreign-org',
  };

  const mockAccountingSettings = {
    id: 'settings-1',
    organizationId: orgId,
    entityId: entityId,
    arAccountId: 'acc-ar',
    apAccountId: 'acc-ap',
    inputTaxAccountId: 'acc-vat-in',
    defaultExpenseAccountId: 'acc-exp-default',
    apAccount: { id: 'acc-ap', code: '2000', name: 'Utang Usaha', type: AccountType.LIABILITY },
    inputTaxAccount: { id: 'acc-vat-in', code: '1150', name: 'PPN Masukan', type: AccountType.ASSET },
    defaultExpenseAccount: { id: 'acc-exp-default', code: '6000', name: 'Beban Operasional', type: AccountType.EXPENSE },
  };

  beforeEach(async () => {
    prisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: entityId, organizationId: orgId }),
      },
      vendor: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      purchaseOrder: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findUnique: jest.fn(),
      },
      accountingSettings: {
        findUnique: jest.fn().mockResolvedValue(mockAccountingSettings),
      },
      vendorBill: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
      createJournalEntry: jest.fn(),
      voidJournalEntry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        VendorsService,
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: AccountingService, useValue: accountingService },
      ],
    }).compile();

    purchasesService = module.get<PurchasesService>(PurchasesService);
    vendorsService = module.get<VendorsService>(VendorsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  // ==========================================
  // TEST 1: CREATE VENDOR -> SUCCESS
  // ==========================================
  it('TEST 1: should successfully create vendor with deterministic VEN-XXXXXX code', async () => {
    prisma.vendor.create.mockImplementation(({ data }: any) => ({
      id: 'vend-new',
      ...data,
    }));

    const result = await vendorsService.createVendor(
      {
        entityId,
        name: 'PT Mitra Sukses Logistik',
        email: 'billing@mitra.com',
      },
      orgId,
      userId,
    );

    expect(result).toBeDefined();
    expect(result.vendorCode).toBe('VEN-000001');
    expect(result.name).toBe('PT Mitra Sukses Logistik');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VENDOR_CREATED' }),
    );
  });

  // ==========================================
  // TEST 2: CROSS-TENANT VENDOR ACCESS -> REJECT
  // ==========================================
  it('TEST 2: should reject cross-tenant vendor retrieval', async () => {
    prisma.vendor.findUnique.mockResolvedValue(mockForeignVendor);

    await expect(vendorsService.getVendorById('vend-foreign', orgId)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ==========================================
  // TEST 3: CREATE PURCHASE ORDER -> SUCCESS (ZERO GL IMPACT)
  // ==========================================
  it('TEST 3: should create Purchase Order with ZERO General Ledger impact', async () => {
    prisma.vendor.findUnique.mockResolvedValue(mockVendor);
    prisma.purchaseOrder.create.mockImplementation(({ data }: any) => ({
      id: 'po-1',
      status: PurchaseOrderStatus.DRAFT,
      ...data,
    }));

    const result = await ordersService.createOrder(
      {
        entityId,
        vendorId: mockVendor.id,
        orderDate: '2026-08-30',
        lines: [
          { description: 'Server Rack Hardware', quantity: 2, unitPrice: 25000000, discountAmount: 0, taxRate: 0.11 },
        ],
      },
      orgId,
      userId,
    );

    expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
    expect(result.poNumber).toBe('PO-2026-000001');
    expect(result.totalAmount.toNumber()).toBe(55500000);
    // Explicit verification: PO creation MUST NEVER invoke AccountingService
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
  });

  // ==========================================
  // TEST 4: APPROVE PURCHASE ORDER
  // ==========================================
  it('TEST 4: should transition PO from DRAFT to APPROVED without GL impact', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      organizationId: orgId,
      status: PurchaseOrderStatus.DRAFT,
      vendor: mockVendor,
    });
    prisma.purchaseOrder.update.mockImplementation(({ data }: any) => ({
      id: 'po-1',
      ...data,
    }));

    const approved = await ordersService.approveOrder('po-1', orgId, userId);

    expect(approved.status).toBe(PurchaseOrderStatus.APPROVED);
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PURCHASE_ORDER_APPROVED' }),
    );
  });

  // ==========================================
  // TEST 5: CREATE VENDOR BILL DRAFT (NO GL IMPACT)
  // ==========================================
  it('TEST 5: should create DRAFT Vendor Bill without invoking AccountingService', async () => {
    prisma.vendor.findUnique.mockResolvedValue(mockVendor);
    prisma.vendorBill.create.mockImplementation(({ data }: any) => ({
      id: 'bill-1',
      status: VendorBillStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      ...data,
    }));

    const result = await purchasesService.createBill(
      {
        entityId,
        vendorId: mockVendor.id,
        billDate: '2026-08-30',
        dueDate: '2026-09-30',
        lines: [
          { description: 'Cloud Infrastructure Subscription', quantity: 1, unitPrice: 10000000, discountAmount: 0, taxRate: 0 },
        ],
      },
      orgId,
      userId,
    );

    expect(result.status).toBe(VendorBillStatus.DRAFT);
    expect(result.postingStatus).toBe(InvoicePostingStatus.UNPOSTED);
    expect(result.totalAmount.toNumber()).toBe(10000000);
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
  });

  // ==========================================
  // TEST 6: POST SIMPLE EXPENSE BILL (NO TAX)
  // ==========================================
  it('TEST 6: should post simple expense bill producing DR Expense 10,000,000 / CR AP 10,000,000', async () => {
    const mockDraftBill = {
      id: 'bill-simple',
      organizationId: orgId,
      entityId,
      vendorId: mockVendor.id,
      billNumber: 'BILL-2026-000001',
      billDate: new Date('2026-08-30'),
      dueDate: new Date('2026-09-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(10000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      totalAmount: new Decimal(10000000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(10000000),
      status: VendorBillStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      vendor: mockVendor,
      lines: [
        {
          id: 'l1',
          lineSubtotal: new Decimal(10000000),
          discountAmount: new Decimal(0),
          taxAmount: new Decimal(0),
          expenseAccountId: 'acc-exp-default',
        },
      ],
    };

    prisma.vendorBill.findUnique.mockResolvedValue(mockDraftBill);
    accountingService.createJournalEntry.mockResolvedValue({
      id: 'je-bill-1',
      entryNumber: 'JE-2026-000020',
    });
    prisma.vendorBill.update.mockImplementation(({ data }: any) => ({
      ...mockDraftBill,
      ...data,
    }));

    const posted = await purchasesService.postBill('bill-simple', orgId, userId);

    expect(posted.status).toBe(VendorBillStatus.OPEN);
    expect(posted.postingStatus).toBe(InvoicePostingStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-exp-default', description: expect.any(String), debit: 10000000, credit: 0 },
          { accountId: 'acc-ap', description: expect.any(String), debit: 0, credit: 10000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 7: POST BILL WITH INPUT TAX (PPN MASUKAN 11%)
  // ==========================================
  it('TEST 7: should post bill with 11% VAT producing DR Expense 10,000,000 / DR Input Tax 1,100,000 / CR AP 11,100,000', async () => {
    const mockTaxBill = {
      id: 'bill-tax',
      organizationId: orgId,
      entityId,
      vendorId: mockVendor.id,
      billNumber: 'BILL-2026-000002',
      billDate: new Date('2026-08-30'),
      dueDate: new Date('2026-09-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(10000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(1100000),
      totalAmount: new Decimal(11100000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(11100000),
      status: VendorBillStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      vendor: mockVendor,
      lines: [
        {
          id: 'l1',
          lineSubtotal: new Decimal(10000000),
          discountAmount: new Decimal(0),
          taxAmount: new Decimal(1100000),
          expenseAccountId: 'acc-exp-default',
        },
      ],
    };

    prisma.vendorBill.findUnique.mockResolvedValue(mockTaxBill);
    accountingService.createJournalEntry.mockResolvedValue({ id: 'je-tax-bill', entryNumber: 'JE-2026-000021' });
    prisma.vendorBill.update.mockImplementation(({ data }: any) => ({ ...mockTaxBill, ...data }));

    await purchasesService.postBill('bill-tax', orgId, userId);

    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-exp-default', description: expect.any(String), debit: 10000000, credit: 0 },
          { accountId: 'acc-vat-in', description: expect.any(String), debit: 1100000, credit: 0 },
          { accountId: 'acc-ap', description: expect.any(String), debit: 0, credit: 11100000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 8: MULTI-EXPENSE ACCOUNT BILL SPLITTING
  // ==========================================
  it('TEST 8: should split compound bill across multiple expense accounts', async () => {
    const mockMultiLineBill = {
      id: 'bill-multi',
      organizationId: orgId,
      entityId,
      vendorId: mockVendor.id,
      billNumber: 'BILL-2026-000003',
      billDate: new Date('2026-08-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(15000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      totalAmount: new Decimal(15000000),
      status: VendorBillStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      vendor: mockVendor,
      lines: [
        { id: 'l1', lineSubtotal: new Decimal(10000000), discountAmount: new Decimal(0), expenseAccountId: 'acc-rent' },
        { id: 'l2', lineSubtotal: new Decimal(5000000), discountAmount: new Decimal(0), expenseAccountId: 'acc-utilities' },
      ],
    };

    prisma.vendorBill.findUnique.mockResolvedValue(mockMultiLineBill);
    accountingService.createJournalEntry.mockResolvedValue({ id: 'je-multi-bill', entryNumber: 'JE-22' });
    prisma.vendorBill.update.mockImplementation(({ data }: any) => ({ ...mockMultiLineBill, ...data }));

    await purchasesService.postBill('bill-multi', orgId, userId);

    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-rent', description: expect.any(String), debit: 10000000, credit: 0 },
          { accountId: 'acc-utilities', description: expect.any(String), debit: 5000000, credit: 0 },
          { accountId: 'acc-ap', description: expect.any(String), debit: 0, credit: 15000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 9: INACTIVE VENDOR REJECTION
  // ==========================================
  it('TEST 9: should reject posting bill for inactive vendor', async () => {
    prisma.vendorBill.findUnique.mockResolvedValue({
      id: 'bill-inact',
      organizationId: orgId,
      entityId,
      vendor: mockInactiveVendor,
      lines: [],
    });

    await expect(purchasesService.postBill('bill-inact', orgId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ==========================================
  // TEST 10: AUTHORITATIVE BACKEND RECALCULATION
  // ==========================================
  it('TEST 10: should calculate authoritative bill line and total amounts', async () => {
    prisma.vendor.findUnique.mockResolvedValue(mockVendor);
    prisma.vendorBill.create.mockImplementation(({ data }: any) => ({
      id: 'bill-calc',
      ...data,
    }));

    const bill = await purchasesService.createBill(
      {
        entityId,
        vendorId: mockVendor.id,
        billDate: '2026-08-30',
        dueDate: '2026-09-30',
        lines: [
          // 4 units @ 2,500,000 = 10,000,000, discount 1,000,000 => taxable 9,000,000, tax 11% => 990,000
          { description: 'Equipment Part A', quantity: 4, unitPrice: 2500000, discountAmount: 1000000, taxRate: 0.11 },
        ],
      },
      orgId,
      userId,
    );

    expect(bill.subtotal.toNumber()).toBe(10000000);
    expect(bill.discountAmount.toNumber()).toBe(1000000);
    expect(bill.taxAmount.toNumber()).toBe(990000);
    expect(bill.totalAmount.toNumber()).toBe(9990000);
    expect(bill.amountDue.toNumber()).toBe(9990000);
  });

  // ==========================================
  // TEST 11: POSTED BILL MUTATION REJECTION
  // ==========================================
  it('TEST 11: should reject updating a POSTED vendor bill', async () => {
    prisma.vendorBill.findUnique.mockResolvedValue({
      id: 'bill-posted',
      organizationId: orgId,
      postingStatus: InvoicePostingStatus.POSTED,
    });

    await expect(
      purchasesService.updateBill('bill-posted', { vendorReference: 'NEW-REF' }, orgId, userId),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 12: CANCEL POSTED BILL (REVERSAL TRIGGER)
  // ==========================================
  it('TEST 12: should void linked journal and mark bill REVERSED on cancellation', async () => {
    prisma.vendorBill.findUnique.mockResolvedValue({
      id: 'bill-cancel',
      organizationId: orgId,
      billNumber: 'BILL-2026-000009',
      status: VendorBillStatus.OPEN,
      postingStatus: InvoicePostingStatus.POSTED,
      journalEntryId: 'je-origin-bill-9',
    });

    prisma.vendorBill.update.mockResolvedValue({
      id: 'bill-cancel',
      status: VendorBillStatus.CANCELLED,
      postingStatus: InvoicePostingStatus.REVERSED,
    });

    const result = await purchasesService.cancelBill('bill-cancel', orgId, userId);

    expect(accountingService.voidJournalEntry).toHaveBeenCalledWith('je-origin-bill-9', orgId, userId);
    expect(result.status).toBe(VendorBillStatus.CANCELLED);
    expect(result.postingStatus).toBe(InvoicePostingStatus.REVERSED);
  });

  // ==========================================
  // TEST 13: AP AGING CALCULATION
  // ==========================================
  it('TEST 13: should correctly assign outstanding bills into aging buckets', async () => {
    prisma.vendorBill.findMany.mockResolvedValue([
      // Current (Due in future: 2026-09-15) -> 5,000,000
      { vendorId: 'v1', vendor: mockVendor, dueDate: new Date('2026-09-15'), amountDue: new Decimal(5000000) },
      // 1-30 Days Overdue (Due 15 days ago: 2026-08-15) -> 3,000,000
      { vendorId: 'v1', vendor: mockVendor, dueDate: new Date('2026-08-15'), amountDue: new Decimal(3000000) },
      // 31-60 Days Overdue (Due 45 days ago: 2026-07-16) -> 2,000,000
      { vendorId: 'v1', vendor: mockVendor, dueDate: new Date('2026-07-16'), amountDue: new Decimal(2000000) },
      // 90+ Days Overdue (Due 100 days ago: 2026-05-22) -> 1,000,000
      { vendorId: 'v1', vendor: mockVendor, dueDate: new Date('2026-05-22'), amountDue: new Decimal(1000000) },
    ]);

    const aging = await purchasesService.getAPAging(orgId, { asOfDate: '2026-08-30' });

    expect(aging.totalPayables).toBe(11000000);
    expect(aging.buckets.current.amount).toBe(5000000);
    expect(aging.buckets.days1_30.amount).toBe(3000000);
    expect(aging.buckets.days31_60.amount).toBe(2000000);
    expect(aging.buckets.days90Plus.amount).toBe(1000000);
  });

  // ==========================================
  // TEST 14: AP SUB-LEDGER TO GL RECONCILIATION
  // ==========================================
  it('TEST 14: should verify AP Sub-ledger total == GL AP Account control balance', async () => {
    // 1. Open bills total 15,000,000
    prisma.vendorBill.findMany.mockResolvedValue([
      { amountDue: new Decimal(10000000) },
      { amountDue: new Decimal(5000000) },
    ]);

    // 2. GL AP lines total 15,000,000 Credit
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(0), credit: new Decimal(15000000) },
    ]);

    const recon = await purchasesService.getAPControlReconciliation(orgId, entityId);

    expect(recon.subledgerTotal).toBe(15000000);
    expect(recon.glControlBalance).toBe(15000000);
    expect(recon.difference).toBe(0);
    expect(recon.isReconciled).toBe(true);
  });

  // ==========================================
  // TEST 15: PO-TO-BILL CONVERSION
  // ==========================================
  it('TEST 15: should copy lines from approved PO to new draft Vendor Bill', async () => {
    const mockApprovedPO = {
      id: 'po-conv-1',
      organizationId: orgId,
      entityId,
      vendorId: mockVendor.id,
      poNumber: 'PO-2026-000005',
      status: PurchaseOrderStatus.APPROVED,
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      vendor: mockVendor,
      lines: [
        {
          description: 'Office Supplies',
          quantity: new Decimal(10),
          unitPrice: new Decimal(500000),
          discountAmount: new Decimal(0),
          taxRate: new Decimal(0.11),
          expenseAccountId: 'acc-exp-default',
        },
      ],
    };

    prisma.purchaseOrder.findUnique.mockResolvedValue(mockApprovedPO);
    prisma.vendor.findUnique.mockResolvedValue(mockVendor);
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-exp-default', organizationId: orgId, entityId, code: '6000' });
    prisma.vendorBill.create.mockImplementation(({ data }: any) => ({
      id: 'bill-converted',
      ...data,
    }));

    const bill = await purchasesService.createBillFromPO('po-conv-1', orgId, userId);

    expect(bill).toBeDefined();
    expect(bill.purchaseOrderId).toBe('po-conv-1');
    expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'po-conv-1' },
        data: { status: PurchaseOrderStatus.FULLY_BILLED },
      }),
    );
  });
});
