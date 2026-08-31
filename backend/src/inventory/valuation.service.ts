import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValuationMethod, StockMovementType, StockMovementStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface ConsumedLayerDetail {
  layerId: string;
  quantityConsumed: Decimal;
  unitCost: Decimal;
  totalCost: Decimal;
}

export interface ConsumptionResult {
  totalQuantity: Decimal;
  totalCost: Decimal;
  effectiveUnitCost: Decimal;
  consumedLayers: ConsumedLayerDetail[];
}

@Injectable()
export class ValuationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves authoritative real-time on-hand quantity and inventory value
   */
  async getInventoryBalance(
    itemId: string,
    warehouseId?: string,
    tx?: any,
  ): Promise<{ quantityOnHand: Decimal; inventoryValue: Decimal; averageCost: Decimal }> {
    const client = tx || this.prisma;

    const where: any = {
      itemId,
      status: StockMovementStatus.POSTED,
    };
    if (warehouseId) where.warehouseId = warehouseId;

    const movements = await client.stockMovement.findMany({
      where,
      select: {
        movementType: true,
        quantity: true,
        totalCost: true,
      },
    });

    let totalQty = new Decimal(0);
    let totalVal = new Decimal(0);

    for (const m of movements) {
      switch (m.movementType) {
        case StockMovementType.OPENING:
        case StockMovementType.PURCHASE_RECEIPT:
        case StockMovementType.TRANSFER_IN:
        case StockMovementType.ADJUSTMENT_IN:
        case StockMovementType.RETURN_IN:
          totalQty = totalQty.plus(m.quantity);
          totalVal = totalVal.plus(m.totalCost);
          break;

        case StockMovementType.SALES_ISSUE:
        case StockMovementType.TRANSFER_OUT:
        case StockMovementType.ADJUSTMENT_OUT:
        case StockMovementType.RETURN_OUT:
          totalQty = totalQty.minus(m.quantity);
          totalVal = totalVal.minus(m.totalCost);
          break;
      }
    }

    const avgCost = totalQty.greaterThan(0)
      ? totalVal.dividedBy(totalQty)
      : new Decimal(0);

    return {
      quantityOnHand: totalQty,
      inventoryValue: Decimal.max(0, totalVal),
      averageCost: avgCost,
    };
  }

  /**
   * Consumes FIFO valuation layers or calculates Weighted Average cost for outbound stock movements
   */
  async consumeInventoryValue(
    organizationId: string,
    entityId: string,
    itemId: string,
    warehouseId: string,
    quantityToConsume: Decimal,
    valuationMethod: ValuationMethod,
    tx?: any,
  ): Promise<ConsumptionResult> {
    const client = tx || this.prisma;

    if (quantityToConsume.lte(0)) {
      throw new BadRequestException('Quantity to consume must be strictly positive.');
    }

    // 1. Check stock availability
    const balance = await this.getInventoryBalance(itemId, warehouseId, client);
    if (balance.quantityOnHand.lessThan(quantityToConsume)) {
      throw new BadRequestException(
        `Insufficient inventory stock: Available ${balance.quantityOnHand.toNumber()} units, requested ${quantityToConsume.toNumber()} units.`,
      );
    }

    if (valuationMethod === ValuationMethod.FIFO) {
      // Fetch unexhausted FIFO layers ordered by layerDate ASC, createdAt ASC
      const layers = await client.inventoryValuationLayer.findMany({
        where: {
          organizationId,
          entityId,
          itemId,
          warehouseId,
          quantityRemaining: { gt: 0 },
        },
        orderBy: [
          { layerDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      let remainingToConsume = new Decimal(quantityToConsume);
      let totalCost = new Decimal(0);
      const consumedLayers: ConsumedLayerDetail[] = [];

      for (const layer of layers) {
        if (remainingToConsume.lte(0)) break;

        const takeQty = Decimal.min(layer.quantityRemaining, remainingToConsume);
        const layerCost = takeQty.times(layer.unitCost);

        totalCost = totalCost.plus(layerCost);
        remainingToConsume = remainingToConsume.minus(takeQty);

        const newRemaining = layer.quantityRemaining.minus(takeQty);
        await client.inventoryValuationLayer.update({
          where: { id: layer.id },
          data: { quantityRemaining: newRemaining },
        });

        consumedLayers.push({
          layerId: layer.id,
          quantityConsumed: takeQty,
          unitCost: layer.unitCost,
          totalCost: layerCost,
        });
      }

      if (remainingToConsume.gt(0)) {
        throw new BadRequestException(
          `FIFO layer discrepancy: Unable to allocate full quantity of ${quantityToConsume.toNumber()} across existing layers.`,
        );
      }

      const effectiveUnitCost = totalCost.dividedBy(quantityToConsume);

      return {
        totalQuantity: quantityToConsume,
        totalCost,
        effectiveUnitCost,
        consumedLayers,
      };
    } else {
      // WEIGHTED AVERAGE
      const effectiveUnitCost = balance.averageCost;
      const totalCost = quantityToConsume.times(effectiveUnitCost);

      return {
        totalQuantity: quantityToConsume,
        totalCost,
        effectiveUnitCost,
        consumedLayers: [],
      };
    }
  }

  /**
   * Creates a new FIFO valuation layer upon stock receipt
   */
  async createValuationLayer(
    data: {
      organizationId: string;
      entityId: string;
      itemId: string;
      warehouseId: string;
      stockMovementId: string;
      quantityIn: Decimal;
      unitCost: Decimal;
      layerDate: Date;
    },
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const totalCost = data.quantityIn.times(data.unitCost);

    return client.inventoryValuationLayer.create({
      data: {
        organizationId: data.organizationId,
        entityId: data.entityId,
        itemId: data.itemId,
        warehouseId: data.warehouseId,
        stockMovementId: data.stockMovementId,
        quantityIn: data.quantityIn,
        quantityRemaining: data.quantityIn,
        unitCost: data.unitCost,
        totalCost,
        layerDate: data.layerDate,
      },
    });
  }

  /**
   * Restores FIFO layers on delivery reversal
   */
  async restoreValuationLayers(
    consumedLayers: ConsumedLayerDetail[],
    tx?: any,
  ) {
    const client = tx || this.prisma;

    for (const consumed of consumedLayers) {
      if (consumed.layerId) {
        const layer = await client.inventoryValuationLayer.findUnique({
          where: { id: consumed.layerId },
        });
        if (layer) {
          await client.inventoryValuationLayer.update({
            where: { id: layer.id },
            data: {
              quantityRemaining: layer.quantityRemaining.plus(consumed.quantityConsumed),
            },
          });
        }
      }
    }
  }
}
