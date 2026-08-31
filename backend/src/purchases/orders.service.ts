import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { PurchaseOrderStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==========================================
  // 1. ORDER COMPUTATION ENGINE
  // ==========================================

  private calculateOrderTotals(lines: CreateOrderDto['lines']) {
    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalTax = new Decimal(0);

    const calculatedLines = lines.map((line) => {
      const qty = new Decimal(line.quantity || 1);
      const unitPrice = new Decimal(line.unitPrice || 0);

      if (qty.isNegative() || unitPrice.isNegative()) {
        throw new BadRequestException('Quantity and Unit Price must be non-negative.');
      }

      const lineSubtotal = qty.times(unitPrice);
      const discount = new Decimal(line.discountAmount || 0);
      const taxableAmount = Decimal.max(0, lineSubtotal.minus(discount));
      const taxRate = new Decimal(line.taxRate || 0);
      const taxAmount = taxableAmount.times(taxRate);
      const lineTotal = taxableAmount.plus(taxAmount);

      subtotal = subtotal.plus(lineSubtotal);
      totalDiscount = totalDiscount.plus(discount);
      totalTax = totalTax.plus(taxAmount);

      return {
        description: line.description.trim(),
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        taxRate,
        taxAmount,
        lineSubtotal,
        lineTotal,
        expenseAccountId: line.expenseAccountId,
      };
    });

    const totalAmount = subtotal.minus(totalDiscount).plus(totalTax);

    return {
      calculatedLines,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      totalAmount,
    };
  }

  // ==========================================
  // 2. PURCHASE ORDER CRUD & LIFECYCLE
  // ==========================================

  async getOrders(organizationId: string, filter: OrderFilterDto) {
    const where: Prisma.PurchaseOrderWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.vendorId) where.vendorId = filter.vendorId;
    if (filter.status) where.status = filter.status;
    if (filter.dateFrom || filter.dateTo) {
      where.orderDate = {};
      if (filter.dateFrom) where.orderDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.orderDate.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { poNumber: { contains: filter.search, mode: 'insensitive' } },
        { reference: { contains: filter.search, mode: 'insensitive' } },
        { vendor: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, vendorCode: true, name: true, email: true },
        },
        lines: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getOrderById(id: string, organizationId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        lines: {
          include: { expenseAccount: true },
        },
        vendorBills: {
          select: { id: true, billNumber: true, status: true, totalAmount: true, amountDue: true },
        },
        entity: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!order || order.organizationId !== organizationId) {
      throw new NotFoundException('Purchase Order not found.');
    }

    return order;
  }

  async createOrder(
    dto: CreateOrderDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Validate vendor exists, belongs to organization/entity, and is active
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
      throw new NotFoundException('Vendor not found in this organization.');
    }
    if (vendor.entityId !== dto.entityId) {
      throw new ForbiddenException('Vendor belongs to a different entity.');
    }
    if (!vendor.isActive) {
      throw new BadRequestException(`Vendor '${vendor.name}' is inactive and cannot receive new purchase orders.`);
    }

    // 2. Authoritative server recalculation of line totals
    const {
      calculatedLines,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    } = this.calculateOrderTotals(dto.lines);

    // 3. Generate deterministic PO number: PO-YYYY-XXXXXX
    const year = new Date(dto.orderDate).getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { entityId: dto.entityId },
    });
    const poNumber = `PO-${year}-${String(count + 1).padStart(6, '0')}`;

    // 4. Create Purchase Order in DRAFT status (ZERO GL Impact)
    const order = await this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        vendorId: dto.vendorId,
        poNumber,
        orderDate: new Date(dto.orderDate),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        currency: dto.currency || 'IDR',
        exchangeRate: new Decimal(dto.exchangeRate || 1.0),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        status: PurchaseOrderStatus.DRAFT,
        reference: dto.reference?.trim(),
        notes: dto.notes?.trim(),
        createdById: userId,
        lines: {
          create: calculatedLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            lineSubtotal: l.lineSubtotal,
            lineTotal: l.lineTotal,
            expenseAccountId: l.expenseAccountId,
          })),
        },
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PURCHASE_ORDER_CREATED',
      resourceType: 'PurchaseOrder',
      resourceId: order.id,
      metadata: { poNumber: order.poNumber, totalAmount: totalAmount.toString() },
    });

    return order;
  }

  async updateOrder(
    id: string,
    dto: UpdateOrderDto,
    organizationId: string,
    userId: string,
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order || order.organizationId !== organizationId) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(`Cannot edit Purchase Order in '${order.status}' status.`);
    }

    let calculatedData: any = {};
    if (dto.lines && dto.lines.length > 0) {
      const { calculatedLines, subtotal, discountAmount, taxAmount, totalAmount } =
        this.calculateOrderTotals(dto.lines);

      calculatedData = {
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        lines: {
          deleteMany: {},
          create: calculatedLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            lineSubtotal: l.lineSubtotal,
            lineTotal: l.lineTotal,
            expenseAccountId: l.expenseAccountId,
          })),
        },
      };
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        vendorId: dto.vendorId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate !== undefined ? new Decimal(dto.exchangeRate) : undefined,
        reference: dto.reference?.trim(),
        notes: dto.notes?.trim(),
        ...calculatedData,
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PURCHASE_ORDER_UPDATED',
      resourceType: 'PurchaseOrder',
      resourceId: updated.id,
      metadata: { poNumber: updated.poNumber },
    });

    return updated;
  }

  async approveOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!order || order.organizationId !== organizationId) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (order.status === PurchaseOrderStatus.APPROVED) {
      return order; // Idempotent
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot approve a cancelled Purchase Order.');
    }

    if (!order.vendor.isActive) {
      throw new BadRequestException(`Vendor '${order.vendor.name}' is inactive.`);
    }

    const approved = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedById: userId,
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PURCHASE_ORDER_APPROVED',
      resourceType: 'PurchaseOrder',
      resourceId: approved.id,
      metadata: { poNumber: approved.poNumber },
    });

    return approved;
  }

  async cancelOrder(id: string, organizationId: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendorBills: true },
    });

    if (!order || order.organizationId !== organizationId) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      return order; // Idempotent
    }

    const hasPostedBills = order.vendorBills.some(
      (b) => b.status !== 'CANCELLED' && b.postingStatus === 'POSTED',
    );
    if (hasPostedBills) {
      throw new BadRequestException(
        'Cannot cancel Purchase Order with active posted Vendor Bills. Cancel the associated bills first.',
      );
    }

    const cancelled = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PURCHASE_ORDER_CANCELLED',
      resourceType: 'PurchaseOrder',
      resourceId: cancelled.id,
      metadata: { poNumber: cancelled.poNumber },
    });

    return cancelled;
  }
}
