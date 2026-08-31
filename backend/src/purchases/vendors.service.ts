import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getVendors(
    organizationId: string,
    entityId?: string,
    search?: string,
    activeOnly?: boolean,
  ) {
    const where: Prisma.VendorWhereInput = { organizationId };

    if (entityId) where.entityId = entityId;
    if (activeOnly !== undefined) where.isActive = activeOnly;
    if (search) {
      where.OR = [
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.vendor.findMany({
      where,
      orderBy: { vendorCode: 'asc' },
    });
  }

  async getVendorById(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        entity: true,
        purchaseOrders: {
          take: 10,
          orderBy: { orderDate: 'desc' },
        },
        vendorBills: {
          take: 10,
          orderBy: { billDate: 'desc' },
        },
      },
    });

    if (!vendor || vendor.organizationId !== organizationId) {
      throw new NotFoundException('Vendor not found in this organization.');
    }

    return vendor;
  }

  async createVendor(
    dto: CreateVendorDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify entity belongs to organization
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Entity does not belong to this organization.');
    }

    // 2. Generate deterministic entity-scoped vendor code: VEN-XXXXXX
    const count = await this.prisma.vendor.count({
      where: { entityId: dto.entityId },
    });
    const vendorCode = `VEN-${String(count + 1).padStart(6, '0')}`;

    // 3. Create vendor record
    const vendor = await this.prisma.vendor.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        vendorCode,
        name: dto.name.trim(),
        legalName: dto.legalName?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        taxId: dto.taxId?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        bankDetails: dto.bankDetails?.trim(),
        currency: dto.currency || 'IDR',
        paymentTermsDays: dto.paymentTermsDays || 30,
        creditLimit: new Decimal(dto.creditLimit || 0),
        isActive: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_CREATED',
      resourceType: 'Vendor',
      resourceId: vendor.id,
      metadata: { vendorCode: vendor.vendorCode, name: vendor.name },
    });

    return vendor;
  }

  async updateVendor(
    id: string,
    dto: UpdateVendorDto,
    organizationId: string,
    userId: string,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor || vendor.organizationId !== organizationId) {
      throw new NotFoundException('Vendor not found.');
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        legalName: dto.legalName?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        taxId: dto.taxId?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        bankDetails: dto.bankDetails?.trim(),
        currency: dto.currency,
        paymentTermsDays: dto.paymentTermsDays,
        creditLimit: dto.creditLimit !== undefined ? new Decimal(dto.creditLimit) : undefined,
        isActive: dto.isActive,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_UPDATED',
      resourceType: 'Vendor',
      resourceId: updated.id,
      metadata: { vendorCode: updated.vendorCode, name: updated.name },
    });

    return updated;
  }

  async deactivateVendor(id: string, organizationId: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor || vendor.organizationId !== organizationId) {
      throw new NotFoundException('Vendor not found.');
    }

    const deactivated = await this.prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_DEACTIVATED',
      resourceType: 'Vendor',
      resourceId: id,
      metadata: { vendorCode: vendor.vendorCode, name: vendor.name },
    });

    return {
      message: `Vendor '${vendor.vendorCode} - ${vendor.name}' was deactivated.`,
      vendor: deactivated,
    };
  }
}
