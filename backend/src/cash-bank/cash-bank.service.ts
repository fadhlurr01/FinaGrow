import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCashBankAccountDto, UpdateCashBankAccountDto } from './dto/create-account.dto';
import { AccountType, CashBankAccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CashBankService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Helper to mask bank account numbers for secure display (e.g. "**** **** 1234")
   */
  private maskAccountNumber(accNum?: string | null): string | undefined {
    if (!accNum) return undefined;
    const clean = accNum.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    return `**** **** ${clean.slice(-4)}`;
  }

  /**
   * Get all Cash & Bank accounts for an organization / entity with live GL balances
   */
  async getAccounts(
    organizationId: string,
    entityId?: string,
    activeOnly?: boolean,
  ) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;
    if (activeOnly !== undefined) where.isActive = activeOnly;

    const accounts = await this.prisma.cashBankAccount.findMany({
      where,
      include: {
        coaAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            subtype: true,
            isActive: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Calculate live GL balance for each account
    const results = await Promise.all(
      accounts.map(async (acc) => {
        const glLines = await this.prisma.journalLine.findMany({
          where: {
            accountId: acc.coaAccountId,
            journalEntry: {
              organizationId,
              status: 'POSTED',
            },
          },
          select: { debit: true, credit: true },
        });

        let glBalance = new Decimal(0);
        for (const line of glLines) {
          glBalance = glBalance.plus(line.debit).minus(line.credit);
        }

        return {
          ...acc,
          glBalance: glBalance.toNumber(),
          maskedAccountNumber: this.maskAccountNumber(acc.bankAccountNumber),
        };
      }),
    );

    return results;
  }

  /**
   * Get a single Cash/Bank account with full details and live GL balance
   */
  async getAccountById(id: string, organizationId: string) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: { id },
      include: {
        coaAccount: true,
      },
    });

    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found in this organization.');
    }

    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: account.coaAccountId,
        journalEntry: {
          organizationId,
          status: 'POSTED',
        },
      },
      select: { debit: true, credit: true },
    });

    let glBalance = new Decimal(0);
    for (const line of glLines) {
      glBalance = glBalance.plus(line.debit).minus(line.credit);
    }

    return {
      ...account,
      glBalance: glBalance.toNumber(),
      maskedAccountNumber: this.maskAccountNumber(account.bankAccountNumber),
    };
  }

  /**
   * Create a new Cash/Bank account mapped to a valid COA Asset account
   */
  async createAccount(
    dto: CreateCashBankAccountDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify Entity
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Unauthorized entity access.');
    }

    // 2. Validate mapped COA account
    const coa = await this.prisma.account.findUnique({
      where: { id: dto.coaAccountId },
    });
    if (!coa || coa.organizationId !== organizationId) {
      throw new NotFoundException('Mapped COA account not found.');
    }
    if (coa.entityId !== dto.entityId) {
      throw new ForbiddenException('Mapped COA account belongs to a different entity.');
    }
    if (coa.type !== AccountType.ASSET) {
      throw new BadRequestException(`Mapped account '${coa.code}' must be an ASSET account.`);
    }
    if (!coa.isActive) {
      throw new BadRequestException(`Mapped account '${coa.code}' is inactive.`);
    }

    // 3. Generate deterministic Code (e.g. CB-001)
    const count = await this.prisma.cashBankAccount.count({
      where: { entityId: dto.entityId },
    });
    const code = `CB-${String(count + 1).padStart(3, '0')}`;

    const newAccount = await this.prisma.cashBankAccount.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        code,
        name: dto.name,
        type: dto.type || CashBankAccountType.BANK,
        coaAccountId: dto.coaAccountId,
        currency: dto.currency || entity.baseCurrency || 'IDR',
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountHolder: dto.bankAccountHolder,
        branch: dto.branch,
        swiftCode: dto.swiftCode,
        openingBalance: new Decimal(dto.openingBalance || 0),
        isActive: true,
      },
      include: {
        coaAccount: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CASH_BANK_ACCOUNT_CREATED',
      resourceType: 'CashBankAccount',
      resourceId: newAccount.id,
      metadata: { code: newAccount.code, name: newAccount.name, coaCode: coa.code },
    });

    return {
      ...newAccount,
      maskedAccountNumber: this.maskAccountNumber(newAccount.bankAccountNumber),
    };
  }

  /**
   * Update an existing Cash/Bank account
   */
  async updateAccount(
    id: string,
    dto: UpdateCashBankAccountDto,
    organizationId: string,
    userId: string,
  ) {
    const existing = await this.prisma.cashBankAccount.findUnique({
      where: { id },
    });
    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    if (dto.coaAccountId && dto.coaAccountId !== existing.coaAccountId) {
      const coa = await this.prisma.account.findUnique({
        where: { id: dto.coaAccountId },
      });
      if (!coa || coa.organizationId !== organizationId || coa.entityId !== existing.entityId) {
        throw new BadRequestException('Invalid replacement COA account.');
      }
      if (coa.type !== AccountType.ASSET || !coa.isActive) {
        throw new BadRequestException('Mapped COA account must be an active ASSET account.');
      }
    }

    const updated = await this.prisma.cashBankAccount.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        coaAccountId: dto.coaAccountId,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountHolder: dto.bankAccountHolder,
        branch: dto.branch,
        swiftCode: dto.swiftCode,
        isActive: dto.isActive,
      },
      include: {
        coaAccount: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CASH_BANK_ACCOUNT_UPDATED',
      resourceType: 'CashBankAccount',
      resourceId: updated.id,
      metadata: { code: updated.code, name: updated.name },
    });

    return {
      ...updated,
      maskedAccountNumber: this.maskAccountNumber(updated.bankAccountNumber),
    };
  }

  /**
   * Soft-deactivate a Cash/Bank account
   */
  async deactivateAccount(id: string, organizationId: string, userId: string) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: { id },
    });
    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    const deactivated = await this.prisma.cashBankAccount.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CASH_BANK_ACCOUNT_DEACTIVATED',
      resourceType: 'CashBankAccount',
      resourceId: deactivated.id,
      metadata: { code: deactivated.code },
    });

    return {
      message: `Cash/Bank account '${deactivated.code}' has been deactivated.`,
      account: deactivated,
    };
  }

  /**
   * Get authoritative live GL balance for a Cash/Bank account
   */
  async getAccountBalance(id: string, organizationId: string) {
    const account = await this.prisma.cashBankAccount.findUnique({
      where: { id },
      include: { coaAccount: true },
    });
    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }

    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: account.coaAccountId,
        journalEntry: {
          organizationId,
          status: 'POSTED',
        },
      },
      select: { debit: true, credit: true },
    });

    let glBalance = new Decimal(0);
    for (const line of glLines) {
      glBalance = glBalance.plus(line.debit).minus(line.credit);
    }

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      coaAccountId: account.coaAccountId,
      coaAccountCode: account.coaAccount.code,
      coaAccountName: account.coaAccount.name,
      currency: account.currency,
      glBalance: glBalance.toNumber(),
      isAuthoritative: true,
      source: 'GENERAL_LEDGER',
    };
  }
}
