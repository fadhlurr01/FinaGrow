import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { ValuationService, ConsumedLayerDetail } from './valuation.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import {
  DeliveryStatus,
  StockMovementType,
  StockMovementStatus,
  ValuationMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
    private valuationService: ValuationService,
  ) {}

  private async generateDeliveryNumber(entityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.delivery.count({
      where: {
        entityId,
        deliveryDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    return `DEL-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async generateMovementNumber(entityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.stockMovement.count({
      where: {
        entityId,
        movementDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    return `MOV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async getDeliveries(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.delivery.findMany({
      where,
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async getDeliveryById(id: string, organizationId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        salesInvoice: { include: { lines: true } },
        warehouse: true,
        journalEntry: { include: { lines: { include: { account: true } } } },
        lines: {
          include: {
            item: true,
            salesInvoiceLine: true,
          },
        },
      },
    });

    if (!delivery || delivery.organizationId !== organizationId) {
      throw new NotFoundException('Delivery record not found.');
    }

    return delivery;
  }

  async createDelivery(
    dto: CreateDeliveryDto,
    organizationId: string,
    userId: string,
  ) {
    const entity = await this.prisma.entity.findUnique({ where: { id: dto.entityId } });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Invalid entity access.');
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse || warehouse.organizationId !== organizationId || warehouse.entityId !== dto.entityId) {
      throw new BadRequestException('Warehouse not found or belongs to another entity.');
    }

    if (dto.lines.length === 0) {
      throw new BadRequestException('Delivery must contain at least one line.');
    }

    const validatedLines: any[] = [];
    for (const line of dto.lines) {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: line.itemId } });
      if (!item || item.organizationId !== organizationId || item.entityId !== dto.entityId) {
        throw new BadRequestException(`Invalid inventory item '${line.itemId}'.`);
      }

      const qty = new Decimal(line.quantityDelivered);
      if (qty.lte(0)) {
        throw new BadRequestException('Quantity delivered must be greater than zero.');
      }

      // Check stock availability
      const bal = await this.valuationService.getInventoryBalance(item.id, dto.warehouseId);
      if (bal.quantityOnHand.lessThan(qty)) {
        throw new BadRequestException(
          `Insufficient stock for item '${item.name}' in warehouse '${warehouse.name}': Available ${bal.quantityOnHand.toNumber()} units, requested ${qty.toNumber()} units.`,
        );
      }

      validatedLines.push({
        itemId: line.itemId,
        salesInvoiceLineId: line.salesInvoiceLineId,
        quantityDelivered: qty,
        calculatedUnitCost: new Decimal(0),
        calculatedTotalCost: new Decimal(0),
      });
    }

    const deliveryDate = new Date(dto.deliveryDate);
    const deliveryNumber = await this.generateDeliveryNumber(dto.entityId, deliveryDate);

    const delivery = await this.prisma.delivery.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        deliveryNumber,
        customerId: dto.customerId,
        salesInvoiceId: dto.salesInvoiceId,
        warehouseId: dto.warehouseId,
        deliveryDate,
        status: DeliveryStatus.DRAFT,
        reference: dto.reference,
        notes: dto.notes,
        createdById: userId,
        lines: {
          create: validatedLines,
        },
      },
      include: {
        lines: { include: { item: true } },
        warehouse: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELIVERY_CREATED',
      resourceType: 'Delivery',
      resourceId: delivery.id,
      metadata: { deliveryNumber: delivery.deliveryNumber },
    });

    return delivery;
  }

  /**
   * Atomic Post Delivery:
   * 1. Consumes valuation layers (FIFO / AVCO)
   * 2. Creates Stock Movement (SALES_ISSUE)
   * 3. Posts COGS Journal: DR Cost of Goods Sold / CR Inventory Control
   */
  async postDelivery(id: string, organizationId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        lines: { include: { item: true } },
        warehouse: true,
        customer: true,
      },
    });

    if (!delivery || delivery.organizationId !== organizationId) {
      throw new NotFoundException('Delivery record not found.');
    }

    if (delivery.status === DeliveryStatus.POSTED) {
      return delivery; // Idempotent
    }

    if (delivery.status === DeliveryStatus.REVERSED || delivery.status === DeliveryStatus.CANCELLED) {
      throw new BadRequestException(`Cannot post delivery in ${delivery.status} status.`);
    }

    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: delivery.entityId },
    });

    if (!settings || !settings.inventoryAccountId || !settings.cogsAccountId) {
      throw new BadRequestException(
        'Entity accounting settings must configure both Inventory Control Account and COGS Account before posting Deliveries.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let overallDeliveryCost = new Decimal(0);
      const cogsDebitMap: Record<string, Decimal> = {};
      const inventoryCreditMap: Record<string, Decimal> = {};

      for (const line of delivery.lines) {
        // 1. Consume valuation layers / AVCO cost
        const consumption = await this.valuationService.consumeInventoryValue(
          organizationId,
          delivery.entityId,
          line.itemId,
          delivery.warehouseId,
          line.quantityDelivered,
          line.item.valuationMethod,
          tx,
        );

        // Update line with calculated cost
        await tx.deliveryLine.update({
          where: { id: line.id },
          data: {
            calculatedUnitCost: consumption.effectiveUnitCost,
            calculatedTotalCost: consumption.totalCost,
          },
        });

        overallDeliveryCost = overallDeliveryCost.plus(consumption.totalCost);

        // 2. Create Stock Movement (SALES_ISSUE)
        const movementNumber = await this.generateMovementNumber(delivery.entityId, delivery.deliveryDate);
        await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: delivery.entityId,
            itemId: line.itemId,
            warehouseId: delivery.warehouseId,
            movementNumber,
            movementType: StockMovementType.SALES_ISSUE,
            movementDate: delivery.deliveryDate,
            quantity: line.quantityDelivered,
            unitCost: consumption.effectiveUnitCost,
            totalCost: consumption.totalCost,
            sourceType: 'DELIVERY',
            sourceId: delivery.id,
            reference: delivery.deliveryNumber,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        // 3. Accumulate COGS DR and Inventory CR per account
        const cogsAccId = line.item.cogsAccountId || settings.cogsAccountId;
        const invAccId = line.item.inventoryAccountId || settings.inventoryAccountId;

        cogsDebitMap[cogsAccId] = (cogsDebitMap[cogsAccId] || new Decimal(0)).plus(consumption.totalCost);
        inventoryCreditMap[invAccId] = (inventoryCreditMap[invAccId] || new Decimal(0)).plus(consumption.totalCost);
      }

      // 4. Build Double-Entry COGS Journal: DR COGS / CR Inventory
      const journalLines: any[] = [];
      for (const [cogsId, debitAmount] of Object.entries(cogsDebitMap)) {
        journalLines.push({
          accountId: cogsId,
          description: `Beban Pokok Penjualan (HPP) - Ref: ${delivery.deliveryNumber}`,
          debit: debitAmount.toNumber(),
          credit: 0,
        });
      }

      for (const [invId, creditAmount] of Object.entries(inventoryCreditMap)) {
        journalLines.push({
          accountId: invId,
          description: `Pengurangan Persediaan Penjualan - Ref: ${delivery.deliveryNumber}`,
          debit: 0,
          credit: creditAmount.toNumber(),
        });
      }

      const journal = await this.accountingService.createJournalEntry(
        {
          entityId: delivery.entityId,
          entryDate: delivery.deliveryDate.toISOString().split('T')[0],
          description: `[DELIVERY] Pengiriman Barang ${delivery.deliveryNumber} (${delivery.customer?.name || ''})`,
          reference: delivery.deliveryNumber,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      // 5. Update Delivery to POSTED
      const posted = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.POSTED,
          totalCost: overallDeliveryCost,
          journalEntryId: journal.id,
          postedById: userId,
          postedAt: new Date(),
        },
        include: {
          lines: { include: { item: true } },
          journalEntry: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'DELIVERY_POSTED',
        resourceType: 'Delivery',
        resourceId: posted.id,
        metadata: { deliveryNumber: posted.deliveryNumber, totalCost: posted.totalCost.toNumber(), journalId: journal.id },
      });

      return posted;
    });
  }

  /**
   * Reverse a posted Delivery and restore valuation layers
   */
  async reverseDelivery(id: string, organizationId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        lines: { include: { item: true } },
      },
    });

    if (!delivery || delivery.organizationId !== organizationId) {
      throw new NotFoundException('Delivery record not found.');
    }

    if (delivery.status !== DeliveryStatus.POSTED) {
      throw new BadRequestException('Only POSTED Deliveries can be reversed.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Void linked COGS journal entry
      if (delivery.journalEntryId) {
        await this.accountingService.voidJournalEntry(
          delivery.journalEntryId,
          organizationId,
          userId,
        );
      }

      // 2. Create Compensating Stock Movements (RETURN_IN) & Restore Layers
      for (const line of delivery.lines) {
        const movementNumber = await this.generateMovementNumber(delivery.entityId, new Date());
        const movement = await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: delivery.entityId,
            itemId: line.itemId,
            warehouseId: delivery.warehouseId,
            movementNumber,
            movementType: StockMovementType.RETURN_IN,
            movementDate: new Date(),
            quantity: line.quantityDelivered,
            unitCost: line.calculatedUnitCost,
            totalCost: line.calculatedTotalCost,
            sourceType: 'DELIVERY_REVERSAL',
            sourceId: delivery.id,
            reference: `REV-${delivery.deliveryNumber}`,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        // Recreate valuation layer if FIFO
        if (line.item.valuationMethod === ValuationMethod.FIFO) {
          await this.valuationService.createValuationLayer(
            {
              organizationId,
              entityId: delivery.entityId,
              itemId: line.itemId,
              warehouseId: delivery.warehouseId,
              stockMovementId: movement.id,
              quantityIn: line.quantityDelivered,
              unitCost: line.calculatedUnitCost,
              layerDate: new Date(),
            },
            tx,
          );
        }
      }

      // 3. Update Delivery to REVERSED
      const reversed = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.REVERSED,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'DELIVERY_REVERSED',
        resourceType: 'Delivery',
        resourceId: reversed.id,
        metadata: { deliveryNumber: reversed.deliveryNumber },
      });

      return reversed;
    });
  }
}
