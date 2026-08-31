import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProjectDto, UpdateProjectDto, ProjectFilterDto } from './dto/project.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getProjects(organizationId: string, filter: ProjectFilterDto) {
    const where: any = { organizationId };
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { customer: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.project.findMany({
      where,
      include: {
        entity: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: { entity: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(organizationId: string, dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        code: dto.code || undefined,
        name: dto.name.trim(),
        customer: dto.customer?.trim() || undefined,
        budget: new Decimal(dto.budget ?? 0),
        spent: new Decimal(dto.spent ?? 0),
        progress: new Decimal(dto.progress ?? 0),
        status: dto.status || 'In Progress',
        profitability: new Decimal(dto.profitability ?? 0),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        description: dto.description || undefined,
        createdById: userId,
      },
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PROJECT_CREATED',
      resourceType: 'Project',
      resourceId: project.id,
      metadata: { name: project.name, budget: dto.budget },
    });

    return project;
  }

  async updateProject(id: string, organizationId: string, dto: UpdateProjectDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.customer !== undefined) data.customer = dto.customer;
    if (dto.budget !== undefined) data.budget = new Decimal(dto.budget);
    if (dto.spent !== undefined) data.spent = new Decimal(dto.spent);
    if (dto.progress !== undefined) data.progress = new Decimal(dto.progress);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.profitability !== undefined) data.profitability = new Decimal(dto.profitability);
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.prisma.project.update({
      where: { id },
      data,
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PROJECT_UPDATED',
      resourceType: 'Project',
      resourceId: updated.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteProject(id: string, organizationId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project.delete({
      where: { id },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PROJECT_DELETED',
      resourceType: 'Project',
      resourceId: id,
      metadata: { name: project.name },
    });

    return { success: true, message: 'Project deleted successfully' };
  }

  async getMetrics(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    const allProjects = await this.prisma.project.findMany({
      where,
      select: {
        id: true,
        status: true,
        budget: true,
        spent: true,
        profitability: true,
        progress: true,
      },
    });

    const activeCount = allProjects.filter((p) => p.status === 'In Progress').length;
    const totalBudget = allProjects.reduce((acc, p) => acc.plus(new Decimal(p.budget)), new Decimal(0));
    const totalSpent = allProjects.reduce((acc, p) => acc.plus(new Decimal(p.spent)), new Decimal(0));

    const avgProfitability =
      allProjects.length > 0
        ? allProjects
            .reduce((acc, p) => acc.plus(new Decimal(p.profitability)), new Decimal(0))
            .dividedBy(allProjects.length)
            .toNumber()
        : 0;

    const completedCount = allProjects.filter((p) => p.status === 'Completed').length;
    const completionRate = allProjects.length > 0 ? (completedCount / allProjects.length) * 100 : 0;

    return {
      activeProjects: activeCount,
      totalProjects: allProjects.length,
      totalBudget: totalBudget.toNumber(),
      totalSpent: totalSpent.toNumber(),
      overallProfitability: Number(avgProfitability.toFixed(1)),
      onTimeCompletion: Number(completionRate.toFixed(0)),
    };
  }
}
