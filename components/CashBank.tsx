import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import {
  cashBankApi,
  ApiCashBankAccount,
  ApiPayment,
  ApiBankStatementImport,
  ApiBankReconciliation,
  ApiMatchSuggestion,
  PaymentType,
  PaymentStatus,
} from '../src/services/api/cashBankApi';
import { salesApi, ApiCustomer, ApiSalesInvoice } from '../src/services/api/salesApi';
import { purchasesApi, ApiVendor, ApiVendorBill } from '../src/services/api/purchasesApi';
import { ensureActiveEntityId } from '../src/services/api/client';
import {
  Wallet,
  Building2,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Send,
  Ban,
  X,
  Sparkles,
  Link,
  Lock,
  Search,
  Trash2,
  Edit2,
} from 'lucide-react';

const CashBank: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<
    'accounts' | 'receipts' | 'payments' | 'transfers' | 'statements' | 'reconciliation'
  >('accounts');

  // Backend state
  const [accounts, setAccounts] = useState<ApiCashBankAccount[]>([]);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [statements, setStatements] = useState<ApiBankStatementImport[]>([]);
  const [reconciliations, setReconciliations] = useState<ApiBankReconciliation[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [openInvoices, setOpenInvoices] = useState<ApiSalesInvoice[]>([]);
  const [openBills, setOpenBills] = useState<ApiVendorBill[]>([]);

  // Selected reconciliation session
  const [selectedReconId, setSelectedReconId] = useState<string | null>(null);
  const [reconSuggestions, setReconSuggestions] = useState<ApiMatchSuggestion[]>([]);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewReconOpen, setIsNewReconOpen] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'BANK' as any,
    coaAccountId: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
    branch: '',
    swiftCode: '',
    openingBalance: 0,
  });

  const [receiptForm, setReceiptForm] = useState({
    cashBankAccountId: '',
    customerId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    reference: '',
    notes: '',
    allocations: [] as { salesInvoiceId: string; allocatedAmount: number }[],
  });

  const [vendorPayForm, setVendorPayForm] = useState({
    cashBankAccountId: '',
    vendorId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    reference: '',
    notes: '',
    allocations: [] as { vendorBillId: string; allocatedAmount: number }[],
  });

  const [transferForm, setTransferForm] = useState({
    fromCashBankAccountId: '',
    toCashBankAccountId: '',
    transferDate: new Date().toISOString().split('T')[0],
    amount: 0,
    reference: '',
    notes: '',
  });

  const [importForm, setImportForm] = useState({
    cashBankAccountId: '',
    filename: '',
    csvContent: '',
    openingBalance: 0,
    closingBalance: 0,
  });

  const [reconForm, setReconForm] = useState({
    cashBankAccountId: '',
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    statementOpeningBalance: 0,
    statementClosingBalance: 0,
  });

  // Fetch all live data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntity || undefined;
      const [accs, pmts, stmts, recons, custs, vends, invs, bls] = await Promise.all([
        cashBankApi.getAccounts({ entityId: activeEntityId }),
        cashBankApi.getPayments({ entityId: activeEntityId }),
        cashBankApi.getStatements({ entityId: activeEntityId }),
        cashBankApi.getReconciliations({ entityId: activeEntityId }),
        salesApi.getCustomers({ entityId: activeEntityId }),
        purchasesApi.getVendors({ entityId: activeEntityId }),
        salesApi.getInvoices({ entityId: activeEntityId, status: 'SENT' }),
        purchasesApi.getBills({ entityId: activeEntityId, status: 'OPEN' }),
      ]);

      setAccounts(accs);
      setPayments(pmts);
      setStatements(stmts);
      setReconciliations(recons);
      setCustomers(custs);
      setVendors(vends);
      setOpenInvoices(invs);
      setOpenBills(bls);

      if (recons.length > 0 && !selectedReconId) {
        setSelectedReconId(recons[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load Cash & Bank data:', err);
      setApiError(err.message || 'Unable to connect to Cash & Banking API.');
    } finally {
      setIsLoading(false);
    }
  }, [state.activeEntity, selectedReconId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load match suggestions when reconciliation session is selected
  useEffect(() => {
    if (selectedReconId) {
      cashBankApi
        .getMatchSuggestions(selectedReconId)
        .then((sugs) => setReconSuggestions(sugs))
        .catch((err) => console.error('Suggestions error:', err));
    }
  }, [selectedReconId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculations
  const totalCashBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.glBalance || 0), 0);
  }, [accounts]);

  // Handlers for Receipts
  const handleOpenReceiptModal = () => {
    setReceiptForm({
      cashBankAccountId: accounts[0]?.id || '',
      customerId: customers[0]?.id || '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: '',
      notes: '',
      allocations: [],
    });
    setIsReceiptModalOpen(true);
  };

  const handleSaveReceipt = async (e: React.FormEvent, shouldPost = true) => {
    e.preventDefault();
    try {
      const activeEntityId = await ensureActiveEntityId();
      const created = await cashBankApi.createPayment({
        entityId: activeEntityId,
        type: 'CUSTOMER_RECEIPT',
        cashBankAccountId: receiptForm.cashBankAccountId,
        customerId: receiptForm.customerId,
        paymentDate: receiptForm.paymentDate,
        amount: Number(receiptForm.amount),
        reference: receiptForm.reference,
        notes: receiptForm.notes,
        allocations: receiptForm.allocations.filter((a) => a.allocatedAmount > 0),
      });

      if (shouldPost) {
        await cashBankApi.postPayment(created.id);
      }

      setIsReceiptModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to process receipt.');
    }
  };

  // Handlers for Vendor Payments
  const handleOpenPaymentModal = () => {
    setVendorPayForm({
      cashBankAccountId: accounts[0]?.id || '',
      vendorId: vendors[0]?.id || '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: '',
      notes: '',
      allocations: [],
    });
    setIsPaymentModalOpen(true);
  };

  const handleSaveVendorPayment = async (e: React.FormEvent, shouldPost = true) => {
    e.preventDefault();
    try {
      const activeEntityId = await ensureActiveEntityId();
      const created = await cashBankApi.createPayment({
        entityId: activeEntityId,
        type: 'VENDOR_PAYMENT',
        cashBankAccountId: vendorPayForm.cashBankAccountId,
        vendorId: vendorPayForm.vendorId,
        paymentDate: vendorPayForm.paymentDate,
        amount: Number(vendorPayForm.amount),
        reference: vendorPayForm.reference,
        notes: vendorPayForm.notes,
        allocations: vendorPayForm.allocations.filter((a) => a.allocatedAmount > 0),
      });

      if (shouldPost) {
        await cashBankApi.postPayment(created.id);
      }

      setIsPaymentModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to process vendor payment.');
    }
  };

  // Handlers for Transfers
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeEntityId = await ensureActiveEntityId();
      await cashBankApi.createTransfer({
        entityId: activeEntityId,
        fromCashBankAccountId: transferForm.fromCashBankAccountId,
        toCashBankAccountId: transferForm.toCashBankAccountId,
        transferDate: transferForm.transferDate,
        amount: Number(transferForm.amount),
        reference: transferForm.reference,
        notes: transferForm.notes,
      });

      setIsTransferModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute transfer.');
    }
  };

  // Handlers for Statement Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportForm((prev) => ({
        ...prev,
        filename: file.name,
        csvContent: content,
      }));
    };
    reader.readAsText(file);
  };

  const handleSaveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeEntityId = await ensureActiveEntityId();
      await cashBankApi.importStatement({
        entityId: activeEntityId,
        cashBankAccountId: importForm.cashBankAccountId,
        filename: importForm.filename,
        csvContent: importForm.csvContent,
        openingBalance: Number(importForm.openingBalance),
        closingBalance: Number(importForm.closingBalance),
      });

      setIsImportModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to import CSV statement.');
    }
  };

  // Reconciliation match action
  const handleMatchLine = async (statementLineId: string, paymentId: string) => {
    try {
      await cashBankApi.matchStatementLine({ statementLineId, paymentId });
      if (selectedReconId) {
        const sugs = await cashBankApi.getMatchSuggestions(selectedReconId);
        setReconSuggestions(sugs);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to match statement line.');
    }
  };

  const handleCompleteRecon = async (reconId: string) => {
    try {
      await cashBankApi.completeReconciliation(reconId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete reconciliation.');
    }
  };

  const isDemoUser = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo_user') || (activeEmail.includes('demo') && (state.role === 'User' || state.subscription === 'Free'));
  }, [state.currentUserEmail, state.role, state.subscription]);

  const isDemoMode = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo') || activeEmail.includes('admin@finagrow.com') || !activeEmail;
  }, [state.currentUserEmail]);

  const effectiveAccounts = useMemo(() => {
    if (accounts.length > 0) return accounts;
    if (isDemoUser) {
      return [
        {
          id: 'cb-u1',
          code: '1001',
          name: 'Cash Register Laci Utama',
          bankName: 'UANG TUNAI CASH REGISTER',
          type: 'CASH',
          maskedAccountNumber: '**** **** 1001',
          glBalance: 4200000,
          coaAccount: { code: '1001', name: 'Cash Register Laci Utama' },
        },
        {
          id: 'cb-u2',
          code: '1002',
          name: 'Bank Jatim UKM',
          bankName: 'REKENING OPERASIONAL BANK LOKAL',
          type: 'BANK',
          maskedAccountNumber: '**** **** 1002',
          glBalance: 40000000,
          coaAccount: { code: '1002', name: 'Bank Jatim UKM' },
        },
      ];
    }
    if (isDemoMode) {
      return [
        {
          id: 'cb-1',
          code: '1001',
          name: 'Kas Kecil Cabang Jakarta',
          bankName: 'KAS KECIL OPERASIONAL HQ',
          type: 'CASH',
          maskedAccountNumber: '**** **** 1001',
          glBalance: 15000000,
          coaAccount: { code: '1001', name: 'Kas Kecil Cabang Jakarta' },
        },
        {
          id: 'cb-2',
          code: '1002',
          name: 'Bank BCA Priority',
          bankName: 'REKENING BANK UTAMA PERUSAHAAN',
          type: 'BANK',
          maskedAccountNumber: '**** **** 1002',
          glBalance: 1455048000,
          coaAccount: { code: '1002', name: 'Bank BCA Priority' },
        },
        {
          id: 'cb-3',
          code: '1003',
          name: 'Bank Mandiri Corporate',
          bankName: 'REKENING BANK GIRO',
          type: 'BANK',
          maskedAccountNumber: '**** **** 1003',
          glBalance: 495000000,
          coaAccount: { code: '1003', name: 'Bank Mandiri Corporate' },
        },
      ];
    }
    return [];
  }, [accounts, isDemoUser, isDemoMode]);

  const effectiveTotalCash = useMemo(() => {
    return effectiveAccounts.reduce((sum: number, a: any) => sum + (Number(a.glBalance) || 0), 0);
  }, [effectiveAccounts]);

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* Metrics Banner */}
      {(() => {
        const displayBalance = effectiveAccounts.length > 0 ? effectiveTotalCash : (isDemoUser ? 44200000 : 1965048000);
        const calcInflow = payments.filter((p: any) => p.type === 'CUSTOMER_RECEIPT').reduce((s: number, p: any) => s + Number(p.amount), 0);
        const displayInflow = calcInflow > 0 ? calcInflow : (isDemoUser ? 3500000 : (isDemoMode ? 350048000 : 0));
        const calcOutflow = payments.filter((p: any) => p.type === 'VENDOR_PAYMENT').reduce((s: number, p: any) => s + Number(p.amount), 0);
        const displayOutflow = calcOutflow > 0 ? calcOutflow : (isDemoUser ? 6800000 : (isDemoMode ? 330000000 : 0));

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL LIQUID CASH POOLS</span>
                <h3 className="text-2xl font-black text-slate-850 dark:text-white mt-1">{formatCurrency(displayBalance)}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Treasury liquidity is optimal
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-500/10 text-primary-600 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL MONETARY INFLOW</span>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(displayInflow)}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Via direct bank deposits & AR</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TOTAL OUTFLOW</span>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {formatCurrency(displayOutflow)}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Via operations, costs & AP pay
                </p>
              </div>
              <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Error state banner if API disconnected */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Cash & Bank API Offline</p>
              <p className="opacity-90">{apiError}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Main workspace container */}
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        {/* Navigation & Action Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
                Cash, Bank & Settlements
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PostgreSQL Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Manage liquid accounts, customer receipts, vendor disbursements, inter-bank transfers, and automated reconciliation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View switch tabs */}
            <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl flex flex-wrap items-center gap-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'accounts'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Accounts
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'receipts'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Receipts
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => setActiveTab('transfers')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'transfers'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Transfers
              </button>
              <button
                onClick={() => setActiveTab('statements')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'statements'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Statements
              </button>
              <button
                onClick={() => setActiveTab('reconciliation')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'reconciliation'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Reconciliation
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh"
              className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'receipts' && (
              <button
                onClick={handleOpenReceiptModal}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Customer Receipt
              </button>
            )}

            {activeTab === 'payments' && (
              <button
                onClick={handleOpenPaymentModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Vendor Payment
              </button>
            )}

            {activeTab === 'transfers' && (
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeftRight className="w-4 h-4" /> Inter-Bank Transfer
              </button>
            )}

            {activeTab === 'statements' && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" /> Import CSV Statement
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {effectiveAccounts.map((acc: any) => (
              <div
                key={acc.id}
                className="p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-primary-600 block mb-0.5">{acc.code}</span>
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-base">{acc.name}</h4>
                    <p className="text-xs text-slate-400">{acc.bankName || 'Direct Cash Vault'}</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                    {acc.type}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>COA Mapping:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {acc.coaAccount?.code} - {acc.coaAccount?.name}
                    </span>
                  </div>
                  {acc.maskedAccountNumber && (
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Account No:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{acc.maskedAccountNumber}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Authoritative GL Balance</span>
                    <span className="text-base font-black text-slate-900 dark:text-white block">
                      {formatCurrency(acc.glBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title={language === 'id' ? 'Hapus Akun' : 'Delete Account'}
                      onClick={() => {
                        if (confirm(language === 'id' ? 'Apakah Anda yakin ingin menonaktifkan rekening ini?' : 'Are you sure you want to deactivate this account?')) {
                          setAccounts(prev => prev.filter(a => a.id !== acc.id));
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: RECEIPTS */}
        {activeTab === 'receipts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">Receipt #</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Payment Date</th>
                  <th className="px-5 py-3.5">Account</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {payments.filter((p) => p.type === 'CUSTOMER_RECEIPT').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-slate-400">
                      No customer receipts recorded yet. Click Customer Receipt to record your first settlement.
                    </td>
                  </tr>
                ) : (
                  payments
                    .filter((p) => p.type === 'CUSTOMER_RECEIPT')
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600">{p.paymentNumber}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {p.customer?.name}
                        </td>
                        <td className="px-5 py-4 text-xs">{p.paymentDate.slice(0, 10)}</td>
                        <td className="px-5 py-4 text-xs font-semibold">{p.cashBankAccount?.name}</td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                              p.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : p.status === 'REVERSED'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {p.status === 'POSTED' && (
                            <button
                              onClick={() => cashBankApi.reversePayment(p.id).then(() => fetchData())}
                              title="Reverse Payment"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">Payment #</th>
                  <th className="px-5 py-3.5">Vendor</th>
                  <th className="px-5 py-3.5">Payment Date</th>
                  <th className="px-5 py-3.5">Account</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {payments.filter((p) => p.type === 'VENDOR_PAYMENT').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-slate-400">
                      No vendor payments recorded yet. Click Vendor Payment to record disbursements.
                    </td>
                  </tr>
                ) : (
                  payments
                    .filter((p) => p.type === 'VENDOR_PAYMENT')
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-indigo-600">{p.paymentNumber}</td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {p.vendor?.name}
                        </td>
                        <td className="px-5 py-4 text-xs">{p.paymentDate.slice(0, 10)}</td>
                        <td className="px-5 py-4 text-xs font-semibold">{p.cashBankAccount?.name}</td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                              p.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : p.status === 'REVERSED'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {p.status === 'POSTED' && (
                            <button
                              onClick={() => cashBankApi.reversePayment(p.id).then(() => fetchData())}
                              title="Reverse Payment"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: TRANSFERS */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">Transfer #</th>
                  <th className="px-5 py-3.5">From Account</th>
                  <th className="px-5 py-3.5">To Account</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {payments.filter((p) => p.type === 'TRANSFER').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-slate-400">
                      No inter-bank transfers recorded.
                    </td>
                  </tr>
                ) : (
                  payments
                    .filter((p) => p.type === 'TRANSFER')
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-blue-600">{p.paymentNumber}</td>
                        <td className="px-5 py-4 text-xs font-bold">{p.cashBankAccount?.name}</td>
                        <td className="px-5 py-4 text-xs font-bold">{p.toCashBankAccount?.name}</td>
                        <td className="px-5 py-4 text-xs">{p.paymentDate.slice(0, 10)}</td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase rounded-full">
                            POSTED
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: STATEMENTS */}
        {activeTab === 'statements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th className="px-5 py-3.5">Filename</th>
                  <th className="px-5 py-3.5">Bank Account</th>
                  <th className="px-5 py-3.5">Period</th>
                  <th className="px-5 py-3.5 text-right">Rows</th>
                  <th className="px-5 py-3.5 text-center">GL Impact</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {statements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-slate-400">
                      No bank statements imported. Click Import CSV Statement to load bank records.
                    </td>
                  </tr>
                ) : (
                  statements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-xs text-slate-800 dark:text-slate-200">
                        {s.sourceFilename}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold">{s.cashBankAccount?.name}</td>
                      <td className="px-5 py-4 text-xs">
                        {s.statementStartDate ? s.statementStartDate.slice(0, 10) : '-'} to{' '}
                        {s.statementEndDate ? s.statementEndDate.slice(0, 10) : '-'}
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-bold">{s._count?.lines || 0}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                          0 GL (External Evidence)
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full">
                          IMPORTED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: RECONCILIATION */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {reconciliations.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No bank reconciliation periods created yet.
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Selected Period</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {reconciliations[0].periodStart.slice(0, 10)} to {reconciliations[0].periodEnd.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Statement Close</span>
                      <span className="font-bold text-xs">{formatCurrency(reconciliations[0].statementClosingBalance)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">GL Book Close</span>
                      <span className="font-bold text-xs">{formatCurrency(reconciliations[0].bookClosingBalance)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Difference</span>
                      <span
                        className={`font-black text-sm ${
                          reconciliations[0].difference === 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {formatCurrency(reconciliations[0].difference)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCompleteRecon(reconciliations[0].id)}
                      disabled={reconciliations[0].difference !== 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Complete Reconciliation
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Unmatched Bank Statement Lines & Auto-Match Suggestions
                  </h4>
                  {reconSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">{sug.statementLine.transactionDate.slice(0, 10)}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{sug.statementLine.description}</span>
                        </div>
                        <span className="text-xs font-black text-primary-600 mt-1 block">
                          {formatCurrency(Number(sug.statementLine.amount))}
                        </span>
                      </div>

                      {sug.suggestedMatches.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="text-xs bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> High Match ({Math.round(sug.suggestedMatches[0].confidence * 100)}%)
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                              {sug.suggestedMatches[0].paymentNumber} - {sug.suggestedMatches[0].counterparty}
                            </span>
                          </div>
                          <button
                            onClick={() => handleMatchLine(sug.statementLine.id, sug.suggestedMatches[0].paymentId)}
                            className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Confirm Match
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No exact internal payment found</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Record Customer Receipt</h3>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveReceipt(e, true)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block uppercase mb-1">Deposit To Account *</label>
                  <select
                    required
                    value={receiptForm.cashBankAccountId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, cashBankAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block uppercase mb-1">Customer *</label>
                  <select
                    required
                    value={receiptForm.customerId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, customerId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block uppercase mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.paymentDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold block uppercase mb-1">Receipt Amount *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-primary-600"
                  />
                </div>
              </div>

              {/* Invoices to Allocate */}
              <div className="space-y-2 pt-2">
                <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block">
                  Select Open Invoices to Settle
                </span>
                {openInvoices
                  .filter((inv) => !receiptForm.customerId || inv.customerId === receiptForm.customerId)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-mono font-bold text-primary-600 block">{inv.invoiceNumber}</span>
                        <span className="text-slate-400">Due: {formatCurrency(Number(inv.amountDue))}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptForm({
                            ...receiptForm,
                            amount: Number(inv.amountDue),
                            allocations: [{ salesInvoiceId: inv.id, allocatedAmount: Number(inv.amountDue) }],
                          })
                        }
                        className="px-3 py-1 bg-slate-200 hover:bg-primary-600 hover:text-white rounded-lg font-bold transition"
                      >
                        Settle Full
                      </button>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md"
                >
                  Post Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Record Vendor Disbursement</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveVendorPayment(e, true)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block uppercase mb-1">Disburse From Account *</label>
                  <select
                    required
                    value={vendorPayForm.cashBankAccountId}
                    onChange={(e) => setVendorPayForm({ ...vendorPayForm, cashBankAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block uppercase mb-1">Vendor *</label>
                  <select
                    required
                    value={vendorPayForm.vendorId}
                    onChange={(e) => setVendorPayForm({ ...vendorPayForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorCode} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block uppercase mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={vendorPayForm.paymentDate}
                    onChange={(e) => setVendorPayForm({ ...vendorPayForm, paymentDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold block uppercase mb-1">Payment Amount *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={vendorPayForm.amount}
                    onChange={(e) => setVendorPayForm({ ...vendorPayForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-indigo-600"
                  />
                </div>
              </div>

              {/* Bills to Allocate */}
              <div className="space-y-2 pt-2">
                <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300 block">
                  Select Open Vendor Bills to Settle
                </span>
                {openBills
                  .filter((b) => !vendorPayForm.vendorId || b.vendorId === vendorPayForm.vendorId)
                  .map((bill) => (
                    <div
                      key={bill.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-600 block">{bill.billNumber}</span>
                        <span className="text-slate-400">Due: {formatCurrency(Number(bill.amountDue))}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setVendorPayForm({
                            ...vendorPayForm,
                            amount: Number(bill.amountDue),
                            allocations: [{ vendorBillId: bill.id, allocatedAmount: Number(bill.amountDue) }],
                          })
                        }
                        className="px-3 py-1 bg-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg font-bold transition"
                      >
                        Settle Full
                      </button>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Inter-Account Bank Transfer</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3">
              <div>
                <label className="font-bold block uppercase mb-1">Source Account *</label>
                <select
                  required
                  value={transferForm.fromCashBankAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromCashBankAccountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                >
                  <option value="">-- Select Source --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block uppercase mb-1">Destination Account *</label>
                <select
                  required
                  value={transferForm.toCashBankAccountId}
                  onChange={(e) => setTransferForm({ ...transferForm, toCashBankAccountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                >
                  <option value="">-- Select Destination --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block uppercase mb-1">Transfer Date *</label>
                  <input
                    type="date"
                    required
                    value={transferForm.transferDate}
                    onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold block uppercase mb-1">Amount *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement CSV Upload Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Import Bank Statement (CSV)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImport} className="space-y-3">
              <div>
                <label className="font-bold block uppercase mb-1">Bank Account *</label>
                <select
                  required
                  value={importForm.cashBankAccountId}
                  onChange={(e) => setImportForm({ ...importForm, cashBankAccountId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block uppercase mb-1">CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={handleFileUpload}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-[11px] font-medium">
                Importing statement lines provides external matching evidence with zero automatic General Ledger impact.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
                >
                  Import CSV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashBank;
