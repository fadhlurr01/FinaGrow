import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Metric } from '../types';
import StatCard from './StatCard';
import {
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  Users,
  FileText,
  Send,
  Ban,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import {
  salesApi,
  ApiSalesInvoice,
  ApiCustomer,
  ARSummaryResponse,
  SalesInvoiceStatus,
  InvoicePostingStatus,
} from '../src/services/api/salesApi';

const InvoiceStatusBadge: React.FC<{
  status: SalesInvoiceStatus;
  postingStatus: InvoicePostingStatus;
}> = ({ status, postingStatus }) => {
  const { t } = useLocalization();

  let statusBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  if (status === 'PAID') {
    statusBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  } else if (status === 'OPEN' || status === 'PARTIALLY_PAID') {
    statusBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  } else if (status === 'OVERDUE') {
    statusBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
  } else if (status === 'CANCELLED') {
    statusBg = 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20';
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${statusBg}`}>
        {status}
      </span>
      {postingStatus === 'POSTED' && (
        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          <CheckCircle className="w-2.5 h-2.5" /> GL Posted
        </span>
      )}
      {postingStatus === 'REVERSED' && (
        <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-0.5">
          <Ban className="w-2.5 h-2.5" /> Reversal
        </span>
      )}
    </div>
  );
};

const Sales: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'customers'>('invoices');

  // Backend state
  const [invoices, setInvoices] = useState<ApiSalesInvoice[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [arSummary, setArSummary] = useState<ARSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dialog Overlays
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<string | null>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: '',
    notes: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxRate: 0.11, // Standard 11% PPN
      },
    ],
  });

  // Customer Form State
  const [customerForm, setCustomerForm] = useState({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    taxId: '',
    billingAddress: '',
    paymentTermsDays: 30,
    creditLimit: 100000000,
  });

  // Fetch data from backend
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntity || undefined;
      const [invData, custData, arData] = await Promise.all([
        salesApi.getInvoices({ entityId: activeEntityId }),
        salesApi.getCustomers({ entityId: activeEntityId }),
        salesApi.getARSummary({ entityId: activeEntityId }),
      ]);

      setInvoices(invData);
      setCustomers(custData);
      setArSummary(arData);
    } catch (err: any) {
      console.error('Failed to load Sales & AR data:', err);
      setApiError(err.message || 'Unable to connect to the backend server. Please verify backend service status.');
    } finally {
      setIsLoading(false);
    }
  }, [state.activeEntity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const effectiveInvoices = useMemo(() => {
    return invoices;
  }, [invoices]);

  // Metrics overview calculation
  const metrics: Metric[] = useMemo(() => {
    const calcTotalRec = effectiveInvoices.filter((i: any) => i.status !== 'PAID').reduce((sum: number, i: any) => sum + Number(i.amountDue || i.totalAmount), 0);
    const totalRec = arSummary?.totalReceivables ?? calcTotalRec;
    const overdueRec = arSummary?.totalOverdue ?? 0;
    const calcAvgInvoice = effectiveInvoices.length > 0 ? (effectiveInvoices.reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0) / effectiveInvoices.length) : 0;
    const avgInvoice = arSummary ? (arSummary.totalInvoiced / (effectiveInvoices.length || 1)) : calcAvgInvoice;
    const calcTotalInvoiced = effectiveInvoices.reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);
    const totalInvoiced = arSummary?.totalInvoiced ?? calcTotalInvoiced;

    return [
      {
        title: language === 'en' ? 'TOTAL RECEIVABLES' : 'TOTAL PIUTANG USAHA',
        value: formatCurrency(totalRec),
        change: totalRec > 0 ? '+5.8%' : '0.0%',
        changeType: 'increase',
        icon: ScaleIcon,
      },
      {
        title: language === 'en' ? 'OVERDUE RECEIVABLES' : 'PIUTANG JATUH TEMPO',
        value: formatCurrency(overdueRec),
        change: overdueRec > 0 ? '+2.1%' : '0.0%',
        changeType: overdueRec > 0 ? 'decrease' : 'increase',
        icon: ArrowTrendingUpIcon,
      },
      {
        title: language === 'en' ? 'AVERAGE INVOICE VALUE' : 'RATA-RATA NILAI FAKTUR',
        value: formatCurrency(avgInvoice),
        change: avgInvoice > 0 ? '+12.4%' : '0.0%',
        changeType: 'increase',
        icon: BanknotesIcon,
      },
      {
        title: language === 'en' ? 'TOTAL INVOICED REVENUE' : 'TOTAL OMZET TERTARIK',
        value: formatCurrency(totalInvoiced),
        change: totalInvoiced > 0 ? '+18.6%' : '0.0%',
        changeType: 'increase',
        icon: DocumentPlusIcon,
      },
    ];
  }, [effectiveInvoices, arSummary, language, state.currency]);

  // Invoice creation handlers
  const handleOpenAddInvoice = () => {
    setInvoiceForm({
      customerId: customers[0]?.id || '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: '',
      notes: '',
      lines: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
          taxRate: 0.11,
        },
      ],
    });
    setIsAddInvoiceOpen(true);
  };

  const handleAddLine = () => {
    setInvoiceForm({
      ...invoiceForm,
      lines: [
        ...invoiceForm.lines,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
          taxRate: 0.11,
        },
      ],
    });
  };

  const handleRemoveLine = (index: number) => {
    if (invoiceForm.lines.length <= 1) return;
    setInvoiceForm({
      ...invoiceForm,
      lines: invoiceForm.lines.filter((_, i) => i !== index),
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...invoiceForm.lines];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceForm({ ...invoiceForm, lines: updated });
  };

  const formPreviewTotals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    invoiceForm.lines.forEach((l) => {
      const lineSub = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      const lineDisc = Number(l.discountAmount) || 0;
      const taxable = Math.max(0, lineSub - lineDisc);
      const lineTax = taxable * (Number(l.taxRate) || 0);
      sub += lineSub;
      disc += lineDisc;
      tax += lineTax;
    });
    return {
      subtotal: sub,
      discount: disc,
      tax,
      total: sub - disc + tax,
    };
  }, [invoiceForm.lines]);

  const handleSaveInvoice = async (e: React.FormEvent, shouldPost = false) => {
    e.preventDefault();
    if (!invoiceForm.customerId) {
      alert(language === 'en' ? 'Please select a customer' : 'Silakan pilih pelanggan');
      return;
    }

    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntity || 'E1';
      const created = await salesApi.createInvoice({
        entityId: activeEntityId,
        customerId: invoiceForm.customerId,
        invoiceDate: invoiceForm.invoiceDate,
        dueDate: invoiceForm.dueDate,
        reference: invoiceForm.reference,
        notes: invoiceForm.notes,
        lines: invoiceForm.lines.map((l) => ({
          description: l.description || 'Sales Item',
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          discountAmount: Number(l.discountAmount) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      });

      if (shouldPost) {
        await salesApi.postInvoice(created.id);
      }

      setIsAddInvoiceOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save sales invoice.');
    }
  };

  const handlePostInvoice = async (invoiceId: string) => {
    try {
      await salesApi.postInvoice(invoiceId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to post invoice to General Ledger.');
    }
  };

  const handleCancelInvoice = async () => {
    if (!isCancelConfirmOpen) return;
    try {
      await salesApi.cancelInvoice(isCancelConfirmOpen);
      setIsCancelConfirmOpen(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice.');
    }
  };

  // Edit / Delete Invoice and Customer states & handlers
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const handleOpenEditInvoice = (inv: any) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      customerId: inv.customerId || inv.customer?.id || '',
      invoiceDate: (inv.invoiceDate || '').slice(0, 10),
      dueDate: (inv.dueDate || '').slice(0, 10),
      reference: inv.reference || '',
      notes: inv.notes || '',
      lines: (inv.lines && inv.lines.length > 0) ? inv.lines.map((l: any) => ({
        description: l.description || '',
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        discountAmount: Number(l.discountAmount) || 0,
        taxRate: Number(l.taxRate) || 0.11,
      })) : [
        {
          description: inv.description || 'Enterprise Software Licensing Term 1',
          quantity: 1,
          unitPrice: Number(inv.subtotal) || Number(inv.totalAmount) || 100000000,
          discountAmount: 0,
          taxRate: 0.11,
        }
      ],
    });
    setIsEditInvoiceOpen(true);
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    const updated = {
      ...editingInvoice,
      customerId: invoiceForm.customerId,
      invoiceDate: invoiceForm.invoiceDate,
      dueDate: invoiceForm.dueDate,
      reference: invoiceForm.reference,
      notes: invoiceForm.notes,
      subtotal: formPreviewTotals.subtotal,
      taxAmount: formPreviewTotals.tax,
      totalAmount: formPreviewTotals.total,
    };
    setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updated : inv));
    setIsEditInvoiceOpen(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (confirm(language === 'id' ? 'Apakah Anda yakin ingin menghapus invoice ini?' : 'Are you sure you want to delete this invoice?')) {
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    }
  };

  const handleOpenEditCustomer = (cust: any) => {
    setEditingCustomer(cust);
    setCustomerForm({
      name: cust.name || '',
      legalName: cust.legalName || '',
      email: cust.email || '',
      phone: cust.phone || '',
      taxId: cust.taxId || '',
      billingAddress: cust.billingAddress || '',
      paymentTermsDays: Number(cust.paymentTermsDays) || 30,
      creditLimit: Number(cust.creditLimit) || 100000000,
    });
    setIsEditCustomerOpen(true);
  };

  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const updated = {
      ...editingCustomer,
      name: customerForm.name,
      legalName: customerForm.legalName,
      email: customerForm.email,
      phone: customerForm.phone,
      taxId: customerForm.taxId,
      billingAddress: customerForm.billingAddress,
      paymentTermsDays: Number(customerForm.paymentTermsDays) || 30,
      creditLimit: Number(customerForm.creditLimit) || 0,
    };
    setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updated : c));
    setIsEditCustomerOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (custId: string) => {
    if (confirm(language === 'id' ? 'Apakah Anda yakin ingin menghapus pelanggan ini?' : 'Are you sure you want to delete this customer?')) {
      setCustomers(prev => prev.filter(c => c.id !== custId));
    }
  };

  // Customer creation handler
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name) {
      alert(language === 'en' ? 'Customer name is required' : 'Nama pelanggan wajib diisi');
      return;
    }

    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntity || 'E1';
      await salesApi.createCustomer({
        entityId: activeEntityId,
        name: customerForm.name,
        legalName: customerForm.legalName,
        email: customerForm.email,
        phone: customerForm.phone,
        taxId: customerForm.taxId,
        billingAddress: customerForm.billingAddress,
        paymentTermsDays: Number(customerForm.paymentTermsDays) || 30,
        creditLimit: Number(customerForm.creditLimit) || 0,
      });

      setIsAddCustomerOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer.');
    }
  };

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* Metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Error state alert banner if API fails */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Sales & Accounts Receivable API Error</p>
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

      {/* Main card panel */}
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        {/* Navigation bar with Sub-ledger Tabs and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
                {language === 'en' ? 'Sales & Accounts Receivable' : 'Penjualan & Piutang Usaha (AR)'}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PostgreSQL Sub-ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Manage B2B sales invoicing, AR aging, customer ledger, and automated double-entry GL postings'
                : 'Kelola faktur penjualan B2B, umur piutang, buku pembantu pelanggan, dan posting otomatis GL'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl flex items-center gap-1">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {t('invoices')}
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {language === 'en' ? 'Customers' : 'Pelanggan'}
              </button>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'invoices' ? (
              <button
                type="button"
                onClick={handleOpenAddInvoice}
                className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition transform active:scale-98 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('newInvoice')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition transform active:scale-98 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {language === 'en' ? 'Add Customer' : 'Tambah Pelanggan'}
              </button>
            )}
          </div>
        </div>

        {/* INVOICES TAB CONTENT */}
        {activeTab === 'invoices' && (
          <div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">{t('invoice')} #</th>
                    <th scope="col" className="px-5 py-3.5">{t('customer')}</th>
                    <th scope="col" className="px-5 py-3.5">{t('issueDate')}</th>
                    <th scope="col" className="px-5 py-3.5">{t('dueDate')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('subtotal')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('tax')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('total')}</th>
                    <th scope="col" className="px-5 py-3.5 text-center">{t('status')}</th>
                    <th scope="col" className="px-5 py-3.5 text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {effectiveInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-xs text-slate-400">
                        {isLoading ? (
                          <div className="flex justify-center items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                            Loading sales invoices from PostgreSQL...
                          </div>
                        ) : (
                          language === 'en'
                            ? 'No invoices found. Click New Invoice to create and post your first invoice.'
                            : 'Tidak ada invoice ditemukan. Klik Invoice Baru untuk membuat dan memposting invoice pertama Anda.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    effectiveInvoices.map((invoice: any) => (
                      <tr
                        key={invoice.id}
                        className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {invoice.customer?.name || 'Customer'}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {invoice.customer?.customerCode}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {invoice.invoiceDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {invoice.dueDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {formatCurrency(Number(invoice.subtotal))}
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-slate-400 dark:text-slate-500">
                          {formatCurrency(Number(invoice.taxAmount))}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(Number(invoice.totalAmount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <InvoiceStatusBadge
                            status={invoice.status}
                            postingStatus={invoice.postingStatus}
                          />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              title={language === 'en' ? 'Edit Invoice' : 'Ubah Invoice'}
                              onClick={() => handleOpenEditInvoice(invoice)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title={language === 'en' ? 'Delete Invoice' : 'Hapus Invoice'}
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {invoice.postingStatus === 'UNPOSTED' && invoice.status !== 'CANCELLED' && (
                              <button
                                title={language === 'en' ? 'Post to General Ledger' : 'Posting ke Buku Besar'}
                                onClick={() => handlePostInvoice(invoice.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {invoice.status !== 'CANCELLED' && (
                              <button
                                title={language === 'en' ? 'Cancel / Reverse' : 'Batalkan / Reversal'}
                                onClick={() => setIsCancelConfirmOpen(invoice.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards stack view */}
            <div className="block md:hidden space-y-4">
              {effectiveInvoices.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
                  {language === 'en' ? 'No invoices found.' : 'Tidak ada invoice ditemukan.'}
                </div>
              ) : (
                effectiveInvoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 block mb-0.5">
                          {invoice.invoiceNumber}
                        </span>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {invoice.customer?.name}
                        </h4>
                      </div>
                      <InvoiceStatusBadge
                        status={invoice.status}
                        postingStatus={invoice.postingStatus}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-800/40 p-2 rounded-xl text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">{t('issueDate')}</span>
                        <span className="font-semibold">{invoice.invoiceDate.slice(0, 10)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">{t('dueDate')}</span>
                        <span className="font-semibold">{invoice.dueDate.slice(0, 10)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 font-sans">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">{t('total')}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white block">
                          {formatCurrency(Number(invoice.totalAmount))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title={language === 'en' ? 'Edit' : 'Ubah'}
                          onClick={() => handleOpenEditInvoice(invoice)}
                          className="p-2 text-slate-400 hover:text-primary-600 rounded-xl transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          title={language === 'en' ? 'Delete' : 'Hapus'}
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {invoice.postingStatus === 'UNPOSTED' && invoice.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handlePostInvoice(invoice.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setIsCancelConfirmOpen(invoice.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB CONTENT */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Code</th>
                  <th scope="col" className="px-5 py-3.5">Customer Name</th>
                  <th scope="col" className="px-5 py-3.5">Contact</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Payment Terms</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Credit Limit</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-slate-400">
                      No customers found. Click Add Customer to create a customer profile.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.id}
                      className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                        {c.customerCode}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {c.name}
                        {c.legalName && <p className="text-[10px] font-normal text-slate-400">{c.legalName}</p>}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        <p>{c.email || '-'}</p>
                        <p className="text-[10px] text-slate-400">{c.phone || '-'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-center font-semibold">
                        {c.paymentTermsDays} Days (Net {c.paymentTermsDays})
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(Number(c.creditLimit))}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title={language === 'en' ? 'Edit Customer' : 'Ubah Pelanggan'}
                            onClick={() => handleOpenEditCustomer(c)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={language === 'en' ? 'Delete Customer' : 'Hapus Pelanggan'}
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Sales Invoice Modal */}
      {isAddInvoiceOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Create B2B Sales Invoice' : 'Buat Invoice Penjualan B2B'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Calculates PPN 11% and posts balanced AR journals' : 'Hitung PPN 11% dan posting jurnal piutang berimbang'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddInvoiceOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('customer')} *
                  </label>
                  <select
                    required
                    value={invoiceForm.customerId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.filter((c) => c.isActive).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Reference / PO Number
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.reference}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, reference: e.target.value })}
                    placeholder="e.g. PO-2026-0889"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('issueDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('dueDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Line items section */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {invoiceForm.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Item Description (e.g. Enterprise Software License)"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white outline-none"
                      />
                      {invoiceForm.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Unit Price</span>
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Discount</span>
                        <input
                          type="number"
                          min="0"
                          value={line.discountAmount}
                          onChange={(e) => handleLineChange(idx, 'discountAmount', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Tax (PPN)</span>
                        <select
                          value={line.taxRate}
                          onChange={(e) => handleLineChange(idx, 'taxRate', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        >
                          <option value="0.11">PPN 11%</option>
                          <option value="0">0% Non-Tax</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Authoritative calculated totals summary */}
              <div className="p-4 bg-slate-100 dark:bg-slate-700/40 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(formPreviewTotals.subtotal)}</span>
                </div>
                {formPreviewTotals.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount:</span>
                    <span>-{formatCurrency(formPreviewTotals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Output VAT (PPN 11%):</span>
                  <span>{formatCurrency(formPreviewTotals.tax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total (AR Due):</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(formPreviewTotals.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/40 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddInvoiceOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveInvoice(e, false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveInvoice(e, true)}
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Save & Post to GL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700/60 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Add Corporate Customer' : 'Tambah Pelanggan Korporat'}
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Customer Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PT Telekomunikasi Asia"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Email (Finance / Invoicing)
                </label>
                <input
                  type="email"
                  placeholder="e.g. finance@customer.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+62-21-5551234"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Tax ID (NPWP)
                  </label>
                  <input
                    type="text"
                    placeholder="01.234.567.8..."
                    value={customerForm.taxId}
                    onChange={(e) => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-md cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sales Invoice Modal */}
      {isEditInvoiceOpen && editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Edit B2B Sales Invoice' : 'Ubah Invoice Penjualan B2B'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingInvoice.invoiceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditInvoiceOpen(false);
                  setEditingInvoice(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('customer')} *
                  </label>
                  <select
                    required
                    value={invoiceForm.customerId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.filter((c) => c.isActive).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Reference / PO Number
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.reference}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, reference: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('issueDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('dueDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Invoice Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Items</h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {invoiceForm.lines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Description of software / consulting"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <input
                          type="number"
                          required
                          placeholder="Unit Price"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Authoritative calculated totals summary */}
              <div className="p-4 bg-slate-100 dark:bg-slate-700/40 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(formPreviewTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Output VAT (PPN 11%):</span>
                  <span>{formatCurrency(formPreviewTotals.tax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(formPreviewTotals.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/40 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditInvoiceOpen(false);
                    setEditingInvoice(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditCustomerOpen && editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700/60 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Edit Corporate Customer' : 'Ubah Pelanggan Korporat'}
              </h3>
              <button
                onClick={() => {
                  setIsEditCustomerOpen(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Customer Trade Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Tax ID (NPWP)
                  </label>
                  <input
                    type="text"
                    value={customerForm.taxId}
                    onChange={(e) => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCustomerOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Cancel Sales Invoice' : 'Batalkan Invoice Penjualan'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'If posted, an immutable reversing journal entry will automatically be created in the General Ledger to ensure accounting integrity.'
                  : 'Jika sudah diposting, entri jurnal reversal akan otomatis dibuat di Buku Besar untuk menjaga integritas akuntansi.'}
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
