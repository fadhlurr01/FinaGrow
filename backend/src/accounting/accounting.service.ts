import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { LedgerFilterDto, TrialBalanceFilterDto } from './dto/ledger-filter.dto';
import { AccountType, AccountSubtype, NormalBalance, JournalEntryStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const DEFAULT_CHART_OF_ACCOUNTS = [
  // 1. ASSETS
  { code: '1110', name: 'Kas & Bank Utama (IDR)', type: AccountType.ASSET, subtype: AccountSubtype.CASH_AND_EQUIVALENT, normalBalance: NormalBalance.DEBIT, description: 'Akun kas dan operasional bank utama' },
  { code: '1120', name: 'Piutang Usaha (Accounts Receivable)', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE, normalBalance: NormalBalance.DEBIT, description: 'Tagihan penjualan pelanggan belum lunas' },
  { code: '1130', name: 'Persediaan Barang Dagang (Inventory)', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY, normalBalance: NormalBalance.DEBIT, description: 'Nilai perolehan stok barang di gudang' },
  { code: '1140', name: 'Uang Muka Pembelian / Biaya Dibayar Dimuka', type: AccountType.ASSET, subtype: AccountSubtype.PREPAID_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Uang muka operasional dan asuransi dibayar di muka' },
  { code: '1150', name: 'PPN Masukan (Input Tax Receivable)', type: AccountType.ASSET, subtype: AccountSubtype.OTHER_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Faktur pajak masukan atas pembelian barang/jasa' },
  { code: '1510', name: 'Aset Tetap - Peralatan & Inventaris Kantor', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Komputer, mesin, dan peralatan operasional kantor' },
  { code: '1520', name: 'Akumulasi Penyusutan Aset Tetap', type: AccountType.ASSET, subtype: AccountSubtype.ACCUMULATED_DEPRECIATION, normalBalance: NormalBalance.CREDIT, description: 'Kontra akun nilai akumulasi depresiasi aset tetap' },

  // 2. LIABILITIES
  { code: '2110', name: 'Utang Usaha (Accounts Payable)', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCOUNTS_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'Kewajiban tagihan kepada vendor atau supplier' },
  { code: '2120', name: 'Beban Akrual / Utang Biaya', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCRUED_EXPENSE, normalBalance: NormalBalance.CREDIT, description: 'Beban operasional yang masih harus dibayar' },
  { code: '2130', name: 'Utang Pajak - PPN Keluaran (Output Tax)', type: AccountType.LIABILITY, subtype: AccountSubtype.TAX_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'Kewajiban setoran faktur pajak keluaran PPN 11%' },
  { code: '2140', name: 'Utang Pajak - PPh 21 / 23 / Final', type: AccountType.LIABILITY, subtype: AccountSubtype.TAX_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'Kewajiban pemotongan pajak penghasilan karyawan & vendor' },
  { code: '2150', name: 'Uang Muka Penjualan (Customer Deposits)', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, normalBalance: NormalBalance.CREDIT, description: 'Deposit atau uang muka diterima dari pelanggan' },

  // 3. EQUITY
  { code: '3110', name: 'Modal Disetor (Paid-in Capital)', type: AccountType.EQUITY, subtype: AccountSubtype.EQUITY, normalBalance: NormalBalance.CREDIT, description: 'Modal awal pendirian perusahaan dari pemegang saham' },
  { code: '3210', name: 'Laba Ditahan (Retained Earnings)', type: AccountType.EQUITY, subtype: AccountSubtype.RETAINED_EARNINGS, normalBalance: NormalBalance.CREDIT, description: 'Akumulasi laba bersih periode-periode sebelumnya' },

  // 4. REVENUE
  { code: '4110', name: 'Pendapatan Penjualan Produk', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Pendapatan bruto penjualan barang dagangan' },
  { code: '4120', name: 'Pendapatan Jasa & Konsultasi', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Pendapatan layanan profesional & jasa' },

  // 5. COGS & EXPENSES
  { code: '5110', name: 'Beban Pokok Penjualan (HPP / COGS)', type: AccountType.EXPENSE, subtype: AccountSubtype.COST_OF_GOODS_SOLD, normalBalance: NormalBalance.DEBIT, description: 'Harga pokok barang yang berhasil terjual' },
  { code: '6110', name: 'Beban Gaji & Tunjangan Karyawan', type: AccountType.EXPENSE, subtype: AccountSubtype.PAYROLL_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Gaji pokok, BPJS, dan insentif payroll staf' },
  { code: '6120', name: 'Beban Sewa & Pemeliharaan Gedung', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Sewa kantor, gudang, dan pemeliharaan sarana kerja' },
  { code: '6130', name: 'Beban Listrik, Air, & Telekomunikasi', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Tagihan utilitas bulanan dan jaringan internet kantor' },
  { code: '6140', name: 'Beban Penyusutan Aset Tetap', type: AccountType.EXPENSE, subtype: AccountSubtype.DEPRECIATION_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Alokasi amortisasi & penyusutan berkala aset perusahaan' },
  { code: '6150', name: 'Beban Pemasaran & Operasional Umum', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Iklan digital, transportasi, dan konsumsi operasional' },
  { code: '8110', name: 'Pendapatan Lain-lain / Bunga Bank', type: AccountType.REVENUE, subtype: AccountSubtype.NON_OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Bunga tabungan giro dan keuntungan selisih kurs' },
  { code: '9110', name: 'Beban Administrasi Bank & Pajak Bunga', type: AccountType.EXPENSE, subtype: AccountSubtype.NON_OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Biaya admin transfer bank dan potongan pajak bunga' },
];

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ==========================================
  // 1. CHART OF ACCOUNTS (COA) ENGINE
  // ==========================================

  async seedDefaultAccounts(organizationId: string, entityId: string) {
    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
      await this.prisma.account.upsert({
        where: {
          entityId_code: {
            entityId,
            code: acc.code,
          },
        },
        update: {},
        create: {
          organizationId,
          entityId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
          normalBalance: acc.normalBalance,
          description: acc.description,
          isSystem: true,
        },
      });
    }
  }

  async getAccounts(organizationId: string, entityId?: string) {
    const where: Prisma.AccountWhereInput = { organizationId };
    if (entityId) {
      where.entityId = entityId;
    }

    const accounts = await this.prisma.account.findMany({
      where,
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return accounts;
  }

  async getAccountById(id: string, organizationId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { code: 'asc' },
        },
        entity: true,
      },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Account not found in this organization.');
    }

    return account;
  }

  async createAccount(dto: CreateAccountDto, organizationId: string, userId: string) {
    const code = dto.code.trim();

    // 1. Verify entity belongs to organization
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Target entity does not belong to this organization.');
    }

    // 2. Check code uniqueness per entity
    const existing = await this.prisma.account.findUnique({
      where: {
        entityId_code: {
          entityId: dto.entityId,
          code,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Account code '${code}' already exists in this entity.`);
    }

    // 3. Verify parent account if specified
    if (dto.parentId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.entityId !== dto.entityId) {
        throw new BadRequestException('Parent account must belong to the exact same entity.');
      }
    }

    // 4. Create Account
    const account = await this.prisma.account.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        code,
        name: dto.name.trim(),
        type: dto.type,
        subtype: dto.subtype,
        parentId: dto.parentId,
        description: dto.description?.trim(),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ACCOUNT_CREATED',
      resourceType: 'Account',
      resourceId: account.id,
      metadata: { code: account.code, name: account.name, type: account.type },
    });

    return account;
  }

  async updateAccount(
    id: string,
    dto: UpdateAccountDto,
    organizationId: string,
    userId: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Account not found.');
    }

    // Prevent circular parent hierarchy
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('An account cannot be its own parent.');
      }
      const parent = await this.prisma.account.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.entityId !== account.entityId) {
        throw new BadRequestException('Parent account must belong to the exact same entity.');
      }
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        subtype: dto.subtype,
        parentId: dto.parentId,
        description: dto.description?.trim(),
        isActive: dto.isActive,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ACCOUNT_UPDATED',
      resourceType: 'Account',
      resourceId: updated.id,
      metadata: { code: updated.code, name: updated.name },
    });

    return updated;
  }

  async deactivateAccount(id: string, organizationId: string, userId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        journalLines: {
          take: 1,
        },
      },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Account not found.');
    }

    if (account.isSystem) {
      throw new ForbiddenException('Protected system accounts cannot be deactivated or deleted.');
    }

    if (account.journalLines.length > 0) {
      // Soft-deactivate if historical activity exists
      const deactivated = await this.prisma.account.update({
        where: { id },
        data: { isActive: false },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'ACCOUNT_DEACTIVATED',
        resourceType: 'Account',
        resourceId: id,
        metadata: { code: account.code, name: account.name, reason: 'Has journal history' },
      });

      return {
        message: `Account '${account.code}' has existing journal activity and was safely deactivated.`,
        account: deactivated,
      };
    }

    // Safe deletion if completely unused
    await this.prisma.account.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ACCOUNT_DELETED',
      resourceType: 'Account',
      resourceId: id,
      metadata: { code: account.code, name: account.name },
    });

    return { message: `Account '${account.code}' was successfully removed.` };
  }

  // ==========================================
  // 2. DOUBLE-ENTRY JOURNAL ENGINE
  // ==========================================

  private validateJournalLines(lines: CreateJournalEntryDto['lines']) {
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = new Decimal(line.debit || 0);
      const credit = new Decimal(line.credit || 0);

      // Rule 1: Non-negative amounts
      if (debit.isNegative() || credit.isNegative()) {
        throw new BadRequestException(`Line ${i + 1}: Monetary values cannot be negative.`);
      }

      // Rule 2: Cannot have both debit and credit
      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BadRequestException(
          `Line ${i + 1}: A line cannot specify both debit (${debit}) and credit (${credit}).`,
        );
      }

      // Rule 3: Cannot both be zero
      if (debit.isZero() && credit.isZero()) {
        throw new BadRequestException(`Line ${i + 1}: Either debit or credit must be greater than zero.`);
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    }

    return { totalDebit, totalCredit };
  }

  async createJournalEntry(
    dto: CreateJournalEntryDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify target entity
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Entity does not belong to this organization.');
    }

    // 2. Validate line invariants
    const { totalDebit, totalCredit } = this.validateJournalLines(dto.lines);

    const targetStatus = dto.status || JournalEntryStatus.DRAFT;

    // 3. Double-entry balancing rule: If posting, SUM(Debit) === SUM(Credit)
    if (targetStatus === JournalEntryStatus.POSTED) {
      if (!totalDebit.equals(totalCredit)) {
        throw new BadRequestException(
          `Double-entry balancing failed: Total Debits (${totalDebit.toFixed(2)}) must exactly equal Total Credits (${totalCredit.toFixed(2)}).`,
        );
      }
    }

    // 4. Verify all accounts belong to the entity and are active
    const accountIds = Array.from(new Set(dto.lines.map((l) => l.accountId)));
    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: accountIds },
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more referenced accounts do not exist.');
    }

    for (const acc of accounts) {
      if (acc.organizationId !== organizationId) {
        throw new ForbiddenException(`Account '${acc.code}' belongs to another organization.`);
      }
      if (acc.entityId !== dto.entityId) {
        throw new ForbiddenException(`Account '${acc.code}' belongs to a different entity.`);
      }
      if (!acc.isActive) {
        throw new BadRequestException(`Account '${acc.code} - ${acc.name}' is inactive and cannot accept postings.`);
      }
    }

    // 5. Generate deterministic human-readable journal number: JE-YYYY-XXXXXX
    const year = new Date(dto.entryDate).getFullYear();
    const count = await this.prisma.journalEntry.count({
      where: { entityId: dto.entityId },
    });
    const entryNumber = `JE-${year}-${String(count + 1).padStart(6, '0')}`;

    // 6. Execute atomic database transaction
    const journalEntry = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          organizationId,
          entityId: dto.entityId,
          entryNumber,
          entryDate: new Date(dto.entryDate),
          reference: dto.reference?.trim(),
          description: dto.description.trim(),
          status: targetStatus,
          currency: dto.currency || 'IDR',
          exchangeRate: new Decimal(dto.exchangeRate || 1.0),
          postedAt: targetStatus === JournalEntryStatus.POSTED ? new Date() : null,
          postedById: targetStatus === JournalEntryStatus.POSTED ? userId : null,
          lines: {
            create: dto.lines.map((line) => ({
              accountId: line.accountId,
              description: line.description?.trim(),
              debit: new Decimal(line.debit || 0),
              credit: new Decimal(line.credit || 0),
              currency: dto.currency || 'IDR',
              exchangeRate: new Decimal(dto.exchangeRate || 1.0),
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });

      return entry;
    });

    // 7. Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: targetStatus === JournalEntryStatus.POSTED ? 'JOURNAL_POSTED' : 'JOURNAL_CREATED',
      resourceType: 'JournalEntry',
      resourceId: journalEntry.id,
      metadata: {
        entryNumber: journalEntry.entryNumber,
        status: journalEntry.status,
        totalAmount: totalDebit.toString(),
      },
    });

    return journalEntry;
  }

  async postJournalEntry(id: string, organizationId: string, userId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    if (!entry || entry.organizationId !== organizationId) {
      throw new NotFoundException('Journal entry not found.');
    }

    if (entry.status === JournalEntryStatus.POSTED) {
      throw new BadRequestException('This journal entry is already posted.');
    }

    if (entry.status === JournalEntryStatus.VOIDED) {
      throw new BadRequestException('Cannot post a voided journal entry.');
    }

    // Verify double-entry balancing
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of entry.lines) {
      if (!line.account.isActive) {
        throw new BadRequestException(`Account '${line.account.code}' is inactive and cannot be posted.`);
      }
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Cannot post unbalanced journal entry: Debits (${totalDebit.toFixed(2)}) !== Credits (${totalCredit.toFixed(2)}).`,
      );
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: userId,
      },
      include: {
        lines: { include: { account: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'JOURNAL_POSTED',
      resourceType: 'JournalEntry',
      resourceId: updated.id,
      metadata: { entryNumber: updated.entryNumber, totalDebit: totalDebit.toString() },
    });

    return updated;
  }

  async voidJournalEntry(id: string, organizationId: string, userId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: { account: true },
        },
      },
    });

    if (!entry || entry.organizationId !== organizationId) {
      throw new NotFoundException('Journal entry not found.');
    }

    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException('Only POSTED journal entries can be voided.');
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.journalEntry.count({
      where: { entityId: entry.entityId },
    });
    const reversalNumber = `REV-${entry.entryNumber}`;

    const { voided, reversal } = await this.prisma.$transaction(async (tx) => {
      // 1. Mark original entry as VOIDED
      const voidedRecord = await tx.journalEntry.update({
        where: { id },
        data: { status: JournalEntryStatus.VOIDED },
      });

      // 2. Create immutable Reversing Journal Entry: DR of original becomes CR, CR of original becomes DR
      const reversalRecord = await tx.journalEntry.create({
        data: {
          organizationId,
          entityId: entry.entityId,
          entryNumber: reversalNumber,
          entryDate: new Date(),
          reference: `REVERSAL:${entry.entryNumber}`,
          description: `[REVERSAL] Pembatalan Entri Jurnal: ${entry.description}`,
          status: JournalEntryStatus.POSTED,
          currency: entry.currency,
          exchangeRate: entry.exchangeRate,
          postedAt: new Date(),
          postedById: userId,
          lines: {
            create: (entry.lines || []).map((line) => ({
              accountId: line.accountId,
              description: `Reversal of line: ${line.description || ''}`,
              debit: line.credit || 0, // Invert
              credit: line.debit || 0,  // Invert
              currency: line.currency || 'IDR',
              exchangeRate: line.exchangeRate || 1.0,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      return { voided: voidedRecord, reversal: reversalRecord };
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'JOURNAL_VOIDED',
      resourceType: 'JournalEntry',
      resourceId: voided.id,
      metadata: {
        originalEntryNumber: voided.entryNumber,
        reversalEntryNumber: reversal.entryNumber,
      },
    });

    return voided;
  }

  async getJournalEntries(organizationId: string, filter: JournalFilterDto) {
    const where: Prisma.JournalEntryWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.status) where.status = filter.status;
    if (filter.dateFrom || filter.dateTo) {
      where.entryDate = {};
      if (filter.dateFrom) where.entryDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.entryDate.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { entryNumber: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { reference: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
        },
        postedBy: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  async getJournalEntryById(id: string, organizationId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        postedBy: {
          select: { id: true, email: true, fullName: true },
        },
        entity: true,
      },
    });

    if (!entry || entry.organizationId !== organizationId) {
      throw new NotFoundException('Journal entry not found.');
    }

    return entry;
  }

  // ==========================================
  // 3. GENERAL LEDGER (GL) ENGINE
  // ==========================================

  async getGeneralLedger(organizationId: string, filter: LedgerFilterDto) {
    const lineWhere: Prisma.JournalLineWhereInput = {
      journalEntry: {
        organizationId,
        status: JournalEntryStatus.POSTED,
      },
    };

    if (filter.entityId) {
      lineWhere.journalEntry.entityId = filter.entityId;
    }

    if (filter.accountId) {
      lineWhere.accountId = filter.accountId;
    }

    if (filter.accountCode) {
      lineWhere.account = { code: filter.accountCode };
    }

    if (filter.dateFrom || filter.dateTo) {
      lineWhere.journalEntry.entryDate = {};
      if (filter.dateFrom) lineWhere.journalEntry.entryDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) lineWhere.journalEntry.entryDate.lte = new Date(filter.dateTo);
    }

    const lines = await this.prisma.journalLine.findMany({
      where: lineWhere,
      include: {
        account: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            reference: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { journalEntry: { entryNumber: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    // Group lines by account to calculate mathematically accurate running balances
    const accountRunningBalances: Record<string, Decimal> = {};
    const ledgerStream: any[] = [];

    for (const line of lines) {
      const accId = line.accountId;
      const accType = line.account.type;

      if (!accountRunningBalances[accId]) {
        accountRunningBalances[accId] = new Decimal(0);
      }

      const prev = accountRunningBalances[accId];
      let newBalance = prev;

      // Normal balance calculation rules
      // ASSET & EXPENSE: Normal Debit (Debit increases, Credit decreases)
      // LIABILITY, EQUITY & REVENUE: Normal Credit (Credit increases, Debit decreases)
      if (accType === AccountType.ASSET || accType === AccountType.EXPENSE) {
        newBalance = prev.plus(line.debit).minus(line.credit);
      } else {
        newBalance = prev.plus(line.credit).minus(line.debit);
      }

      accountRunningBalances[accId] = newBalance;

      ledgerStream.push({
        lineId: line.id,
        journalEntryId: line.journalEntry.id,
        entryNumber: line.journalEntry.entryNumber,
        entryDate: line.journalEntry.entryDate,
        reference: line.journalEntry.reference,
        description: line.description || line.journalEntry.description,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        debit: line.debit.toNumber(),
        credit: line.credit.toNumber(),
        runningBalance: newBalance.toNumber(),
        currency: line.currency,
      });
    }

    return {
      entries: ledgerStream.reverse(), // Most recent first for UI feed
      totalCount: ledgerStream.length,
    };
  }

  // ==========================================
  // 4. TRIAL BALANCE ENGINE
  // ==========================================

  async getTrialBalance(organizationId: string, filter: TrialBalanceFilterDto) {
    const whereAccounts: Prisma.AccountWhereInput = { organizationId };
    if (filter.entityId) {
      whereAccounts.entityId = filter.entityId;
    }

    const accounts = await this.prisma.account.findMany({
      where: whereAccounts,
      orderBy: { code: 'asc' },
    });

    const whereLines: Prisma.JournalLineWhereInput = {
      journalEntry: {
        organizationId,
        status: JournalEntryStatus.POSTED,
      },
    };

    if (filter.entityId) {
      whereLines.journalEntry.entityId = filter.entityId;
    }

    if (filter.asOfDate) {
      whereLines.journalEntry.entryDate = {
        lte: new Date(filter.asOfDate),
      };
    }

    const lines = await this.prisma.journalLine.findMany({
      where: whereLines,
      include: {
        account: true,
      },
    });

    // Sum debit & credit per account
    const debitMap: Record<string, Decimal> = {};
    const creditMap: Record<string, Decimal> = {};

    accounts.forEach((acc) => {
      debitMap[acc.id] = new Decimal(0);
      creditMap[acc.id] = new Decimal(0);
    });

    lines.forEach((line) => {
      if (debitMap[line.accountId]) {
        debitMap[line.accountId] = debitMap[line.accountId].plus(line.debit);
        creditMap[line.accountId] = creditMap[line.accountId].plus(line.credit);
      }
    });

    let grandTotalDebit = new Decimal(0);
    let grandTotalCredit = new Decimal(0);

    const trialBalanceRows = accounts.map((acc) => {
      const totalDr = debitMap[acc.id] || new Decimal(0);
      const totalCr = creditMap[acc.id] || new Decimal(0);

      let netDebit = new Decimal(0);
      let netCredit = new Decimal(0);

      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
        const net = totalDr.minus(totalCr);
        if (net.greaterThanOrEqualTo(0)) {
          netDebit = net;
        } else {
          netCredit = net.abs();
        }
      } else {
        const net = totalCr.minus(totalDr);
        if (net.greaterThanOrEqualTo(0)) {
          netCredit = net;
        } else {
          netDebit = net.abs();
        }
      }

      grandTotalDebit = grandTotalDebit.plus(netDebit);
      grandTotalCredit = grandTotalCredit.plus(netCredit);

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        totalDebit: totalDr.toNumber(),
        totalCredit: totalCr.toNumber(),
        netDebit: netDebit.toNumber(),
        netCredit: netCredit.toNumber(),
      };
    });

    return {
      asOfDate: filter.asOfDate || new Date().toISOString().slice(0, 10),
      isBalanced: grandTotalDebit.equals(grandTotalCredit),
      totalDebitBalance: grandTotalDebit.toNumber(),
      totalCreditBalance: grandTotalCredit.toNumber(),
      difference: grandTotalDebit.minus(grandTotalCredit).abs().toNumber(),
      rows: trialBalanceRows,
    };
  }
}
