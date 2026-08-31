import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    // 1. Check existing user
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. Generate organization name and unique slug
    const orgName = dto.organizationName?.trim() || `${dto.fullName.trim()}'s Group`;
    const baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || 'org'}-${randomSuffix}`;

    // 4. Create User, Organization, Membership, Default Entity, and Session in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          isActive: true,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          baseCurrency: 'IDR',
          timezone: 'Asia/Jakarta',
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: Role.OWNER,
        },
      });

      const defaultEntity = await tx.entity.create({
        data: {
          organizationId: organization.id,
          name: `${orgName} (Headquarters)`,
          code: 'HQ-01',
          legalName: orgName,
          baseCurrency: 'IDR',
          country: 'ID',
          timezone: 'Asia/Jakarta',
          isActive: true,
        },
      });

      // 5. Generate Session Token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return { user, organization, member, defaultEntity, rawToken, expiresAt };
    });

    // 6. Write Audit Log
    await this.auditService.log({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: result.user.id,
      metadata: { email: result.user.email, role: Role.OWNER },
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...sanitizedUser } = result.user;

    return {
      user: sanitizedUser,
      organization: result.organization,
      entity: result.defaultEntity,
      role: Role.OWNER,
      sessionToken: result.rawToken,
      expiresAt: result.expiresAt,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    // 1. Find user with memberships
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been suspended or banned.');
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 3. Generate Session
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const primaryMembership = user.memberships[0];

    // 4. Log Audit
    if (primaryMembership) {
      await this.auditService.log({
        organizationId: primaryMembership.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'Session',
        ipAddress,
        userAgent,
      });
    }

    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      user: sanitizedUser,
      sessionToken: rawToken,
      expiresAt,
      activeOrganization: primaryMembership?.organization || null,
      activeRole: primaryMembership?.role || Role.VIEWER,
    };
  }

  async logout(sessionId: string, userId: string, organizationId?: string) {
    if (sessionId) {
      await this.prisma.session.delete({
        where: { id: sessionId },
      }).catch(() => {});
    }

    if (organizationId) {
      await this.auditService.log({
        organizationId,
        userId,
        action: 'USER_LOGOUT',
        resourceType: 'Session',
      });
    }

    return { message: 'Logged out successfully.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                entities: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
