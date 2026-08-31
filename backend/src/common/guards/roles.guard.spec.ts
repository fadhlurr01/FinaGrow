import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard (RBAC Foundation)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (userRole?: Role, hasUser = true): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: hasUser ? { id: 'user-1', email: 'test@finagrow.com' } : null,
          tenantMember: userRole ? { role: userRole } : null,
        }),
      }),
    } as any;
  };

  it('should allow access when no roles are required on the endpoint', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(Role.VIEWER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user has insufficient role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.ADMIN]);
    const context = createMockContext(Role.VIEWER);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is not attached to request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(undefined, false);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
