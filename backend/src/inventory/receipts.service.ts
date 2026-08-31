import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { ValuationService } from './valuation.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import {
  GoodsReceiptStatus,
  StockMovementType,
  StockMovementStatus,
  ValuationMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
    private valuationService: ValuationService,
  ) {}

  private async generateReceiptNumber(entityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.goodsReceipt.count({
      where: {
        entityId,
        receiptDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    return `GR-${year}-${String(count + 1).padStart(6, '0')}`;
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

  async getReceipts(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.goodsReceipt.findMany({
      where,
      include: {
        vendor: { select: { id: true, vendorCode: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { receiptDate: 'desc' },
    });
  }

  async getReceiptById(id: string, organizationId: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: { include: { lines: true } },
        warehouse: true,
        journalEntry: { include: { lines: { include: { account: true } } } },
        lines: {
          include: {
            item: true,
            purchaseOrderLine: true,
          },
        },
      },
    });

    if (!receipt || receipt.organizationId !== organizationId) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    return receipt;
  }

  async createGoodsReceipt(
    dto: CreateGoodsReceiptDto,
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
      throw new BadRequestException('Goods Receipt must contain at least one line.');
    }

    // Validate lines and over-receipt rules
    let totalValue = new Decimal(0);
    const validatedLines: any[] = [];

    for (const line of dto.lines) {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: line.itemId } });
      if (!item || item.organizationId !== organizationId || item.entityId !== dto.entityId) {
        throw new BadRequestException(`Invalid inventory item '${line.itemId}'.`);
      }

      const qtyReceived = new Decimal(line.quantityReceived);
      const unitCost = new Decimal(line.unitCost);
      const lineTotal = qtyReceived.times(unitCost);

      // Over-receipt validation against Purchase Order
      if (line.purchaseOrderLineId) {
        const poLine = await this.prisma.purchaseOrderLine.findUnique({
          where: { id: line.purchaseOrderLineId },
          include: { goodsReceiptLines: { include: { goodsReceipt: true } } },
        });

        if (!poLine) {
          throw new BadRequestException('Linked Purchase Order line not found.');
        }

        // Sum previously posted received quantities
        let priorReceived = new Decimal(0);
        for (const grLine of poLine.goodsReceiptLines) {
          if (grLine.goodsReceipt.status === GoodsReceiptStatus.POSTED) {
            priorReceived = priorReceived.plus(grLine.quantityReceived);
          }
        }

        const remainingAllowed = Decimal.max(0, poLine.quantity.minus(priorReceived));
        if (qtyReceived.greaterThan(remainingAllowed)) {
          throw new BadRequestException(
            `Over-receipt rejected: Receiving ${qtyReceived.toNumber()} units exceeds PO remaining allowed quantity of ${remainingAllowed.toNumber()} units for item '${item.name}'.`,
          );
        }
      }

      totalValue = totalValue.plus(lineTotal);
      validatedLines.push({
        itemId: line.itemId,
        purchaseOrderLineId: line.purchaseOrderLineId,
        quantityReceived: qtyReceived,
        unitCost,
        totalCost: lineTotal,
      });
    }

    const receiptDate = new Date(dto.receiptDate);
    const receiptNumber = await this.generateReceiptNumber(dto.entityId, receiptDate);

    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        receiptNumber,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId,
        warehouseId: dto.warehouseId,
        receiptDate,
        status: GoodsReceiptStatus.DRAFT,
        totalValue,
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
      action: 'GOODS_RECEIPT_CREATED',
      resourceType: 'GoodsReceipt',
      resourceId: receipt.id,
      metadata: { receiptNumber: receipt.receiptNumber, totalValue: receipt.totalValue.toNumber() },
    });

    return receipt;
  }

  /**
   * Atomic Post Goods Receipt:
   * DR Inventory Control
   * CR Goods Received Not Invoiced (GRNI)
   */
  async postGoodsReceipt(id: string, organizationId: string, userId: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        lines: { include: { item: true } },
        warehouse: true,
        vendor: true,
      },
    });

    if (!receipt || receipt.organizationId !== organizationId) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    if (receipt.status === GoodsReceiptStatus.POSTED) {
      return receipt; // Idempotent
    }

    if (receipt.status === GoodsReceiptStatus.REVERSED || receipt.status === GoodsReceiptStatus.CANCELLED) {
      throw new BadRequestException(`Cannot post Goods Receipt in ${receipt.status} status.`);
    }

    // Retrieve Entity Accounting Settings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: receipt.entityId },
    });

    if (!settings || !settings.grniAccountId || !settings.inventoryAccountId) {
      throw new BadRequestException(
        'Entity accounting settings must configure both Inventory Control Account and GRNI Account before posting Goods Receipts.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Group Inventory debits by account (item override or default)
      const inventoryDebitMap: Record<string, Decimal> = {};
      let totalGRNI = new Decimal(0);

      for (const line of receipt.lines) {
        const invAccId = line.item.inventoryAccountId || settings.inventoryAccountId;
        if (!inventoryDebitMap[invAccId]) {
          inventoryDebitMap[invAccId] = new Decimal(0);
        }
        inventoryDebitMap[invAccId] = inventoryDebitMap[invAccId].plus(line.totalCost);
        totalGRNI = totalGRNI.plus(line.totalCost);

        // 2. Create Stock Movement (PURCHASE_RECEIPT)
        const movementNumber = await this.generateMovementNumber(receipt.entityId, receipt.receiptDate);
        const movement = await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: receipt.entityId,
            itemId: line.itemId,
            warehouseId: receipt.warehouseId,
            movementNumber,
            movementType: StockMovementType.PURCHASE_RECEIPT,
            movementDate: receipt.receiptDate,
            quantity: line.quantityReceived,
            unitCost: line.unitCost,
            totalCost: line.totalCost,
            sourceType: 'GOODS_RECEIPT',
            sourceId: receipt.id,
            reference: receipt.receiptNumber,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        // 3. Create FIFO Valuation Layer if item uses FIFO
        if (line.item.valuationMethod === ValuationMethod.FIFO) {
          await this.valuationService.createValuationLayer(
            {
              organizationId,
              entityId: receipt.entityId,
              itemId: line.itemId,
              warehouseId: receipt.warehouseId,
              stockMovementId: movement.id,
              quantityIn: line.quantityReceived,
              unitCost: line.unitCost,
              layerDate: receipt.receiptDate,
            },
            tx,
          );
        }
      }

      // 4. Build Double-Entry Journal: DR Inventory / CR GRNI
      const journalLines: any[] = [];
      for (const [accId, debitAmount] of Object.entries(inventoryDebitMap)) {
        journalLines.push({
          accountId: accId,
          description: `Penerimaan Persediaan Fisik - Ref: ${receipt.receiptNumber}`,
          debit: debitAmount.toNumber(),
          credit: 0,
        });
      }

      journalLines.push({
        accountId: settings.grniAccountId,
        description: `Penerimaan Barang Belum Ditagih (GRNI) - Ref: ${receipt.receiptNumber}`,
        debit: 0,
        credit: totalGRNI.toNumber(),
      });

      const journal = await this.accountingService.createJournalEntry(
        {
          entityId: receipt.entityId,
          entryDate: receipt.receiptDate.toISOString().split('T')[0],
          description: `[GOODS_RECEIPT] Penerimaan Barang ${receipt.receiptNumber} (${receipt.vendor?.name || ''})`,
          reference: receipt.receiptNumber,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      // 5. Update Goods Receipt to POSTED
      const posted = await tx.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
          status: GoodsReceiptStatus.POSTED,
          journalEntryId: journal.id,
          postedById: userId,
          postedAt: new Date(),
        },
        include: {
          lines: true,
          journalEntry: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'GOODS_RECEIPT_POSTED',
        resourceType: 'GoodsReceipt',
        resourceId: posted.id,
        metadata: { receiptNumber: posted.receiptNumber, journalId: journal.id },
      });

      return posted;
    });
  }

  /**
   * Reverse a posted Goods Receipt
   */
  async reverseGoodsReceipt(id: string, organizationId: string, userId: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        lines: { include: { item: true } },
      },
    });

    if (!receipt || receipt.organizationId !== organizationId) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    if (receipt.status !== GoodsReceiptStatus.POSTED) {
      throw new BadRequestException('Only POSTED Goods Receipts can be reversed.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Void linked journal entry
      if (receipt.journalEntryId) {
        await this.accountingService.voidJournalEntry(
          receipt.journalEntryId,
          organizationId,
          userId,
        );
      }

      // 2. Create Compensating Stock Movements (RETURN_OUT)
      for (const line of receipt.lines) {
        const movementNumber = await this.generateMovementNumber(receipt.entityId, new Date());
        await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: receipt.entityId,
            itemId: line.itemId,
            warehouseId: receipt.warehouseId,
            movementNumber,
            movementType: StockMovementType.RETURN_OUT,
            movementDate: new Date(),
            quantity: line.quantityReceived,
            unitCost: line.unitCost,
            totalCost: line.totalCost,
            sourceType: 'GOODS_RECEIPT_REVERSAL',
            sourceId: receipt.id,
            reference: `REV-${receipt.receiptNumber}`,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });
      }

      // 3. Mark receipt REVERSED
      const reversed = await tx.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
          status: GoodsReceiptStatus.REVERSED,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'GOODS_RECEIPT_REVERSED',
        resourceType: 'GoodsReceipt',
        resourceId: reversed.id,
        metadata: { receiptNumber: reversed.receiptNumber },
      });

      return reversed;
    });
  }
}
