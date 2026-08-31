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
import { CreateStockAdjustmentDto } from './dto/create-adjustment.dto';
import {
  StockAdjustmentType,
  StockAdjustmentStatus,
  StockMovementType,
  StockMovementStatus,
  ValuationMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdjustmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
    private valuationService: ValuationService,
  ) {}

  private async generateAdjustmentNumber(entityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.stockAdjustment.count({
      where: {
        entityId,
        adjustmentDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    return `ADJ-${year}-${String(count + 1).padStart(6, '0')}`;
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

  async getAdjustments(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { adjustmentDate: 'desc' },
    });
  }

  async createAdjustment(
    dto: CreateStockAdjustmentDto,
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

    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: dto.entityId },
    });

    if (!settings || !settings.inventoryAccountId || !settings.inventoryAdjustmentAccountId) {
      throw new BadRequestException(
        'Entity accounting settings must configure Inventory and Adjustment accounts before posting adjustments.',
      );
    }

    const adjustmentDate = new Date(dto.adjustmentDate);
    const adjustmentNumber = await this.generateAdjustmentNumber(dto.entityId, adjustmentDate);

    return this.prisma.$transaction(async (tx) => {
      let totalCost = new Decimal(0);
      const validatedLines: any[] = [];
      const isIncrease = dto.adjustmentType === StockAdjustmentType.INCREASE;

      for (const line of dto.lines) {
        const item = await tx.inventoryItem.findUnique({ where: { id: line.itemId } });
        if (!item || item.organizationId !== organizationId || item.entityId !== dto.entityId) {
          throw new BadRequestException(`Invalid inventory item '${line.itemId}'.`);
        }

        const qty = new Decimal(line.quantity);
        if (qty.lte(0)) {
          throw new BadRequestException('Adjustment quantity must be greater than zero.');
        }

        let unitCost = new Decimal(line.unitCost || 0);
        let lineTotal = new Decimal(0);

        if (isIncrease) {
          if (unitCost.lte(0)) {
            unitCost = item.purchasePrice.greaterThan(0) ? item.purchasePrice : new Decimal(1000);
          }
          lineTotal = qty.times(unitCost);
          totalCost = totalCost.plus(lineTotal);

          // Stock Movement (ADJUSTMENT_IN)
          const movNum = await this.generateMovementNumber(dto.entityId, adjustmentDate);
          const mov = await tx.stockMovement.create({
            data: {
              organizationId,
              entityId: dto.entityId,
              itemId: line.itemId,
              warehouseId: dto.warehouseId,
              movementNumber: movNum,
              movementType: StockMovementType.ADJUSTMENT_IN,
              movementDate: adjustmentDate,
              quantity: qty,
              unitCost,
              totalCost: lineTotal,
              sourceType: 'INVENTORY_ADJUSTMENT',
              reference: adjustmentNumber,
              status: StockMovementStatus.POSTED,
              createdById: userId,
              postedById: userId,
              postedAt: new Date(),
            },
          });

          // Create FIFO layer
          if (item.valuationMethod === ValuationMethod.FIFO) {
            await this.valuationService.createValuationLayer(
              {
                organizationId,
                entityId: dto.entityId,
                itemId: line.itemId,
                warehouseId: dto.warehouseId,
                stockMovementId: mov.id,
                quantityIn: qty,
                unitCost,
                layerDate: adjustmentDate,
              },
              tx,
            );
          }
        } else {
          // DECREASE (Shortage)
          const consumption = await this.valuationService.consumeInventoryValue(
            organizationId,
            dto.entityId,
            line.itemId,
            dto.warehouseId,
            qty,
            item.valuationMethod,
            tx,
          );

          unitCost = consumption.effectiveUnitCost;
          lineTotal = consumption.totalCost;
          totalCost = totalCost.plus(lineTotal);

          // Stock Movement (ADJUSTMENT_OUT)
          const movNum = await this.generateMovementNumber(dto.entityId, adjustmentDate);
          await tx.stockMovement.create({
            data: {
              organizationId,
              entityId: dto.entityId,
              itemId: line.itemId,
              warehouseId: dto.warehouseId,
              movementNumber: movNum,
              movementType: StockMovementType.ADJUSTMENT_OUT,
              movementDate: adjustmentDate,
              quantity: qty,
              unitCost,
              totalCost: lineTotal,
              sourceType: 'INVENTORY_ADJUSTMENT',
              reference: adjustmentNumber,
              status: StockMovementStatus.POSTED,
              createdById: userId,
              postedById: userId,
              postedAt: new Date(),
            },
          });
        }

        validatedLines.push({
          itemId: line.itemId,
          quantity: qty,
          unitCost,
          totalCost: lineTotal,
        });
      }

      // Build balanced double-entry journal
      const journalLines: any[] = [];
      const gainLossAccId = isIncrease
        ? settings.inventoryAdjustmentGainAccountId || settings.inventoryAdjustmentAccountId
        : settings.inventoryAdjustmentAccountId;

      if (isIncrease) {
        // DR Inventory Control / CR Adjustment Gain
        journalLines.push({
          accountId: settings.inventoryAccountId,
          description: `Penyesuaian Stok Masuk (Surplus) - Ref: ${adjustmentNumber}`,
          debit: totalCost.toNumber(),
          credit: 0,
        });
        journalLines.push({
          accountId: gainLossAccId,
          description: `Pendapatan / Selisih Lebih Penyesuaian Persediaan - Ref: ${adjustmentNumber}`,
          debit: 0,
          credit: totalCost.toNumber(),
        });
      } else {
        // DR Adjustment Loss / CR Inventory Control
        journalLines.push({
          accountId: gainLossAccId,
          description: `Beban Kerugian / Selisih Kurang Persediaan - Ref: ${adjustmentNumber}`,
          debit: totalCost.toNumber(),
          credit: 0,
        });
        journalLines.push({
          accountId: settings.inventoryAccountId,
          description: `Pengurangan Persediaan Penyesuaian - Ref: ${adjustmentNumber}`,
          debit: 0,
          credit: totalCost.toNumber(),
        });
      }

      const journal = await this.accountingService.createJournalEntry(
        {
          entityId: dto.entityId,
          entryDate: adjustmentDate.toISOString().split('T')[0],
          description: `[ADJUSTMENT] ${dto.adjustmentType} Persediaan: ${dto.reason}`,
          reference: adjustmentNumber,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      const adjustment = await tx.stockAdjustment.create({
        data: {
          organizationId,
          entityId: dto.entityId,
          adjustmentNumber,
          warehouseId: dto.warehouseId,
          adjustmentDate,
          adjustmentType: dto.adjustmentType,
          status: StockAdjustmentStatus.POSTED,
          totalCost,
          reason: dto.reason,
          reference: dto.reference,
          journalEntryId: journal.id,
          createdById: userId,
          postedById: userId,
          postedAt: new Date(),
          lines: {
            create: validatedLines,
          },
        },
        include: {
          lines: { include: { item: true } },
          warehouse: true,
          journalEntry: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'INVENTORY_ADJUSTMENT_POSTED',
        resourceType: 'StockAdjustment',
        resourceId: adjustment.id,
        metadata: {
          adjustmentNumber: adjustment.adjustmentNumber,
          type: adjustment.adjustmentType,
          totalCost: totalCost.toNumber(),
        },
      });

      return adjustment;
    });
  }
}
