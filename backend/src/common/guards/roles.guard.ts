import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const activeMembership = request.tenantMember;

    if (!user) {
      throw new ForbiddenException('User authentication required for role verification.');
    }

    // Role hierarchy mapping: OWNER > ADMIN > ACCOUNTANT > AUDITOR > VIEWER
    const userRole: Role = activeMembership?.role || user.role;

    if (!userRole) {
      throw new ForbiddenException('User has no assigned role in this organization context.');
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient privileges. Required role: [${requiredRoles.join(', ')}], Current role: ${userRole}`,
      );
    }

    return true;
  }
}
