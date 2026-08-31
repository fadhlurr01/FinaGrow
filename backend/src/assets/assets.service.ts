import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { DepreciationService } from './depreciation.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AssetStatus,
  DepreciationMethod,
  AccountType,
  AccountSubtype,
} from '@prisma/client';
import { CreateAssetCategoryDto, UpdateAssetCategoryDto } from './dto/category.dto';
import { CreateFixedAssetDto, UpdateFixedAssetDto, CapitalizeFixedAssetDto } from './dto/asset.dto';
import { CreateAssetMovementDto } from './dto/lifecycle.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
    private readonly depreciationService: DepreciationService,
  ) {}

  // ==========================================
  // ASSET CATEGORIES
  // ==========================================

  async createCategory(organizationId: string, entityId: string, dto: CreateAssetCategoryDto) {
    const existing = await this.prisma.fixedAssetCategory.findUnique({
      where: {
        entityId_code: {
          entityId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Category with code ${dto.code} already exists for this entity`);
    }

    // Validate account existence in same entity
    await this.validateAccount(entityId, dto.fixedAssetAccountId, 'Fixed Asset');
    await this.validateAccount(entityId, dto.accumulatedDepreciationAccountId, 'Accumulated Depreciation');
    await this.validateAccount(entityId, dto.depreciationExpenseAccountId, 'Depreciation Expense');
    await this.validateAccount(entityId, dto.gainOnDisposalAccountId, 'Gain on Disposal');
    await this.validateAccount(entityId, dto.lossOnDisposalAccountId, 'Loss on Disposal');

    return await this.prisma.fixedAssetCategory.create({
      data: {
        organizationId,
        entityId,
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        fixedAssetAccountId: dto.fixedAssetAccountId,
        accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: dto.depreciationExpenseAccountId,
        gainOnDisposalAccountId: dto.gainOnDisposalAccountId,
        lossOnDisposalAccountId: dto.lossOnDisposalAccountId,
        defaultUsefulLifeMonths: dto.defaultUsefulLifeMonths || null,
        defaultDepreciationMethod: dto.defaultDepreciationMethod || DepreciationMethod.STRAIGHT_LINE,
        defaultResidualValuePercent: new Decimal(dto.defaultResidualValuePercent || 0),
        isActive: true,
      },
      include: {
        fixedAssetAccount: true,
        accumulatedDepreciationAccount: true,
        depreciationExpenseAccount: true,
      },
    });
  }

  async listCategories(organizationId: string, entityId: string) {
    return await this.prisma.fixedAssetCategory.findMany({
      where: { organizationId, entityId },
      include: {
        fixedAssetAccount: true,
        accumulatedDepreciationAccount: true,
        depreciationExpenseAccount: true,
        gainOnDisposalAccount: true,
        lossOnDisposalAccount: true,
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getCategory(organizationId: string, entityId: string, id: string) {
    const category = await this.prisma.fixedAssetCategory.findFirst({
      where: { id, organizationId, entityId },
      include: {
        fixedAssetAccount: true,
        accumulatedDepreciationAccount: true,
        depreciationExpenseAccount: true,
        gainOnDisposalAccount: true,
        lossOnDisposalAccount: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Fixed Asset Category ${id} not found`);
    }

    return category;
  }

  async updateCategory(organizationId: string, entityId: string, id: string, dto: UpdateAssetCategoryDto) {
    await this.getCategory(organizationId, entityId, id);

    if (dto.fixedAssetAccountId) await this.validateAccount(entityId, dto.fixedAssetAccountId, 'Fixed Asset');
    if (dto.accumulatedDepreciationAccountId) await this.validateAccount(entityId, dto.accumulatedDepreciationAccountId, 'Accumulated Depreciation');
    if (dto.depreciationExpenseAccountId) await this.validateAccount(entityId, dto.depreciationExpenseAccountId, 'Depreciation Expense');

    return await this.prisma.fixedAssetCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.fixedAssetAccountId && { fixedAssetAccountId: dto.fixedAssetAccountId }),
        ...(dto.accumulatedDepreciationAccountId && { accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId }),
        ...(dto.depreciationExpenseAccountId && { depreciationExpenseAccountId: dto.depreciationExpenseAccountId }),
        ...(dto.gainOnDisposalAccountId && { gainOnDisposalAccountId: dto.gainOnDisposalAccountId }),
        ...(dto.lossOnDisposalAccountId && { lossOnDisposalAccountId: dto.lossOnDisposalAccountId }),
        ...(dto.defaultUsefulLifeMonths !== undefined && { defaultUsefulLifeMonths: dto.defaultUsefulLifeMonths }),
        ...(dto.defaultDepreciationMethod && { defaultDepreciationMethod: dto.defaultDepreciationMethod }),
        ...(dto.defaultResidualValuePercent !== undefined && {
          defaultResidualValuePercent: new Decimal(dto.defaultResidualValuePercent),
        }),
      },
    });
  }

  // ==========================================
  // FIXED ASSETS REGISTER
  // ==========================================

  async createAsset(organizationId: string, entityId: string, dto: CreateFixedAssetDto, userId: string) {
    const category = await this.prisma.fixedAssetCategory.findFirst({
      where: { id: dto.categoryId, organizationId, entityId, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Invalid or inactive category for this entity');
    }

    // Validate Vendor and PO if provided
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId, entityId },
      });
      if (!vendor) throw new BadRequestException('Invalid vendorId for this entity');
    }

    if (dto.vendorBillId) {
      const bill = await this.prisma.vendorBill.findFirst({
        where: { id: dto.vendorBillId, organizationId, entityId },
      });
      if (!bill) throw new BadRequestException('Invalid vendorBillId for this entity');
    }

    const assetNumber = await this.generateAssetNumber(entityId, category.code);

    const cost = new Decimal(dto.acquisitionCost);
    const residual = new Decimal(dto.residualValue || 0);
    const depreciable = Decimal.max(new Decimal(0), cost.minus(residual));
    const usefulLife = dto.usefulLifeMonths ?? category.defaultUsefulLifeMonths ?? null;
    const method = dto.depreciationMethod ?? category.defaultDepreciationMethod;

    return await this.prisma.fixedAsset.create({
      data: {
        organizationId,
        entityId,
        assetNumber,
        categoryId: category.id,
        name: dto.name,
        description: dto.description || null,
        serialNumber: dto.serialNumber || null,
        acquisitionDate: new Date(dto.acquisitionDate),
        acquisitionCost: cost,
        residualValue: residual,
        depreciableAmount: depreciable,
        usefulLifeMonths: usefulLife,
        depreciationMethod: method,
        accumulatedDepreciation: new Decimal(0),
        netBookValue: cost,
        status: AssetStatus.DRAFT,
        vendorId: dto.vendorId || null,
        vendorBillId: dto.vendorBillId || null,
        vendorBillLineId: dto.vendorBillLineId || null,
        purchaseOrderId: dto.purchaseOrderId || null,
        location: dto.location || null,
        department: dto.department || null,
        custodian: dto.custodian || null,
        reference: dto.reference || null,
        createdById: userId,
      },
      include: {
        category: true,
        vendor: true,
      },
    });
  }

  async listAssets(
    organizationId: string,
    entityId: string,
    filters?: {
      status?: AssetStatus;
      categoryId?: string;
      search?: string;
    },
  ) {
    const where: any = { organizationId, entityId };

    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.search) {
      where.OR = [
        { assetNumber: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.fixedAsset.findMany({
      where,
      include: {
        category: true,
        vendor: true,
        vendorBill: true,
      },
      orderBy: { assetNumber: 'asc' },
    });
  }

  async getAsset(organizationId: string, entityId: string, id: string) {
    const asset = await this.prisma.fixedAsset.findFirst({
      where: { id, organizationId, entityId },
      include: {
        category: true,
        vendor: true,
        vendorBill: true,
        schedules: {
          orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
        },
        movements: {
          orderBy: { movementDate: 'desc' },
        },
        disposals: true,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Fixed Asset ${id} not found`);
    }

    return asset;
  }

  async updateAsset(organizationId: string, entityId: string, id: string, dto: UpdateFixedAssetDto) {
    await this.getAsset(organizationId, entityId, id);

    return await this.prisma.fixedAsset.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.custodian !== undefined && { custodian: dto.custodian }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
      },
    });
  }

  // ==========================================
  // CAPITALIZATION
  // ==========================================

  async capitalizeAsset(
    organizationId: string,
    entityId: string,
    assetId: string,
    dto: CapitalizeFixedAssetDto,
    userId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({
        where: { id: assetId, organizationId, entityId },
        include: { category: true, vendorBill: true },
      });

      if (!asset) {
        throw new NotFoundException(`Fixed Asset ${assetId} not found`);
      }

      if (asset.status !== AssetStatus.DRAFT) {
        throw new BadRequestException(`Only DRAFT assets can be capitalized. Current status: ${asset.status}`);
      }

      const capitalizationDate = new Date(dto.capitalizationDate);
      const depreciationStartDate = dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : capitalizationDate;

      let journalEntryId = asset.journalEntryId;

      // If asset was not already capitalized via Vendor Bill, create direct capitalization journal
      if (!asset.vendorBillId && !journalEntryId) {
        const creditAccountId = dto.creditAccountId;
        if (!creditAccountId) {
          throw new BadRequestException(
            'creditAccountId (Bank or AP) is required when capitalizing asset directly without a linked Vendor Bill',
          );
        }

        const costNum = Number(asset.acquisitionCost);

        const journal = await this.accountingService.createJournalEntry(
          {
            entityId,
            entryDate: dto.capitalizationDate,
            description: `Asset Capitalization - ${asset.assetNumber} (${asset.name})`,
            reference: `CAP-${asset.assetNumber}`,
            lines: [
              {
                accountId: asset.category.fixedAssetAccountId,
                debit: costNum,
                credit: 0,
                description: `Fixed Asset Cost - ${asset.name}`,
              },
              {
                accountId: creditAccountId,
                debit: 0,
                credit: costNum,
                description: `Direct acquisition funding for ${asset.assetNumber}`,
              },
            ],
          },
          organizationId,
          userId,
        );

        await this.accountingService.postJournalEntry(journal.id, organizationId, userId);
        journalEntryId = journal.id;
      }

      // Generate depreciation schedule
      await this.depreciationService.generateScheduleForAsset(
        tx,
        asset.id,
        asset.acquisitionCost,
        asset.residualValue,
        asset.usefulLifeMonths,
        asset.depreciationMethod,
        depreciationStartDate,
      );

      // Update asset to ACTIVE
      const updatedAsset = await tx.fixedAsset.update({
        where: { id: asset.id },
        data: {
          status: AssetStatus.ACTIVE,
          capitalizationDate,
          depreciationStartDate,
          capitalizedById: userId,
          capitalizedAt: new Date(),
          journalEntryId,
        },
        include: {
          category: true,
          schedules: true,
        },
      });

      return updatedAsset;
    });
  }

  // ==========================================
  // ASSET MOVEMENTS / LOCATION TRANSFERS
  // ==========================================

  async recordMovement(
    organizationId: string,
    entityId: string,
    assetId: string,
    dto: CreateAssetMovementDto,
    userId: string,
  ) {
    const asset = await this.getAsset(organizationId, entityId, assetId);

    const movement = await this.prisma.assetMovement.create({
      data: {
        assetId: asset.id,
        fromLocation: asset.location || null,
        toLocation: dto.toLocation,
        fromCustodian: asset.custodian || null,
        toCustodian: dto.toCustodian || null,
        movementDate: new Date(dto.movementDate),
        reason: dto.reason || null,
        createdById: userId,
      },
    });

    await this.prisma.fixedAsset.update({
      where: { id: asset.id },
      data: {
        location: dto.toLocation,
        ...(dto.toCustodian !== undefined && { custodian: dto.toCustodian }),
      },
    });

    return movement;
  }

  async listMovements(organizationId: string, entityId: string, assetId?: string) {
    const where: any = {
      asset: { organizationId, entityId },
    };
    if (assetId) where.assetId = assetId;

    return await this.prisma.assetMovement.findMany({
      where,
      include: {
        asset: true,
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { movementDate: 'desc' },
    });
  }

  // ==========================================
  // ASSET-TO-GL RECONCILIATION
  // ==========================================

  async getReconciliation(organizationId: string, entityId: string) {
    // 1. Sub-ledger Register totals (ACTIVE + FULLY_DEPRECIATED assets)
    const activeAssets = await this.prisma.fixedAsset.findMany({
      where: {
        organizationId,
        entityId,
        status: { in: [AssetStatus.ACTIVE, AssetStatus.FULLY_DEPRECIATED] },
      },
    });

    const registerCost = activeAssets.reduce(
      (sum, a) => sum.plus(new Decimal(a.acquisitionCost)),
      new Decimal(0),
    );

    const registerAccumDeprec = activeAssets.reduce(
      (sum, a) => sum.plus(new Decimal(a.accumulatedDepreciation)),
      new Decimal(0),
    );

    const registerNBV = registerCost.minus(registerAccumDeprec);

    // 2. General Ledger control accounts
    // Find all fixed asset accounts
    const assetAccounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        entityId,
        type: AccountType.ASSET,
        subtype: { in: [AccountSubtype.FIXED_ASSET, AccountSubtype.ACCUMULATED_DEPRECIATION] },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              status: 'POSTED',
            },
          },
        },
      },
    });

    let glAssetCost = new Decimal(0);
    let glAccumDeprec = new Decimal(0);

    for (const acc of assetAccounts) {
      const debits = acc.journalLines.reduce((sum, l) => sum.plus(new Decimal(l.debit)), new Decimal(0));
      const credits = acc.journalLines.reduce((sum, l) => sum.plus(new Decimal(l.credit)), new Decimal(0));

      if (acc.subtype === AccountSubtype.FIXED_ASSET) {
        // Normal debit balance
        const bal = debits.minus(credits);
        glAssetCost = glAssetCost.plus(bal);
      } else if (acc.subtype === AccountSubtype.ACCUMULATED_DEPRECIATION) {
        // Normal credit balance for contra-asset
        const bal = credits.minus(debits);
        glAccumDeprec = glAccumDeprec.plus(bal);
      }
    }

    const glNBV = glAssetCost.minus(glAccumDeprec);

    const costDifference = registerCost.minus(glAssetCost);
    const depreciationDifference = registerAccumDeprec.minus(glAccumDeprec);

    const isReconciled = costDifference.isZero() && depreciationDifference.isZero();

    return {
      entityId,
      assetCount: activeAssets.length,
      assetRegisterCost: registerCost.toNumber(),
      glAssetCost: glAssetCost.toNumber(),
      costDifference: costDifference.toNumber(),
      registerAccumulatedDepreciation: registerAccumDeprec.toNumber(),
      glAccumulatedDepreciation: glAccumDeprec.toNumber(),
      depreciationDifference: depreciationDifference.toNumber(),
      netBookValue: registerNBV.toNumber(),
      glNetBookValue: glNBV.toNumber(),
      isReconciled,
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async validateAccount(entityId: string, accountId: string, label: string) {
    const acc = await this.prisma.account.findFirst({
      where: { id: accountId, entityId, isActive: true },
    });
    if (!acc) {
      throw new BadRequestException(`Invalid or inactive ${label} Account (ID: ${accountId}) for this entity`);
    }
    return acc;
  }

  private async generateAssetNumber(entityId: string, categoryCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${categoryCode.replace('CAT-', '')}-${year}`;

    const count = await this.prisma.fixedAsset.count({
      where: {
        entityId,
        assetNumber: { startsWith: prefix },
      },
    });

    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${seq}`;
  }
}
