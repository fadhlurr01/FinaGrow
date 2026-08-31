import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { DepreciationService } from './depreciation.service';
import { DisposalService } from './disposal.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AssetStatus,
  DepreciationMethod,
  DepreciationScheduleStatus,
  DepreciationRunStatus,
  DisposalType,
  DisposalStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Assets & Depreciation Subsystem (Phase 7)', () => {
  let assetsService: AssetsService;
  let depreciationService: DepreciationService;
  let disposalService: DisposalService;

  const mockOrgId = 'org-test-123';
  const mockEntityId = 'entity-test-123';
  const mockUserId = 'user-test-123';

  const mockCategoryIT = {
    id: 'cat-it-1',
    organizationId: mockOrgId,
    entityId: mockEntityId,
    code: 'CAT-IT',
    name: 'IT & Computers',
    fixedAssetAccountId: 'acc-1500',
    accumulatedDepreciationAccountId: 'acc-1510',
    depreciationExpenseAccountId: 'acc-6500',
    gainOnDisposalAccountId: 'acc-4910',
    lossOnDisposalAccountId: 'acc-5910',
    defaultUsefulLifeMonths: 36,
    defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    defaultResidualValuePercent: new Decimal(0.05),
    isActive: true,
  };

  const mockCategoryLand = {
    id: 'cat-land-1',
    organizationId: mockOrgId,
    entityId: mockEntityId,
    code: 'CAT-LAND',
    name: 'Freehold Land',
    fixedAssetAccountId: 'acc-1590',
    accumulatedDepreciationAccountId: 'acc-1510',
    depreciationExpenseAccountId: 'acc-6500',
    gainOnDisposalAccountId: 'acc-4910',
    lossOnDisposalAccountId: 'acc-5910',
    defaultUsefulLifeMonths: null,
    defaultDepreciationMethod: DepreciationMethod.NONE,
    defaultResidualValuePercent: new Decimal(0),
    isActive: true,
  };

  const mockPrisma: any = {
    fixedAssetCategory: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    fixedAsset: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    assetDepreciationSchedule: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    depreciationRun: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    assetMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    assetDisposal: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    vendor: {
      findFirst: jest.fn(),
    },
    vendorBill: {
      findFirst: jest.fn(),
    },
    cashBankAccount: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockAccountingService: any = {
    createJournalEntry: jest.fn(),
    postJournalEntry: jest.fn(),
    voidJournalEntry: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        DepreciationService,
        DisposalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingService, useValue: mockAccountingService },
      ],
    }).compile();

    assetsService = module.get<AssetsService>(AssetsService);
    depreciationService = module.get<DepreciationService>(DepreciationService);
    disposalService = module.get<DisposalService>(DisposalService);
  });

  // ==========================================
  // 1. STRAIGHT-LINE DEPRECIATION TESTS
  // ==========================================

  describe('Straight-Line Depreciation & Schedule Generation', () => {
    it('TEST 1: Straight-Line: 120m cost, 0 residual, 60 months => 2m/month', async () => {
      const rows = await depreciationService.generateScheduleForAsset(
        mockPrisma,
        'asset-1',
        new Decimal(120000000),
        new Decimal(0),
        60,
        DepreciationMethod.STRAIGHT_LINE,
        new Date('2026-01-01'),
      );

      expect(rows).toHaveLength(60);
      expect(Number(rows[0].depreciationAmount)).toBe(2000000);
      expect(Number(rows[59].depreciationAmount)).toBe(2000000);
      expect(Number(rows[59].accumulatedDepreciation)).toBe(120000000);
      expect(Number(rows[59].closingBookValue)).toBe(0);
      expect(mockPrisma.assetDepreciationSchedule.createMany).toHaveBeenCalled();
    });

    it('TEST 2: Residual Value: 100m cost, 10m residual, 60 months => 1.5m/month, NBV reaches 10m', async () => {
      const rows = await depreciationService.generateScheduleForAsset(
        mockPrisma,
        'asset-2',
        new Decimal(100000000),
        new Decimal(10000000),
        60,
        DepreciationMethod.STRAIGHT_LINE,
        new Date('2026-01-01'),
      );

      expect(rows).toHaveLength(60);
      expect(Number(rows[0].depreciationAmount)).toBe(1500000);
      expect(Number(rows[59].accumulatedDepreciation)).toBe(90000000);
      expect(Number(rows[59].closingBookValue)).toBe(10000000);
    });

    it('TEST 3: Rounding: Cost with repeating decimal reconciles exactly on final period', async () => {
      // 10,000,000 / 3 months = 3,333,333.33 ...
      const rows = await depreciationService.generateScheduleForAsset(
        mockPrisma,
        'asset-3',
        new Decimal(10000000),
        new Decimal(0),
        3,
        DepreciationMethod.STRAIGHT_LINE,
        new Date('2026-01-01'),
      );

      expect(rows).toHaveLength(3);
      expect(Number(rows[0].depreciationAmount)).toBe(3333333.33);
      expect(Number(rows[1].depreciationAmount)).toBe(3333333.33);
      // Final month adjusts remainder: 10,000,000 - 6,666,666.66 = 3,333,333.34
      expect(Number(rows[2].depreciationAmount)).toBe(3333333.34);
      expect(Number(rows[2].accumulatedDepreciation)).toBe(10000000);
      expect(Number(rows[2].closingBookValue)).toBe(0);
    });

    it('TEST 4: Land Asset: Method NONE produces zero scheduled rows and no GL impact', async () => {
      const rows = await depreciationService.generateScheduleForAsset(
        mockPrisma,
        'asset-land',
        new Decimal(500000000),
        new Decimal(0),
        null,
        DepreciationMethod.NONE,
        new Date('2026-01-01'),
      );

      expect(rows).toHaveLength(0);
    });
  });

  // ==========================================
  // 2. CAPITALIZATION & LIFECYCLE
  // ==========================================

  describe('Asset Capitalization', () => {
    it('TEST 5: Draft Asset creation does not trigger GL impact', async () => {
      mockPrisma.fixedAssetCategory.findFirst.mockResolvedValue(mockCategoryIT);
      mockPrisma.fixedAsset.count.mockResolvedValue(0);
      mockPrisma.fixedAsset.create.mockResolvedValue({
        id: 'fa-1',
        assetNumber: 'IT-2026-00001',
        status: AssetStatus.DRAFT,
        acquisitionCost: new Decimal(20000000),
      });

      const asset = await assetsService.createAsset(
        mockOrgId,
        mockEntityId,
        {
          categoryId: 'cat-it-1',
          name: 'MacBook Pro M3',
          acquisitionDate: '2026-01-10',
          acquisitionCost: 20000000,
        },
        mockUserId,
      );

      expect(asset.status).toBe(AssetStatus.DRAFT);
      expect(mockAccountingService.createJournalEntry).not.toHaveBeenCalled();
    });

    it('TEST 6: Direct Capitalization generates DR Fixed Asset / CR Bank and activates schedules', async () => {
      const draftAsset = {
        id: 'fa-1',
        organizationId: mockOrgId,
        entityId: mockEntityId,
        assetNumber: 'IT-2026-00001',
        name: 'MacBook Pro M3',
        status: AssetStatus.DRAFT,
        acquisitionCost: new Decimal(20000000),
        residualValue: new Decimal(1000000),
        usefulLifeMonths: 36,
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        category: mockCategoryIT,
        vendorBillId: null,
      };

      mockPrisma.fixedAsset.findFirst.mockResolvedValue(draftAsset);
      mockAccountingService.createJournalEntry.mockResolvedValue({ id: 'je-cap-1' });
      mockPrisma.fixedAsset.update.mockResolvedValue({
        ...draftAsset,
        status: AssetStatus.ACTIVE,
      });

      const capitalized = await assetsService.capitalizeAsset(
        mockOrgId,
        mockEntityId,
        'fa-1',
        {
          capitalizationDate: '2026-01-15',
          creditAccountId: 'acc-1002', // Bank BCA
        },
        mockUserId,
      );

      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Asset Capitalization'),
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-1500', debit: 20000000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-1002', debit: 0, credit: 20000000 }),
          ]),
        }),
        mockOrgId,
        mockUserId,
      );
      expect(mockAccountingService.postJournalEntry).toHaveBeenCalledWith('je-cap-1', mockOrgId, mockUserId);
      expect(capitalized.status).toBe(AssetStatus.ACTIVE);
    });
  });

  // ==========================================
  // 3. MONTHLY DEPRECIATION RUNS
  // ==========================================

  describe('Depreciation Runs & Idempotency', () => {
    it('TEST 7: Post monthly depreciation run creates DR Depreciation Expense / CR Accumulated Depreciation', async () => {
      mockPrisma.depreciationRun.findUnique.mockResolvedValue(null);
      mockPrisma.assetDepreciationSchedule.findMany.mockResolvedValue([
        {
          id: 'sch-1',
          assetId: 'fa-1',
          depreciationAmount: new Decimal(500000),
          asset: {
            id: 'fa-1',
            assetNumber: 'IT-2026-00001',
            acquisitionCost: new Decimal(20000000),
            residualValue: new Decimal(1000000),
            status: AssetStatus.ACTIVE,
            category: mockCategoryIT,
          },
        },
      ]);
      mockAccountingService.createJournalEntry.mockResolvedValue({ id: 'je-depr-1' });
      mockPrisma.depreciationRun.create.mockResolvedValue({
        id: 'run-1',
        runNumber: 'DEPR-202601-0001',
        status: DepreciationRunStatus.POSTED,
      });

      const result = await depreciationService.postRun(mockOrgId, mockEntityId, 2026, 1, mockUserId);

      expect(result.status).toBe(DepreciationRunStatus.POSTED);
      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-6500', debit: 500000, credit: 0 }),
            expect.objectContaining({ accountId: 'acc-1510', debit: 0, credit: 500000 }),
          ]),
        }),
        mockOrgId,
        mockUserId,
      );
      expect(mockAccountingService.postJournalEntry).toHaveBeenCalledWith('je-depr-1', mockOrgId, mockUserId);
    });

    it('TEST 8: Duplicate depreciation run posting is rejected', async () => {
      mockPrisma.depreciationRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: DepreciationRunStatus.POSTED,
      });

      await expect(
        depreciationService.postRun(mockOrgId, mockEntityId, 2026, 1, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('TEST 9: Depreciation reversal voids journal and restores schedule status', async () => {
      mockPrisma.depreciationRun.findFirst.mockResolvedValue({
        id: 'run-1',
        status: DepreciationRunStatus.POSTED,
        journalEntryId: 'je-depr-1',
        schedules: [
          {
            assetId: 'fa-1',
            asset: {
              id: 'fa-1',
              acquisitionCost: new Decimal(20000000),
              residualValue: new Decimal(1000000),
              status: AssetStatus.ACTIVE,
            },
          },
        ],
      });
      mockPrisma.assetDepreciationSchedule.findMany.mockResolvedValue([]);
      mockPrisma.depreciationRun.update.mockResolvedValue({
        id: 'run-1',
        status: DepreciationRunStatus.REVERSED,
      });

      const res = await depreciationService.reverseRun(mockOrgId, mockEntityId, 'run-1', mockUserId);

      expect(res.status).toBe(DepreciationRunStatus.REVERSED);
      expect(mockAccountingService.voidJournalEntry).toHaveBeenCalledWith('je-depr-1', mockOrgId, mockUserId);
      expect(mockPrisma.assetDepreciationSchedule.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { depreciationRunId: 'run-1' },
          data: { status: DepreciationScheduleStatus.SCHEDULED, depreciationRunId: null, journalEntryId: null, postedAt: null },
        }),
      );
    });
  });

  // ==========================================
  // 4. DISPOSALS (GAIN, LOSS, SCRAP)
  // ==========================================

  describe('Asset Disposals & Gain / Loss Recognition', () => {
    it('TEST 11: Disposal with Gain: Cost 100m, AccDep 70m (NBV 30m), Sale 40m => Gain 10m', async () => {
      const activeAsset = {
        id: 'fa-disp-1',
        organizationId: mockOrgId,
        entityId: mockEntityId,
        assetNumber: 'VEH-2026-00001',
        name: 'Delivery Van',
        status: AssetStatus.ACTIVE,
        acquisitionCost: new Decimal(100000000),
        accumulatedDepreciation: new Decimal(70000000),
        category: mockCategoryIT,
      };

      mockPrisma.fixedAsset.findFirst.mockResolvedValue(activeAsset);
      mockPrisma.cashBankAccount.findFirst.mockResolvedValue({ id: 'bank-1', coaAccountId: 'acc-1002', isActive: true });
      mockAccountingService.createJournalEntry.mockResolvedValue({ id: 'je-disp-gain' });
      mockPrisma.assetDisposal.create.mockResolvedValue({
        id: 'disp-1',
        disposalType: DisposalType.SALE,
        status: DisposalStatus.POSTED,
      });

      const res = await disposalService.disposeAsset(
        mockOrgId,
        mockEntityId,
        'fa-disp-1',
        {
          disposalDate: '2026-06-30',
          disposalType: DisposalType.SALE,
          proceeds: 40000000,
          cashBankAccountId: 'bank-1',
        },
        mockUserId,
      );

      expect(res.gainLoss).toBe(10000000);
      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-1002', debit: 40000000, credit: 0 }), // DR Bank
            expect.objectContaining({ accountId: 'acc-1510', debit: 70000000, credit: 0 }), // DR Acc Dep
            expect.objectContaining({ accountId: 'acc-1500', debit: 0, credit: 100000000 }), // CR Asset Cost
            expect.objectContaining({ accountId: 'acc-4910', debit: 0, credit: 10000000 }), // CR Gain on Disposal
          ]),
        }),
        mockOrgId,
        mockUserId,
      );
    });

    it('TEST 12: Disposal with Loss: Cost 100m, AccDep 70m (NBV 30m), Sale 20m => Loss 10m', async () => {
      const activeAsset = {
        id: 'fa-disp-2',
        organizationId: mockOrgId,
        entityId: mockEntityId,
        assetNumber: 'VEH-2026-00002',
        name: 'Delivery Van 2',
        status: AssetStatus.ACTIVE,
        acquisitionCost: new Decimal(100000000),
        accumulatedDepreciation: new Decimal(70000000),
        category: mockCategoryIT,
      };

      mockPrisma.fixedAsset.findFirst.mockResolvedValue(activeAsset);
      mockPrisma.cashBankAccount.findFirst.mockResolvedValue({ id: 'bank-1', coaAccountId: 'acc-1002', isActive: true });
      mockAccountingService.createJournalEntry.mockResolvedValue({ id: 'je-disp-loss' });
      mockPrisma.assetDisposal.create.mockResolvedValue({
        id: 'disp-2',
        disposalType: DisposalType.SALE,
        status: DisposalStatus.POSTED,
      });

      const res = await disposalService.disposeAsset(
        mockOrgId,
        mockEntityId,
        'fa-disp-2',
        {
          disposalDate: '2026-06-30',
          disposalType: DisposalType.SALE,
          proceeds: 20000000,
          cashBankAccountId: 'bank-1',
        },
        mockUserId,
      );

      expect(res.gainLoss).toBe(-10000000);
      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-1002', debit: 20000000, credit: 0 }), // DR Bank
            expect.objectContaining({ accountId: 'acc-1510', debit: 70000000, credit: 0 }), // DR Acc Dep
            expect.objectContaining({ accountId: 'acc-5910', debit: 10000000, credit: 0 }), // DR Loss on Disposal
            expect.objectContaining({ accountId: 'acc-1500', debit: 0, credit: 100000000 }), // CR Asset Cost
          ]),
        }),
        mockOrgId,
        mockUserId,
      );
    });

    it('TEST 13: Scrap asset with zero proceeds recognizes loss equal to full NBV', async () => {
      const activeAsset = {
        id: 'fa-scrap-1',
        organizationId: mockOrgId,
        entityId: mockEntityId,
        assetNumber: 'IT-2026-00005',
        name: 'Broken Server',
        status: AssetStatus.ACTIVE,
        acquisitionCost: new Decimal(50000000),
        accumulatedDepreciation: new Decimal(45000000),
        category: mockCategoryIT,
      };

      mockPrisma.fixedAsset.findFirst.mockResolvedValue(activeAsset);
      mockAccountingService.createJournalEntry.mockResolvedValue({ id: 'je-scrap' });
      mockPrisma.assetDisposal.create.mockResolvedValue({
        id: 'disp-scrap',
        disposalType: DisposalType.SCRAP,
        status: DisposalStatus.POSTED,
      });

      const res = await disposalService.disposeAsset(
        mockOrgId,
        mockEntityId,
        'fa-scrap-1',
        {
          disposalDate: '2026-06-30',
          disposalType: DisposalType.SCRAP,
        },
        mockUserId,
      );

      expect(res.netBookValue).toBe(5000000);
      expect(res.gainLoss).toBe(-5000000);
      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: 'acc-1510', debit: 45000000, credit: 0 }), // DR Acc Dep
            expect.objectContaining({ accountId: 'acc-5910', debit: 5000000, credit: 0 }), // DR Loss
            expect.objectContaining({ accountId: 'acc-1500', debit: 0, credit: 50000000 }), // CR Asset Cost
          ]),
        }),
        mockOrgId,
        mockUserId,
      );
    });

    it('TEST 14: Disposed asset cannot be disposed again', async () => {
      mockPrisma.fixedAsset.findFirst.mockResolvedValue({
        id: 'fa-disp-already',
        status: AssetStatus.DISPOSED,
      });

      await expect(
        disposalService.disposeAsset(
          mockOrgId,
          mockEntityId,
          'fa-disp-already',
          { disposalDate: '2026-07-01', disposalType: DisposalType.SALE },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // 5. ASSET-TO-GL RECONCILIATION
  // ==========================================

  describe('Asset-to-GL Reconciliation', () => {
    it('TEST 15: Reconciled Sub-ledger matches GL Fixed Asset and Accumulated Depreciation balances', async () => {
      mockPrisma.fixedAsset.findMany.mockResolvedValue([
        {
          id: 'fa-1',
          acquisitionCost: new Decimal(500000000),
          accumulatedDepreciation: new Decimal(100000000),
          status: AssetStatus.ACTIVE,
        },
      ]);

      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'acc-1500',
          subtype: 'FIXED_ASSET',
          journalLines: [{ debit: new Decimal(500000000), credit: new Decimal(0) }],
        },
        {
          id: 'acc-1510',
          subtype: 'ACCUMULATED_DEPRECIATION',
          journalLines: [{ debit: new Decimal(0), credit: new Decimal(100000000) }],
        },
      ]);

      const recon = await assetsService.getReconciliation(mockOrgId, mockEntityId);

      expect(recon.assetRegisterCost).toBe(500000000);
      expect(recon.glAssetCost).toBe(500000000);
      expect(recon.costDifference).toBe(0);
      expect(recon.registerAccumulatedDepreciation).toBe(100000000);
      expect(recon.glAccumulatedDepreciation).toBe(100000000);
      expect(recon.depreciationDifference).toBe(0);
      expect(recon.isReconciled).toBe(true);
    });
  });

  // ==========================================
  // 6. ASSET MOVEMENT
  // ==========================================

  describe('Asset Movement', () => {
    it('TEST 22: Asset movement updates location with zero GL impact', async () => {
      mockPrisma.fixedAsset.findFirst.mockResolvedValue({
        id: 'fa-mov-1',
        location: 'Jakarta Office',
        custodian: 'Budi Santoso',
      });
      mockPrisma.assetMovement.create.mockResolvedValue({
        id: 'mov-1',
        toLocation: 'Bandung Office',
      });

      const mov = await assetsService.recordMovement(
        mockOrgId,
        mockEntityId,
        'fa-mov-1',
        {
          toLocation: 'Bandung Office',
          toCustodian: 'Siti Rahma',
          movementDate: '2026-05-15',
          reason: 'Office Relocation',
        },
        mockUserId,
      );

      expect(mov.toLocation).toBe('Bandung Office');
      expect(mockPrisma.fixedAsset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fa-mov-1' },
          data: expect.objectContaining({ location: 'Bandung Office', custodian: 'Siti Rahma' }),
        }),
      );
      expect(mockAccountingService.createJournalEntry).not.toHaveBeenCalled();
    });
  });
});
