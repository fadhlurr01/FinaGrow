import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { TaxEngineService } from './tax-engine.service';
import { TaxTransactionService } from './tax-transaction.service';
import { TaxPeriodService } from './tax-period.service';
import { TaxPaymentService } from './tax-payment.service';
import { TaxReconciliationService } from './tax-reconciliation.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TaxType, TaxDirection, TaxCalculationMethod, TaxRoundingMethod } from '@prisma/client';

describe('Phase 8 — Indonesian Tax Engine & Sub-Ledger', () => {
  const orgId = 'org-uuid-1';
  const entityId = 'entity-uuid-1';
  const userId = 'user-uuid-1';

  let taxEngine: TaxEngineService;
  let taxTransactionService: TaxTransactionService;
  let taxPeriodService: TaxPeriodService;
  let taxPaymentService: TaxPaymentService;
  let taxReconciliationService: TaxReconciliationService;
  let prismaMock: any;
  let accountingMock: any;

  beforeEach(async () => {
    prismaMock = {
      taxCode: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      taxRule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      taxTransaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      taxPeriod: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      taxPayment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      cashBankAccount: {
        findFirst: jest.fn(),
      },
      accountingSettings: {
        findUnique: jest.fn(),
      },
      journalLine: {
        aggregate: jest.fn(),
      },
    };

    accountingMock = {
      createJournalEntry: jest.fn(),
      postJournalEntry: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxEngineService,
        TaxTransactionService,
        TaxPeriodService,
        TaxPaymentService,
        TaxReconciliationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AccountingService, useValue: accountingMock },
      ],
    }).compile();

    taxEngine = module.get<TaxEngineService>(TaxEngineService);
    taxTransactionService = module.get<TaxTransactionService>(TaxTransactionService);
    taxPeriodService = module.get<TaxPeriodService>(TaxPeriodService);
    taxPaymentService = module.get<TaxPaymentService>(TaxPaymentService);
    taxReconciliationService = module.get<TaxReconciliationService>(TaxReconciliationService);
  });

  describe('1. TaxEngineService (Calculations & Versioning)', () => {
    const mockPpnCode = {
      id: 'tax-code-ppn',
      organizationId: orgId,
      code: 'PPN-OUT-11',
      name: 'PPN Keluaran 11%',
      taxType: TaxType.VAT,
      direction: TaxDirection.OUTPUT,
      isActive: true,
    };

    const mockRulePpn11 = {
      id: 'rule-ppn-11',
      taxCodeId: 'tax-code-ppn',
      validFrom: new Date('2022-04-01'),
      validTo: new Date('2024-12-31'),
      legalRate: new Decimal(0.11),
      dppFactor: new Decimal(1.0),
      calculationMethod: TaxCalculationMethod.PERCENT_OF_BASE,
      roundingMethod: TaxRoundingMethod.ROUND_HALF_UP,
      isActive: true,
      taxCode: mockPpnCode,
    };

    const mockRulePpn12DppFactor = {
      id: 'rule-ppn-12',
      taxCodeId: 'tax-code-ppn',
      validFrom: new Date('2025-01-01'),
      validTo: null,
      legalRate: new Decimal(0.12),
      dppFactor: new Decimal(11 / 12), // Effective rate = 12% * (11/12) = 11%
      calculationMethod: TaxCalculationMethod.RATE_TIMES_DPP_FACTOR,
      roundingMethod: TaxRoundingMethod.ROUND_HALF_UP,
      isActive: true,
      taxCode: mockPpnCode,
    };

    it('should calculate standard 11% PPN on base amount', async () => {
      prismaMock.taxRule.findFirst.mockResolvedValue(mockRulePpn11);

      const result = await taxEngine.calculateTax(
        'tax-code-ppn',
        new Date('2024-06-15'),
        new Decimal(1000000),
        orgId,
      );

      expect(result.taxAmount.toNumber()).toBe(110000);
      expect(result.dppAmount.toNumber()).toBe(1000000);
      expect(result.legalRate.toNumber()).toBe(0.11);
    });

    it('should calculate PPN with RATE_TIMES_DPP_FACTOR for 2025+ rate change', async () => {
      prismaMock.taxRule.findFirst.mockResolvedValue(mockRulePpn12DppFactor);

      const result = await taxEngine.calculateTax(
        'tax-code-ppn',
        new Date('2025-02-01'),
        new Decimal(1200000),
        orgId,
      );

      // base: 1,200,000 * (11/12) = 1,100,000 DPP
      // tax: 1,200,000 * 0.12 * (11/12) = 132,000
      expect(result.dppAmount.toNumber()).toBe(1100000);
      expect(result.taxAmount.toNumber()).toBe(132000);
    });

    it('should calculate PPh 23 withholding (2% service rate)', async () => {
      const mockPph23Code = {
        id: 'tax-code-pph23',
        organizationId: orgId,
        code: 'PPH23-SRV',
        name: 'PPh 23 Jasa 2%',
        taxType: TaxType.PPH23,
        direction: TaxDirection.WITHHOLDING_PAYABLE,
      };

      const mockRulePph23 = {
        id: 'rule-pph23',
        taxCodeId: 'tax-code-pph23',
        validFrom: new Date('2020-01-01'),
        validTo: null,
        legalRate: new Decimal(0.02),
        dppFactor: new Decimal(1.0),
        calculationMethod: TaxCalculationMethod.PERCENT_OF_BASE,
        roundingMethod: TaxRoundingMethod.ROUND_HALF_UP,
        taxCode: mockPph23Code,
      };

      prismaMock.taxRule.findFirst.mockResolvedValue(mockRulePph23);

      const result = await taxEngine.calculateTax(
        'tax-code-pph23',
        new Date('2026-03-01'),
        new Decimal(5000000),
        orgId,
      );

      expect(result.taxAmount.toNumber()).toBe(100000); // 2% of 5,000,000
      expect(result.direction).toBe(TaxDirection.WITHHOLDING_PAYABLE);
    });

    it('should reject calculation if baseAmount is negative', async () => {
      await expect(
        taxEngine.calculateTax('tax-code-ppn', new Date(), new Decimal(-5000), orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no valid tax rule exists for date', async () => {
      prismaMock.taxRule.findFirst.mockResolvedValue(null);

      await expect(
        taxEngine.calculateTax('tax-code-ppn', new Date('1990-01-01'), new Decimal(100000), orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. TaxTransactionService (Sub-Ledger & Periods)', () => {
    const mockRule = {
      id: 'rule-1',
      taxCodeId: 'code-1',
      validFrom: new Date('2026-01-01'),
      validTo: null,
      legalRate: new Decimal(0.11),
      dppFactor: new Decimal(1.0),
      calculationMethod: TaxCalculationMethod.PERCENT_OF_BASE,
      roundingMethod: TaxRoundingMethod.ROUND_HALF_UP,
      taxCode: {
        id: 'code-1',
        organizationId: orgId,
        code: 'PPN-OUT',
        name: 'PPN Keluaran',
        taxType: TaxType.VAT,
        direction: TaxDirection.OUTPUT,
      },
    };

    it('should create a TaxTransaction and link to an OPEN period', async () => {
      prismaMock.taxRule.findFirst.mockResolvedValue(mockRule);
      prismaMock.taxPeriod.findUnique.mockResolvedValue({
        id: 'period-2026-08',
        status: 'OPEN',
        periodYear: 2026,
        periodMonth: 8,
      });

      prismaMock.taxTransaction.create.mockImplementation((args) =>
        Promise.resolve({ id: 'txn-1', ...args.data }),
      );

      const txn = await taxTransactionService.createTaxTransaction(orgId, {
        taxCodeId: 'code-1',
        entityId,
        transactionDate: new Date('2026-08-15'),
        baseAmount: new Decimal(1000000),
        sourceType: 'SALES_INVOICE',
        salesInvoiceId: 'inv-1',
      });

      expect(txn.taxAmount.toNumber()).toBe(110000);
      expect(txn.taxPeriodId).toBe('period-2026-08');
      expect(txn.status).toBe('DRAFT');
    });

    it('should block creating transaction if tax period is FILED or CLOSED', async () => {
      prismaMock.taxRule.findFirst.mockResolvedValue(mockRule);
      prismaMock.taxPeriod.findUnique.mockResolvedValue({
        id: 'period-2026-08',
        status: 'FILED',
      });

      await expect(
        taxTransactionService.createTaxTransaction(orgId, {
          taxCodeId: 'code-1',
          entityId,
          transactionDate: new Date('2026-08-15'),
          baseAmount: new Decimal(1000000),
          sourceType: 'SALES_INVOICE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create immutable reversal transaction and mark original as REVERSED', async () => {
      const original = {
        id: 'txn-orig',
        organizationId: orgId,
        entityId,
        taxCodeId: 'code-1',
        taxRuleId: 'rule-1',
        taxPeriodId: 'period-1',
        sourceType: 'SALES_INVOICE',
        salesInvoiceId: 'inv-1',
        vendorBillId: null,
        paymentId: null,
        transactionDate: new Date('2026-08-15'),
        baseAmount: new Decimal(1000000),
        dppAmount: new Decimal(1000000),
        taxAmount: new Decimal(110000),
        legalRate: new Decimal(0.11),
        dppFactor: new Decimal(1.0),
        direction: TaxDirection.OUTPUT,
        status: 'POSTED',
      };

      prismaMock.taxTransaction.findFirst.mockResolvedValue(original);
      prismaMock.taxPeriod.findUnique.mockResolvedValue({ id: 'period-1', status: 'OPEN' });
      prismaMock.taxTransaction.create.mockImplementation((args) =>
        Promise.resolve({ id: 'txn-rev', ...args.data }),
      );
      prismaMock.taxTransaction.update.mockResolvedValue({ ...original, status: 'REVERSED' });

      const rev = await taxTransactionService.reverseTaxTransaction(
        'txn-orig',
        orgId,
        entityId,
        'Invoice cancelled',
      );

      expect(rev.baseAmount.toNumber()).toBe(-1000000);
      expect(rev.taxAmount.toNumber()).toBe(-110000);
      expect(rev.reversalOfId).toBe('txn-orig');
      expect(prismaMock.taxTransaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-orig' },
        data: { status: 'REVERSED' },
      });
    });

    it('should compute VAT summary with net payable/refundable', async () => {
      prismaMock.taxTransaction.findMany.mockResolvedValue([
        { taxAmount: new Decimal(550000), direction: 'OUTPUT' }, // Output PPN
        { taxAmount: new Decimal(220000), direction: 'INPUT' },  // Input PPN
      ]);

      const summary = await taxTransactionService.getVATSummary(orgId, entityId, 2026, 8);

      expect(summary.outputVat.toNumber()).toBe(550000);
      expect(summary.inputVat.toNumber()).toBe(220000);
      expect(summary.netVat.toNumber()).toBe(330000);
      expect(summary.vatPayable.toNumber()).toBe(330000);
      expect(summary.vatRefundable.toNumber()).toBe(0);
    });
  });

  describe('3. TaxPeriodService (Lifecycle)', () => {
    it('should prepare period by aggregating posted transactions', async () => {
      prismaMock.taxPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        organizationId: orgId,
        status: 'OPEN',
      });

      prismaMock.taxTransaction.groupBy.mockResolvedValue([
        { direction: 'OUTPUT', _sum: { taxAmount: new Decimal(500000) } },
        { direction: 'INPUT', _sum: { taxAmount: new Decimal(200000) } },
      ]);

      prismaMock.taxPeriod.update.mockImplementation((args) =>
        Promise.resolve({ id: 'period-1', ...args.data }),
      );

      const prepared = await taxPeriodService.preparePeriod('period-1', orgId);

      expect(prepared.status).toBe('PREPARED');
      expect(prepared.totalOutputTax.toNumber()).toBe(500000);
      expect(prepared.totalInputTax.toNumber()).toBe(200000);
      expect(prepared.netTax.toNumber()).toBe(300000);
    });

    it('should file a prepared period and lock it', async () => {
      prismaMock.taxPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        organizationId: orgId,
        status: 'PREPARED',
      });

      prismaMock.taxPeriod.update.mockImplementation((args) =>
        Promise.resolve({ id: 'period-1', ...args.data }),
      );

      const filed = await taxPeriodService.filePeriod('period-1', orgId, userId);

      expect(filed.status).toBe('FILED');
      expect(filed.filedById).toBe(userId);
    });

    it('should allow reopening a filed period with audit reason', async () => {
      prismaMock.taxPeriod.findFirst.mockResolvedValue({
        id: 'period-1',
        organizationId: orgId,
        status: 'FILED',
        notes: null,
      });

      prismaMock.taxPeriod.update.mockImplementation((args) =>
        Promise.resolve({ id: 'period-1', ...args.data }),
      );

      const reopened = await taxPeriodService.reopenPeriod(
        'period-1',
        orgId,
        'Tax audit adjustment required',
      );

      expect(reopened.status).toBe('REOPENED');
      expect(reopened.notes).toContain('[REOPENED] Tax audit adjustment required');
    });
  });

  describe('4. TaxPaymentService (Accounting Integration)', () => {
    it('should post VAT settlement journal entry with balanced double-entry', async () => {
      const mockPayment = {
        id: 'tax-pay-1',
        organizationId: orgId,
        entityId,
        taxPeriodId: 'period-1',
        cashBankAccountId: 'cb-1',
        paymentNumber: 'TXPAY-2026-00001',
        paymentDate: new Date('2026-08-20'),
        amount: new Decimal(300000),
        status: 'DRAFT',
        ntpn: 'NTPN-1234567890',
        sspNumber: 'SSP-12345',
      };

      prismaMock.taxPayment.findFirst.mockResolvedValue(mockPayment);
      prismaMock.taxPeriod.findUnique.mockResolvedValue({
        id: 'period-1',
        periodYear: 2026,
        periodMonth: 8,
        totalOutputTax: new Decimal(500000),
        totalInputTax: new Decimal(200000),
        netTax: new Decimal(300000),
      });

      prismaMock.accountingSettings.findUnique.mockResolvedValue({
        entityId,
        outputTaxAccountId: 'acc-out-vat',
        inputTaxAccountId: 'acc-in-vat',
        outputTaxAccount: { id: 'acc-out-vat' },
        inputTaxAccount: { id: 'acc-in-vat' },
        vatPayableAccount: null,
      });

      prismaMock.cashBankAccount.findFirst.mockResolvedValue({
        id: 'cb-1',
        coaAccountId: 'acc-bank',
      });

      accountingMock.createJournalEntry.mockResolvedValue({ id: 'je-vat-settle' });
      accountingMock.postJournalEntry.mockResolvedValue({});
      prismaMock.taxPayment.update.mockImplementation((args) =>
        Promise.resolve({ id: 'tax-pay-1', ...args.data }),
      );
      prismaMock.taxPeriod.update.mockResolvedValue({});

      const posted = await taxPaymentService.postVATSettlement('tax-pay-1', orgId, userId);

      expect(posted.status).toBe('POSTED');
      expect(accountingMock.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId,
          description: 'VAT Settlement 2026-08',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-out-vat', debit: 500000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-in-vat', debit: 0, credit: 200000 }),
            expect.objectContaining({ accountId: 'acc-bank', debit: 0, credit: 300000 }),
          ]),
        }),
        orgId,
        userId,
      );
    });

    it('should post PPh 23 withholding remittance journal entry', async () => {
      const mockPayment = {
        id: 'tax-pay-2',
        organizationId: orgId,
        entityId,
        taxPeriodId: 'period-1',
        cashBankAccountId: 'cb-1',
        paymentNumber: 'TXPAY-2026-00002',
        paymentDate: new Date('2026-08-20'),
        taxType: 'PPH23',
        amount: new Decimal(100000),
        status: 'DRAFT',
        ntpn: 'NTPN-999999',
      };

      prismaMock.taxPayment.findFirst.mockResolvedValue(mockPayment);
      prismaMock.taxPeriod.findUnique.mockResolvedValue({
        id: 'period-1',
        periodYear: 2026,
        periodMonth: 8,
        netTax: new Decimal(100000),
      });

      prismaMock.accountingSettings.findUnique.mockResolvedValue({
        entityId,
        pph23PayableAccountId: 'acc-pph23-pay',
      });

      prismaMock.cashBankAccount.findFirst.mockResolvedValue({
        id: 'cb-1',
        coaAccountId: 'acc-bank',
      });

      accountingMock.createJournalEntry.mockResolvedValue({ id: 'je-pph23' });
      accountingMock.postJournalEntry.mockResolvedValue({});
      prismaMock.taxPayment.update.mockImplementation((args) =>
        Promise.resolve({ id: 'tax-pay-2', ...args.data }),
      );
      prismaMock.taxPeriod.update.mockResolvedValue({});

      const posted = await taxPaymentService.postWithholdingRemittance('tax-pay-2', orgId, userId);

      expect(posted.status).toBe('POSTED');
      expect(accountingMock.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId,
          description: 'PPH23 Remittance 2026-08',
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-pph23-pay', debit: 100000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-bank', debit: 0, credit: 100000 }),
          ]),
        }),
        orgId,
        userId,
      );
    });
  });

  describe('5. TaxReconciliationService (Sub-Ledger vs GL)', () => {
    it('should reconcile subledger and GL balances and report balanced lines', async () => {
      prismaMock.accountingSettings.findUnique.mockResolvedValue({
        entityId,
        outputTaxAccountId: 'acc-out-vat',
        inputTaxAccountId: 'acc-in-vat',
        pph23PayableAccountId: 'acc-pph23',
        pph4_2PayableAccountId: 'acc-pph4_2',
      });

      prismaMock.taxTransaction.findMany.mockResolvedValue([
        { taxAmount: new Decimal(1100000), direction: 'OUTPUT', taxCode: { taxType: 'VAT' } },
        { taxAmount: new Decimal(440000), direction: 'INPUT', taxCode: { taxType: 'VAT' } },
        { taxAmount: new Decimal(50000), direction: 'WITHHOLDING_PAYABLE', taxCode: { taxType: 'PPH23' } },
      ]);

      // GL balances (net credit for liabilities = -1,100,000; net debit for assets = 440,000)
      prismaMock.journalLine.aggregate
        .mockResolvedValueOnce({ _sum: { debit: new Decimal(0), credit: new Decimal(1100000) } }) // Output VAT
        .mockResolvedValueOnce({ _sum: { debit: new Decimal(440000), credit: new Decimal(0) } }) // Input VAT
        .mockResolvedValueOnce({ _sum: { debit: new Decimal(0), credit: new Decimal(50000) } })   // PPh 23
        .mockResolvedValueOnce({ _sum: { debit: new Decimal(0), credit: new Decimal(0) } });      // PPh 4(2)

      const recon = await taxReconciliationService.reconcile(orgId, entityId, 2026, 8);

      expect(recon.isFullyReconciled).toBe(true);
      expect(recon.lines[0].label).toContain('Output VAT');
      expect(recon.lines[0].subLedger.toNumber()).toBe(1100000);
      expect(recon.lines[0].gl.toNumber()).toBe(1100000);
      expect(recon.lines[0].difference.toNumber()).toBe(0);
      expect(recon.lines[0].isBalanced).toBe(true);
    });
  });
});
