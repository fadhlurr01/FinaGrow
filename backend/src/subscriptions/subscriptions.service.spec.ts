import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SubscriptionsService (Phase 9)', () => {
  let service: SubscriptionsService;
  let prisma: any;
  let audit: any;

  const orgId = 'org-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('should get or create default subscription plan for organization', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.subscription.create.mockResolvedValue({
      id: 'sub-1',
      organizationId: orgId,
      planCode: 'FREE',
      status: 'ACTIVE',
    });

    const sub = await service.getCurrentSubscription(orgId);

    expect(sub.planCode).toBe('FREE');
    expect(sub.status).toBe('ACTIVE');
  });

  it('should change subscription plan successfully and log audit', async () => {
    prisma.subscription.upsert.mockResolvedValue({
      id: 'sub-1',
      organizationId: orgId,
      planCode: 'ENTERPRISE',
      status: 'ACTIVE',
    });

    const result = await service.changePlan(orgId, { planCode: 'Enterprise' }, userId);

    expect(result.planCode).toBe('ENTERPRISE');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBSCRIPTION_PLAN_CHANGED' }),
    );
  });
});
