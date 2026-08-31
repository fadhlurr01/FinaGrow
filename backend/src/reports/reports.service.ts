import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountType, JournalEntryStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private resolveDateRange(filter?: ReportFilterDto): { startDate?: Date; endDate?: Date } {
    const now = new Date();
    if (!filter) return {};

    if (filter.startDate && filter.endDate) {
      return {
        startDate: new Date(filter.startDate),
        endDate: new Date(filter.endDate),
      };
    }

    const preset = filter.periodPreset || 'THIS_YEAR';
    switch (preset) {
      case 'THIS_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      case 'LAST_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      case 'THIS_QUARTER': {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterMonth, 1);
        const end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
      case 'THIS_YEAR':
      default: {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. PROFIT & LOSS (INCOME STATEMENT)
  // ──────────────────────────────────────────────────────────────────
  async getProfitAndLoss(organizationId: string, filter?: ReportFilterDto) {
    const { startDate, endDate } = this.resolveDateRange(filter);

    const whereLines: any = {
      journalEntry: {
        organizationId,
        status: JournalEntryStatus.POSTED,
        ...(filter?.entityId ? { entityId: filter.entityId } : {}),
        ...(startDate && endDate ? { entryDate: { gte: startDate, lte: endDate } } : {}),
      },
    };

    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
        ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      },
      include: {
        journalLines: {
          where: whereLines,
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const revenueItems: any[] = [];
    const cogsItems: any[] = [];
    const expenseItems: any[] = [];

    let totalRevenue = new Decimal(0);
    let totalCOGS = new Decimal(0);
    let totalOperatingExpenses = new Decimal(0);

    accounts.forEach((acc) => {
      let totalDr = new Decimal(0);
      let totalCr = new Decimal(0);
      acc.journalLines.forEach((l) => {
        totalDr = totalDr.plus(new Decimal(l.debit));
        totalCr = totalCr.plus(new Decimal(l.credit));
      });

      if (acc.type === AccountType.REVENUE) {
        const net = totalCr.minus(totalDr);
        totalRevenue = totalRevenue.plus(net);
        revenueItems.push({
          code: acc.code,
          name: acc.name,
          amount: net.toNumber(),
        });
      } else {
        const net = totalDr.minus(totalCr);
        if (acc.subtype === 'COST_OF_GOODS_SOLD' || acc.code.startsWith('50')) {
          totalCOGS = totalCOGS.plus(net);
          cogsItems.push({ code: acc.code, name: acc.name, amount: net.toNumber() });
        } else {
          totalOperatingExpenses = totalOperatingExpenses.plus(net);
          expenseItems.push({ code: acc.code, name: acc.name, amount: net.toNumber() });
        }
      }
    });

    const grossProfit = totalRevenue.minus(totalCOGS);
    const netProfit = grossProfit.minus(totalOperatingExpenses);

    return {
      period: { startDate, endDate },
      revenue: {
        items: revenueItems,
        total: totalRevenue.toNumber(),
      },
      cogs: {
        items: cogsItems,
        total: totalCOGS.toNumber(),
      },
      grossProfit: grossProfit.toNumber(),
      operatingExpenses: {
        items: expenseItems,
        total: totalOperatingExpenses.toNumber(),
      },
      netProfit: netProfit.toNumber(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. BALANCE SHEET
  // ──────────────────────────────────────────────────────────────────
  async getBalanceSheet(organizationId: string, filter?: ReportFilterDto) {
    const { endDate } = this.resolveDateRange(filter);
    const asOfDate = endDate || new Date();

    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        type: { in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY] },
        ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              organizationId,
              status: JournalEntryStatus.POSTED,
              entryDate: { lte: asOfDate },
              ...(filter?.entityId ? { entityId: filter.entityId } : {}),
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);
    let totalEquity = new Decimal(0);

    accounts.forEach((acc) => {
      let totalDr = new Decimal(0);
      let totalCr = new Decimal(0);

      acc.journalLines.forEach((l) => {
        totalDr = totalDr.plus(new Decimal(l.debit));
        totalCr = totalCr.plus(new Decimal(l.credit));
      });

      if (acc.type === AccountType.ASSET) {
        const net = totalDr.minus(totalCr);
        totalAssets = totalAssets.plus(net);
        assets.push({ code: acc.code, name: acc.name, subtype: acc.subtype, amount: net.toNumber() });
      } else if (acc.type === AccountType.LIABILITY) {
        const net = totalCr.minus(totalDr);
        totalLiabilities = totalLiabilities.plus(net);
        liabilities.push({ code: acc.code, name: acc.name, subtype: acc.subtype, amount: net.toNumber() });
      } else if (acc.type === AccountType.EQUITY) {
        const net = totalCr.minus(totalDr);
        totalEquity = totalEquity.plus(net);
        equity.push({ code: acc.code, name: acc.name, subtype: acc.subtype, amount: net.toNumber() });
      }
    });

    const pnl = await this.getProfitAndLoss(organizationId, filter);
    const currentPeriodEarnings = pnl.netProfit;
    totalEquity = totalEquity.plus(new Decimal(currentPeriodEarnings));
    equity.push({
      code: 'RE-CURR',
      name: 'Current Period Net Profit / (Loss)',
      subtype: 'RETAINED_EARNINGS',
      amount: currentPeriodEarnings,
    });

    const isBalanced = totalAssets.equals(totalLiabilities.plus(totalEquity));

    return {
      asOfDate,
      assets: { items: assets, total: totalAssets.toNumber() },
      liabilities: { items: liabilities, total: totalLiabilities.toNumber() },
      equity: { items: equity, total: totalEquity.toNumber() },
      totalLiabilitiesAndEquity: totalLiabilities.plus(totalEquity).toNumber(),
      isBalanced,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. CASH FLOW REPORT
  // ──────────────────────────────────────────────────────────────────
  async getCashFlow(organizationId: string, filter?: ReportFilterDto) {
    const { startDate, endDate } = this.resolveDateRange(filter);

    const paymentWhere: any = {
      organizationId,
      status: 'POSTED',
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      ...(startDate && endDate ? { paymentDate: { gte: startDate, lte: endDate } } : {}),
    };

    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
      include: {
        customer: { select: { name: true } },
        vendor: { select: { name: true } },
        cashBankAccount: { select: { name: true, bankAccountNumber: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const inflows: any[] = [];
    const outflows: any[] = [];

    let totalInflow = new Decimal(0);
    let totalOutflow = new Decimal(0);

    payments.forEach((p) => {
      const amt = new Decimal(p.amount);
      const item = {
        id: p.id,
        date: new Date(p.paymentDate).toISOString().split('T')[0],
        number: p.paymentNumber,
        account: p.cashBankAccount?.name || 'Cash',
        party: p.customer?.name || p.vendor?.name || '-',
        amount: amt.toNumber(),
      };

      if (p.direction === 'INBOUND') {
        totalInflow = totalInflow.plus(amt);
        inflows.push(item);
      } else {
        totalOutflow = totalOutflow.plus(amt);
        outflows.push(item);
      }
    });

    const netCashChange = totalInflow.minus(totalOutflow);

    return {
      period: { startDate, endDate },
      inflows: { items: inflows, total: totalInflow.toNumber() },
      outflows: { items: outflows, total: totalOutflow.toNumber() },
      netCashChange: netCashChange.toNumber(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. AR AGING REPORT
  // ──────────────────────────────────────────────────────────────────
  async getArAging(organizationId: string, filter?: ReportFilterDto) {
    const where: any = {
      organizationId,
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
    };

    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const rows = invoices.map((inv) => {
      const total = new Decimal(inv.totalAmount).toNumber();
      const balanceDue = new Decimal(inv.amountDue).toNumber();
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      let bracket = 'Current';
      if (diffDays > 90) bracket = '90+ Days';
      else if (diffDays > 60) bracket = '61-90 Days';
      else if (diffDays > 30) bracket = '31-60 Days';
      else if (diffDays > 0) bracket = '1-30 Days';

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || 'Customer',
        issueDate: new Date(inv.invoiceDate).toISOString().split('T')[0],
        dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
        totalAmount: total,
        balanceDue,
        currency: inv.currency,
        daysOverdue: Math.max(0, diffDays),
        agingBracket: bracket,
        status: inv.status,
      };
    });

    const totalOutstanding = rows.reduce((s, r) => s + r.balanceDue, 0);

    return {
      totalOutstanding,
      count: rows.length,
      rows,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. SALES BY CUSTOMER REPORT
  // ──────────────────────────────────────────────────────────────────
  async getSalesByCustomer(organizationId: string, filter?: ReportFilterDto) {
    const { startDate, endDate } = this.resolveDateRange(filter);

    const where: any = {
      organizationId,
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      ...(startDate && endDate ? { invoiceDate: { gte: startDate, lte: endDate } } : {}),
    };

    const invoices = await this.prisma.salesInvoice.findMany({
      where,
      include: { customer: true },
    });

    const customerMap: Record<string, any> = {};

    invoices.forEach((inv) => {
      const cId = inv.customerId || 'UNKNOWN';
      const cName = inv.customer?.name || 'Cash Customer';
      if (!customerMap[cId]) {
        customerMap[cId] = {
          customerId: cId,
          customerName: cName,
          customerCode: inv.customer?.customerCode || '-',
          invoiceCount: 0,
          totalSales: new Decimal(0),
          totalPaid: new Decimal(0),
          balanceDue: new Decimal(0),
        };
      }

      const total = new Decimal(inv.totalAmount);
      const paid = new Decimal(inv.amountPaid ?? 0);
      const due = new Decimal(inv.amountDue);

      customerMap[cId].invoiceCount += 1;
      customerMap[cId].totalSales = customerMap[cId].totalSales.plus(total);
      customerMap[cId].totalPaid = customerMap[cId].totalPaid.plus(paid);
      customerMap[cId].balanceDue = customerMap[cId].balanceDue.plus(due);
    });

    const rows = Object.values(customerMap).map((c: any) => ({
      customerId: c.customerId,
      customerName: c.customerName,
      customerCode: c.customerCode,
      invoiceCount: c.invoiceCount,
      totalSales: c.totalSales.toNumber(),
      totalPaid: c.totalPaid.toNumber(),
      balanceDue: c.balanceDue.toNumber(),
    }));

    rows.sort((a, b) => b.totalSales - a.totalSales);

    return {
      period: { startDate, endDate },
      totalSales: rows.reduce((s, r) => s + r.totalSales, 0),
      rows,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. AP AGING REPORT
  // ──────────────────────────────────────────────────────────────────
  async getApAging(organizationId: string, filter?: ReportFilterDto) {
    const where: any = {
      organizationId,
      status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
    };

    const bills = await this.prisma.vendorBill.findMany({
      where,
      include: { vendor: true },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const rows = bills.map((b) => {
      const total = new Decimal(b.totalAmount).toNumber();
      const balanceDue = new Decimal(b.amountDue).toNumber();
      const dueDate = new Date(b.dueDate);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      let bracket = 'Current';
      if (diffDays > 90) bracket = '90+ Days';
      else if (diffDays > 60) bracket = '61-90 Days';
      else if (diffDays > 30) bracket = '31-60 Days';
      else if (diffDays > 0) bracket = '1-30 Days';

      return {
        id: b.id,
        billNumber: b.billNumber,
        vendorName: b.vendor?.name || 'Vendor',
        issueDate: new Date(b.billDate).toISOString().split('T')[0],
        dueDate: new Date(b.dueDate).toISOString().split('T')[0],
        totalAmount: total,
        balanceDue,
        currency: b.currency,
        daysOverdue: Math.max(0, diffDays),
        agingBracket: bracket,
        status: b.status,
      };
    });

    const totalOutstanding = rows.reduce((s, r) => s + r.balanceDue, 0);

    return {
      totalOutstanding,
      count: rows.length,
      rows,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. EXPENSES BY VENDOR REPORT
  // ──────────────────────────────────────────────────────────────────
  async getExpensesByVendor(organizationId: string, filter?: ReportFilterDto) {
    const { startDate, endDate } = this.resolveDateRange(filter);

    const where: any = {
      organizationId,
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
      ...(startDate && endDate ? { billDate: { gte: startDate, lte: endDate } } : {}),
    };

    const bills = await this.prisma.vendorBill.findMany({
      where,
      include: { vendor: true },
    });

    const vendorMap: Record<string, any> = {};

    bills.forEach((b) => {
      const vId = b.vendorId || 'UNKNOWN';
      const vName = b.vendor?.name || 'General Supplier';
      if (!vendorMap[vId]) {
        vendorMap[vId] = {
          vendorId: vId,
          vendorName: vName,
          vendorCode: b.vendor?.vendorCode || '-',
          billCount: 0,
          totalExpenses: new Decimal(0),
          totalPaid: new Decimal(0),
          balanceDue: new Decimal(0),
        };
      }

      const total = new Decimal(b.totalAmount);
      const paid = new Decimal(b.amountPaid ?? 0);
      const due = new Decimal(b.amountDue);

      vendorMap[vId].billCount += 1;
      vendorMap[vId].totalExpenses = vendorMap[vId].totalExpenses.plus(total);
      vendorMap[vId].totalPaid = vendorMap[vId].totalPaid.plus(paid);
      vendorMap[vId].balanceDue = vendorMap[vId].balanceDue.plus(due);
    });

    const rows = Object.values(vendorMap).map((v: any) => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      vendorCode: v.vendorCode,
      billCount: v.billCount,
      totalExpenses: v.totalExpenses.toNumber(),
      totalPaid: v.totalPaid.toNumber(),
      balanceDue: v.balanceDue.toNumber(),
    }));

    rows.sort((a, b) => b.totalExpenses - a.totalExpenses);

    return {
      period: { startDate, endDate },
      totalExpenses: rows.reduce((s, r) => s + r.totalExpenses, 0),
      rows,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 8. VAT SUMMARY REPORT (TAX ENGINE)
  // ──────────────────────────────────────────────────────────────────
  async getVatSummary(organizationId: string, filter?: ReportFilterDto) {
    const where: any = {
      organizationId,
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
    };

    const taxTxs = await this.prisma.taxTransaction.findMany({
      where,
      include: {
        taxPeriod: true,
        taxCode: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    let totalOutputVat = new Decimal(0);
    let totalInputVat = new Decimal(0);

    const rows = taxTxs.map((tx) => {
      const taxAmt = new Decimal(tx.taxAmount);
      const dpp = new Decimal(tx.baseAmount);

      if (tx.direction === 'OUTPUT') {
        totalOutputVat = totalOutputVat.plus(taxAmt);
      } else {
        totalInputVat = totalInputVat.plus(taxAmt);
      }

      const periodLabel = tx.taxPeriod
        ? `${tx.taxPeriod.periodYear}-${String(tx.taxPeriod.periodMonth).padStart(2, '0')}`
        : 'Active';

      return {
        id: tx.id,
        transactionDate: new Date(tx.transactionDate).toISOString().split('T')[0],
        period: periodLabel,
        sourceType: tx.sourceType,
        sourceId: tx.salesInvoiceId || tx.vendorBillId || tx.paymentId || '-',
        taxCode: tx.taxCode?.code || 'PPN12',
        direction: tx.direction === 'OUTPUT' ? 'Output VAT (Keluaran)' : 'Input VAT (Masukan)',
        baseAmount: dpp.toNumber(),
        taxAmount: taxAmt.toNumber(),
        legalRate: new Decimal(tx.legalRate).toNumber(),
        status: tx.status,
      };
    });

    const netVatPayable = totalOutputVat.minus(totalInputVat).toNumber();

    return {
      totalOutputVat: totalOutputVat.toNumber(),
      totalInputVat: totalInputVat.toNumber(),
      netVatPayable,
      status: netVatPayable >= 0 ? 'PAYABLE' : 'OVERPAID_REFUND',
      rows,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // 9. PAYROLL TAX & SUMMARY REPORT
  // ──────────────────────────────────────────────────────────────────
  async getPayrollSummary(organizationId: string, filter?: ReportFilterDto) {
    const where: any = {
      organizationId,
      ...(filter?.entityId ? { entityId: filter.entityId } : {}),
    };

    const runs = await this.prisma.payrollRun.findMany({
      where,
      orderBy: { runDate: 'desc' },
    });

    let totalGross = new Decimal(0);
    let totalTaxes = new Decimal(0);
    let totalNet = new Decimal(0);

    const rows = runs.map((r) => {
      const g = new Decimal(r.totalGross);
      const t = new Decimal(r.totalTaxes);
      const n = new Decimal(r.totalNet);

      totalGross = totalGross.plus(g);
      totalTaxes = totalTaxes.plus(t);
      totalNet = totalNet.plus(n);

      return {
        id: r.id,
        payPeriod: r.payPeriod,
        runDate: new Date(r.runDate).toISOString().split('T')[0],
        totalGross: g.toNumber(),
        totalTaxes: t.toNumber(),
        totalNet: n.toNumber(),
        employeeCount: r.employeeCount,
        status: r.status,
      };
    });

    return {
      totalGross: totalGross.toNumber(),
      totalTaxes: totalTaxes.toNumber(),
      totalNet: totalNet.toNumber(),
      rows,
    };
  }
}
