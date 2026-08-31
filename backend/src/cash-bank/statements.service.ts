import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ImportStatementDto } from './dto/import-statement.dto';
import {
  BankStatementImportStatus,
  StatementLineStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

@Injectable()
export class StatementsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generates a deterministic normalized SHA-256 hash fingerprint for statement line deduplication
   */
  private generateLineHash(
    accountId: string,
    dateStr: string,
    amountStr: string,
    description: string,
    reference?: string,
  ): string {
    const raw = `${accountId}|${dateStr}|${amountStr}|${description.trim().toLowerCase()}|${(reference || '').trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Parses CSV content into structured statement line payloads
   */
  private parseCsvRows(csvContent: string): any[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      throw new BadRequestException('CSV file is empty or contains only a header.');
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('tanggal'));
    const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('keterangan') || h.includes('memo') || h.includes('uraian'));
    const refIdx = header.findIndex((h) => h.includes('ref') || h.includes('no') || h.includes('invoice'));
    const debitIdx = header.findIndex((h) => h.includes('debit') || h.includes('dr') || h.includes('keluar'));
    const creditIdx = header.findIndex((h) => h.includes('credit') || h.includes('cr') || h.includes('masuk'));
    const amountIdx = header.findIndex((h) => h === 'amount' || h === 'nominal' || h === 'jumlah');
    const balanceIdx = header.findIndex((h) => h.includes('balance') || h.includes('saldo'));

    if (dateIdx === -1) {
      throw new BadRequestException('CSV must contain a valid Date column header.');
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const dateStr = parts[dateIdx];
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException(`Row ${i + 1}: Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`);
      }

      const description = descIdx !== -1 ? parts[descIdx] : 'Bank Transaction';
      const reference = refIdx !== -1 ? parts[refIdx] : undefined;

      let debit = new Decimal(0);
      let credit = new Decimal(0);
      let amount = new Decimal(0);

      if (debitIdx !== -1 && creditIdx !== -1) {
        const rawDr = parseFloat(parts[debitIdx] || '0') || 0;
        const rawCr = parseFloat(parts[creditIdx] || '0') || 0;
        debit = new Decimal(rawDr);
        credit = new Decimal(rawCr);
        amount = credit.minus(debit); // Inflow is positive, Outflow is negative
      } else if (amountIdx !== -1) {
        const rawAmt = parseFloat(parts[amountIdx] || '0') || 0;
        amount = new Decimal(rawAmt);
        if (rawAmt >= 0) credit = amount;
        else debit = amount.abs();
      }

      let balance: Decimal | undefined;
      if (balanceIdx !== -1 && parts[balanceIdx]) {
        balance = new Decimal(parseFloat(parts[balanceIdx]) || 0);
      }

      rows.push({
        transactionDate: parsedDate,
        description,
        reference,
        debitAmount: debit,
        creditAmount: credit,
        amount,
        balance,
      });
    }

    return rows;
  }

  /**
   * Import CSV Bank Statement with deduplication and ZERO GL IMPACT
   */
  async importCsvStatement(
    dto: ImportStatementDto,
    organizationId: string,
    userId: string,
  ) {
    const cashBank = await this.prisma.cashBankAccount.findUnique({
      where: { id: dto.cashBankAccountId },
    });
    if (!cashBank || cashBank.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }
    if (cashBank.entityId !== dto.entityId) {
      throw new ForbiddenException('Cash/Bank account belongs to another entity.');
    }

    const parsedRows = this.parseCsvRows(dto.csvContent);
    if (parsedRows.length === 0) {
      throw new BadRequestException('No valid statement rows parsed from CSV.');
    }

    // Determine date boundaries
    const dates = parsedRows.map((r) => r.transactionDate.getTime());
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    // Process rows and build fingerprints
    const statementLinesToCreate: any[] = [];
    let duplicatesDetected = 0;

    for (const row of parsedRows) {
      const hash = this.generateLineHash(
        cashBank.id,
        row.transactionDate.toISOString().split('T')[0],
        row.amount.toString(),
        row.description,
        row.reference,
      );

      // Check if duplicate hash exists in database
      const existing = await this.prisma.bankStatementLine.findFirst({
        where: { normalizedHash: hash },
      });

      if (existing) {
        duplicatesDetected++;
        continue; // Skip duplicate lines
      }

      statementLinesToCreate.push({
        transactionDate: row.transactionDate,
        description: row.description,
        reference: row.reference,
        debitAmount: row.debitAmount,
        creditAmount: row.creditAmount,
        amount: row.amount,
        balance: row.balance,
        normalizedHash: hash,
        reconciliationStatus: StatementLineStatus.UNMATCHED,
      });
    }

    if (statementLinesToCreate.length === 0 && duplicatesDetected > 0) {
      throw new BadRequestException(`All ${duplicatesDetected} statement rows were identified as duplicate entries and skipped.`);
    }

    const createdImport = await this.prisma.bankStatementImport.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        cashBankAccountId: dto.cashBankAccountId,
        sourceFilename: dto.filename,
        statementStartDate: startDate,
        statementEndDate: endDate,
        openingBalance: new Decimal(dto.openingBalance || 0),
        closingBalance: new Decimal(dto.closingBalance || 0),
        status: BankStatementImportStatus.IMPORTED,
        importedById: userId,
        lines: {
          create: statementLinesToCreate,
        },
      },
      include: {
        lines: true,
        cashBankAccount: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_STATEMENT_IMPORTED',
      resourceType: 'BankStatementImport',
      resourceId: createdImport.id,
      metadata: {
        filename: dto.filename,
        importedLines: statementLinesToCreate.length,
        duplicatesSkipped: duplicatesDetected,
      },
    });

    return {
      importRecord: createdImport,
      totalRowsProcessed: parsedRows.length,
      importedCount: statementLinesToCreate.length,
      duplicatesSkipped: duplicatesDetected,
      zeroGlImpact: true,
    };
  }

  /**
   * Get all imports for an account
   */
  async getImports(organizationId: string, entityId?: string, accountId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;
    if (accountId) where.cashBankAccountId = accountId;

    return this.prisma.bankStatementImport.findMany({
      where,
      include: {
        cashBankAccount: { select: { id: true, code: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single import with all lines
   */
  async getImportById(id: string, organizationId: string) {
    const record = await this.prisma.bankStatementImport.findUnique({
      where: { id },
      include: {
        cashBankAccount: true,
        lines: {
          include: {
            matches: {
              include: {
                payment: true,
                journalEntry: true,
              },
            },
          },
          orderBy: { transactionDate: 'asc' },
        },
      },
    });

    if (!record || record.organizationId !== organizationId) {
      throw new NotFoundException('Statement import not found.');
    }

    return record;
  }
}
