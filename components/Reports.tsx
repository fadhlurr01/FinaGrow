import React, { useState } from 'react';
import { ReportCardType } from '../types';
import { 
  ScaleIcon, DocumentChartBarIcon, ArrowTrendingUpIcon, 
  BuildingStorefrontIcon, ArrowsRightLeftIcon, ReceiptPercentIcon, 
  ArrowDownOnSquareIcon 
} from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { reportsApi, ReportFilter } from '../src/services/api/reportsApi';
import { 
  FileText, Download, X, RefreshCw, AlertCircle, 
  CheckCircle2, Calendar, Filter, Eye 
} from 'lucide-react';

interface ReportModalState {
  isOpen: boolean;
  reportType: string;
  title: string;
  data: any | null;
  loading: boolean;
  error: string | null;
}

const ReportCard: React.FC<{ 
  report: ReportCardType; 
  onView: () => void;
  onDownload: () => void;
  isLoading: boolean;
}> = ({ report, onView, onDownload, isLoading }) => {
  const { t } = useLocalization();
  const { title, description, icon: Icon } = report;

  return (
    <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-700/40 p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-sm">
      <div>
        <div className="flex items-center mb-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-950/60 rounded-2xl mr-4">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h4 className="text-base font-extrabold text-slate-800 dark:text-white">{t(title) || title}</h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {t(description) || description}
        </p>
      </div>

      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700/30">
        <button 
          onClick={onView}
          className="flex-1 text-center bg-primary-50 dark:bg-slate-700/60 text-primary-600 dark:text-primary-300 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-primary-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t('viewReport') || 'View Report'}</span>
        </button>
        <button 
          onClick={onDownload}
          disabled={isLoading}
          className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
          aria-label={`Download ${t(title)}`}
          title={`Download ${t(title)} (CSV)`}
        >
          <Download className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

const Reports: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [periodPreset, setPeriodPreset] = useState<string>('THIS_YEAR');

  // Report details modal state
  const [modal, setModal] = useState<ReportModalState>({
    isOpen: false,
    reportType: '',
    title: '',
    data: null,
    loading: false,
    error: null,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const fetchReportData = async (reportType: string, filter?: ReportFilter) => {
    const activeFilter: ReportFilter = {
      entityId: state.activeEntityId || undefined,
      periodPreset,
      ...filter,
    };

    switch (reportType) {
      case 'pnl':
        return await reportsApi.getProfitAndLoss(activeFilter);
      case 'balanceSheet':
        return await reportsApi.getBalanceSheet(activeFilter);
      case 'cashFlow':
        return await reportsApi.getCashFlow(activeFilter);
      case 'invoiceAging':
        return await reportsApi.getArAging(activeFilter);
      case 'salesByCustomer':
        return await reportsApi.getSalesByCustomer(activeFilter);
      case 'billsAging':
        return await reportsApi.getApAging(activeFilter);
      case 'expensesByVendor':
        return await reportsApi.getExpensesByVendor(activeFilter);
      case 'vatReport':
        return await reportsApi.getVatSummary(activeFilter);
      case 'payrollTaxReport':
        return await reportsApi.getPayrollSummary(activeFilter);
      default:
        throw new Error('Unknown report type');
    }
  };

  const handleOpenView = async (reportType: string, titleTranslated: string) => {
    setModal({
      isOpen: true,
      reportType,
      title: titleTranslated,
      data: null,
      loading: true,
      error: null,
    });

    try {
      const result = await fetchReportData(reportType);
      setModal({
        isOpen: true,
        reportType,
        title: titleTranslated,
        data: result,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setModal({
        isOpen: true,
        reportType,
        title: titleTranslated,
        data: null,
        loading: false,
        error: err.message || (language === 'id' ? 'Gagal memuat laporan' : 'Failed to load report'),
      });
    }
  };

  const handleDownload = async (reportType: string, titleTranslated: string) => {
    setDownloadingType(reportType);
    try {
      const data = await fetchReportData(reportType);
      exportToCsv(reportType, titleTranslated, data);
    } catch (err: any) {
      alert(`Error exporting report: ${err.message}`);
    } finally {
      setDownloadingType(null);
    }
  };

  const exportToCsv = (reportType: string, titleTranslated: string, data: any) => {
    let csvContent = '';
    const delimiter = ',';
    const escapeCsv = (str: any) => {
      const s = String(str ?? '');
      if (s.includes(delimiter) || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    let headers: string[] = [];
    let rows: any[][] = [];

    switch (reportType) {
      case 'pnl': {
        headers = ['Category', 'Account Code', 'Account Name', 'Amount'];
        data.revenue?.items?.forEach((i: any) => rows.push(['Revenue', i.code, i.name, i.amount]));
        rows.push(['Revenue Total', '', '', data.revenue?.total || 0]);
        data.cogs?.items?.forEach((i: any) => rows.push(['COGS', i.code, i.name, i.amount]));
        rows.push(['COGS Total', '', '', data.cogs?.total || 0]);
        rows.push(['Gross Profit', '', '', data.grossProfit || 0]);
        data.operatingExpenses?.items?.forEach((i: any) => rows.push(['Operating Expenses', i.code, i.name, i.amount]));
        rows.push(['Total Operating Expenses', '', '', data.operatingExpenses?.total || 0]);
        rows.push(['Net Profit', '', '', data.netProfit || 0]);
        break;
      }
      case 'balanceSheet': {
        headers = ['Section', 'Account Code', 'Account Name', 'Subtype', 'Amount'];
        data.assets?.items?.forEach((i: any) => rows.push(['Assets', i.code, i.name, i.subtype, i.amount]));
        rows.push(['Total Assets', '', '', '', data.assets?.total || 0]);
        data.liabilities?.items?.forEach((i: any) => rows.push(['Liabilities', i.code, i.name, i.subtype, i.amount]));
        rows.push(['Total Liabilities', '', '', '', data.liabilities?.total || 0]);
        data.equity?.items?.forEach((i: any) => rows.push(['Equity', i.code, i.name, i.subtype, i.amount]));
        rows.push(['Total Equity', '', '', '', data.equity?.total || 0]);
        rows.push(['Total Liabilities & Equity', '', '', '', data.totalLiabilitiesAndEquity || 0]);
        break;
      }
      case 'cashFlow': {
        headers = ['Direction', 'Date', 'Reference', 'Account', 'Counterparty', 'Amount'];
        data.inflows?.items?.forEach((i: any) => rows.push(['Inflow', i.date, i.number, i.account, i.party, i.amount]));
        data.outflows?.items?.forEach((i: any) => rows.push(['Outflow', i.date, i.number, i.account, i.party, i.amount]));
        rows.push(['Net Cash Flow', '', '', '', '', data.netCashChange || 0]);
        break;
      }
      case 'invoiceAging': {
        headers = ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Total Amount', 'Balance Due', 'Aging Bracket', 'Status'];
        data.rows?.forEach((r: any) => rows.push([r.invoiceNumber, r.customerName, r.issueDate, r.dueDate, r.totalAmount, r.balanceDue, r.agingBracket, r.status]));
        break;
      }
      case 'salesByCustomer': {
        headers = ['Customer Code', 'Customer Name', 'Invoices Count', 'Total Sales', 'Total Paid', 'Balance Due'];
        data.rows?.forEach((r: any) => rows.push([r.customerCode, r.customerName, r.invoiceCount, r.totalSales, r.totalPaid, r.balanceDue]));
        break;
      }
      case 'billsAging': {
        headers = ['Bill #', 'Vendor', 'Issue Date', 'Due Date', 'Total Amount', 'Balance Due', 'Aging Bracket', 'Status'];
        data.rows?.forEach((r: any) => rows.push([r.billNumber, r.vendorName, r.issueDate, r.dueDate, r.totalAmount, r.balanceDue, r.agingBracket, r.status]));
        break;
      }
      case 'expensesByVendor': {
        headers = ['Vendor Code', 'Vendor Name', 'Bills Count', 'Total Expenses', 'Total Paid', 'Balance Due'];
        data.rows?.forEach((r: any) => rows.push([r.vendorCode, r.vendorName, r.billCount, r.totalExpenses, r.totalPaid, r.balanceDue]));
        break;
      }
      case 'vatReport': {
        headers = ['Date', 'Period', 'Source Type', 'Tax Code', 'Direction', 'Base DPP', 'VAT Amount', 'Rate', 'Status'];
        data.rows?.forEach((r: any) => rows.push([r.transactionDate, r.period, r.sourceType, r.taxCode, r.direction, r.baseAmount, r.taxAmount, `${r.legalRate * 100}%`, r.status]));
        break;
      }
      case 'payrollTaxReport': {
        headers = ['Pay Period', 'Run Date', 'Employee Count', 'Total Gross Pay', 'PPh 21 Taxes', 'Total Net Pay', 'Status'];
        data.rows?.forEach((r: any) => rows.push([r.payPeriod, r.runDate, r.employeeCount, r.totalGross, r.totalTaxes, r.totalNet, r.status]));
        break;
      }
      default:
        headers = ['Info'];
        rows = [['No data template']];
    }

    csvContent = [
      headers.join(delimiter),
      ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(delimiter)),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${titleTranslated.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableReports: ReportCardType[] = [
    { title: 'pnl', description: 'pnlDesc', icon: DocumentChartBarIcon, category: 'Financial Statements' },
    { title: 'balanceSheet', description: 'balanceSheetDesc', icon: ScaleIcon, category: 'Financial Statements' },
    { title: 'cashFlow', description: 'cashFlowDesc', icon: ArrowsRightLeftIcon, category: 'Financial Statements' },
    { title: 'invoiceAging', description: 'invoiceAgingDesc', icon: ArrowTrendingUpIcon, category: 'Sales & Receivables' },
    { title: 'salesByCustomer', description: 'salesByCustomerDesc', icon: ArrowTrendingUpIcon, category: 'Sales & Receivables' },
    { title: 'billsAging', description: 'billsAgingDesc', icon: BuildingStorefrontIcon, category: 'Purchases & Payables' },
    { title: 'expensesByVendor', description: 'expensesByVendorDesc', icon: BuildingStorefrontIcon, category: 'Purchases & Payables' },
    { title: 'vatReport', description: 'vatReportDesc', icon: ReceiptPercentIcon, category: 'Tax' },
    { title: 'payrollTaxReport', description: 'payrollTaxReportDesc', icon: ReceiptPercentIcon, category: 'Tax' },
  ];

  const categories: Record<string, string> = {
    'Financial Statements': 'financialStatements',
    'Sales & Receivables': 'salesAndReceivables',
    'Purchases & Payables': 'purchasesAndPayables',
    Tax: 'tax',
  };

  const categoryOrder = ['Financial Statements', 'Sales & Receivables', 'Purchases & Payables', 'Tax'];

  return (
    <div className="container mx-auto pb-12 space-y-8">
      {/* Header & Global Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-700/60">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === 'id' ? 'Laporan Keuangan & Fiskal' : 'Financial & Fiscal Reports'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'id'
              ? 'Laporan laba rugi, neraca, arus kas, penuaan piutang/utang, serta pajak langsung dari database'
              : 'Live financial statements, sub-ledger aging, and tax compliance backed by PostgreSQL'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-2 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="THIS_MONTH">{language === 'id' ? 'Bulan Ini' : 'This Month'}</option>
            <option value="LAST_MONTH">{language === 'id' ? 'Bulan Lalu' : 'Last Month'}</option>
            <option value="THIS_QUARTER">{language === 'id' ? 'Kuartal Ini' : 'This Quarter'}</option>
            <option value="THIS_YEAR">{language === 'id' ? 'Tahun Ini' : 'This Year'}</option>
          </select>
        </div>
      </div>

      {/* Report Categories Grid */}
      {categoryOrder.map((category) => (
        <div key={category} className="space-y-4">
          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
            {t(categories[category]) || category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableReports
              .filter((report) => report.category === category)
              .map((report) => (
                <ReportCard
                  key={report.title}
                  report={report}
                  onView={() => handleOpenView(report.title, t(report.title) || report.title)}
                  onDownload={() => handleDownload(report.title, t(report.title) || report.title)}
                  isLoading={downloadingType === report.title}
                />
              ))}
          </div>
        </div>
      ))}

      {/* Live Report Detail Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 dark:bg-primary-950/50 rounded-2xl text-primary-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{modal.title}</h3>
                  <p className="text-xs text-slate-400">
                    {language === 'id' ? 'Data langsung dari PostgreSQL' : 'Live data from PostgreSQL'} • {periodPreset}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {modal.data && (
                  <button
                    onClick={() => exportToCsv(modal.reportType, modal.title, modal.data)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                )}
                <button
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 font-sans">
              {modal.loading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
                  <p className="text-xs font-bold">{language === 'id' ? 'Memuat laporan keuangan...' : 'Generating financial report...'}</p>
                </div>
              )}

              {modal.error && (
                <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{modal.error}</p>
                </div>
              )}

              {!modal.loading && !modal.error && modal.data && (
                <div className="space-y-6">
                  {/* Dynamic Render based on Report Type */}
                  {modal.reportType === 'pnl' && (
                    <div className="space-y-4">
                      {/* Revenue */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span>{language === 'id' ? 'Pendapatan Usaha (Revenue)' : 'Operating Revenue'}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(modal.data.revenue?.total)}</span>
                        </div>
                        {modal.data.revenue?.items?.map((item: any) => (
                          <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{item.code} - {item.name}</span>
                            <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>

                      {/* COGS */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span>{language === 'id' ? 'Beban Pokok Pendapatan (COGS)' : 'Cost of Goods Sold'}</span>
                          <span className="text-rose-500">{formatCurrency(modal.data.cogs?.total)}</span>
                        </div>
                        {modal.data.cogs?.items?.map((item: any) => (
                          <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{item.code} - {item.name}</span>
                            <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Gross Profit */}
                      <div className="p-4 bg-primary-50 dark:bg-primary-950/40 rounded-2xl flex justify-between font-black text-sm text-primary-700 dark:text-primary-300 border border-primary-150 dark:border-primary-800/50">
                        <span>{language === 'id' ? 'Laba Kotor (Gross Profit)' : 'Gross Profit'}</span>
                        <span>{formatCurrency(modal.data.grossProfit)}</span>
                      </div>

                      {/* Operating Expenses */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span>{language === 'id' ? 'Beban Operasional' : 'Operating Expenses'}</span>
                          <span className="text-rose-500">{formatCurrency(modal.data.operatingExpenses?.total)}</span>
                        </div>
                        {modal.data.operatingExpenses?.items?.map((item: any) => (
                          <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{item.code} - {item.name}</span>
                            <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Net Profit */}
                      <div className={`p-4 rounded-2xl flex justify-between font-black text-base border ${
                        modal.data.netProfit >= 0 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        <span>{language === 'id' ? 'Laba Bersih (Net Profit)' : 'Net Profit / (Loss)'}</span>
                        <span>{formatCurrency(modal.data.netProfit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Balance Sheet */}
                  {modal.reportType === 'balanceSheet' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Assets */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                          <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span>{language === 'id' ? 'Aset (Assets)' : 'Assets'}</span>
                            <span className="text-primary-600">{formatCurrency(modal.data.assets?.total)}</span>
                          </div>
                          {modal.data.assets?.items?.map((item: any) => (
                            <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                              <span>{item.code} - {item.name}</span>
                              <span className="font-semibold">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Liabilities & Equity */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                            <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                              <span>{language === 'id' ? 'Kewajiban (Liabilities)' : 'Liabilities'}</span>
                              <span className="text-rose-500">{formatCurrency(modal.data.liabilities?.total)}</span>
                            </div>
                            {modal.data.liabilities?.items?.map((item: any) => (
                              <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                <span>{item.code} - {item.name}</span>
                                <span className="font-semibold">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-2">
                            <div className="flex justify-between font-black text-sm text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                              <span>{language === 'id' ? 'Ekuitas (Equity)' : 'Equity'}</span>
                              <span className="text-emerald-600">{formatCurrency(modal.data.equity?.total)}</span>
                            </div>
                            {modal.data.equity?.items?.map((item: any) => (
                              <div key={item.code} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                <span>{item.code} - {item.name}</span>
                                <span className="font-semibold">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Balance check */}
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex justify-between font-bold text-xs">
                        <span>Total Liabilitas + Ekuitas</span>
                        <span>{formatCurrency(modal.data.totalLiabilitiesAndEquity)}</span>
                      </div>
                    </div>
                  )}

                  {/* Generic Table for AR/AP Aging, Sales by Customer, VAT, Payroll */}
                  {modal.data.rows && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs divide-y divide-slate-200 dark:divide-slate-700">
                        <thead>
                          <tr className="text-left font-black text-slate-500 uppercase tracking-wider">
                            {Object.keys(modal.data.rows[0] || {}).map((k) => (
                              <th key={k} className="py-3 px-3">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {modal.data.rows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              {Object.entries(row).map(([k, val]: [string, any], vIdx: number) => (
                                <td key={vIdx} className="py-2.5 px-3 whitespace-nowrap">
                                  {typeof val === 'number' && k.toLowerCase().includes('amount') ? formatCurrency(val) : String(val ?? '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;