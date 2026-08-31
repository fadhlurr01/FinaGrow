import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import { 
  taxApi, 
  TaxCode, 
  TaxTransaction, 
  TaxPeriod, 
  TaxPayment, 
  VATSummary, 
  TaxReconciliationReport 
} from '../src/services/api/taxApi';
import { 
  ReceiptPercentIcon,
} from './icons/IconComponents';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Layers, 
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  CreditCard,
  Building2,
  Calendar,
  Lock,
  Unlock,
  Scale
} from 'lucide-react';

type TaxTab = 'vat_summary' | 'transactions' | 'periods' | 'payments' | 'reconciliation' | 'codes';

const Tax: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();
  const activeEntityId = state.activeEntityId;

  // Active tab state
  const [activeTab, setActiveTab] = useState<TaxTab>('vat_summary');

  // Selected period state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Data states
  const [vatSummary, setVatSummary] = useState<VATSummary | null>(null);
  const [transactions, setTransactions] = useState<TaxTransaction[]>([]);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [reconciliation, setReconciliation] = useState<TaxReconciliationReport | null>(null);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentForm, setPaymentForm] = useState({
    taxPeriodId: '',
    taxType: 'VAT',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    cashBankAccountId: '',
    ntpn: '',
    sspNumber: '',
    notes: '',
  });

  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [reopenTargetId, setReopenTargetId] = useState<string>('');
  const [reopenReason, setReopenReason] = useState<string>('');

  const [showReverseModal, setShowReverseModal] = useState<boolean>(false);
  const [reverseTargetId, setReverseTargetId] = useState<string>('');
  const [reverseReason, setReverseReason] = useState<string>('');

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0
    }).format(isNaN(num) ? 0 : num);
  };

  // ─── Data Fetching ───────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [codesRes, transRes, periodsRes, paymentsRes] = await Promise.all([
        taxApi.getTaxCodes(activeEntityId || undefined).catch(() => []),
        taxApi.getTransactions({
          entityId: activeEntityId || undefined,
          periodYear: selectedYear,
          periodMonth: selectedMonth,
        }).catch(() => []),
        taxApi.getPeriods({
          entityId: activeEntityId || undefined,
          periodYear: selectedYear,
          periodMonth: selectedMonth,
        }).catch(() => []),
        taxApi.getTaxPayments({
          entityId: activeEntityId || undefined,
        }).catch(() => []),
      ]);

      setTaxCodes(codesRes);
      setTransactions(transRes);
      setPeriods(periodsRes);
      setPayments(paymentsRes);

      // Load VAT summary if entity is selected
      if (activeEntityId) {
        const [vatRes, reconRes] = await Promise.all([
          taxApi.getVATSummary(activeEntityId, selectedYear, selectedMonth).catch(() => null),
          taxApi.reconcile(activeEntityId, selectedYear, selectedMonth).catch(() => null),
        ]);
        setVatSummary(vatRes);
        setReconciliation(reconRes);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load tax data from server.');
    } finally {
      setLoading(false);
    }
  }, [activeEntityId, selectedYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Actions ─────────────────────────────────────────────────────

  const handlePreparePeriod = async (periodId: string) => {
    setActionLoading(periodId);
    setErrorMessage(null);
    try {
      await taxApi.preparePeriod(periodId);
      setSuccessMessage(language === 'id' ? 'Masa pajak berhasil dihitung & disiapkan!' : 'Tax period successfully prepared!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to prepare tax period.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilePeriod = async (periodId: string) => {
    setActionLoading(periodId);
    setErrorMessage(null);
    try {
      await taxApi.filePeriod(periodId);
      setSuccessMessage(language === 'id' ? 'SPT Masa berhasil dilaporkan!' : 'Tax period successfully filed!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to file tax period.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenPeriodSubmit = async () => {
    if (!reopenTargetId || !reopenReason.trim()) return;
    setActionLoading(reopenTargetId);
    setErrorMessage(null);
    try {
      await taxApi.reopenPeriod(reopenTargetId, reopenReason);
      setSuccessMessage(language === 'id' ? 'Masa pajak berhasil dibuka kembali.' : 'Tax period successfully reopened.');
      setShowReopenModal(false);
      setReopenReason('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reopen tax period.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReverseTransactionSubmit = async () => {
    if (!reverseTargetId) return;
    setActionLoading(reverseTargetId);
    setErrorMessage(null);
    try {
      await taxApi.reverseTransaction(reverseTargetId, reverseReason);
      setSuccessMessage(language === 'id' ? 'Transaksi pajak berhasil dibalik (reversal)!' : 'Tax transaction reversed successfully!');
      setShowReverseModal(false);
      setReverseReason('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reverse tax transaction.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostVATSettlement = async (paymentId: string) => {
    setActionLoading(paymentId);
    setErrorMessage(null);
    try {
      await taxApi.postVATSettlement(paymentId);
      setSuccessMessage(language === 'id' ? 'Jurnal pelunasan PPN berhasil diposting ke Buku Besar!' : 'VAT settlement journal successfully posted to GL!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post VAT settlement.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostWithholdingRemittance = async (paymentId: string) => {
    setActionLoading(paymentId);
    setErrorMessage(null);
    try {
      await taxApi.postWithholdingRemittance(paymentId);
      setSuccessMessage(language === 'id' ? 'Jurnal setoran PPh berhasil diposting ke Buku Besar!' : 'Withholding remittance journal successfully posted to GL!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post withholding remittance.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntityId || !paymentForm.taxPeriodId || !paymentForm.cashBankAccountId || paymentForm.amount <= 0) {
      setErrorMessage(language === 'id' ? 'Mohon lengkapi seluruh data pembayaran pajak.' : 'Please fill all required payment fields.');
      return;
    }

    setActionLoading('create_payment');
    setErrorMessage(null);
    try {
      await taxApi.createTaxPayment({
        entityId: activeEntityId,
        taxPeriodId: paymentForm.taxPeriodId,
        paymentDate: paymentForm.paymentDate,
        taxType: paymentForm.taxType,
        amount: paymentForm.amount,
        cashBankAccountId: paymentForm.cashBankAccountId,
        ntpn: paymentForm.ntpn || undefined,
        sspNumber: paymentForm.sspNumber || undefined,
        notes: paymentForm.notes || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Draft setoran pajak berhasil dibuat.' : 'Tax payment draft created.');
      setShowPaymentModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create tax payment.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Filtered Transactions ───────────────────────────────────────

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesType = taxTypeFilter === 'all' || tx.taxCode?.taxType === taxTypeFilter;
      const matchesDir = directionFilter === 'all' || tx.direction === directionFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? (
        (tx.taxCode?.code?.toLowerCase() || '').includes(term) ||
        (tx.taxCode?.name?.toLowerCase() || '').includes(term) ||
        (tx.notes?.toLowerCase() || '').includes(term) ||
        (tx.id.toLowerCase()).includes(term)
      ) : true;
      return matchesType && matchesDir && matchesSearch;
    });
  }, [transactions, taxTypeFilter, directionFilter, searchTerm]);

  // Derive VAT values
  const outputVatValue = vatSummary ? Number(vatSummary.outputVat) : 0;
  const inputVatValue = vatSummary ? Number(vatSummary.inputVat) : 0;
  const netVatValue = vatSummary ? Number(vatSummary.netVat) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <ReceiptPercentIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span>TAXATION & VAT LEDGER</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Benchmark Input vs Output Value-Added Tax (VAT) generated directly from your Invoices records.
          </p>
        </div>

        {/* Period selection, Refresh & Export button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => alert('Exporting e-Faktur CSV formatted according to DJP guidelines...')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT E-TAX CSV</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
          </button>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-white font-bold outline-none cursor-pointer pr-2"
            >
              {[
                { m: 1, name: 'Januari' },
                { m: 2, name: 'Februari' },
                { m: 3, name: 'Maret' },
                { m: 4, name: 'April' },
                { m: 5, name: 'Mei' },
                { m: 6, name: 'Juni' },
                { m: 7, name: 'Juli' },
                { m: 8, name: 'Agustus' },
                { m: 9, name: 'September' },
                { m: 10, name: 'Oktober' },
                { m: 11, name: 'November' },
                { m: 12, name: 'Desember' },
              ].map(item => (
                <option key={item.m} value={item.m} className="dark:bg-slate-800">
                  {language === 'id' ? item.name : `Month ${item.m}`}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="dark:bg-slate-800">{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 2. Stat Cards */}
      {(() => {
        const displayOutputVat = outputVatValue;
        const displayInputVat = inputVatValue;
        const displayNetVat = netVatValue;

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Output VAT Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block">
                  OUTPUT VAT (TAX ON SALES)
                </span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(displayOutputVat)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                <span>Collected via outbound invoices</span>
              </p>
            </div>

            {/* Input VAT Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block">
                  INPUT VAT (TAX ON PURCHASES)
                </span>
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(displayInputVat)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Creditable on purchases billing</span>
              </p>
            </div>

            {/* Net VAT Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block">
                  NET VAT PAYABLE
                </span>
                <Layers className="w-4 h-4 text-primary-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(displayNetVat)}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Net liabilities to state treasury
              </p>
            </div>
          </div>
        );
      })()}

      {/* ─── TAB 1: REKAPITULASI PPN & TRANSAKSI (MATCHING SCREENSHOT 3) ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700/50 gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              TAX TRANSACTIONS
            </h3>
            <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
              Track billing vouchers with associated sales tax factors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Invoice No. / Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Tax Types</option>
              <option value="INPUT">INPUT VAT</option>
              <option value="OUTPUT">OUTPUT VAT</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="px-5 py-3.5">DATE</th>
                <th className="px-5 py-3.5">DOCUMENT NO</th>
                <th className="px-5 py-3.5">PARTY</th>
                <th className="px-5 py-3.5 text-center">TAX TYPE</th>
                <th className="px-5 py-3.5 text-right">SUBTOTAL</th>
                <th className="px-5 py-3.5 text-center">TAX RATE</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">TAX AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
              {(() => {
                const rowsToRender = transactions.length > 0 
                  ? transactions.map(t => ({
                      date: new Date(t.transactionDate).toISOString().split('T')[0],
                      docNo: t.referenceNumber || t.id.substring(0, 8),
                      party: t.notes || 'Counterparty',
                      taxType: t.direction === 'INPUT' ? 'INPUT VAT' : 'OUTPUT VAT',
                      typeBadge: t.direction === 'INPUT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
                      subtotal: Number(t.dppAmount) || 0,
                      rate: `${(Number(t.legalRate) * 100).toFixed(0)}%`,
                      taxAmount: Number(t.taxAmount) || 0,
                    }))
                  : [];

                const filtered = rowsToRender.filter(row => {
                  const matchSearch = row.docNo.toLowerCase().includes(searchTerm.toLowerCase()) || row.party.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchType = taxTypeFilter === 'all' || row.taxType.includes(taxTypeFilter);
                  return matchSearch && matchType;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                        {language === 'id' ? 'Belum ada transaksi pajak pada periode ini.' : 'No tax transactions found for this period.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">
                      {row.date}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {row.docNo}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                      {row.party}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${row.typeBadge}`}>
                        • {row.taxType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(row.subtotal)}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {row.rate}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(row.taxAmount)}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── TAB 2: BUKU TRANSAKSI PAJAK (SUB-LEDGER) ─── */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="p-5 flex flex-col md:flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700/50 gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Sub-Buku Besar Pajak (Tax Transactions)' : 'Tax Transaction Registry'}
              </h3>
              <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
                {language === 'id' ? 'Catatan mutasi pajak resmi terhubung dengan faktur penjualan, tagihan vendor, dan jurnal memorial.' : 'Immutable authoritative sub-ledger records linked to operational vouchers.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={language === 'id' ? 'Cari kode/keterangan...' : 'Search code/notes...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={taxTypeFilter}
                onChange={(e) => setTaxTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs"
              >
                <option value="all">{language === 'id' ? 'Semua Pajak' : 'All Tax Types'}</option>
                <option value="VAT">PPN (VAT)</option>
                <option value="PPH23">PPh Pasal 23</option>
                <option value="PPH4_2">PPh Final Pasal 4(2)</option>
              </select>

              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs"
              >
                <option value="all">{language === 'id' ? 'Semua Arah' : 'All Directions'}</option>
                <option value="OUTPUT">PPN Keluaran (Output)</option>
                <option value="INPUT">PPN Masukan (Input)</option>
                <option value="WITHHOLDING_PAYABLE">Withholding Payable (PPh Potong)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Kode / Nama' : 'Tax Code'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Arah & Tipe' : 'Direction'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Dasar Pengenaan (DPP)' : 'Taxable Base'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Tarif' : 'Rate'}</th>
                  <th className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">{language === 'id' ? 'Jumlah Pajak' : 'Tax Amount'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-500 dark:text-slate-400">
                      {new Date(tx.transactionDate).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{tx.taxCode?.code || '-'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{tx.taxCode?.name || tx.notes || '-'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tx.direction === 'OUTPUT'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          : tx.direction === 'INPUT'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {tx.direction}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(tx.dppAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-600 dark:text-slate-400">
                      {(Number(tx.legalRate) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(tx.taxAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        tx.status === 'POSTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : tx.status === 'REVERSED'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 line-through'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {tx.status === 'POSTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setReverseTargetId(tx.id);
                            setShowReverseModal(true);
                          }}
                          className="text-rose-600 hover:text-rose-800 dark:text-rose-400 text-xs font-bold flex items-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'id' ? 'Balik' : 'Reverse'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                      {language === 'id' ? 'Tidak ada transaksi pajak pada periode ini.' : 'No tax transactions found for this period.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MASA PAJAK / SPT (PERIODS) ─── */}
      {activeTab === 'periods' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Daftar Masa Pajak & SPT Bulanan' : 'Tax Periods & Monthly SPT Filing'}
              </h3>
              <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
                {language === 'id' ? 'Kelola lifecycle masa pajak: Hitung (Prepare) → Lapor (File) → Kunci (Lock) → Buka Kembali (Reopen).' : 'Tax period lifecycle: Prepare → File → Lock → Reopen with audit trail.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Masa / Tahun' : 'Period'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Jenis Pajak' : 'Tax Type'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Keluaran / Potong' : 'Output / Payable'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Masukan' : 'Input Tax'}</th>
                  <th className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">{language === 'id' ? 'Pajak Bersih' : 'Net Tax'}</th>
                  <th className="px-5 py-3.5 text-right font-bold text-emerald-600">{language === 'id' ? 'Disetor' : 'Paid'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Aksi Lifecycle' : 'Lifecycle Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                      {p.periodMonth}/{p.periodYear}
                    </td>
                    <td className="px-5 py-3.5 font-bold">{p.taxType}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(p.totalOutputTax || p.totalWithholdingPayable)}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(p.totalInputTax)}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">{formatCurrency(p.netTax)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalPaid)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        p.status === 'FILED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : p.status === 'PREPARED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          : p.status === 'REOPENED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => handlePreparePeriod(p.id)}
                            disabled={actionLoading === p.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          >
                            {language === 'id' ? 'Hitung' : 'Prepare'}
                          </button>
                        )}
                        {(p.status === 'PREPARED' || p.status === 'REOPENED') && (
                          <button
                            type="button"
                            onClick={() => handleFilePeriod(p.id)}
                            disabled={actionLoading === p.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>{language === 'id' ? 'Lapor SPT' : 'File'}</span>
                          </button>
                        )}
                        {(p.status === 'FILED' || p.status === 'CLOSED') && (
                          <button
                            type="button"
                            onClick={() => {
                              setReopenTargetId(p.id);
                              setShowReopenModal(true);
                            }}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>{language === 'id' ? 'Buka' : 'Reopen'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                      {language === 'id' ? 'Belum ada masa pajak terdaftar.' : 'No tax periods registered.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SETORAN & PELUNASAN (PAYMENTS) ─── */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Daftar Setoran Pajak ke Kas Negara' : 'Tax Payments & Remittances'}
              </h3>
              <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
                {language === 'id' ? 'Catatan SSP / NTPN dan posting jurnal pelunasan PPN / PPh ke Buku Besar.' : 'Bank remittance vouchers with NTPN references and double-entry postings.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-wider py-2 px-3.5 rounded-xl shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Catat Setoran Pajak' : 'Record Payment'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">{language === 'id' ? 'No. Pembayaran' : 'Payment No.'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Jenis' : 'Tax Type'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'NTPN / SSP' : 'NTPN / SSP'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Akun Bank' : 'Bank Account'}</th>
                  <th className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">{language === 'id' ? 'Nominal' : 'Amount'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Posting Jurnal' : 'Post to GL'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">{pay.paymentNumber}</td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 font-bold">{pay.taxType}</td>
                    <td className="px-5 py-3.5 font-mono text-[11px]">{pay.ntpn || pay.sspNumber || '-'}</td>
                    <td className="px-5 py-3.5">{pay.cashBankAccount?.name || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">{formatCurrency(pay.amount)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        pay.status === 'POSTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {pay.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (pay.taxType === 'VAT') handlePostVATSettlement(pay.id);
                            else handlePostWithholdingRemittance(pay.id);
                          }}
                          disabled={actionLoading === pay.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        >
                          {language === 'id' ? 'Posting GL' : 'Post GL'}
                        </button>
                      )}
                      {pay.status === 'POSTED' && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{language === 'id' ? 'Tercatat di GL' : 'Posted'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                      {language === 'id' ? 'Belum ada catatan setoran pajak.' : 'No tax payments found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: REKONSILIASI PAJAK VS GL ─── */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary-500" />
                <span>{language === 'id' ? `Laporan Rekonsiliasi Pajak vs Buku Besar: ${selectedMonth}/${selectedYear}` : `Tax Sub-Ledger vs GL Reconciliation: ${selectedMonth}/${selectedYear}`}</span>
              </h3>
              <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
                {language === 'id' ? 'Memverifikasi kesamaan saldo antara sub-ledger transaksi pajak dan akun Buku Besar (GL) terkait.' : 'Validates balance equality between the tax sub-ledger and linked GL accounts.'}
              </p>
            </div>

            {reconciliation && (
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                reconciliation.isFullyReconciled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {reconciliation.isFullyReconciled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{reconciliation.isFullyReconciled ? (language === 'id' ? 'SEIMBANG / MATCH' : 'FULLY RECONCILED') : (language === 'id' ? 'TERDAPAT SELISIH' : 'VARIANCE DETECTED')}</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Komponen Pajak' : 'Tax Component'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Saldo Sub-Buku Pajak' : 'Sub-Ledger Balance'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Saldo Buku Besar (GL)' : 'General Ledger Balance'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Selisih (Variance)' : 'Difference'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Status Rekonsiliasi' : 'Reconciliation Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {reconciliation?.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">{line.label}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(line.subLedger)}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(line.gl)}</td>
                    <td className={`px-5 py-3.5 text-right font-black ${Number(line.difference) === 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                      {formatCurrency(line.difference)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        line.isBalanced
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {line.isBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{line.isBalanced ? (language === 'id' ? 'Match' : 'Balanced') : (language === 'id' ? 'Selisih' : 'Variance')}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {!reconciliation && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                      {language === 'id' ? 'Pilih entitas untuk melihat rekonsiliasi pajak.' : 'Select an entity to view tax reconciliation.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 6: MASTER KODE PAJAK (TAX CODES) ─── */}
      {activeTab === 'codes' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Master Kode Pajak & Aturan Berversi' : 'Indonesian Tax Codes & Versioned Rules'}
              </h3>
              <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
                {language === 'id' ? 'Daftar kode pajak resmi berlandaskan regulasi perpajakan Indonesia (UU HPP).' : 'Authoritative Indonesian tax codes with versioned legal rates and DPP calculation rules.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Kode' : 'Code'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Nama Pajak' : 'Tax Name'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Jenis' : 'Type'}</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Arah' : 'Direction'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Tarif Legal' : 'Legal Rate'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Faktor DPP' : 'DPP Factor'}</th>
                  <th className="px-5 py-3.5 text-center">{language === 'id' ? 'Status' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
                {taxCodes.map((code) => {
                  const activeRule = code.rules?.[0];
                  return (
                    <tr key={code.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">{code.code}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{code.name}</div>
                        <div className="text-[10px] text-slate-400">{code.description || '-'}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold">{code.taxType}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          code.direction === 'OUTPUT'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            : code.direction === 'INPUT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {code.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">
                        {activeRule ? `${(Number(activeRule.legalRate) * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {activeRule ? Number(activeRule.dppFactor).toFixed(4) : '1.0000'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          code.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {taxCodes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      {language === 'id' ? 'Belum ada kode pajak terdaftar.' : 'No tax codes registered.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: CATAT SETORAN PAJAK ─── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              {language === 'id' ? 'Catat Setoran Pajak ke Kas Negara' : 'Record Tax Payment'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {language === 'id' ? 'Masukkan detail setoran pajak SSP / NTPN untuk pelunasan PPN atau PPh.' : 'Enter tax payment details for VAT settlement or PPh withholding remittance.'}
            </p>

            <form onSubmit={handleCreatePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'id' ? 'Masa Pajak' : 'Tax Period'} *
                </label>
                <select
                  value={paymentForm.taxPeriodId}
                  onChange={(e) => {
                    const p = periods.find(item => item.id === e.target.value);
                    setPaymentForm({
                      ...paymentForm,
                      taxPeriodId: e.target.value,
                      taxType: p?.taxType || 'VAT',
                      amount: p ? Math.abs(Number(p.netTax) - Number(p.totalPaid)) : 0,
                    });
                  }}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">{language === 'id' ? '-- Pilih Masa Pajak --' : '-- Select Tax Period --'}</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.taxType} - Masa {p.periodMonth}/{p.periodYear} (Net: {formatCurrency(p.netTax)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'id' ? 'Tanggal Bayar' : 'Payment Date'} *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'id' ? 'Nominal (Rp)' : 'Amount'} *
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'id' ? 'Nomor NTPN' : 'NTPN Ref'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.ntpn}
                    onChange={(e) => setPaymentForm({ ...paymentForm, ntpn: e.target.value })}
                    placeholder="Contoh: 1234ABCD5678"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'id' ? 'Nomor SSP' : 'SSP Number'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.sspNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, sspNumber: e.target.value })}
                    placeholder="Nomor bukti SSP"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'id' ? 'Rekening Bank / Kas' : 'Bank Account'} *
                </label>
                <select
                  value={paymentForm.cashBankAccountId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cashBankAccountId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">{language === 'id' ? '-- Pilih Akun Kas/Bank --' : '-- Select Bank Account --'}</option>
                  {state.bankAccounts?.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName || acc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'id' ? 'Keterangan' : 'Notes'}
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create_payment'}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md"
                >
                  {language === 'id' ? 'Simpan Setoran' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: REOPEN TAX PERIOD ─── */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-rose-500" />
              <span>{language === 'id' ? 'Buka Kembali Masa Pajak' : 'Reopen Tax Period'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {language === 'id' ? 'Membuka kembali masa pajak yang telah dilaporkan memerlukan alasan audit tertulis.' : 'Reopening a filed period requires an audit explanation.'}
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'id' ? 'Alasan Pembukaan Kembali (Audit Trail)' : 'Reopen Reason'} *
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={3}
                  placeholder={language === 'id' ? 'Contoh: Pembetulan SPT Masa PPN karena penyesuaian faktur retur...' : 'Reason for reopening filed period...'}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleReopenPeriodSubmit}
                  disabled={!reopenReason.trim() || actionLoading === reopenTargetId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md"
                >
                  {language === 'id' ? 'Buka Kembali' : 'Confirm Reopen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REVERSE TRANSACTION ─── */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>{language === 'id' ? 'Pembalikan Transaksi Pajak (Reversal)' : 'Reverse Tax Transaction'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {language === 'id' ? 'Sistem akan membuat transaksi pembalik immutable dengan nilai minus dan mencatat referensi audit.' : 'The system creates an immutable reversal record with negated amounts.'}
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'id' ? 'Alasan Pembalikan' : 'Reversal Reason'}
                </label>
                <textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  rows={2}
                  placeholder={language === 'id' ? 'Contoh: Pembatalan faktur penjualan...' : 'Reason for reversal...'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleReverseTransactionSubmit}
                  disabled={actionLoading === reverseTargetId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md"
                >
                  {language === 'id' ? 'Konfirmasi Reversal' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tax;
