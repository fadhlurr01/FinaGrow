import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto, ARFilterDto } from './dto/invoice-filter.dto';
import {
  SalesInvoiceStatus,
  InvoicePostingStatus,
  JournalEntryStatus,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
  ) {}

  // ==========================================
  // 1. INVOICE COMPUTATION ENGINE
  // ==========================================

  private calculateInvoiceTotals(lines: CreateInvoiceDto['lines']) {
    let subtotal = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalTax = new Decimal(0);

    const calculatedLines = lines.map((line) => {
      const qty = new Decimal(line.quantity || 1);
      const unitPrice = new Decimal(line.unitPrice || 0);

      if (qty.isNegative() || unitPrice.isNegative()) {
        throw new BadRequestException('Quantity and Unit Price must be non-negative.');
      }

      const lineSubtotal = qty.times(unitPrice);
      const discount = new Decimal(line.discountAmount || 0);
      const taxableAmount = Decimal.max(0, lineSubtotal.minus(discount));
      const taxRate = new Decimal(line.taxRate || 0);
      const taxAmount = taxableAmount.times(taxRate);
      const lineTotal = taxableAmount.plus(taxAmount);

      subtotal = subtotal.plus(lineSubtotal);
      totalDiscount = totalDiscount.plus(discount);
      totalTax = totalTax.plus(taxAmount);

      return {
        description: line.description.trim(),
        quantity: qty,
        unitPrice,
        discountAmount: discount,
        taxRate,
        taxAmount,
        lineSubtotal,
        lineTotal,
        revenueAccountId: line.revenueAccountId,
      };
    });

    const totalAmount = subtotal.minus(totalDiscount).plus(totalTax);

    return {
      calculatedLines,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      totalAmount,
    };
  }

  // ==========================================
  // 2. INVOICE CRUD & LIFECYCLE
  // ==========================================

  async getInvoices(organizationId: string, filter: InvoiceFilterDto) {
    const where: Prisma.SalesInvoiceWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.status) where.status = filter.status;
    if (filter.postingStatus) where.postingStatus = filter.postingStatus;
    if (filter.dateFrom || filter.dateTo) {
      where.invoiceDate = {};
      if (filter.dateFrom) where.invoiceDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.invoiceDate.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
        { reference: { contains: filter.search, mode: 'insensitive' } },
        { customer: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.salesInvoice.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerCode: true, name: true, email: true },
        },
        lines: true,
        journalEntry: {
          select: { id: true, entryNumber: true, status: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async getInvoiceById(id: string, organizationId: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: true,
        journalEntry: {
          include: { lines: { include: { account: true } } },
        },
        entity: true,
      },
    });

    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Sales Invoice not found.');
    }

    return invoice;
  }

  async createInvoice(
    dto: CreateInvoiceDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify customer exists, belongs to organization/entity, and is active
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer || customer.organizationId !== organizationId) {
      throw new NotFoundException('Customer not found in this organization.');
    }
    if (customer.entityId !== dto.entityId) {
      throw new ForbiddenException('Customer belongs to a different entity.');
    }
    if (!customer.isActive) {
      throw new BadRequestException(`Customer '${customer.name}' is inactive and cannot receive new invoices.`);
    }

    // 2. Validate line revenue accounts if specified
    for (const line of dto.lines) {
      if (line.revenueAccountId) {
        const revAcc = await this.prisma.account.findUnique({
          where: { id: line.revenueAccountId },
        });
        if (!revAcc || revAcc.organizationId !== organizationId) {
          throw new NotFoundException('Revenue account not found.');
        }
        if (revAcc.entityId !== dto.entityId) {
          throw new ForbiddenException(`Revenue account '${revAcc.code}' belongs to another entity.`);
        }
      }
    }

    // 3. Authoritative server recalculation of totals
    const {
      calculatedLines,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    } = this.calculateInvoiceTotals(dto.lines);

    // 4. Generate deterministic invoice number: INV-YYYY-XXXXXX
    const year = new Date(dto.invoiceDate).getFullYear();
    const count = await this.prisma.salesInvoice.count({
      where: { entityId: dto.entityId },
    });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;

    // 5. Create invoice in DRAFT, UNPOSTED state
    const invoice = await this.prisma.salesInvoice.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        customerId: dto.customerId,
        invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency || 'IDR',
        exchangeRate: new Decimal(dto.exchangeRate || 1.0),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountPaid: new Decimal(0),
        amountDue: totalAmount,
        status: SalesInvoiceStatus.DRAFT,
        postingStatus: InvoicePostingStatus.UNPOSTED,
        reference: dto.reference?.trim(),
        notes: dto.notes?.trim(),
        createdById: userId,
        lines: {
          create: calculatedLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            lineSubtotal: l.lineSubtotal,
            lineTotal: l.lineTotal,
            revenueAccountId: l.revenueAccountId,
          })),
        },
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SALES_INVOICE_CREATED',
      resourceType: 'SalesInvoice',
      resourceId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, totalAmount: totalAmount.toString() },
    });

    return invoice;
  }

  async updateInvoice(
    id: string,
    dto: UpdateInvoiceDto,
    organizationId: string,
    userId: string,
  ) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Sales Invoice not found.');
    }

    if (invoice.postingStatus === InvoicePostingStatus.POSTED) {
      throw new BadRequestException('Posted invoices cannot be edited. Please cancel and reissue if corrections are needed.');
    }

    let calculatedData: any = {};
    if (dto.lines && dto.lines.length > 0) {
      const { calculatedLines, subtotal, discountAmount, taxAmount, totalAmount } =
        this.calculateInvoiceTotals(dto.lines);

      calculatedData = {
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountDue: totalAmount.minus(invoice.amountPaid),
        lines: {
          deleteMany: {},
          create: calculatedLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            taxRate: l.taxRate,
            taxAmount: l.taxAmount,
            lineSubtotal: l.lineSubtotal,
            lineTotal: l.lineTotal,
            revenueAccountId: l.revenueAccountId,
          })),
        },
      };
    }

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate !== undefined ? new Decimal(dto.exchangeRate) : undefined,
        reference: dto.reference?.trim(),
        notes: dto.notes?.trim(),
        ...calculatedData,
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SALES_INVOICE_UPDATED',
      resourceType: 'SalesInvoice',
      resourceId: updated.id,
      metadata: { invoiceNumber: updated.invoiceNumber },
    });

    return updated;
  }

  // ==========================================
  // 3. POSTING ENGINE (DOUBLE-ENTRY INTEGRATION)
  // ==========================================

  async postInvoice(id: string, organizationId: string, userId: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Sales Invoice not found.');
    }

    // Idempotency: If already posted, return safely
    if (invoice.postingStatus === InvoicePostingStatus.POSTED) {
      return invoice;
    }

    if (invoice.status === SalesInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot post a cancelled invoice.');
    }

    if (!invoice.customer.isActive) {
      throw new BadRequestException(`Customer '${invoice.customer.name}' is inactive.`);
    }

    // 1. Fetch Entity Accounting Settings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: invoice.entityId },
      include: {
        arAccount: true,
        defaultRevenueAccount: true,
        outputTaxAccount: true,
      },
    });

    if (!settings) {
      throw new BadRequestException(
        'Accounting settings not configured for this operating entity. Please map AR, Revenue, and Tax accounts first.',
      );
    }

    // 2. Build Double-Entry Journal Lines
    // Debit: AR Account = totalAmount
    // Credit: Revenue Accounts (split by line) = net taxable amounts
    // Credit: Output Tax Account = taxAmount
    const journalLines: any[] = [];

    // DR Accounts Receivable
    journalLines.push({
      accountId: settings.arAccountId,
      description: `Piutang Usaha - Invoice ${invoice.invoiceNumber} (${invoice.customer.name})`,
      debit: invoice.totalAmount.toNumber(),
      credit: 0,
    });

    // Group Revenue credits by account
    const revenueMap: Record<string, Decimal> = {};
    for (const line of invoice.lines) {
      const revAccId = line.revenueAccountId || settings.defaultRevenueAccountId;
      const netRev = line.lineSubtotal.minus(line.discountAmount);
      if (!revenueMap[revAccId]) {
        revenueMap[revAccId] = new Decimal(0);
      }
      revenueMap[revAccId] = revenueMap[revAccId].plus(netRev);
    }

    for (const [accId, amount] of Object.entries(revenueMap)) {
      if (amount.greaterThan(0)) {
        journalLines.push({
          accountId: accId,
          description: `Pendapatan Penjualan - Invoice ${invoice.invoiceNumber}`,
          debit: 0,
          credit: amount.toNumber(),
        });
      }
    }

    // CR Output Tax Payable if applicable
    if (invoice.taxAmount.greaterThan(0)) {
      journalLines.push({
        accountId: settings.outputTaxAccountId,
        description: `PPN Keluaran - Invoice ${invoice.invoiceNumber}`,
        debit: 0,
        credit: invoice.taxAmount.toNumber(),
      });
    }

    // 3. Post Journal Entry through Phase 2 AccountingService inside transaction
    const journalEntry = await this.accountingService.createJournalEntry(
      {
        entityId: invoice.entityId,
        entryDate: invoice.invoiceDate.toISOString().slice(0, 10),
        description: `Penjualan Kredit: Invoice ${invoice.invoiceNumber} - ${invoice.customer.name}`,
        reference: invoice.invoiceNumber,
        status: JournalEntryStatus.POSTED,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate.toNumber(),
        lines: journalLines,
      },
      organizationId,
      userId,
    );

    // 4. Update Invoice Status to SENT and POSTED
    const updatedInvoice = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        status: SalesInvoiceStatus.SENT,
        postingStatus: InvoicePostingStatus.POSTED,
        journalEntryId: journalEntry.id,
        postedAt: new Date(),
        postedById: userId,
      },
      include: {
        customer: true,
        lines: true,
        journalEntry: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SALES_INVOICE_POSTED',
      resourceType: 'SalesInvoice',
      resourceId: updatedInvoice.id,
      metadata: {
        invoiceNumber: updatedInvoice.invoiceNumber,
        journalNumber: journalEntry.entryNumber,
        totalAmount: updatedInvoice.totalAmount.toString(),
      },
    });

    return updatedInvoice;
  }

  // ==========================================
  // 4. CANCELLATION & ACCOUNTING REVERSAL
  // ==========================================

  async cancelInvoice(id: string, organizationId: string, userId: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
    });

    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Sales Invoice not found.');
    }

    if (invoice.status === SalesInvoiceStatus.CANCELLED) {
      return invoice; // Idempotent
    }

    // If invoice is posted, trigger immutable reversal via AccountingService
    if (invoice.postingStatus === InvoicePostingStatus.POSTED && invoice.journalEntryId) {
      await this.accountingService.voidJournalEntry(
        invoice.journalEntryId,
        organizationId,
        userId,
      );
    }

    const cancelled = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        status: SalesInvoiceStatus.CANCELLED,
        postingStatus:
          invoice.postingStatus === InvoicePostingStatus.POSTED
            ? InvoicePostingStatus.REVERSED
            : InvoicePostingStatus.UNPOSTED,
      },
      include: {
        customer: true,
        journalEntry: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SALES_INVOICE_CANCELLED',
      resourceType: 'SalesInvoice',
      resourceId: cancelled.id,
      metadata: {
        invoiceNumber: cancelled.invoiceNumber,
        previousPostingStatus: invoice.postingStatus,
      },
    });

    return cancelled;
  }

  // ==========================================
  // 5. ACCOUNTS RECEIVABLE (AR) ANALYTICS & AGING
  // ==========================================

  async getARSummary(organizationId: string, filter: ARFilterDto) {
    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId,
      postingStatus: InvoicePostingStatus.POSTED,
      status: { not: SalesInvoiceStatus.CANCELLED },
    };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.customerId) where.customerId = filter.customerId;

    const invoices = await this.prisma.salesInvoice.findMany({ where });

    const now = filter.asOfDate ? new Date(filter.asOfDate) : new Date();

    let totalInvoiced = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalReceivables = new Decimal(0);
    let totalOverdue = new Decimal(0);
    let overdueCount = 0;

    for (const inv of invoices) {
      totalInvoiced = totalInvoiced.plus(inv.totalAmount);
      totalPaid = totalPaid.plus(inv.amountPaid);
      totalReceivables = totalReceivables.plus(inv.amountDue);

      if (inv.dueDate < now && inv.amountDue.greaterThan(0)) {
        totalOverdue = totalOverdue.plus(inv.amountDue);
        overdueCount++;
      }
    }

    return {
      totalInvoiced: totalInvoiced.toNumber(),
      totalPaid: totalPaid.toNumber(),
      totalReceivables: totalReceivables.toNumber(),
      totalOverdue: totalOverdue.toNumber(),
      openInvoiceCount: invoices.filter((i) => i.amountDue.greaterThan(0)).length,
      overdueInvoiceCount: overdueCount,
    };
  }

  async getARAging(organizationId: string, filter: ARFilterDto) {
    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId,
      postingStatus: InvoicePostingStatus.POSTED,
      status: { not: SalesInvoiceStatus.CANCELLED },
      amountDue: { gt: 0 },
    };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.customerId) where.customerId = filter.customerId;

    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

    const asOf = filter.asOfDate ? new Date(filter.asOfDate) : new Date();

    const buckets = {
      current: { count: 0, amount: new Decimal(0) },
      days1_30: { count: 0, amount: new Decimal(0) },
      days31_60: { count: 0, amount: new Decimal(0) },
      days61_90: { count: 0, amount: new Decimal(0) },
      days90Plus: { count: 0, amount: new Decimal(0) },
    };

    const customerMap: Record<string, any> = {};

    for (const inv of invoices) {
      const diffTime = asOf.getTime() - new Date(inv.dueDate).getTime();
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucketKey: 'current' | 'days1_30' | 'days31_60' | 'days61_90' | 'days90Plus' = 'current';

      if (daysOverdue <= 0) {
        bucketKey = 'current';
      } else if (daysOverdue <= 30) {
        bucketKey = 'days1_30';
      } else if (daysOverdue <= 60) {
        bucketKey = 'days31_60';
      } else if (daysOverdue <= 90) {
        bucketKey = 'days61_90';
      } else {
        bucketKey = 'days90Plus';
      }

      buckets[bucketKey].count++;
      buckets[bucketKey].amount = buckets[bucketKey].amount.plus(inv.amountDue);

      // Customer aging breakdown
      if (!customerMap[inv.customerId]) {
        customerMap[inv.customerId] = {
          customerId: inv.customerId,
          customerCode: inv.customer.customerCode,
          name: inv.customer.name,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
          totalDue: 0,
        };
      }

      customerMap[inv.customerId][bucketKey] += inv.amountDue.toNumber();
      customerMap[inv.customerId].totalDue += inv.amountDue.toNumber();
    }

    const totalAR = Object.values(buckets).reduce(
      (sum, b) => sum.plus(b.amount),
      new Decimal(0),
    );

    return {
      asOfDate: asOf.toISOString().slice(0, 10),
      totalReceivables: totalAR.toNumber(),
      buckets: {
        current: { count: buckets.current.count, amount: buckets.current.amount.toNumber() },
        days1_30: { count: buckets.days1_30.count, amount: buckets.days1_30.amount.toNumber() },
        days31_60: { count: buckets.days31_60.count, amount: buckets.days31_60.amount.toNumber() },
        days61_90: { count: buckets.days61_90.count, amount: buckets.days61_90.amount.toNumber() },
        days90Plus: { count: buckets.days90Plus.count, amount: buckets.days90Plus.amount.toNumber() },
      },
      customers: Object.values(customerMap),
    };
  }

  // ==========================================
  // 6. AR SUB-LEDGER TO GL RECONCILIATION
  // ==========================================

  async getARControlReconciliation(organizationId: string, entityId: string) {
    // 1. Get AR Subledger total
    const openInvoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        entityId,
        postingStatus: InvoicePostingStatus.POSTED,
        status: { not: SalesInvoiceStatus.CANCELLED },
      },
    });

    const subledgerTotal = openInvoices.reduce(
      (sum, inv) => sum.plus(inv.amountDue),
      new Decimal(0),
    );

    // 2. Get GL AR Control Account balance
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId },
      include: { arAccount: true },
    });

    if (!settings) {
      return {
        isReconciled: false,
        subledgerTotal: subledgerTotal.toNumber(),
        glControlBalance: 0,
        difference: subledgerTotal.toNumber(),
        message: 'Accounting settings not configured.',
      };
    }

    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: settings.arAccountId,
        journalEntry: {
          organizationId,
          entityId,
          status: JournalEntryStatus.POSTED,
        },
      },
    });

    // AR is an Asset -> Debit increases, Credit decreases
    let glBalance = new Decimal(0);
    for (const line of glLines) {
      glBalance = glBalance.plus(line.debit).minus(line.credit);
    }

    const difference = subledgerTotal.minus(glBalance).abs();

    return {
      entityId,
      arAccountId: settings.arAccountId,
      arAccountCode: settings.arAccount.code,
      arAccountName: settings.arAccount.name,
      subledgerTotal: subledgerTotal.toNumber(),
      glControlBalance: glBalance.toNumber(),
      difference: difference.toNumber(),
      isReconciled: difference.isZero(),
    };
  }
}
