import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: params.metadata || {},
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`, error.stack);
    }
  }

  async getLogsByOrganization(organizationId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }
}
