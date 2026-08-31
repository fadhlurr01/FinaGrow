import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProjectsService (Phase 9)', () => {
  let service: ProjectsService;
  let prisma: any;
  let audit: any;

  const orgId = 'org-1';
  const entityId = 'entity-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should create a project and log audit trail', async () => {
    prisma.project.create.mockResolvedValue({
      id: 'p-1',
      organizationId: orgId,
      entityId,
      name: 'ERP Implementation',
      customer: 'PT Maju Bersama',
      budget: new Decimal(500000000),
      status: 'In Progress',
    });

    const result = await service.createProject(
      orgId,
      {
        entityId,
        name: 'ERP Implementation',
        customer: 'PT Maju Bersama',
        budget: 500000000,
      },
      userId,
    );

    expect(result.id).toBe('p-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PROJECT_CREATED' }),
    );
  });

  it('should compute aggregated project metrics', async () => {
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-1',
        status: 'In Progress',
        budget: new Decimal(200000000),
        spent: new Decimal(50000000),
        profitability: new Decimal(30.0),
        progress: new Decimal(25.0),
      },
      {
        id: 'p-2',
        status: 'Completed',
        budget: new Decimal(300000000),
        spent: new Decimal(280000000),
        profitability: new Decimal(20.0),
        progress: new Decimal(100.0),
      },
    ]);

    const metrics = await service.getMetrics(orgId);

    expect(metrics.activeProjects).toBe(1);
    expect(metrics.totalProjects).toBe(2);
    expect(metrics.totalBudget).toBe(500000000);
    expect(metrics.totalSpent).toBe(330000000);
    expect(metrics.overallProfitability).toBe(25.0);
    expect(metrics.onTimeCompletion).toBe(50);
  });
});
