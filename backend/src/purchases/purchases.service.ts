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
import { CreateBillDto, UpdateBillDto } from './dto/create-bill.dto';
import { BillFilterDto, APFilterDto } from './dto/order-filter.dto';
import {
  VendorBillStatus,
  InvoicePostingStatus,
  PurchaseOrderStatus,
  JournalEntryStatus,
  BillLineType,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
  ) {}

  // ==========================================
  // 1. BILL COMPUTATION ENGINE
  // ==========================================

  private calculateBillTotals(lines: CreateBillDto['lines']) {
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
        expenseAccountId: line.expenseAccountId,
        lineType: line.lineType || 'EXPENSE',
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
  // 2. VENDOR BILL CRUD & LIFECYCLE
  // ==========================================

  async getBills(organizationId: string, filter: BillFilterDto) {
    const where: Prisma.VendorBillWhereInput = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.vendorId) where.vendorId = filter.vendorId;
    if (filter.status) where.status = filter.status;
    if (filter.postingStatus) where.postingStatus = filter.postingStatus;
    if (filter.dateFrom || filter.dateTo) {
      where.billDate = {};
      if (filter.dateFrom) where.billDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.billDate.lte = new Date(filter.dateTo);
    }
    if (filter.search) {
      where.OR = [
        { billNumber: { contains: filter.search, mode: 'insensitive' } },
        { vendorReference: { contains: filter.search, mode: 'insensitive' } },
        { vendor: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.vendorBill.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, vendorCode: true, name: true, email: true },
        },
        lines: true,
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
        journalEntry: {
          select: { id: true, entryNumber: true, status: true },
        },
      },
      orderBy: { billDate: 'desc' },
    });
  }

  async getBillById(id: string, organizationId: string) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: true,
        lines: {
          include: { expenseAccount: true },
        },
        journalEntry: {
          include: { lines: { include: { account: true } } },
        },
        entity: true,
      },
    });

    if (!bill || bill.organizationId !== organizationId) {
      throw new NotFoundException('Vendor Bill not found.');
    }

    return bill;
  }

  async createBill(
    dto: CreateBillDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify vendor exists, belongs to organization/entity, and is active
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
    });
    if (!vendor || vendor.organizationId !== organizationId) {
      throw new NotFoundException('Vendor not found in this organization.');
    }
    if (vendor.entityId !== dto.entityId) {
      throw new ForbiddenException('Vendor belongs to a different entity.');
    }
    if (!vendor.isActive) {
      throw new BadRequestException(`Vendor '${vendor.name}' is inactive and cannot receive new bills.`);
    }

    // 2. Validate line expense accounts if specified
    for (const line of dto.lines) {
      if (line.expenseAccountId) {
        const expAcc = await this.prisma.account.findUnique({
          where: { id: line.expenseAccountId },
        });
        if (!expAcc || expAcc.organizationId !== organizationId) {
          throw new NotFoundException('Expense account not found.');
        }
        if (expAcc.entityId !== dto.entityId) {
          throw new ForbiddenException(`Expense account '${expAcc.code}' belongs to another entity.`);
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
    } = this.calculateBillTotals(dto.lines);

    // 4. Generate deterministic internal bill number: BILL-YYYY-XXXXXX
    const year = new Date(dto.billDate).getFullYear();
    const count = await this.prisma.vendorBill.count({
      where: { entityId: dto.entityId },
    });
    const billNumber = `BILL-${year}-${String(count + 1).padStart(6, '0')}`;

    // 5. Create bill in DRAFT, UNPOSTED state
    const bill = await this.prisma.vendorBill.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId,
        billNumber,
        vendorReference: dto.vendorReference?.trim(),
        billDate: new Date(dto.billDate),
        dueDate: new Date(dto.dueDate),
        currency: dto.currency || 'IDR',
        exchangeRate: new Decimal(dto.exchangeRate || 1.0),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountPaid: new Decimal(0),
        amountDue: totalAmount,
        status: VendorBillStatus.DRAFT,
        postingStatus: InvoicePostingStatus.UNPOSTED,
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
            expenseAccountId: l.expenseAccountId,
            lineType: l.lineType as any,
          })),
        },
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_BILL_CREATED',
      resourceType: 'VendorBill',
      resourceId: bill.id,
      metadata: { billNumber: bill.billNumber, totalAmount: totalAmount.toString() },
    });

    return bill;
  }

  async createBillFromPO(
    poId: string,
    organizationId: string,
    userId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        vendor: true,
        lines: true,
      },
    });

    if (!po || po.organizationId !== organizationId) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_BILLED) {
      throw new BadRequestException(`Cannot create bill from Purchase Order in '${po.status}' status. Only APPROVED POs can be billed.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + (po.vendor.paymentTermsDays || 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const bill = await this.createBill(
      {
        entityId: po.entityId,
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        vendorReference: po.poNumber,
        billDate: today,
        dueDate,
        currency: po.currency,
        exchangeRate: po.exchangeRate.toNumber(),
        notes: `Billed from Purchase Order ${po.poNumber}`,
        lines: po.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity.toNumber(),
          unitPrice: l.unitPrice.toNumber(),
          discountAmount: l.discountAmount.toNumber(),
          taxRate: l.taxRate.toNumber(),
          expenseAccountId: l.expenseAccountId || undefined,
        })),
      },
      organizationId,
      userId,
    );

    // Update PO status to FULLY_BILLED
    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: PurchaseOrderStatus.FULLY_BILLED },
    });

    return bill;
  }

  async updateBill(
    id: string,
    dto: UpdateBillDto,
    organizationId: string,
    userId: string,
  ) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!bill || bill.organizationId !== organizationId) {
      throw new NotFoundException('Vendor Bill not found.');
    }

    if (bill.postingStatus === InvoicePostingStatus.POSTED) {
      throw new BadRequestException('Posted bills cannot be edited. Please cancel and reissue if corrections are needed.');
    }

    let calculatedData: any = {};
    if (dto.lines && dto.lines.length > 0) {
      const { calculatedLines, subtotal, discountAmount, taxAmount, totalAmount } =
        this.calculateBillTotals(dto.lines);

      calculatedData = {
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountDue: totalAmount.minus(bill.amountPaid),
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
            expenseAccountId: l.expenseAccountId,
            lineType: l.lineType as any,
          })),
        },
      };
    }

    const updated = await this.prisma.vendorBill.update({
      where: { id },
      data: {
        vendorId: dto.vendorId,
        vendorReference: dto.vendorReference?.trim(),
        billDate: dto.billDate ? new Date(dto.billDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate !== undefined ? new Decimal(dto.exchangeRate) : undefined,
        notes: dto.notes?.trim(),
        ...calculatedData,
      },
      include: {
        vendor: true,
        lines: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_BILL_UPDATED',
      resourceType: 'VendorBill',
      resourceId: updated.id,
      metadata: { billNumber: updated.billNumber },
    });

    return updated;
  }

  // ==========================================
  // 3. POSTING ENGINE (DOUBLE-ENTRY INTEGRATION)
  // ==========================================

  async postBill(id: string, organizationId: string, userId: string) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        lines: true,
      },
    });

    if (!bill || bill.organizationId !== organizationId) {
      throw new NotFoundException('Vendor Bill not found.');
    }

    // Idempotency: If already posted, return safely
    if (bill.postingStatus === InvoicePostingStatus.POSTED) {
      return bill;
    }

    if (bill.status === VendorBillStatus.CANCELLED) {
      throw new BadRequestException('Cannot post a cancelled vendor bill.');
    }

    if (!bill.vendor.isActive) {
      throw new BadRequestException(`Vendor '${bill.vendor.name}' is inactive.`);
    }

    // 1. Fetch Entity Accounting Settings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: bill.entityId },
      include: {
        apAccount: true,
        inputTaxAccount: true,
        defaultExpenseAccount: true,
      },
    });

    if (!settings || !settings.apAccountId) {
      throw new BadRequestException(
        'Accounting settings (Accounts Payable account) not configured for this operating entity.',
      );
    }

    const defaultExpenseId = settings.defaultExpenseAccountId || settings.arAccountId; // Fallback safety

    // 2. Build Double-Entry Journal Lines
    // Debit: Operating Expense Accounts (split by line) = net taxable amounts
    // Debit: Input Tax Receivable (if taxAmount > 0) = taxAmount
    // Credit: Accounts Payable Control Account = totalAmount
    const journalLines: any[] = [];

    // Group Expense / GRNI / Fixed Asset debits by account
    const debitMap: Record<string, { amount: Decimal; isAsset: boolean; isGrni: boolean }> = {};
    for (const line of bill.lines) {
      let targetAccountId = line.expenseAccountId || defaultExpenseId;
      let isGrni = false;
      let isAsset = false;

      if (line.goodsReceiptLineId || line.lineType === BillLineType.INVENTORY) {
        if (settings.grniAccountId) {
          targetAccountId = settings.grniAccountId;
          isGrni = true;
        }
      } else if (line.lineType === BillLineType.ASSET || line.assetCategoryId) {
        isAsset = true;
        if (line.assetCategoryId) {
          const cat = await this.prisma.fixedAssetCategory.findUnique({
            where: { id: line.assetCategoryId },
          });
          if (cat) {
            targetAccountId = cat.fixedAssetAccountId;
          }
        }
      }

      const netAmount = line.lineSubtotal.minus(line.discountAmount);
      if (!debitMap[targetAccountId]) {
        debitMap[targetAccountId] = { amount: new Decimal(0), isAsset, isGrni };
      }
      debitMap[targetAccountId].amount = debitMap[targetAccountId].amount.plus(netAmount);
    }

    for (const [accId, entry] of Object.entries(debitMap)) {
      if (entry.amount.greaterThan(0)) {
        let desc = `Beban Pembelian - Tagihan ${bill.billNumber} (${bill.vendor.name})`;
        if (entry.isGrni) {
          desc = `Penyelesaian Tagihan Barang Diterima (GRNI) - Tagihan ${bill.billNumber}`;
        } else if (entry.isAsset) {
          desc = `Kapitalisasi Perolehan Aset Tetap - Tagihan ${bill.billNumber} (${bill.vendor.name})`;
        }

        journalLines.push({
          accountId: accId,
          description: desc,
          debit: entry.amount.toNumber(),
          credit: 0,
        });
      }
    }

    // DR Input Tax Receivable if applicable
    if (bill.taxAmount.greaterThan(0)) {
      if (!settings.inputTaxAccountId) {
        throw new BadRequestException('Input Tax account not configured in Accounting Settings.');
      }
      journalLines.push({
        accountId: settings.inputTaxAccountId,
        description: `PPN Masukan - Tagihan ${bill.billNumber}`,
        debit: bill.taxAmount.toNumber(),
        credit: 0,
      });
    }

    // CR Accounts Payable Control Account
    journalLines.push({
      accountId: settings.apAccountId,
      description: `Utang Usaha - Tagihan ${bill.billNumber} (${bill.vendor.name})`,
      debit: 0,
      credit: bill.totalAmount.toNumber(),
    });

    // 3. Post Journal Entry through Phase 2 AccountingService
    const journalEntry = await this.accountingService.createJournalEntry(
      {
        entityId: bill.entityId,
        entryDate: bill.billDate.toISOString().slice(0, 10),
        description: `Pembelian Kredit: Tagihan ${bill.billNumber} - ${bill.vendor.name}`,
        reference: bill.billNumber,
        status: JournalEntryStatus.POSTED,
        currency: bill.currency,
        exchangeRate: bill.exchangeRate.toNumber(),
        lines: journalLines,
      },
      organizationId,
      userId,
    );

    // 4. Update Bill Status to OPEN and POSTED
    const updatedBill = await this.prisma.vendorBill.update({
      where: { id },
      data: {
        status: VendorBillStatus.OPEN,
        postingStatus: InvoicePostingStatus.POSTED,
        journalEntryId: journalEntry.id,
        postedAt: new Date(),
        postedById: userId,
      },
      include: {
        vendor: true,
        lines: true,
        journalEntry: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_BILL_POSTED',
      resourceType: 'VendorBill',
      resourceId: updatedBill.id,
      metadata: {
        billNumber: updatedBill.billNumber,
        journalNumber: journalEntry.entryNumber,
        totalAmount: updatedBill.totalAmount.toString(),
      },
    });

    return updatedBill;
  }

  // ==========================================
  // 4. CANCELLATION & ACCOUNTING REVERSAL
  // ==========================================

  async cancelBill(id: string, organizationId: string, userId: string) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
    });

    if (!bill || bill.organizationId !== organizationId) {
      throw new NotFoundException('Vendor Bill not found.');
    }

    if (bill.status === VendorBillStatus.CANCELLED) {
      return bill; // Idempotent
    }

    // If bill is posted, trigger immutable reversal via AccountingService
    if (bill.postingStatus === InvoicePostingStatus.POSTED && bill.journalEntryId) {
      await this.accountingService.voidJournalEntry(
        bill.journalEntryId,
        organizationId,
        userId,
      );
    }

    const cancelled = await this.prisma.vendorBill.update({
      where: { id },
      data: {
        status: VendorBillStatus.CANCELLED,
        postingStatus:
          bill.postingStatus === InvoicePostingStatus.POSTED
            ? InvoicePostingStatus.REVERSED
            : InvoicePostingStatus.UNPOSTED,
      },
      include: {
        vendor: true,
        journalEntry: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VENDOR_BILL_CANCELLED',
      resourceType: 'VendorBill',
      resourceId: cancelled.id,
      metadata: {
        billNumber: cancelled.billNumber,
        previousPostingStatus: bill.postingStatus,
      },
    });

    return cancelled;
  }

  // ==========================================
  // 5. ACCOUNTS PAYABLE (AP) ANALYTICS & AGING
  // ==========================================

  async getAPSummary(organizationId: string, filter: APFilterDto) {
    const where: Prisma.VendorBillWhereInput = {
      organizationId,
      postingStatus: InvoicePostingStatus.POSTED,
      status: { not: VendorBillStatus.CANCELLED },
    };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.vendorId) where.vendorId = filter.vendorId;

    const bills = await this.prisma.vendorBill.findMany({ where });

    const now = filter.asOfDate ? new Date(filter.asOfDate) : new Date();

    let totalBilled = new Decimal(0);
    let totalPaid = new Decimal(0);
    let totalPayables = new Decimal(0);
    let totalOverdue = new Decimal(0);
    let overdueCount = 0;

    for (const bill of bills) {
      totalBilled = totalBilled.plus(bill.totalAmount);
      totalPaid = totalPaid.plus(bill.amountPaid);
      totalPayables = totalPayables.plus(bill.amountDue);

      if (bill.dueDate < now && bill.amountDue.greaterThan(0)) {
        totalOverdue = totalOverdue.plus(bill.amountDue);
        overdueCount++;
      }
    }

    return {
      totalBilled: totalBilled.toNumber(),
      totalPaid: totalPaid.toNumber(),
      totalPayables: totalPayables.toNumber(),
      totalOverdue: totalOverdue.toNumber(),
      openBillCount: bills.filter((b) => b.amountDue.greaterThan(0)).length,
      overdueBillCount: overdueCount,
    };
  }

  async getAPAging(organizationId: string, filter: APFilterDto) {
    const where: Prisma.VendorBillWhereInput = {
      organizationId,
      postingStatus: InvoicePostingStatus.POSTED,
      status: { not: VendorBillStatus.CANCELLED },
      amountDue: { gt: 0 },
    };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.vendorId) where.vendorId = filter.vendorId;

    const bills = await this.prisma.vendorBill.findMany({
      where,
      include: { vendor: true },
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

    const vendorMap: Record<string, any> = {};

    for (const bill of bills) {
      const diffTime = asOf.getTime() - new Date(bill.dueDate).getTime();
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
      buckets[bucketKey].amount = buckets[bucketKey].amount.plus(bill.amountDue);

      // Vendor aging breakdown
      if (!vendorMap[bill.vendorId]) {
        vendorMap[bill.vendorId] = {
          vendorId: bill.vendorId,
          vendorCode: bill.vendor.vendorCode,
          name: bill.vendor.name,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
          totalDue: 0,
        };
      }

      vendorMap[bill.vendorId][bucketKey] += bill.amountDue.toNumber();
      vendorMap[bill.vendorId].totalDue += bill.amountDue.toNumber();
    }

    const totalAP = Object.values(buckets).reduce(
      (sum, b) => sum.plus(b.amount),
      new Decimal(0),
    );

    return {
      asOfDate: asOf.toISOString().slice(0, 10),
      totalPayables: totalAP.toNumber(),
      buckets: {
        current: { count: buckets.current.count, amount: buckets.current.amount.toNumber() },
        days1_30: { count: buckets.days1_30.count, amount: buckets.days1_30.amount.toNumber() },
        days31_60: { count: buckets.days31_60.count, amount: buckets.days31_60.amount.toNumber() },
        days61_90: { count: buckets.days61_90.count, amount: buckets.days61_90.amount.toNumber() },
        days90Plus: { count: buckets.days90Plus.count, amount: buckets.days90Plus.amount.toNumber() },
      },
      vendors: Object.values(vendorMap),
    };
  }

  // ==========================================
  // 6. AP SUB-LEDGER TO GL RECONCILIATION
  // ==========================================

  async getAPControlReconciliation(organizationId: string, entityId: string) {
    // 1. Get AP Subledger total
    const openBills = await this.prisma.vendorBill.findMany({
      where: {
        organizationId,
        entityId,
        postingStatus: InvoicePostingStatus.POSTED,
        status: { not: VendorBillStatus.CANCELLED },
      },
    });

    const subledgerTotal = openBills.reduce(
      (sum, bill) => sum.plus(bill.amountDue),
      new Decimal(0),
    );

    // 2. Get GL AP Control Account balance
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId },
      include: { apAccount: true },
    });

    if (!settings || !settings.apAccountId) {
      return {
        isReconciled: false,
        subledgerTotal: subledgerTotal.toNumber(),
        glControlBalance: 0,
        difference: subledgerTotal.toNumber(),
        message: 'Accounts Payable account not configured.',
      };
    }

    const glLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: settings.apAccountId,
        journalEntry: {
          organizationId,
          entityId,
          status: JournalEntryStatus.POSTED,
        },
      },
    });

    // AP is a Liability -> Credit increases, Debit decreases
    let glBalance = new Decimal(0);
    for (const line of glLines) {
      glBalance = glBalance.plus(line.credit).minus(line.debit);
    }

    const difference = subledgerTotal.minus(glBalance).abs();

    return {
      entityId,
      apAccountId: settings.apAccountId,
      apAccountCode: settings.apAccount?.code,
      apAccountName: settings.apAccount?.name,
      subledgerTotal: subledgerTotal.toNumber(),
      glControlBalance: glBalance.toNumber(),
      difference: difference.toNumber(),
      isReconciled: difference.isZero(),
    };
  }
}
