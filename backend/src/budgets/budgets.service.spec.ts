import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('BudgetsService (Phase 9)', () => {
  let service: BudgetsService;
  let prisma: any;
  let audit: any;

  const orgId = 'org-1';
  const entityId = 'entity-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      budget: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      journalLine: {
        aggregate: jest.fn(),
      },
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  it('should create a budget successfully', async () => {
    prisma.budget.findUnique.mockResolvedValue(null);
    prisma.budget.create.mockResolvedValue({
      id: 'b-1',
      organizationId: orgId,
      entityId,
      accountId: 'acc-5100',
      period: '2026-08',
      amount: new Decimal(10000000),
    });

    const result = await service.createBudget(
      orgId,
      {
        entityId,
        accountId: 'acc-5100',
        period: '2026-08',
        amount: 10000000,
      },
      userId,
    );

    expect(result.id).toBe('b-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BUDGET_CREATED' }),
    );
  });

  it('should reject duplicate budget for same entity, account, and period', async () => {
    prisma.budget.findUnique.mockResolvedValue({ id: 'b-exist' });

    await expect(
      service.createBudget(
        orgId,
        {
          entityId,
          accountId: 'acc-5100',
          period: '2026-08',
          amount: 5000000,
        },
        userId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should enrich budget with GL actual spent and utilization', async () => {
    prisma.budget.findMany.mockResolvedValue([
      {
        id: 'b-1',
        organizationId: orgId,
        entityId,
        accountId: 'acc-5100',
        period: '2026-08',
        amount: new Decimal(10000000),
        account: { id: 'acc-5100', code: '5100', name: 'Biaya Gaji', type: 'EXPENSE' },
        entity: { id: entityId, code: 'HQ', name: 'Headquarters' },
      },
    ]);

    prisma.journalLine.aggregate.mockResolvedValue({
      _sum: { debit: new Decimal(4000000), credit: new Decimal(0) },
    });

    const result = await service.getBudgets(orgId, { entityId, period: '2026-08' });

    expect(result).toHaveLength(1);
    expect(result[0].actualSpent).toBe(4000000);
    expect(result[0].remaining).toBe(6000000);
    expect(result[0].utilization).toBe(40);
  });
});
