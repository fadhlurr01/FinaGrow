import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getCustomers(
    organizationId: string,
    entityId?: string,
    search?: string,
    activeOnly?: boolean,
  ) {
    const where: Prisma.CustomerWhereInput = { organizationId };

    if (entityId) where.entityId = entityId;
    if (activeOnly !== undefined) where.isActive = activeOnly;
    if (search) {
      where.OR = [
        { customerCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { customerCode: 'asc' },
    });
  }

  async getCustomerById(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        entity: true,
        salesInvoices: {
          take: 10,
          orderBy: { invoiceDate: 'desc' },
        },
      },
    });

    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  async createCustomer(
    dto: CreateCustomerDto,
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

    // 2. Generate deterministic entity-scoped customer code: CUS-XXXXXX
    const count = await this.prisma.customer.count({
      where: { entityId: dto.entityId },
    });
    const customerCode = `CUS-${String(count + 1).padStart(6, '0')}`;

    // 3. Create customer record
    const customer = await this.prisma.customer.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        customerCode,
        name: dto.name.trim(),
        legalName: dto.legalName?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        taxId: dto.taxId?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        shippingAddress: dto.shippingAddress?.trim(),
        currency: dto.currency || 'IDR',
        paymentTermsDays: dto.paymentTermsDays || 30,
        creditLimit: new Decimal(dto.creditLimit || 0),
        isActive: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CUSTOMER_CREATED',
      resourceType: 'Customer',
      resourceId: customer.id,
      metadata: { customerCode: customer.customerCode, name: customer.name },
    });

    return customer;
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    organizationId: string,
    userId: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundException('Customer not found.');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        legalName: dto.legalName?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone?.trim(),
        taxId: dto.taxId?.trim(),
        billingAddress: dto.billingAddress?.trim(),
        shippingAddress: dto.shippingAddress?.trim(),
        currency: dto.currency,
        paymentTermsDays: dto.paymentTermsDays,
        creditLimit: dto.creditLimit !== undefined ? new Decimal(dto.creditLimit) : undefined,
        isActive: dto.isActive,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CUSTOMER_UPDATED',
      resourceType: 'Customer',
      resourceId: updated.id,
      metadata: { customerCode: updated.customerCode, name: updated.name },
    });

    return updated;
  }

  async deactivateCustomer(id: string, organizationId: string, userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundException('Customer not found.');
    }

    const deactivated = await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CUSTOMER_DEACTIVATED',
      resourceType: 'Customer',
      resourceId: id,
      metadata: { customerCode: customer.customerCode, name: customer.name },
    });

    return {
      message: `Customer '${customer.customerCode} - ${customer.name}' was deactivated.`,
      customer: deactivated,
    };
  }
}
