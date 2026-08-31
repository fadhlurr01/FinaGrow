import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateReconciliationDto,
  MatchStatementLineDto,
  UnmatchStatementLineDto,
} from './dto/reconciliation.dto';
import {
  BankReconciliationStatus,
  StatementLineStatus,
  PaymentStatus,
  JournalEntryStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReconciliationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new Bank Reconciliation session/period
   */
  async createReconciliation(
    dto: CreateReconciliationDto,
    organizationId: string,
    userId: string,
  ) {
    const cashBank = await this.prisma.cashBankAccount.findUnique({
      where: { id: dto.cashBankAccountId },
      include: { coaAccount: true },
    });
    if (!cashBank || cashBank.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }
    if (cashBank.entityId !== dto.entityId) {
      throw new ForbiddenException('Cash/Bank account belongs to another entity.');
    }

    const startDate = new Date(dto.periodStart);
    const endDate = new Date(dto.periodEnd);
    if (startDate > endDate) {
      throw new BadRequestException('Period start date must be before period end date.');
    }

    // Calculate GL Book Closing Balance up to periodEnd
    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: cashBank.coaAccountId,
        journalEntry: {
          organizationId,
          status: JournalEntryStatus.POSTED,
          entryDate: { lte: endDate },
        },
      },
      select: { debit: true, credit: true },
    });

    let bookBalance = new Decimal(0);
    for (const line of glLines) {
      bookBalance = bookBalance.plus(line.debit).minus(line.credit);
    }

    const statementClose = new Decimal(dto.statementClosingBalance);
    const difference = statementClose.minus(bookBalance);

    const recon = await this.prisma.bankReconciliation.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        cashBankAccountId: dto.cashBankAccountId,
        periodStart: startDate,
        periodEnd: endDate,
        statementOpeningBalance: new Decimal(dto.statementOpeningBalance),
        statementClosingBalance: statementClose,
        bookClosingBalance: bookBalance,
        difference,
        status: BankReconciliationStatus.IN_PROGRESS,
      },
      include: {
        cashBankAccount: { include: { coaAccount: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_RECONCILIATION_CREATED',
      resourceType: 'BankReconciliation',
      resourceId: recon.id,
      metadata: {
        accountCode: cashBank.code,
        difference: difference.toNumber(),
      },
    });

    return recon;
  }

  /**
   * List reconciliations
   */
  async getReconciliations(organizationId: string, entityId?: string, accountId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;
    if (accountId) where.cashBankAccountId = accountId;

    return this.prisma.bankReconciliation.findMany({
      where,
      include: {
        cashBankAccount: { select: { id: true, code: true, name: true, currency: true } },
      },
      orderBy: { periodEnd: 'desc' },
    });
  }

  /**
   * Get single reconciliation details with matching summary
   */
  async getReconciliationById(id: string, organizationId: string) {
    const recon = await this.prisma.bankReconciliation.findUnique({
      where: { id },
      include: {
        cashBankAccount: { include: { coaAccount: true } },
      },
    });

    if (!recon || recon.organizationId !== organizationId) {
      throw new NotFoundException('Bank reconciliation record not found.');
    }

    // Refresh live GL book balance
    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: recon.cashBankAccount.coaAccountId,
        journalEntry: {
          organizationId,
          status: JournalEntryStatus.POSTED,
          entryDate: { lte: recon.periodEnd },
        },
      },
      select: { debit: true, credit: true },
    });

    let liveBookBalance = new Decimal(0);
    for (const line of glLines) {
      liveBookBalance = liveBookBalance.plus(line.debit).minus(line.credit);
    }

    const difference = recon.statementClosingBalance.minus(liveBookBalance);

    return {
      ...recon,
      bookClosingBalance: liveBookBalance.toNumber(),
      difference: difference.toNumber(),
      isReconciled: difference.isZero(),
    };
  }

  /**
   * Auto-matching suggestion engine for unmatched statement lines
   */
  async getMatchSuggestions(reconciliationId: string, organizationId: string) {
    const recon = await this.getReconciliationById(reconciliationId, organizationId);

    // 1. Fetch unmatched statement lines in period
    const statementLines = await this.prisma.bankStatementLine.findMany({
      where: {
        statementImport: {
          cashBankAccountId: recon.cashBankAccountId,
          organizationId,
        },
        transactionDate: {
          gte: recon.periodStart,
          lte: recon.periodEnd,
        },
        reconciliationStatus: StatementLineStatus.UNMATCHED,
      },
    });

    // 2. Fetch candidate POSTED payments for this bank account in date window (+/- 5 days)
    const windowStart = new Date(recon.periodStart);
    windowStart.setDate(windowStart.getDate() - 5);
    const windowEnd = new Date(recon.periodEnd);
    windowEnd.setDate(windowEnd.getDate() + 5);

    const payments = await this.prisma.payment.findMany({
      where: {
        cashBankAccountId: recon.cashBankAccountId,
        organizationId,
        status: PaymentStatus.POSTED,
        paymentDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        customer: true,
        vendor: true,
      },
    });

    // 3. Evaluate match candidates for each line
    const suggestions = statementLines.map((line) => {
      const candidates: any[] = [];
      const lineAbsAmount = line.amount.abs().toNumber();

      for (const p of payments) {
        const paymentAmount = p.amount.toNumber();
        const daysDiff = Math.abs((p.paymentDate.getTime() - line.transactionDate.getTime()) / (1000 * 3600 * 24));

        // Exact amount match
        if (Math.abs(paymentAmount - lineAbsAmount) < 0.01) {
          let confidence = 0.85;
          if (daysDiff <= 1) confidence = 0.95;
          else if (daysDiff <= 3) confidence = 0.90;

          // Boost if reference matches
          if (line.reference && p.reference && line.reference.toLowerCase().includes(p.reference.toLowerCase())) {
            confidence = 0.99;
          }

          candidates.push({
            paymentId: p.id,
            paymentNumber: p.paymentNumber,
            paymentDate: p.paymentDate,
            amount: paymentAmount,
            type: p.type,
            reference: p.reference,
            counterparty: p.customer?.name || p.vendor?.name || 'Internal Transfer',
            confidence,
            daysDifference: Math.round(daysDiff),
          });
        }
      }

      candidates.sort((a, b) => b.confidence - a.confidence);

      return {
        statementLine: line,
        suggestedMatches: candidates,
      };
    });

    return suggestions;
  }

  /**
   * Manually match a bank statement line with an internal payment/journal
   */
  async matchStatementLine(
    dto: MatchStatementLineDto,
    organizationId: string,
    userId: string,
  ) {
    const line = await this.prisma.bankStatementLine.findUnique({
      where: { id: dto.statementLineId },
      include: { statementImport: true },
    });

    if (!line || line.statementImport.organizationId !== organizationId) {
      throw new NotFoundException('Statement line not found.');
    }

    if (line.reconciliationStatus === StatementLineStatus.MATCHED) {
      throw new BadRequestException('Statement line is already matched.');
    }

    const matchedAmount = dto.matchedAmount ? new Decimal(dto.matchedAmount) : line.amount.abs();

    const match = await this.prisma.bankReconciliationMatch.create({
      data: {
        bankStatementLineId: dto.statementLineId,
        paymentId: dto.paymentId,
        journalEntryId: dto.journalEntryId,
        matchedAmount,
        confidence: new Decimal(1.0),
        matchType: dto.matchType || 'MANUAL',
        matchedById: userId,
      },
    });

    await this.prisma.bankStatementLine.update({
      where: { id: dto.statementLineId },
      data: { reconciliationStatus: StatementLineStatus.MATCHED },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_RECONCILIATION_MATCHED',
      resourceType: 'BankReconciliationMatch',
      resourceId: match.id,
      metadata: { statementLineId: dto.statementLineId, paymentId: dto.paymentId },
    });

    return match;
  }

  /**
   * Unmatch a previously matched statement line
   */
  async unmatchStatementLine(
    dto: UnmatchStatementLineDto,
    organizationId: string,
    userId: string,
  ) {
    const line = await this.prisma.bankStatementLine.findUnique({
      where: { id: dto.statementLineId },
      include: { statementImport: true },
    });

    if (!line || line.statementImport.organizationId !== organizationId) {
      throw new NotFoundException('Statement line not found.');
    }

    await this.prisma.bankReconciliationMatch.deleteMany({
      where: { bankStatementLineId: dto.statementLineId },
    });

    await this.prisma.bankStatementLine.update({
      where: { id: dto.statementLineId },
      data: { reconciliationStatus: StatementLineStatus.UNMATCHED },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_RECONCILIATION_UNMATCHED',
      resourceType: 'BankStatementLine',
      resourceId: dto.statementLineId,
      metadata: { statementLineId: dto.statementLineId },
    });

    return { message: 'Statement line unmatched successfully.' };
  }

  /**
   * Complete and close a bank reconciliation session with zero-difference enforcement
   */
  async completeReconciliation(id: string, organizationId: string, userId: string) {
    const recon = await this.getReconciliationById(id, organizationId);

    if (!recon.isReconciled || recon.difference !== 0) {
      throw new BadRequestException(
        `Cannot complete reconciliation: statement closing balance differs from GL book balance by ${recon.difference}. Difference must be 0.`,
      );
    }

    const completed = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankReconciliationStatus.RECONCILED,
        difference: new Decimal(0),
        completedById: userId,
        completedAt: new Date(),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_RECONCILIATION_COMPLETED',
      resourceType: 'BankReconciliation',
      resourceId: completed.id,
      metadata: { periodEnd: completed.periodEnd, difference: 0 },
    });

    return completed;
  }

  /**
   * Reopen a completed bank reconciliation session
   */
  async reopenReconciliation(id: string, organizationId: string, userId: string) {
    const recon = await this.prisma.bankReconciliation.findUnique({
      where: { id },
    });

    if (!recon || recon.organizationId !== organizationId) {
      throw new NotFoundException('Reconciliation not found.');
    }

    const reopened = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankReconciliationStatus.REOPENED,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'BANK_RECONCILIATION_REOPENED',
      resourceType: 'BankReconciliation',
      resourceId: reopened.id,
      metadata: { periodEnd: reopened.periodEnd },
    });

    return reopened;
  }
}
