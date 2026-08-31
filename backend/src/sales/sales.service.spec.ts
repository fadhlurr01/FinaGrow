import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  SalesInvoiceStatus,
  InvoicePostingStatus,
  JournalEntryStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('SalesService & CustomersService (Phase 3 Sub-ledger)', () => {
  let salesService: SalesService;
  let customersService: CustomersService;
  let prisma: any;
  let auditService: any;
  let accountingService: any;

  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  const mockCustomer = {
    id: 'cust-1',
    organizationId: orgId,
    entityId: entityId,
    customerCode: 'CUS-000001',
    name: 'PT Global Niaga Abadi',
    email: 'finance@globalniaga.co.id',
    paymentTermsDays: 30,
    creditLimit: new Decimal(100000000),
    isActive: true,
  };

  const mockInactiveCustomer = {
    ...mockCustomer,
    id: 'cust-inactive',
    name: 'CV Inactive Partner',
    isActive: false,
  };

  const mockForeignCustomer = {
    ...mockCustomer,
    id: 'cust-foreign',
    organizationId: 'foreign-org',
  };

  const mockAccountingSettings = {
    id: 'settings-1',
    organizationId: orgId,
    entityId: entityId,
    arAccountId: 'acc-ar',
    defaultRevenueAccountId: 'acc-sales-rev',
    outputTaxAccountId: 'acc-vat-out',
    arAccount: { id: 'acc-ar', code: '1100', name: 'Piutang Usaha', type: AccountType.ASSET },
    defaultRevenueAccount: { id: 'acc-sales-rev', code: '4100', name: 'Pendapatan Penjualan', type: AccountType.REVENUE },
    outputTaxAccount: { id: 'acc-vat-out', code: '2100', name: 'Utang PPN', type: AccountType.LIABILITY },
  };

  beforeEach(async () => {
    prisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: entityId, organizationId: orgId }),
      },
      customer: {
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
      salesInvoice: {
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
        SalesService,
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: AccountingService, useValue: accountingService },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    customersService = module.get<CustomersService>(CustomersService);
  });

  // ==========================================
  // TEST 1: CREATE CUSTOMER -> SUCCESS
  // ==========================================
  it('TEST 1: should successfully create customer with deterministic code', async () => {
    prisma.customer.create.mockImplementation(({ data }: any) => ({
      id: 'cust-new',
      ...data,
    }));

    const result = await customersService.createCustomer(
      {
        entityId,
        name: 'PT Mitra Sukses',
        email: 'billing@mitra.com',
      },
      orgId,
      userId,
    );

    expect(result).toBeDefined();
    expect(result.customerCode).toBe('CUS-000001');
    expect(result.name).toBe('PT Mitra Sukses');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_CREATED' }),
    );
  });

  // ==========================================
  // TEST 2: CROSS-TENANT CUSTOMER ACCESS -> REJECT
  // ==========================================
  it('TEST 2: should reject cross-tenant customer retrieval', async () => {
    prisma.customer.findUnique.mockResolvedValue(mockForeignCustomer);

    await expect(customersService.getCustomerById('cust-foreign', orgId)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ==========================================
  // TEST 3: CREATE INVOICE DRAFT (NO GL IMPACT)
  // ==========================================
  it('TEST 3: should create DRAFT invoice without invoking AccountingService', async () => {
    prisma.customer.findUnique.mockResolvedValue(mockCustomer);
    prisma.salesInvoice.create.mockImplementation(({ data }: any) => ({
      id: 'inv-1',
      status: SalesInvoiceStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      ...data,
    }));

    const result = await salesService.createInvoice(
      {
        entityId,
        customerId: mockCustomer.id,
        invoiceDate: '2026-08-30',
        dueDate: '2026-09-30',
        lines: [
          { description: 'Konsultasi Finansial', quantity: 1, unitPrice: 10000000, discountAmount: 0, taxRate: 0 },
        ],
      },
      orgId,
      userId,
    );

    expect(result.status).toBe(SalesInvoiceStatus.DRAFT);
    expect(result.postingStatus).toBe(InvoicePostingStatus.UNPOSTED);
    expect(result.totalAmount.toNumber()).toBe(10000000);
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
  });

  // ==========================================
  // TEST 4: POST SIMPLE INVOICE (NO TAX)
  // ==========================================
  it('TEST 4: should post simple invoice producing DR AR 10,000,000 / CR Revenue 10,000,000', async () => {
    const mockDraftInvoice = {
      id: 'inv-simple',
      organizationId: orgId,
      entityId,
      customerId: mockCustomer.id,
      invoiceNumber: 'INV-2026-000001',
      invoiceDate: new Date('2026-08-30'),
      dueDate: new Date('2026-09-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(10000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      totalAmount: new Decimal(10000000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(10000000),
      status: SalesInvoiceStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      customer: mockCustomer,
      lines: [
        {
          id: 'l1',
          lineSubtotal: new Decimal(10000000),
          discountAmount: new Decimal(0),
          taxAmount: new Decimal(0),
          revenueAccountId: null,
        },
      ],
    };

    prisma.salesInvoice.findUnique.mockResolvedValue(mockDraftInvoice);
    accountingService.createJournalEntry.mockResolvedValue({
      id: 'je-sales-1',
      entryNumber: 'JE-2026-000010',
    });
    prisma.salesInvoice.update.mockImplementation(({ data }: any) => ({
      ...mockDraftInvoice,
      ...data,
    }));

    const posted = await salesService.postInvoice('inv-simple', orgId, userId);

    expect(posted.status).toBe(SalesInvoiceStatus.SENT);
    expect(posted.postingStatus).toBe(InvoicePostingStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-ar', description: expect.any(String), debit: 10000000, credit: 0 },
          { accountId: 'acc-sales-rev', description: expect.any(String), debit: 0, credit: 10000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 5: POST INVOICE WITH 11% TAX
  // ==========================================
  it('TEST 5: should post invoice with 11% VAT producing DR AR 11,100,000 / CR Rev 10,000,000 / CR Tax 1,100,000', async () => {
    const mockTaxInvoice = {
      id: 'inv-tax',
      organizationId: orgId,
      entityId,
      customerId: mockCustomer.id,
      invoiceNumber: 'INV-2026-000002',
      invoiceDate: new Date('2026-08-30'),
      dueDate: new Date('2026-09-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(10000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(1100000),
      totalAmount: new Decimal(11100000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(11100000),
      status: SalesInvoiceStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      customer: mockCustomer,
      lines: [
        {
          id: 'l1',
          lineSubtotal: new Decimal(10000000),
          discountAmount: new Decimal(0),
          taxAmount: new Decimal(1100000),
          revenueAccountId: null,
        },
      ],
    };

    prisma.salesInvoice.findUnique.mockResolvedValue(mockTaxInvoice);
    accountingService.createJournalEntry.mockResolvedValue({ id: 'je-tax', entryNumber: 'JE-2026-000011' });
    prisma.salesInvoice.update.mockImplementation(({ data }: any) => ({ ...mockTaxInvoice, ...data }));

    await salesService.postInvoice('inv-tax', orgId, userId);

    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-ar', description: expect.any(String), debit: 11100000, credit: 0 },
          { accountId: 'acc-sales-rev', description: expect.any(String), debit: 0, credit: 10000000 },
          { accountId: 'acc-vat-out', description: expect.any(String), debit: 0, credit: 1100000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 6: MULTI-LINE REVENUE ACCOUNT SPLITTING
  // ==========================================
  it('TEST 6: should split revenue across multiple accounts on compound lines', async () => {
    const mockMultiLineInvoice = {
      id: 'inv-multi',
      organizationId: orgId,
      entityId,
      customerId: mockCustomer.id,
      invoiceNumber: 'INV-2026-000003',
      invoiceDate: new Date('2026-08-30'),
      currency: 'IDR',
      exchangeRate: new Decimal(1.0),
      subtotal: new Decimal(15000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      totalAmount: new Decimal(15000000),
      status: SalesInvoiceStatus.DRAFT,
      postingStatus: InvoicePostingStatus.UNPOSTED,
      customer: mockCustomer,
      lines: [
        { id: 'l1', lineSubtotal: new Decimal(10000000), discountAmount: new Decimal(0), revenueAccountId: 'acc-sales-rev' },
        { id: 'l2', lineSubtotal: new Decimal(5000000), discountAmount: new Decimal(0), revenueAccountId: 'acc-service-rev' },
      ],
    };

    prisma.salesInvoice.findUnique.mockResolvedValue(mockMultiLineInvoice);
    accountingService.createJournalEntry.mockResolvedValue({ id: 'je-multi', entryNumber: 'JE-12' });
    prisma.salesInvoice.update.mockImplementation(({ data }: any) => ({ ...mockMultiLineInvoice, ...data }));

    await salesService.postInvoice('inv-multi', orgId, userId);

    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-ar', description: expect.any(String), debit: 15000000, credit: 0 },
          { accountId: 'acc-sales-rev', description: expect.any(String), debit: 0, credit: 10000000 },
          { accountId: 'acc-service-rev', description: expect.any(String), debit: 0, credit: 5000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // TEST 7: INACTIVE CUSTOMER POSTING REJECTION
  // ==========================================
  it('TEST 7: should reject posting invoice for inactive customer', async () => {
    prisma.salesInvoice.findUnique.mockResolvedValue({
      id: 'inv-inact',
      organizationId: orgId,
      entityId,
      customer: mockInactiveCustomer,
      lines: [],
    });

    await expect(salesService.postInvoice('inv-inact', orgId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ==========================================
  // TEST 8: AUTHORITATIVE BACKEND RECALCULATION
  // ==========================================
  it('TEST 8: should calculate authoritative line and total amounts', async () => {
    prisma.customer.findUnique.mockResolvedValue(mockCustomer);
    prisma.salesInvoice.create.mockImplementation(({ data }: any) => ({
      id: 'inv-calc',
      ...data,
    }));

    const inv = await salesService.createInvoice(
      {
        entityId,
        customerId: mockCustomer.id,
        invoiceDate: '2026-08-30',
        dueDate: '2026-09-30',
        lines: [
          // 2 units @ 5,000,000 = 10,000,000, discount 1,000,000 => taxable 9,000,000, tax 11% => 990,000
          { description: 'Product A', quantity: 2, unitPrice: 5000000, discountAmount: 1000000, taxRate: 0.11 },
        ],
      },
      orgId,
      userId,
    );

    expect(inv.subtotal.toNumber()).toBe(10000000);
    expect(inv.discountAmount.toNumber()).toBe(1000000);
    expect(inv.taxAmount.toNumber()).toBe(990000);
    expect(inv.totalAmount.toNumber()).toBe(9990000);
    expect(inv.amountDue.toNumber()).toBe(9990000);
  });

  // ==========================================
  // TEST 9: POSTED INVOICE MUTATION REJECTION
  // ==========================================
  it('TEST 9: should reject updating a POSTED invoice', async () => {
    prisma.salesInvoice.findUnique.mockResolvedValue({
      id: 'inv-posted',
      organizationId: orgId,
      postingStatus: InvoicePostingStatus.POSTED,
    });

    await expect(
      salesService.updateInvoice('inv-posted', { reference: 'NEW-REF' }, orgId, userId),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 10: CANCEL POSTED INVOICE (REVERSAL TRIGGER)
  // ==========================================
  it('TEST 10: should void linked journal and mark invoice REVERSED on cancellation', async () => {
    prisma.salesInvoice.findUnique.mockResolvedValue({
      id: 'inv-cancel',
      organizationId: orgId,
      invoiceNumber: 'INV-2026-000009',
      status: SalesInvoiceStatus.SENT,
      postingStatus: InvoicePostingStatus.POSTED,
      journalEntryId: 'je-origin-9',
    });

    prisma.salesInvoice.update.mockResolvedValue({
      id: 'inv-cancel',
      status: SalesInvoiceStatus.CANCELLED,
      postingStatus: InvoicePostingStatus.REVERSED,
    });

    const result = await salesService.cancelInvoice('inv-cancel', orgId, userId);

    expect(accountingService.voidJournalEntry).toHaveBeenCalledWith('je-origin-9', orgId, userId);
    expect(result.status).toBe(SalesInvoiceStatus.CANCELLED);
    expect(result.postingStatus).toBe(InvoicePostingStatus.REVERSED);
  });

  // ==========================================
  // TEST 11: AR AGING CALCULATION
  // ==========================================
  it('TEST 11: should correctly assign outstanding invoices into aging buckets', async () => {
    const today = new Date('2026-08-30');

    prisma.salesInvoice.findMany.mockResolvedValue([
      // Current (Due in future: 2026-09-15) -> 5,000,000
      { customerId: 'c1', customer: mockCustomer, dueDate: new Date('2026-09-15'), amountDue: new Decimal(5000000) },
      // 1-30 Days Overdue (Due 15 days ago: 2026-08-15) -> 3,000,000
      { customerId: 'c1', customer: mockCustomer, dueDate: new Date('2026-08-15'), amountDue: new Decimal(3000000) },
      // 31-60 Days Overdue (Due 45 days ago: 2026-07-16) -> 2,000,000
      { customerId: 'c1', customer: mockCustomer, dueDate: new Date('2026-07-16'), amountDue: new Decimal(2000000) },
      // 90+ Days Overdue (Due 100 days ago: 2026-05-22) -> 1,000,000
      { customerId: 'c1', customer: mockCustomer, dueDate: new Date('2026-05-22'), amountDue: new Decimal(1000000) },
    ]);

    const aging = await salesService.getARAging(orgId, { asOfDate: '2026-08-30' });

    expect(aging.totalReceivables).toBe(11000000);
    expect(aging.buckets.current.amount).toBe(5000000);
    expect(aging.buckets.days1_30.amount).toBe(3000000);
    expect(aging.buckets.days31_60.amount).toBe(2000000);
    expect(aging.buckets.days90Plus.amount).toBe(1000000);
  });

  // ==========================================
  // TEST 12: AR SUB-LEDGER TO GL RECONCILIATION
  // ==========================================
  it('TEST 12: should verify AR Sub-ledger total == GL AR Account control balance', async () => {
    // 1. Open invoices total 15,000,000
    prisma.salesInvoice.findMany.mockResolvedValue([
      { amountDue: new Decimal(10000000) },
      { amountDue: new Decimal(5000000) },
    ]);

    // 2. GL AR lines total 15,000,000 Debit
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(15000000), credit: new Decimal(0) },
    ]);

    const recon = await salesService.getARControlReconciliation(orgId, entityId);

    expect(recon.subledgerTotal).toBe(15000000);
    expect(recon.glControlBalance).toBe(15000000);
    expect(recon.difference).toBe(0);
    expect(recon.isReconciled).toBe(true);
  });
});
