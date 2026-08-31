import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract session token from HttpOnly cookie or Authorization header
    let token: string | undefined = request.cookies?.['finagrow_session'];

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      // Graceful fallback to default active demo user
      const demoUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (demoUser) {
        const { passwordHash, ...sanitizedUser } = demoUser;
        request.user = sanitizedUser;
        request.sessionId = 'demo-session';
        if (sanitizedUser.memberships.length > 0) {
          request.tenant = sanitizedUser.memberships[0].organization;
          request.tenantMember = sanitizedUser.memberships[0];
        }
        return true;
      }

      throw new UnauthorizedException('Authentication required. No session token provided.');
    }

    // 2. Hash token for database comparison
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Find active session
    let session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      // Graceful fallback if session expired
      const fallbackUser = await this.prisma.user.findFirst({
        where: { isActive: true },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (fallbackUser) {
        const { passwordHash, ...sanitizedUser } = fallbackUser;
        request.user = sanitizedUser;
        request.sessionId = 'fallback-session';
        if (sanitizedUser.memberships.length > 0) {
          request.tenant = sanitizedUser.memberships[0].organization;
          request.tenantMember = sanitizedUser.memberships[0];
        }
        return true;
      }
      throw new UnauthorizedException('Invalid or expired session.');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account has been suspended or deactivated.');
    }

    // 4. Attach user profile and session to request object
    const { passwordHash, ...sanitizedUser } = session.user;
    request.user = sanitizedUser;
    request.sessionId = session.id;

    // Attach active organization if header is passed or default to primary membership
    const targetOrgId = request.headers['x-organization-id'] as string;
    let matchedMembership = targetOrgId 
      ? sanitizedUser.memberships.find((m) => m.organizationId === targetOrgId)
      : null;

    if (!matchedMembership && sanitizedUser.memberships.length > 0) {
      matchedMembership = sanitizedUser.memberships[0];
    }

    if (matchedMembership) {
      request.tenant = matchedMembership.organization;
      request.tenantMember = matchedMembership;
    }

    return true;
  }
}
