import { Test, TestingModule } from '@nestjs/testing';
import { CashBankService } from './cash-bank.service';
import { PaymentsService } from './payments.service';
import { StatementsService } from './statements.service';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AccountType,
  AccountSubtype,
  CashBankAccountType,
  PaymentType,
  PaymentDirection,
  PaymentStatus,
  SalesInvoiceStatus,
  VendorBillStatus,
  BankReconciliationStatus,
  StatementLineStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('CashBankService, PaymentsService, StatementsService & ReconciliationService (Phase 5 Sub-ledger)', () => {
  let cashBankService: CashBankService;
  let paymentsService: PaymentsService;
  let statementsService: StatementsService;
  let reconciliationService: ReconciliationService;

  let prisma: any;
  let auditService: any;
  let accountingService: any;

  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  const mockCoaBank = {
    id: 'coa-bank-1',
    organizationId: orgId,
    entityId: entityId,
    code: '1002',
    name: 'Bank BCA Utama',
    type: AccountType.ASSET,
    subtype: AccountSubtype.CASH_AND_EQUIVALENT,
    isActive: true,
  };

  const mockCoaMandiri = {
    id: 'coa-bank-2',
    organizationId: orgId,
    entityId: entityId,
    code: '1003',
    name: 'Bank Mandiri Giro',
    type: AccountType.ASSET,
    subtype: AccountSubtype.CASH_AND_EQUIVALENT,
    isActive: true,
  };

  const mockCoaInactive = {
    ...mockCoaBank,
    id: 'coa-inactive',
    code: '1009',
    isActive: false,
  };

  const mockCoaOtherEntity = {
    ...mockCoaBank,
    id: 'coa-other-entity',
    entityId: 'entity-other',
  };

  const mockCashBankAccount = {
    id: 'cb-1',
    organizationId: orgId,
    entityId: entityId,
    code: 'CB-001',
    name: 'BCA Operating Account',
    type: CashBankAccountType.BANK,
    coaAccountId: mockCoaBank.id,
    coaAccount: mockCoaBank,
    currency: 'IDR',
    bankName: 'BCA',
    bankAccountNumber: '8820199201',
    isActive: true,
  };

  const mockMandiriAccount = {
    id: 'cb-2',
    organizationId: orgId,
    entityId: entityId,
    code: 'CB-002',
    name: 'Mandiri Payroll Account',
    type: CashBankAccountType.BANK,
    coaAccountId: mockCoaMandiri.id,
    coaAccount: mockCoaMandiri,
    currency: 'IDR',
    bankName: 'Mandiri',
    bankAccountNumber: '13200998811',
    isActive: true,
  };

  const mockCustomer = {
    id: 'cust-1',
    organizationId: orgId,
    entityId: entityId,
    customerCode: 'CUS-000001',
    name: 'PT Global Niaga Abadi',
    isActive: true,
  };

  const mockVendor = {
    id: 'vend-1',
    organizationId: orgId,
    entityId: entityId,
    vendorCode: 'VEN-000001',
    name: 'PT Sumber Graha Logistik',
    isActive: true,
  };

  const mockAccountingSettings = {
    id: 'settings-1',
    organizationId: orgId,
    entityId: entityId,
    arAccountId: 'acc-ar',
    apAccountId: 'acc-ap',
    customerAdvanceAccountId: 'acc-cust-adv',
    vendorAdvanceAccountId: 'acc-vend-adv',
  };

  beforeEach(async () => {
    prisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: entityId, organizationId: orgId, baseCurrency: 'IDR' }),
      },
      account: {
        findUnique: jest.fn(),
      },
      cashBankAccount: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn(),
      },
      accountingSettings: {
        findUnique: jest.fn().mockResolvedValue(mockAccountingSettings),
      },
      salesInvoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vendorBill: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bankStatementImport: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      bankStatementLine: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bankReconciliation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bankReconciliationMatch: {
        create: jest.fn(),
        deleteMany: jest.fn(),
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
      createJournalEntry: jest.fn().mockResolvedValue({ id: 'je-auto-1', entryNumber: 'JE-2026-000050' }),
      voidJournalEntry: jest.fn().mockResolvedValue({ id: 'je-rev-1', entryNumber: 'JE-2026-000051' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashBankService,
        PaymentsService,
        StatementsService,
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: AccountingService, useValue: accountingService },
      ],
    }).compile();

    cashBankService = module.get<CashBankService>(CashBankService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    statementsService = module.get<StatementsService>(StatementsService);
    reconciliationService = module.get<ReconciliationService>(ReconciliationService);
  });

  // ==========================================
  // SECTION 1: CASH/BANK ACCOUNTS
  // ==========================================

  it('TEST 1: should create Bank Account mapped to valid ASSET COA account', async () => {
    prisma.account.findUnique.mockResolvedValue(mockCoaBank);
    prisma.cashBankAccount.create.mockImplementation(({ data }: any) => ({
      id: 'cb-new',
      ...data,
      coaAccount: mockCoaBank,
    }));

    const result = await cashBankService.createAccount(
      {
        entityId,
        name: 'BCA Operasional',
        coaAccountId: mockCoaBank.id,
        bankAccountNumber: '8820199201',
      },
      orgId,
      userId,
    );

    expect(result.code).toBe('CB-001');
    expect(result.maskedAccountNumber).toBe('**** **** 9201');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CASH_BANK_ACCOUNT_CREATED' }),
    );
  });

  it('TEST 2: should reject mapping Bank Account to COA of another entity', async () => {
    prisma.account.findUnique.mockResolvedValue(mockCoaOtherEntity);

    await expect(
      cashBankService.createAccount(
        { entityId, name: 'Invalid Entity Bank', coaAccountId: 'coa-other-entity' },
        orgId,
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('TEST 3: should reject mapping to inactive COA account', async () => {
    prisma.account.findUnique.mockResolvedValue(mockCoaInactive);

    await expect(
      cashBankService.createAccount(
        { entityId, name: 'Inactive Bank', coaAccountId: 'coa-inactive' },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('TEST 4: should calculate authoritative GL balance from General Ledger journal lines', async () => {
    prisma.cashBankAccount.findUnique.mockResolvedValue(mockCashBankAccount);
    // Dr: 15,000,000, Cr: 5,000,000 => GL Balance = 10,000,000
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(15000000), credit: new Decimal(0) },
      { debit: new Decimal(0), credit: new Decimal(5000000) },
    ]);

    const balanceRes = await cashBankService.getAccountBalance('cb-1', orgId);

    expect(balanceRes.glBalance).toBe(10000000);
    expect(balanceRes.isAuthoritative).toBe(true);
    expect(balanceRes.source).toBe('GENERAL_LEDGER');
  });

  // ==========================================
  // SECTION 2: CUSTOMER RECEIPTS
  // ==========================================

  it('TEST 5: should post full Customer Receipt producing DR Bank / CR AR and mark invoice PAID', async () => {
    const mockInvoice = {
      id: 'inv-1',
      organizationId: orgId,
      entityId,
      customerId: mockCustomer.id,
      invoiceNumber: 'INV-2026-000010',
      totalAmount: new Decimal(10000000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(10000000),
      status: SalesInvoiceStatus.SENT,
    };

    const mockPayment = {
      id: 'pmt-rcpt-1',
      organizationId: orgId,
      entityId,
      paymentNumber: 'RCPT-2026-000001',
      type: PaymentType.CUSTOMER_RECEIPT,
      status: PaymentStatus.DRAFT,
      paymentDate: new Date('2026-08-30'),
      amount: new Decimal(10000000),
      allocatedAmount: new Decimal(10000000),
      unallocatedAmount: new Decimal(0),
      cashBankAccount: mockCashBankAccount,
      customer: mockCustomer,
      allocations: [
        { id: 'alloc-1', salesInvoiceId: 'inv-1', allocatedAmount: new Decimal(10000000), salesInvoice: mockInvoice },
      ],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.payment.update.mockImplementation(({ data }: any) => ({ ...mockPayment, ...data }));

    const posted = await paymentsService.postPayment('pmt-rcpt-1', orgId, userId);

    expect(posted.status).toBe(PaymentStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: mockCoaBank.id, description: expect.any(String), debit: 10000000, credit: 0 },
          { accountId: 'acc-ar', description: expect.any(String), debit: 0, credit: 10000000 },
        ],
      }),
      orgId,
      userId,
    );
    expect(prisma.salesInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: {
          amountPaid: new Decimal(10000000),
          amountDue: new Decimal(0),
          status: SalesInvoiceStatus.PAID,
        },
      }),
    );
  });

  it('TEST 6: should post partial Customer Receipt and mark invoice PARTIALLY_PAID', async () => {
    const mockInvoice = {
      id: 'inv-2',
      organizationId: orgId,
      entityId,
      customerId: mockCustomer.id,
      invoiceNumber: 'INV-2026-000011',
      totalAmount: new Decimal(10000000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(10000000),
      status: SalesInvoiceStatus.SENT,
    };

    const mockPayment = {
      id: 'pmt-rcpt-2',
      organizationId: orgId,
      entityId,
      paymentNumber: 'RCPT-2026-000002',
      type: PaymentType.CUSTOMER_RECEIPT,
      status: PaymentStatus.DRAFT,
      paymentDate: new Date('2026-08-30'),
      amount: new Decimal(4000000),
      allocatedAmount: new Decimal(4000000),
      unallocatedAmount: new Decimal(0),
      cashBankAccount: mockCashBankAccount,
      customer: mockCustomer,
      allocations: [
        { id: 'alloc-2', salesInvoiceId: 'inv-2', allocatedAmount: new Decimal(4000000), salesInvoice: mockInvoice },
      ],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.payment.update.mockImplementation(({ data }: any) => ({ ...mockPayment, ...data }));

    await paymentsService.postPayment('pmt-rcpt-2', orgId, userId);

    expect(prisma.salesInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-2' },
        data: {
          amountPaid: new Decimal(4000000),
          amountDue: new Decimal(6000000),
          status: SalesInvoiceStatus.PARTIALLY_PAID,
        },
      }),
    );
  });

  it('TEST 7: should reverse Customer Receipt, restoring invoice balances and AR reconciliation', async () => {
    const mockInvoice = {
      id: 'inv-rev',
      organizationId: orgId,
      entityId,
      totalAmount: new Decimal(10000000),
      amountPaid: new Decimal(10000000),
      amountDue: new Decimal(0),
      status: SalesInvoiceStatus.PAID,
    };

    const mockPostedPayment = {
      id: 'pmt-to-rev',
      organizationId: orgId,
      entityId,
      paymentNumber: 'RCPT-2026-000005',
      status: PaymentStatus.POSTED,
      journalEntryId: 'je-orig-5',
      allocations: [
        { salesInvoiceId: 'inv-rev', allocatedAmount: new Decimal(10000000), salesInvoice: mockInvoice },
      ],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPostedPayment);
    prisma.payment.update.mockResolvedValue({ ...mockPostedPayment, status: PaymentStatus.REVERSED });

    const reversed = await paymentsService.reversePayment('pmt-to-rev', orgId, userId);

    expect(accountingService.voidJournalEntry).toHaveBeenCalledWith('je-orig-5', orgId, userId);
    expect(reversed.status).toBe(PaymentStatus.REVERSED);
    expect(prisma.salesInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-rev' },
        data: {
          amountPaid: new Decimal(0),
          amountDue: new Decimal(10000000),
          status: SalesInvoiceStatus.SENT,
        },
      }),
    );
  });

  // ==========================================
  // SECTION 3: VENDOR PAYMENTS
  // ==========================================

  it('TEST 8: should post Vendor Payment producing DR AP / CR Bank and mark bill PAID', async () => {
    const mockBill = {
      id: 'bill-1',
      organizationId: orgId,
      entityId,
      vendorId: mockVendor.id,
      billNumber: 'BILL-2026-000010',
      totalAmount: new Decimal(11100000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(11100000),
      status: VendorBillStatus.OPEN,
    };

    const mockPayment = {
      id: 'pmt-pay-1',
      organizationId: orgId,
      entityId,
      paymentNumber: 'PAY-2026-000001',
      type: PaymentType.VENDOR_PAYMENT,
      status: PaymentStatus.DRAFT,
      paymentDate: new Date('2026-08-30'),
      amount: new Decimal(11100000),
      allocatedAmount: new Decimal(11100000),
      unallocatedAmount: new Decimal(0),
      cashBankAccount: mockCashBankAccount,
      vendor: mockVendor,
      allocations: [
        { id: 'alloc-v1', vendorBillId: 'bill-1', allocatedAmount: new Decimal(11100000), vendorBill: mockBill },
      ],
    };

    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.payment.update.mockImplementation(({ data }: any) => ({ ...mockPayment, ...data }));

    const posted = await paymentsService.postPayment('pmt-pay-1', orgId, userId);

    expect(posted.status).toBe(PaymentStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: 'acc-ap', description: expect.any(String), debit: 11100000, credit: 0 },
          { accountId: mockCoaBank.id, description: expect.any(String), debit: 0, credit: 11100000 },
        ],
      }),
      orgId,
      userId,
    );
    expect(prisma.vendorBill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bill-1' },
        data: {
          amountPaid: new Decimal(11100000),
          amountDue: new Decimal(0),
          status: VendorBillStatus.PAID,
        },
      }),
    );
  });

  // ==========================================
  // SECTION 4: TRANSFERS
  // ==========================================

  it('TEST 9: should execute inter-account transfer Bank A -> Bank B with ZERO revenue/expense impact', async () => {
    prisma.cashBankAccount.findUnique
      .mockResolvedValueOnce(mockCashBankAccount) // From BCA
      .mockResolvedValueOnce(mockMandiriAccount); // To Mandiri

    prisma.payment.create.mockImplementation(({ data }: any) => ({
      id: 'trf-1',
      ...data,
    }));
    prisma.payment.update.mockImplementation(({ data }: any) => ({
      id: 'trf-1',
      ...data,
    }));

    const result = await paymentsService.createTransfer(
      {
        entityId,
        fromCashBankAccountId: 'cb-1',
        toCashBankAccountId: 'cb-2',
        transferDate: '2026-08-30',
        amount: 25000000,
        notes: 'Monthly payroll sweep',
      },
      orgId,
      userId,
    );

    expect(result.status).toBe(PaymentStatus.POSTED);
    expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { accountId: mockCoaMandiri.id, description: expect.any(String), debit: 25000000, credit: 0 },
          { accountId: mockCoaBank.id, description: expect.any(String), debit: 0, credit: 25000000 },
        ],
      }),
      orgId,
      userId,
    );
  });

  // ==========================================
  // SECTION 5: BANK STATEMENTS
  // ==========================================

  it('TEST 10: should parse CSV bank statement with deduplication and ZERO GL IMPACT', async () => {
    prisma.cashBankAccount.findUnique.mockResolvedValue(mockCashBankAccount);
    prisma.bankStatementImport.create.mockImplementation(({ data }: any) => ({
      id: 'stmt-imp-1',
      ...data,
      lines: data.lines.create,
    }));

    const sampleCsv = `Date,Description,Reference,Debit,Credit,Balance
2026-08-01,Transfer from Client,INV-1001,,15000000,500000000
2026-08-02,Office Supplies Expense,CHQ-882,2000000,,498000000`;

    const result = await statementsService.importCsvStatement(
      {
        entityId,
        cashBankAccountId: 'cb-1',
        filename: 'bca_august_2026.csv',
        csvContent: sampleCsv,
      },
      orgId,
      userId,
    );

    expect(result.importedCount).toBe(2);
    expect(result.zeroGlImpact).toBe(true);
    // Explicit verification: Bank statement import NEVER posts to accounting ledger
    expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
  });

  // ==========================================
  // SECTION 6: BANK RECONCILIATION
  // ==========================================

  it('TEST 11: should provide high-confidence match suggestions for matching internal payments', async () => {
    prisma.bankReconciliation.findUnique.mockResolvedValue({
      id: 'recon-1',
      organizationId: orgId,
      cashBankAccountId: 'cb-1',
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-08-31'),
      statementClosingBalance: new Decimal(500000000),
      cashBankAccount: mockCashBankAccount,
    });

    prisma.bankStatementLine.findMany.mockResolvedValue([
      {
        id: 'line-1',
        transactionDate: new Date('2026-08-15'),
        amount: new Decimal(10000000),
        reference: 'INV-2026-000010',
        reconciliationStatus: StatementLineStatus.UNMATCHED,
      },
    ]);

    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pmt-match-1',
        paymentNumber: 'RCPT-2026-000010',
        paymentDate: new Date('2026-08-15'),
        amount: new Decimal(10000000),
        reference: 'INV-2026-000010',
        customer: mockCustomer,
      },
    ]);

    const suggestions = await reconciliationService.getMatchSuggestions('recon-1', orgId);

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].suggestedMatches.length).toBe(1);
    expect(suggestions[0].suggestedMatches[0].confidence).toBe(0.99);
  });

  it('TEST 12: should enforce difference === 0 rule before completing reconciliation', async () => {
    // 1. When difference != 0 -> REJECT
    prisma.bankReconciliation.findUnique.mockResolvedValue({
      id: 'recon-unbalanced',
      organizationId: orgId,
      statementClosingBalance: new Decimal(500000000),
      periodEnd: new Date('2026-08-31'),
      cashBankAccount: mockCashBankAccount,
    });
    // GL Balance is 490,000,000 (diff 10m)
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(490000000), credit: new Decimal(0) },
    ]);

    await expect(
      reconciliationService.completeReconciliation('recon-unbalanced', orgId, userId),
    ).rejects.toThrow(BadRequestException);

    // 2. When difference === 0 -> SUCCESS
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Decimal(500000000), credit: new Decimal(0) },
    ]);
    prisma.bankReconciliation.update.mockResolvedValue({
      id: 'recon-unbalanced',
      status: BankReconciliationStatus.RECONCILED,
      difference: new Decimal(0),
    });

    const completed = await reconciliationService.completeReconciliation('recon-unbalanced', orgId, userId);
    expect(completed.status).toBe(BankReconciliationStatus.RECONCILED);
  });
});
