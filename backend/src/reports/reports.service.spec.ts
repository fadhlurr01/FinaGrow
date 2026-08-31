import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountType } from '@prisma/client';

describe('ReportsService (Phase 10)', () => {
  let service: ReportsService;
  let prisma: any;

  const orgId = 'org-1';

  beforeEach(async () => {
    prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vendorBill: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      taxTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollRun: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should generate Profit & Loss statement correctly', async () => {
    prisma.account.findMany.mockResolvedValue([
      {
        id: 'acc-4001',
        code: '4001',
        name: 'Sales Revenue',
        type: AccountType.REVENUE,
        subtype: 'OPERATING_REVENUE',
        journalLines: [{ debit: new Decimal(0), credit: new Decimal(100000000) }],
      },
      {
        id: 'acc-5001',
        code: '5001',
        name: 'COGS Goods',
        type: AccountType.EXPENSE,
        subtype: 'COST_OF_GOODS_SOLD',
        journalLines: [{ debit: new Decimal(60000000), credit: new Decimal(0) }],
      },
      {
        id: 'acc-6001',
        code: '6001',
        name: 'Office Rent Expense',
        type: AccountType.EXPENSE,
        subtype: 'OPERATING_EXPENSE',
        journalLines: [{ debit: new Decimal(15000000), credit: new Decimal(0) }],
      },
    ]);

    const pnl = await service.getProfitAndLoss(orgId);

    expect(pnl.revenue.total).toBe(100000000);
    expect(pnl.cogs.total).toBe(60000000);
    expect(pnl.grossProfit).toBe(40000000);
    expect(pnl.operatingExpenses.total).toBe(15000000);
    expect(pnl.netProfit).toBe(25000000);
  });

  it('should compute AR aging with age brackets', async () => {
    const today = new Date();
    const overdue35Days = new Date(today.getTime() - 35 * 24 * 3600 * 1000);

    prisma.salesInvoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        customer: { name: 'PT Surya Prima' },
        invoiceDate: overdue35Days,
        dueDate: overdue35Days,
        totalAmount: new Decimal(20000000),
        amountDue: new Decimal(20000000),
        currency: 'IDR',
        status: 'OVERDUE',
      },
    ]);

    const ar = await service.getArAging(orgId);

    expect(ar.count).toBe(1);
    expect(ar.totalOutstanding).toBe(20000000);
    expect(ar.rows[0].agingBracket).toBe('31-60 Days');
  });
});
