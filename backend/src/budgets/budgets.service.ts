import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetFilterDto } from './dto/budget.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getBudgets(organizationId: string, filter: BudgetFilterDto) {
    const where: any = { organizationId };
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.period) where.period = filter.period;
    if (filter.accountId) where.accountId = filter.accountId;

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        entity: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ period: 'desc' }, { account: { code: 'asc' } }],
    });

    // Enrich budgets with actual spent from General Ledger
    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const actualSpent = await this.calculateActualSpent(
          b.accountId,
          b.entityId,
          b.period,
          b.account?.type,
        );
        const amountNum = new Decimal(b.amount).toNumber();
        const remaining = amountNum - actualSpent;
        const utilization = amountNum > 0 ? (actualSpent / amountNum) * 100 : 0;

        return {
          ...b,
          accountName: b.account?.name || 'Unknown Account',
          accountCode: b.account?.code || '',
          actualSpent,
          remaining,
          utilization,
        };
      }),
    );

    return enriched;
  }

  async getBudgetById(id: string, organizationId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, organizationId },
      include: {
        account: true,
        entity: true,
      },
    });

    if (!budget) throw new NotFoundException('Budget record not found');

    const actualSpent = await this.calculateActualSpent(
      budget.accountId,
      budget.entityId,
      budget.period,
      budget.account?.type,
    );
    const amountNum = new Decimal(budget.amount).toNumber();
    const remaining = amountNum - actualSpent;
    const utilization = amountNum > 0 ? (actualSpent / amountNum) * 100 : 0;

    return {
      ...budget,
      accountName: budget.account?.name || 'Unknown Account',
      accountCode: budget.account?.code || '',
      actualSpent,
      remaining,
      utilization,
    };
  }

  async createBudget(organizationId: string, dto: CreateBudgetDto, userId: string) {
    const existing = await this.prisma.budget.findUnique({
      where: {
        entityId_accountId_period: {
          entityId: dto.entityId,
          accountId: dto.accountId,
          period: dto.period,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A budget for this account in period '${dto.period}' already exists for this entity.`,
      );
    }

    const budget = await this.prisma.budget.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        accountId: dto.accountId,
        period: dto.period,
        amount: new Decimal(dto.amount),
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        account: true,
        entity: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BUDGET_CREATED',
      resourceType: 'Budget',
      resourceId: budget.id,
      metadata: { period: budget.period, amount: dto.amount, accountId: dto.accountId },
    });

    return budget;
  }

  async updateBudget(id: string, organizationId: string, dto: UpdateBudgetDto, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, organizationId },
    });
    if (!budget) throw new NotFoundException('Budget record not found');

    const data: any = {};
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount);
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.budget.update({
      where: { id },
      data,
      include: {
        account: true,
        entity: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BUDGET_UPDATED',
      resourceType: 'Budget',
      resourceId: updated.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteBudget(id: string, organizationId: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, organizationId },
    });
    if (!budget) throw new NotFoundException('Budget record not found');

    await this.prisma.budget.delete({
      where: { id },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BUDGET_DELETED',
      resourceType: 'Budget',
      resourceId: id,
      metadata: { period: budget.period, accountId: budget.accountId },
    });

    return { success: true, message: 'Budget deleted successfully' };
  }

  /**
   * Helper: Calculate actual spent from posted GL lines for the period.
   */
  private async calculateActualSpent(
    accountId: string,
    entityId: string,
    period: string,
    accountType?: string,
  ): Promise<number> {
    // Parse period (e.g. "2024-07" or "2026-08")
    const parts = period.split('-');
    if (parts.length < 2) return 0;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return 0;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const agg = await this.prisma.journalLine.aggregate({
      where: {
        accountId,
        journalEntry: {
          entityId,
          status: 'POSTED',
          entryDate: { gte: startDate, lte: endDate },
        },
      },
      _sum: { debit: true, credit: true },
    });

    const debit = new Decimal(agg._sum.debit ?? 0);
    const credit = new Decimal(agg._sum.credit ?? 0);

    // For expense: debit - credit. For revenue: credit - debit.
    if (accountType === 'REVENUE') {
      return credit.minus(debit).toNumber();
    }
    return debit.minus(credit).toNumber();
  }
}
