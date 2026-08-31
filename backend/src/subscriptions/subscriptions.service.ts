import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangePlanDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getCurrentSubscription(organizationId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: {
          organizationId,
          planCode: 'PRO',
          status: 'ACTIVE',
        },
      });
    }

    return sub;
  }

  async changePlan(organizationId: string, dto: ChangePlanDto, userId: string) {
    const normalizedPlan = dto.planCode.toUpperCase();

    const sub = await this.prisma.subscription.upsert({
      where: { organizationId },
      update: {
        planCode: normalizedPlan,
        status: 'ACTIVE',
      },
      create: {
        organizationId,
        planCode: normalizedPlan,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      resourceType: 'Subscription',
      resourceId: sub.id,
      metadata: { planCode: normalizedPlan },
    });

    return sub;
  }
}
