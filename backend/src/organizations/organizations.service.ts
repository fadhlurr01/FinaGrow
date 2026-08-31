import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Role } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            entities: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async getOrganizationById(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: {
          include: {
            entities: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization.');
    }

    return {
      ...membership.organization,
      currentUserRole: membership.role,
    };
  }

  async createOrganization(dto: CreateOrganizationDto, userId: string) {
    const baseSlug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || 'org'}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          baseCurrency: dto.baseCurrency || 'IDR',
          timezone: dto.timezone || 'Asia/Jakarta',
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: Role.OWNER,
        },
      });

      // Default entity
      await tx.entity.create({
        data: {
          organizationId: org.id,
          name: `${dto.name} (HQ)`,
          code: 'HQ-01',
          baseCurrency: dto.baseCurrency || 'IDR',
        },
      });

      await this.auditService.log({
        organizationId: org.id,
        userId,
        action: 'ORGANIZATION_CREATED',
        resourceType: 'Organization',
        resourceId: org.id,
        metadata: { name: org.name, slug: org.slug },
      });

      return org;
    });
  }
}
