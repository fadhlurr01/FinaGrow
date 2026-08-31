import { Test, TestingModule } from '@nestjs/testing';
import { AccountingService } from './accounting.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountType, AccountSubtype, JournalEntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AccountingService (Phase 2 Core Engine)', () => {
  let service: AccountingService;
  let prisma: any;
  let auditService: any;

  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  const mockCashAccount = {
    id: 'acc-cash',
    organizationId: orgId,
    entityId: entityId,
    code: '1001',
    name: 'Kas Operasional',
    type: AccountType.ASSET,
    subtype: AccountSubtype.CASH_AND_EQUIVALENT,
    isActive: true,
  };

  const mockRevenueAccount = {
    id: 'acc-rev',
    organizationId: orgId,
    entityId: entityId,
    code: '4001',
    name: 'Pendapatan Jasa',
    type: AccountType.REVENUE,
    subtype: AccountSubtype.OPERATING_REVENUE,
    isActive: true,
  };

  const mockTaxAccount = {
    id: 'acc-tax',
    organizationId: orgId,
    entityId: entityId,
    code: '2100',
    name: 'Utang PPN',
    type: AccountType.LIABILITY,
    subtype: AccountSubtype.TAX_PAYABLE,
    isActive: true,
  };

  const mockInactiveAccount = {
    id: 'acc-inactive',
    organizationId: orgId,
    entityId: entityId,
    code: '9999',
    name: 'Akun Nonaktif',
    type: AccountType.EXPENSE,
    subtype: AccountSubtype.OTHER_EXPENSE,
    isActive: false,
  };

  const mockForeignAccount = {
    id: 'acc-foreign',
    organizationId: 'foreign-org-99',
    entityId: 'foreign-entity-99',
    code: '1001',
    name: 'Foreign Cash',
    type: AccountType.ASSET,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      entity: {
        findUnique: jest.fn().mockResolvedValue({ id: entityId, organizationId: orgId }),
      },
      account: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      journalEntry: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      journalLine: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // TEST 1: BALANCED JOURNAL (DR = CR) -> SUCCESS
  // ==========================================
  it('Test 1: should successfully create and post balanced 2-line journal entry', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockRevenueAccount]);
    prisma.journalEntry.create.mockImplementation(({ data }: any) => ({
      id: 'je-1',
      entryNumber: 'JE-2026-000001',
      status: JournalEntryStatus.POSTED,
      ...data,
    }));

    const result = await service.createJournalEntry(
      {
        entityId,
        entryDate: '2026-08-30',
        description: 'Penjualan Jasa Konsultasi',
        status: JournalEntryStatus.POSTED,
        lines: [
          { accountId: 'acc-cash', debit: 1000000, credit: 0 },
          { accountId: 'acc-rev', debit: 0, credit: 1000000 },
        ],
      },
      orgId,
      userId,
    );

    expect(result).toBeDefined();
    expect(result.entryNumber).toBe('JE-2026-000001');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'JOURNAL_POSTED' }),
    );
  });

  // ==========================================
  // TEST 2: UNBALANCED JOURNAL -> REJECT
  // ==========================================
  it('Test 2: should reject unbalanced journal entry when posting', async () => {
    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Unbalanced Transaction',
          status: JournalEntryStatus.POSTED,
          lines: [
            { accountId: 'acc-cash', debit: 1000000, credit: 0 },
            { accountId: 'acc-rev', debit: 0, credit: 900000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 3: MULTIPLE LINES BALANCED -> SUCCESS
  // ==========================================
  it('Test 3: should support multi-line balanced compound journal (Split Sales + VAT)', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockRevenueAccount, mockTaxAccount]);
    prisma.journalEntry.create.mockImplementation(({ data }: any) => ({
      ...data,
      id: 'je-multi',
      status: JournalEntryStatus.POSTED,
      lines: data.lines.create,
    }));

    const result = await service.createJournalEntry(
      {
        entityId,
        entryDate: '2026-08-30',
        description: 'Penjualan dengan PPN 11%',
        status: JournalEntryStatus.POSTED,
        lines: [
          { accountId: 'acc-cash', debit: 1110000, credit: 0 },
          { accountId: 'acc-rev', debit: 0, credit: 1000000 },
          { accountId: 'acc-tax', debit: 0, credit: 110000 },
        ],
      },
      orgId,
      userId,
    );

    expect(result).toBeDefined();
    expect(result.status).toBe(JournalEntryStatus.POSTED);
    expect((result.lines as any)).toHaveLength(3);
  });

  // ==========================================
  // TEST 4: BOTH DEBIT AND CREDIT ON SAME LINE -> REJECT
  // ==========================================
  it('Test 4: should reject line specifying both debit and credit amounts', async () => {
    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Invalid Dual Amount Line',
          lines: [
            { accountId: 'acc-cash', debit: 500000, credit: 500000 },
            { accountId: 'acc-rev', debit: 0, credit: 500000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 5: ZERO LINE (DEBIT 0 & CREDIT 0) -> REJECT
  // ==========================================
  it('Test 5: should reject line with both zero debit and zero credit', async () => {
    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Zero Line',
          lines: [
            { accountId: 'acc-cash', debit: 0, credit: 0 },
            { accountId: 'acc-rev', debit: 0, credit: 100000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 6: NEGATIVE AMOUNT -> REJECT
  // ==========================================
  it('Test 6: should reject line with negative monetary values', async () => {
    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Negative Line',
          lines: [
            { accountId: 'acc-cash', debit: -500000, credit: 0 },
            { accountId: 'acc-rev', debit: 0, credit: 500000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 7: INACTIVE ACCOUNT POSTING -> REJECT
  // ==========================================
  it('Test 7: should reject posting to an inactive account', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockInactiveAccount]);

    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Inactive Account Usage',
          status: JournalEntryStatus.POSTED,
          lines: [
            { accountId: 'acc-cash', debit: 100000, credit: 0 },
            { accountId: 'acc-inactive', debit: 0, credit: 100000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================
  // TEST 8: CROSS-TENANT ACCOUNT USAGE -> REJECT
  // ==========================================
  it('Test 8: should reject account from another organization', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockForeignAccount]);

    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Cross Tenant Hack',
          status: JournalEntryStatus.POSTED,
          lines: [
            { accountId: 'acc-cash', debit: 100000, credit: 0 },
            { accountId: 'acc-foreign', debit: 0, credit: 100000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ==========================================
  // TEST 9: CROSS-ENTITY ACCOUNT USAGE -> REJECT
  // ==========================================
  it('Test 9: should reject account from a different entity within organization', async () => {
    const crossEntityAcc = { ...mockCashAccount, id: 'acc-other-ent', entityId: 'other-entity-99' };
    prisma.account.findMany.mockResolvedValue([mockCashAccount, crossEntityAcc]);

    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Cross Entity Line',
          status: JournalEntryStatus.POSTED,
          lines: [
            { accountId: 'acc-cash', debit: 100000, credit: 0 },
            { accountId: 'acc-other-ent', debit: 0, credit: 100000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ==========================================
  // TEST 10: POSTED ENTRY MUTATION -> REJECT
  // ==========================================
  it('Test 10: should reject re-posting an already posted entry', async () => {
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'je-posted',
      organizationId: orgId,
      status: JournalEntryStatus.POSTED,
    });

    await expect(service.postJournalEntry('je-posted', orgId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ==========================================
  // TEST 11: VOID ENTRY -> SUCCESS
  // ==========================================
  it('Test 11: should successfully void a POSTED journal entry', async () => {
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'je-posted',
      organizationId: orgId,
      entityId,
      entryNumber: 'JE-2026-000005',
      status: JournalEntryStatus.POSTED,
      lines: [
        { accountId: 'acc-cash', debit: new Decimal(1000000), credit: new Decimal(0), description: 'Cash line' },
        { accountId: 'acc-rev', debit: new Decimal(0), credit: new Decimal(1000000), description: 'Rev line' },
      ],
    });
    prisma.journalEntry.update.mockResolvedValue({
      id: 'je-posted',
      status: JournalEntryStatus.VOIDED,
    });
    prisma.journalEntry.create.mockImplementation(({ data }: any) => ({
      ...data,
      id: 'je-reversal-1',
    }));

    const result = await service.voidJournalEntry('je-posted', orgId, userId);
    expect(result.status).toBe(JournalEntryStatus.VOIDED);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'JOURNAL_VOIDED' }),
    );
  });

  // ==========================================
  // TEST 12: TRIAL BALANCE MATHEMATICAL EQUILIBRIUM
  // ==========================================
  it('Test 12: should compute mathematically balanced Trial Balance (Total Dr == Total Cr)', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockRevenueAccount]);
    prisma.journalLine.findMany.mockResolvedValue([
      { accountId: 'acc-cash', debit: new Decimal(5000000), credit: new Decimal(0), account: mockCashAccount },
      { accountId: 'acc-rev', debit: new Decimal(0), credit: new Decimal(5000000), account: mockRevenueAccount },
    ]);

    const tb = await service.getTrialBalance(orgId, { entityId });

    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebitBalance).toBe(5000000);
    expect(tb.totalCreditBalance).toBe(5000000);
    expect(tb.difference).toBe(0);
  });

  // ==========================================
  // TEST 13: GENERAL LEDGER RUNNING BALANCE ACCURACY
  // ==========================================
  it('Test 13: should accurately compute progressive running balances per account type', async () => {
    prisma.journalLine.findMany.mockResolvedValue([
      {
        id: 'line-1',
        accountId: 'acc-cash',
        debit: new Decimal(10000000),
        credit: new Decimal(0),
        currency: 'IDR',
        account: mockCashAccount,
        journalEntry: { id: 'je-1', entryNumber: 'JE-01', entryDate: new Date('2026-01-01'), description: 'Capital In' },
      },
      {
        id: 'line-2',
        accountId: 'acc-cash',
        debit: new Decimal(0),
        credit: new Decimal(3000000),
        currency: 'IDR',
        account: mockCashAccount,
        journalEntry: { id: 'je-2', entryNumber: 'JE-02', entryDate: new Date('2026-01-02'), description: 'Rent Payment' },
      },
    ]);

    const ledger = await service.getGeneralLedger(orgId, { entityId });

    expect(ledger.entries.length).toBe(2);
    // line-2 was latest (reverse ordered): 10,000,000 - 3,000,000 = 7,000,000
    expect(ledger.entries[0].runningBalance).toBe(7000000);
    // line-1 initial: 10,000,000
    expect(ledger.entries[1].runningBalance).toBe(10000000);
  });

  // ==========================================
  // TEST 14: TRANSACTION ATOMIC ROLLBACK ON LINE FAILURE
  // ==========================================
  it('Test 14: should rollback atomic transaction if nested line creation fails', async () => {
    prisma.account.findMany.mockResolvedValue([mockCashAccount, mockRevenueAccount]);
    prisma.journalEntry.create.mockRejectedValue(new Error('DB Constraint Violation'));

    await expect(
      service.createJournalEntry(
        {
          entityId,
          entryDate: '2026-08-30',
          description: 'Failing Transaction',
          status: JournalEntryStatus.POSTED,
          lines: [
            { accountId: 'acc-cash', debit: 100000, credit: 0 },
            { accountId: 'acc-rev', debit: 0, credit: 100000 },
          ],
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow('DB Constraint Violation');
  });
});
