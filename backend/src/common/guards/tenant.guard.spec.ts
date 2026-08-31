import { TenantGuard } from './tenant.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantGuard (Multi-Tenant Isolation)', () => {
  let guard: TenantGuard;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      organizationMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    guard = new TenantGuard(prisma as unknown as PrismaService);
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    params: Record<string, string> = {},
    user: any = { id: 'user-1' },
  ): { context: ExecutionContext; req: any } => {
    const req = {
      headers,
      params,
      user,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  };

  it('should allow access if user is verified member of requested organization header', async () => {
    const mockMembership = {
      id: 'member-1',
      organizationId: 'org-123',
      userId: 'user-1',
      organization: { id: 'org-123', name: 'Verified Corp' },
    };
    prisma.organizationMember.findUnique.mockResolvedValue(mockMembership);

    const { context, req } = createMockContext({ 'x-organization-id': 'org-123' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.tenant).toEqual(mockMembership.organization);
  });

  it('should throw ForbiddenException if user attempts to access foreign organization ID', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue(null);

    const { context } = createMockContext({ 'x-organization-id': 'foreign-org-999' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if no user is authenticated', async () => {
    const { context } = createMockContext({}, {}, null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
