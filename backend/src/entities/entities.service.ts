import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getEntitiesByOrganization(organizationId: string) {
    return this.prisma.entity.findMany({
      where: {
        organizationId,
      },
      orderBy: { code: 'asc' },
    });
  }

  async getEntityById(id: string, organizationId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, organizationId },
    });
    if (!entity) throw new NotFoundException('Entity not found');
    return entity;
  }

  async createEntity(dto: CreateEntityDto, organizationId: string, userId: string) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.entity.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Entity code '${code}' already exists in this organization.`);
    }

    const entity = await this.prisma.entity.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        code,
        legalName: dto.legalName?.trim() || dto.name.trim(),
        baseCurrency: dto.baseCurrency || 'IDR',
        country: dto.country || 'ID',
        timezone: dto.timezone || 'Asia/Jakarta',
        isActive: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ENTITY_CREATED',
      resourceType: 'Entity',
      resourceId: entity.id,
      metadata: { name: entity.name, code: entity.code },
    });

    return entity;
  }

  async updateEntity(id: string, organizationId: string, dto: UpdateEntityDto, userId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, organizationId },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      if (code !== entity.code) {
        const dup = await this.prisma.entity.findUnique({
          where: { organizationId_code: { organizationId, code } },
        });
        if (dup) throw new ConflictException(`Entity code '${code}' already exists.`);
        data.code = code;
      }
    }
    if (dto.legalName !== undefined) data.legalName = dto.legalName.trim();
    if (dto.baseCurrency !== undefined) data.baseCurrency = dto.baseCurrency;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.entity.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ENTITY_UPDATED',
      resourceType: 'Entity',
      resourceId: updated.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteEntity(id: string, organizationId: string, userId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, organizationId },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    // Deactivate entity instead of hard delete to preserve foreign key audit trails
    const updated = await this.prisma.entity.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ENTITY_DEACTIVATED',
      resourceType: 'Entity',
      resourceId: id,
      metadata: { code: entity.code, name: entity.name },
    });

    return { success: true, message: 'Entity deactivated successfully', entity: updated };
  }
}
