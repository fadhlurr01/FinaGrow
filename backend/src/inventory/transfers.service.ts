import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ValuationService } from './valuation.service';
import { CreateStockTransferDto } from './dto/create-transfer.dto';
import {
  StockTransferStatus,
  StockMovementType,
  StockMovementStatus,
  ValuationMethod,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TransfersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private valuationService: ValuationService,
  ) {}

  private async generateTransferNumber(entityId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.stockTransfer.count({
      where: {
        entityId,
        transferDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });
    return `TRF-${year}-${String(count + 1).padStart(6, '0')}`;
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

  async getTransfers(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, sku: true, name: true } },
          },
        },
      },
      orderBy: { transferDate: 'desc' },
    });
  }

  async createTransfer(
    dto: CreateStockTransferDto,
    organizationId: string,
    userId: string,
  ) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different.');
    }

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.toWarehouseId } }),
    ]);

    if (!fromWh || fromWh.organizationId !== organizationId || fromWh.entityId !== dto.entityId) {
      throw new BadRequestException('Invalid source warehouse or cross-entity transfer detected.');
    }
    if (!toWh || toWh.organizationId !== organizationId || toWh.entityId !== dto.entityId) {
      throw new BadRequestException('Invalid destination warehouse or cross-entity transfer detected.');
    }

    const transferDate = new Date(dto.transferDate);
    const transferNumber = await this.generateTransferNumber(dto.entityId, transferDate);

    return this.prisma.$transaction(async (tx) => {
      let totalCost = new Decimal(0);
      const validatedLines: any[] = [];

      for (const line of dto.lines) {
        const item = await tx.inventoryItem.findUnique({ where: { id: line.itemId } });
        if (!item || item.organizationId !== organizationId || item.entityId !== dto.entityId) {
          throw new BadRequestException(`Invalid inventory item '${line.itemId}'.`);
        }

        const qty = new Decimal(line.quantity);
        if (qty.lte(0)) {
          throw new BadRequestException('Transfer quantity must be greater than zero.');
        }

        // Consume valuation layer from source warehouse
        const consumption = await this.valuationService.consumeInventoryValue(
          organizationId,
          dto.entityId,
          line.itemId,
          dto.fromWarehouseId,
          qty,
          item.valuationMethod,
          tx,
        );

        totalCost = totalCost.plus(consumption.totalCost);
        validatedLines.push({
          itemId: line.itemId,
          quantity: qty,
          unitCost: consumption.effectiveUnitCost,
          totalCost: consumption.totalCost,
        });

        // Create Stock Movement (TRANSFER_OUT) in Source Warehouse
        const outMovNum = await this.generateMovementNumber(dto.entityId, transferDate);
        await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: dto.entityId,
            itemId: line.itemId,
            warehouseId: dto.fromWarehouseId,
            movementNumber: outMovNum,
            movementType: StockMovementType.TRANSFER_OUT,
            movementDate: transferDate,
            quantity: qty,
            unitCost: consumption.effectiveUnitCost,
            totalCost: consumption.totalCost,
            sourceType: 'STOCK_TRANSFER',
            reference: transferNumber,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        // Create Stock Movement (TRANSFER_IN) in Destination Warehouse
        const inMovNum = await this.generateMovementNumber(dto.entityId, transferDate);
        const inMov = await tx.stockMovement.create({
          data: {
            organizationId,
            entityId: dto.entityId,
            itemId: line.itemId,
            warehouseId: dto.toWarehouseId,
            movementNumber: inMovNum,
            movementType: StockMovementType.TRANSFER_IN,
            movementDate: transferDate,
            quantity: qty,
            unitCost: consumption.effectiveUnitCost,
            totalCost: consumption.totalCost,
            sourceType: 'STOCK_TRANSFER',
            reference: transferNumber,
            status: StockMovementStatus.POSTED,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        // Create Destination FIFO Layer if applicable (preserving exact cost)
        if (item.valuationMethod === ValuationMethod.FIFO) {
          await this.valuationService.createValuationLayer(
            {
              organizationId,
              entityId: dto.entityId,
              itemId: line.itemId,
              warehouseId: dto.toWarehouseId,
              stockMovementId: inMov.id,
              quantityIn: qty,
              unitCost: consumption.effectiveUnitCost,
              layerDate: transferDate,
            },
            tx,
          );
        }
      }

      // Create Stock Transfer record marked POSTED (Zero net GL impact for same entity)
      const transfer = await tx.stockTransfer.create({
        data: {
          organizationId,
          entityId: dto.entityId,
          transferNumber,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          transferDate,
          status: StockTransferStatus.POSTED,
          totalCost,
          reference: dto.reference,
          notes: dto.notes,
          createdById: userId,
          postedById: userId,
          postedAt: new Date(),
          lines: {
            create: validatedLines,
          },
        },
        include: {
          lines: { include: { item: true } },
          fromWarehouse: true,
          toWarehouse: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'STOCK_TRANSFER_POSTED',
        resourceType: 'StockTransfer',
        resourceId: transfer.id,
        metadata: {
          transferNumber: transfer.transferNumber,
          from: fromWh.code,
          to: toWh.code,
          totalCost: transfer.totalCost.toNumber(),
        },
      });

      return transfer;
    });
  }
}
