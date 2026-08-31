import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required for tenant operations.');
    }

    // Determine target organization from header 'x-organization-id', query param, or route param
    const orgIdFromHeader = request.headers['x-organization-id'] as string;
    const orgIdFromParam = request.params.organizationId || request.params.orgId;
    const targetOrgId = orgIdFromHeader || orgIdFromParam;

    if (targetOrgId) {
      // Validate that user is actually a member of target organization
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: targetOrgId,
            userId: user.id,
          },
        },
        include: {
          organization: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('You do not have access to the requested organization.');
      }

      request.tenant = membership.organization;
      request.tenantMember = membership;
      return true;
    }

    // Default: use the first active membership of user if no explicit org specified or targetOrgId was stale
    const defaultMembership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (defaultMembership) {
      request.tenant = defaultMembership.organization;
      request.tenantMember = defaultMembership;
      return true;
    }

    throw new BadRequestException('No active organization found for this user account.');
  }
}
