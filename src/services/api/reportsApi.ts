import { apiClient } from './client';

export interface ReportFilter {
  entityId?: string;
  startDate?: string;
  endDate?: string;
  periodPreset?: string;
}

export interface ProfitAndLossReport {
  period: { startDate?: string; endDate?: string };
  revenue: {
    items: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  cogs: {
    items: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    items: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  netProfit: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    items: Array<{ code: string; name: string; subtype: string; amount: number }>;
    total: number;
  };
  liabilities: {
    items: Array<{ code: string; name: string; subtype: string; amount: number }>;
    total: number;
  };
  equity: {
    items: Array<{ code: string; name: string; subtype: string; amount: number }>;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface CashFlowReport {
  period: { startDate?: string; endDate?: string };
  inflows: {
    items: Array<{ id: string; date: string; number: string; account: string; party: string; amount: number }>;
    total: number;
  };
  outflows: {
    items: Array<{ id: string; date: string; number: string; account: string; party: string; amount: number }>;
    total: number;
  };
  netCashChange: number;
}

export interface ArAgingReport {
  totalOutstanding: number;
  count: number;
  rows: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    balanceDue: number;
    currency: string;
    daysOverdue: number;
    agingBracket: string;
    status: string;
  }>;
}

export interface SalesByCustomerReport {
  period: { startDate?: string; endDate?: string };
  totalSales: number;
  rows: Array<{
    customerId: string;
    customerName: string;
    customerCode: string;
    invoiceCount: number;
    totalSales: number;
    totalPaid: number;
    balanceDue: number;
  }>;
}

export interface ApAgingReport {
  totalOutstanding: number;
  count: number;
  rows: Array<{
    id: string;
    billNumber: string;
    vendorName: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    balanceDue: number;
    currency: string;
    daysOverdue: number;
    agingBracket: string;
    status: string;
  }>;
}

export interface ExpensesByVendorReport {
  period: { startDate?: string; endDate?: string };
  totalExpenses: number;
  rows: Array<{
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    billCount: number;
    totalExpenses: number;
    totalPaid: number;
    balanceDue: number;
  }>;
}

export interface VatSummaryReport {
  totalOutputVat: number;
  totalInputVat: number;
  netVatPayable: number;
  status: 'PAYABLE' | 'OVERPAID_REFUND';
  rows: Array<{
    id: string;
    transactionDate: string;
    period: string;
    sourceType: string;
    sourceId: string;
    taxCode: string;
    direction: string;
    baseAmount: number;
    taxAmount: number;
    legalRate: number;
    status: string;
  }>;
}

export interface PayrollSummaryReport {
  totalGross: number;
  totalTaxes: number;
  totalNet: number;
  rows: Array<{
    id: string;
    payPeriod: string;
    runDate: string;
    totalGross: number;
    totalTaxes: number;
    totalNet: number;
    employeeCount: number;
    status: string;
  }>;
}

const buildQuery = (filter?: ReportFilter) => {
  const params = new URLSearchParams();
  if (filter?.entityId) params.append('entityId', filter.entityId);
  if (filter?.startDate) params.append('startDate', filter.startDate);
  if (filter?.endDate) params.append('endDate', filter.endDate);
  if (filter?.periodPreset) params.append('periodPreset', filter.periodPreset);
  const q = params.toString();
  return q ? `?${q}` : '';
};

export const reportsApi = {
  getProfitAndLoss: (filter?: ReportFilter) => apiClient<ProfitAndLossReport>(`/reports/profit-loss${buildQuery(filter)}`),
  getBalanceSheet: (filter?: ReportFilter) => apiClient<BalanceSheetReport>(`/reports/balance-sheet${buildQuery(filter)}`),
  getCashFlow: (filter?: ReportFilter) => apiClient<CashFlowReport>(`/reports/cash-flow${buildQuery(filter)}`),
  getArAging: (filter?: ReportFilter) => apiClient<ArAgingReport>(`/reports/ar-aging${buildQuery(filter)}`),
  getSalesByCustomer: (filter?: ReportFilter) => apiClient<SalesByCustomerReport>(`/reports/sales-by-customer${buildQuery(filter)}`),
  getApAging: (filter?: ReportFilter) => apiClient<ApAgingReport>(`/reports/ap-aging${buildQuery(filter)}`),
  getExpensesByVendor: (filter?: ReportFilter) => apiClient<ExpensesByVendorReport>(`/reports/expenses-by-vendor${buildQuery(filter)}`),
  getVatSummary: (filter?: ReportFilter) => apiClient<VatSummaryReport>(`/reports/vat-summary${buildQuery(filter)}`),
  getPayrollSummary: (filter?: ReportFilter) => apiClient<PayrollSummaryReport>(`/reports/payroll-summary${buildQuery(filter)}`),
};
