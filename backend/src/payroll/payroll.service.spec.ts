import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PayrollService (Phase 9)', () => {
  let service: PayrollService;
  let prisma: any;
  let audit: any;

  const orgId = 'org-1';
  const entityId = 'entity-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      payrollRun: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      payrollEmployee: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  it('should auto-compute payroll run totals from active employees when not explicitly passed', async () => {
    prisma.payrollEmployee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        employeeCode: 'EMP001',
        name: 'Budi Santoso',
        baseSalary: new Decimal(10000000),
        allowances: new Decimal(2000000),
        deductions: new Decimal(500000),
      },
      {
        id: 'emp-2',
        employeeCode: 'EMP002',
        name: 'Siti Rahma',
        baseSalary: new Decimal(8000000),
        allowances: new Decimal(1000000),
        deductions: new Decimal(300000),
      },
    ]);

    prisma.payrollRun.create.mockImplementation((args) =>
      Promise.resolve({ id: 'pr-1', ...args.data }),
    );

    const run = await service.createPayrollRun(
      orgId,
      {
        entityId,
        payPeriod: 'August 2026',
        runDate: '2026-08-25',
      },
      userId,
    );

    expect(run.id).toBe('pr-1');
    expect(run.employeeCount).toBe(2);
    // Emp 1: gross 12M, tax 600k, net 10.9M
    // Emp 2: gross 9M, tax 450k, net 8.25M
    // Total gross = 21M, tax = 1.05M, net = 19.15M
    expect(run.totalGross.toNumber()).toBe(21000000);
    expect(run.totalTaxes.toNumber()).toBe(1050000);
    expect(run.totalNet.toNumber()).toBe(19150000);
  });

  it('should calculate payroll KPI metrics correctly', async () => {
    prisma.payrollRun.findMany.mockResolvedValue([
      {
        id: 'pr-1',
        status: 'Completed',
        runDate: new Date('2026-08-25'),
        totalGross: new Decimal(25000000),
        totalNet: new Decimal(22500000),
        employeeCount: 5,
      },
      {
        id: 'pr-2',
        status: 'Completed',
        runDate: new Date('2026-07-25'),
        totalGross: new Decimal(25000000),
        totalNet: new Decimal(22500000),
        employeeCount: 5,
      },
    ]);

    prisma.payrollEmployee.findMany.mockResolvedValue([
      { id: 'e1' },
      { id: 'e2' },
      { id: 'e3' },
      { id: 'e4' },
      { id: 'e5' },
    ]);

    const metrics = await service.getMetrics(orgId);

    expect(metrics.lastPayrollCost).toBe(25000000);
    expect(metrics.employeesPaid).toBe(5);
    expect(metrics.avgNetPay).toBe(4500000); // 22.5M / 5
    expect(metrics.ytdPayrollCost).toBe(50000000);
  });
});
