import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountType } from '@prisma/client';

describe('DashboardService (Phase 10)', () => {
  let service: DashboardService;
  let prisma: any;

  const orgId = 'org-1';

  beforeEach(async () => {
    prisma = {
      journalLine: {
        aggregate: jest.fn(),
      },
      salesInvoice: {
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      vendorBill: {
        aggregate: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      cashBankAccount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      account: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      journalEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should compute financial summary with Revenue, Expenses, Net Profit and Cash', async () => {
    prisma.journalLine.aggregate
      .mockResolvedValueOnce({
        _sum: { debit: new Decimal(0), credit: new Decimal(50000000) },
      })
      .mockResolvedValueOnce({
        _sum: { debit: new Decimal(20000000), credit: new Decimal(0) },
      });

    prisma.cashBankAccount.findMany.mockResolvedValue([
      { openingBalance: new Decimal(35000000) },
    ]);

    prisma.salesInvoice.aggregate.mockResolvedValue({
      _sum: { amountDue: new Decimal(15000000) },
    });

    prisma.vendorBill.aggregate.mockResolvedValue({
      _sum: { amountDue: new Decimal(8000000) },
    });

    const summary = await service.getSummary(orgId);

    expect(summary.totalRevenue).toBe(50000000);
    expect(summary.totalExpenses).toBe(20000000);
    expect(summary.netProfit).toBe(30000000);
    expect(summary.cashBalance).toBe(35000000);
    expect(summary.accountsReceivable).toBe(15000000);
    expect(summary.accountsPayable).toBe(8000000);
  });

  it('should return 12-month revenue vs expense data for chart', async () => {
    prisma.journalEntry.findMany.mockResolvedValue([]);
    prisma.salesInvoice.findMany.mockResolvedValue([]);
    prisma.vendorBill.findMany.mockResolvedValue([]);

    const chartData = await service.getRevenueVsExpenses(orgId);

    expect(chartData).toHaveLength(12);
    expect(chartData[0].name).toBe('Jan');
    expect(chartData[11].name).toBe('Dec');
  });
});
