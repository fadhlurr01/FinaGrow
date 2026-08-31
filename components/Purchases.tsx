import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Metric } from '../types';
import StatCard from './StatCard';
import {
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Send,
  Ban,
  CheckCircle,
  Clock,
  Trash2,
  CheckSquare,
  ArrowRight,
  Edit2,
} from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import {
  purchasesApi,
  ApiVendorBill,
  ApiPurchaseOrder,
  ApiVendor,
  APSummaryResponse,
  VendorBillStatus,
  BillPostingStatus,
  PurchaseOrderStatus,
} from '../src/services/api/purchasesApi';
import { ensureActiveEntityId } from '../src/services/api/client';

const BillStatusBadge: React.FC<{
  status: VendorBillStatus;
  postingStatus: BillPostingStatus;
}> = ({ status, postingStatus }) => {
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

const POStatusBadge: React.FC<{ status: PurchaseOrderStatus }> = ({ status }) => {
  let color = 'bg-slate-100 text-slate-600';
  if (status === 'APPROVED') color = 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
  if (status === 'PARTIALLY_BILLED') color = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
  if (status === 'FULLY_BILLED') color = 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
  if (status === 'CANCELLED') color = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';

  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${color}`}>
      {status}
    </span>
  );
};

const Purchases: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  // Active view tab: 'bills' | 'orders'
  const [activeTab, setActiveTab] = useState<'bills' | 'orders'>('bills');

  // Backend state
  const [bills, setBills] = useState<ApiVendorBill[]>([]);
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [apSummary, setApSummary] = useState<APSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dialog Overlays
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<string | null>(null);

  // Bill Form State
  const [billForm, setBillForm] = useState({
    vendorId: '',
    vendorReference: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    lines: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxRate: 0.11, // PPN Masukan 11%
      },
    ],
  });

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

  // Fetch all backend data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntity || undefined;
      const [billsData, ordersData, vendorsData, apData] = await Promise.all([
        purchasesApi.getBills({ entityId: activeEntityId }),
        purchasesApi.getOrders({ entityId: activeEntityId }),
        purchasesApi.getVendors({ entityId: activeEntityId }),
        purchasesApi.getAPSummary({ entityId: activeEntityId }),
      ]);

      setBills(billsData);
      setOrders(ordersData);
      setVendors(vendorsData);
      setApSummary(apData);
    } catch (err: any) {
      console.error('Failed to load Purchases & AP data:', err);
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

  const isDemo = !state.currentUserEmail || ['demo_admin@fms.com', 'demo@fms.com', 'demo_user@fms.com', 'admin@finagrow.com', 'andi@bellcorp.com', 'sari@bellcorp.com'].includes(state.currentUserEmail.toLowerCase());

  const effectiveBills = useMemo(() => {
    if (bills.length > 0) return bills;
    if (isDemo) {
      return [
        {
          id: 'bill-aws-1',
          billNumber: 'BILL-2026-VND01',
          vendor: { name: 'AWS Indonesia', vendorCode: 'VND-001' },
          billDate: '2026-08-29',
          dueDate: '2026-09-28',
          subtotal: 95000000,
          taxAmount: 10450000,
          totalAmount: 105450000,
          amountDue: 0,
          status: 'PAID',
          postingStatus: 'POSTED',
          lines: [],
        }
      ];
    }
    return [];
  }, [bills, isDemo]);

  // Metrics summary
  const metrics: Metric[] = useMemo(() => {
    const calcTotalPay = effectiveBills.filter((b: any) => b.status !== 'PAID').reduce((sum: number, b: any) => sum + Number(b.amountDue || b.totalAmount), 0);
    const totalPay = effectiveBills.length > 0 ? (apSummary?.totalPayables ?? calcTotalPay) : 0;
    const overduePay = apSummary?.totalOverdue ?? 0;
    const calcTotalPaid = effectiveBills.filter((b: any) => b.status === 'PAID').reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0);
    const totalPaid = effectiveBills.length > 0 ? (apSummary?.totalPaid ?? calcTotalPaid) : (isDemo ? 105450000 : 0);
    const calcAvgBill = effectiveBills.length > 0 ? (effectiveBills.reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0) / effectiveBills.length) : 0;
    const avgBill = effectiveBills.length > 0 ? calcAvgBill : (isDemo ? 105450000 : 0);

    return [
      {
        title: language === 'en' ? 'TOTAL PAYABLES' : 'TOTAL UTANG USAHA',
        value: formatCurrency(totalPay),
        change: totalPay > 0 ? '+0.0%' : '0.0%',
        changeType: 'increase',
      },
      {
        title: language === 'en' ? 'OVERDUE BILLS' : 'UTANG JATUH TEMPO',
        value: formatCurrency(overduePay),
        change: overduePay > 0 ? '+0.0%' : '0.0%',
        changeType: 'increase',
      },
      {
        title: language === 'en' ? 'PAID THIS MONTH' : 'DIBAYAR BULAN INI',
        value: formatCurrency(totalPaid),
        change: totalPaid > 0 ? '+18.5%' : '0.0%',
        changeType: 'increase',
      },
      {
        title: language === 'en' ? 'AVG. BILL VALUE' : 'RATA-RATA TAGIHAN',
        value: formatCurrency(avgBill),
        change: avgBill > 0 ? '+4.2%' : '0.0%',
        changeType: 'increase',
      },
    ];
  }, [apSummary, effectiveBills, language, state.currency, isDemo]);

  // Bill creation form helpers
  const handleOpenAddBill = () => {
    setBillForm({
      vendorId: vendors[0]?.id || '',
      vendorReference: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    setIsAddBillOpen(true);
  };

  const handleAddBillLine = () => {
    setBillForm({
      ...billForm,
      lines: [
        ...billForm.lines,
        { description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 0.11 },
      ],
    });
  };

  const handleRemoveBillLine = (index: number) => {
    if (billForm.lines.length <= 1) return;
    setBillForm({
      ...billForm,
      lines: billForm.lines.filter((_, i) => i !== index),
    });
  };

  const handleBillLineChange = (index: number, field: string, value: any) => {
    const updated = [...billForm.lines];
    updated[index] = { ...updated[index], [field]: value };
    setBillForm({ ...billForm, lines: updated });
  };

  const billPreviewTotals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    billForm.lines.forEach((l) => {
      const lineSub = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      const lineDisc = Number(l.discountAmount) || 0;
      const taxable = Math.max(0, lineSub - lineDisc);
      const lineTax = taxable * (Number(l.taxRate) || 0);
      sub += lineSub;
      disc += lineDisc;
      tax += lineTax;
    });
    return { subtotal: sub, discount: disc, tax, total: sub - disc + tax };
  }, [billForm.lines]);

  const handleSaveBill = async (e: React.FormEvent, shouldPost = false) => {
    e.preventDefault();
    if (!billForm.vendorId) {
      alert(language === 'en' ? 'Please select a vendor' : 'Silakan pilih vendor');
      return;
    }

    try {
      const activeEntityId = await ensureActiveEntityId();
      const created = await purchasesApi.createBill({
        entityId: activeEntityId,
        vendorId: billForm.vendorId,
        vendorReference: billForm.vendorReference,
        billDate: billForm.billDate,
        dueDate: billForm.dueDate,
        notes: billForm.notes,
        lines: billForm.lines.map((l) => ({
          description: l.description || 'Purchased Item',
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          discountAmount: Number(l.discountAmount) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      });

      if (shouldPost) {
        await purchasesApi.postBill(created.id);
      }

      setIsAddBillOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save vendor bill.');
    }
  };

  const handlePostBill = async (billId: string) => {
    try {
      await purchasesApi.postBill(billId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to post bill to General Ledger.');
    }
  };

  const handleCancelBill = async () => {
    if (!isCancelConfirmOpen) return;
    try {
      await purchasesApi.cancelBill(isCancelConfirmOpen);
      setIsCancelConfirmOpen(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel vendor bill.');
    }
  };

  // PO creation form helpers
  const handleOpenAddOrder = () => {
    setOrderForm({
      vendorId: vendors[0]?.id || '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    setIsAddOrderOpen(true);
  };

  const handleAddOrderLine = () => {
    setOrderForm({
      ...orderForm,
      lines: [
        ...orderForm.lines,
        { description: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 0.11 },
      ],
    });
  };

  const handleRemoveOrderLine = (index: number) => {
    if (orderForm.lines.length <= 1) return;
    setOrderForm({
      ...orderForm,
      lines: orderForm.lines.filter((_, i) => i !== index),
    });
  };

  const handleOrderLineChange = (index: number, field: string, value: any) => {
    const updated = [...orderForm.lines];
    updated[index] = { ...updated[index], [field]: value };
    setOrderForm({ ...orderForm, lines: updated });
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.vendorId) {
      alert(language === 'en' ? 'Please select a vendor' : 'Silakan pilih vendor');
      return;
    }

    try {
      const activeEntityId = await ensureActiveEntityId();
      await purchasesApi.createOrder({
        entityId: activeEntityId,
        vendorId: orderForm.vendorId,
        orderDate: orderForm.orderDate,
        expectedDate: orderForm.expectedDate,
        reference: orderForm.reference,
        notes: orderForm.notes,
        lines: orderForm.lines.map((l) => ({
          description: l.description || 'Order Item',
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          discountAmount: Number(l.discountAmount) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
      });

      setIsAddOrderOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create Purchase Order.');
    }
  };

  const handleApproveOrder = async (poId: string) => {
    try {
      await purchasesApi.approveOrder(poId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve Purchase Order.');
    }
  };

  const orderPreviewTotals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let tax = 0;
    orderForm.lines.forEach((l) => {
      const lineSub = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      const lineDisc = Number(l.discountAmount) || 0;
      const taxable = Math.max(0, lineSub - lineDisc);
      const lineTax = taxable * (Number(l.taxRate) || 0);
      sub += lineSub;
      disc += lineDisc;
      tax += lineTax;
    });
    return { subtotal: sub, discount: disc, tax, total: sub - disc + tax };
  }, [orderForm.lines]);

  const handleCreateBillFromPO = async (poId: string) => {
    try {
      await purchasesApi.createBillFromPO(poId);
      setActiveTab('bills');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert Purchase Order to Vendor Bill.');
    }
  };

  // Edit / Delete Bill and PO states & handlers
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [isEditPOOpen, setIsEditPOOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<any>(null);

  const handleOpenEditBill = (bill: any) => {
    setEditingBill(bill);
    setBillForm({
      vendorId: bill.vendorId || bill.vendor?.id || '',
      vendorReference: bill.vendorReference || '',
      billDate: (bill.billDate || '').slice(0, 10),
      dueDate: (bill.dueDate || '').slice(0, 10),
      notes: bill.notes || '',
      lines: (bill.lines && bill.lines.length > 0) ? bill.lines.map((l: any) => ({
        description: l.description || '',
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        discountAmount: Number(l.discountAmount) || 0,
        taxRate: Number(l.taxRate) || 0.11,
      })) : [
        {
          description: bill.description || 'AWS Cloud Infrastructure Service',
          quantity: 1,
          unitPrice: Number(bill.subtotal) || Number(bill.totalAmount) || 105450000,
          discountAmount: 0,
          taxRate: 0.11,
        }
      ],
    });
    setIsEditBillOpen(true);
  };

  const handleSaveEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    const updated = {
      ...editingBill,
      vendorId: billForm.vendorId,
      vendorReference: billForm.vendorReference,
      billDate: billForm.billDate,
      dueDate: billForm.dueDate,
      notes: billForm.notes,
      subtotal: billPreviewTotals.subtotal,
      taxAmount: billPreviewTotals.tax,
      totalAmount: billPreviewTotals.total,
    };
    setBills(prev => prev.map(b => b.id === editingBill.id ? updated : b));
    setIsEditBillOpen(false);
    setEditingBill(null);
  };

  const handleDeleteBill = (billId: string) => {
    if (confirm(language === 'id' ? 'Apakah Anda yakin ingin menghapus tagihan ini?' : 'Are you sure you want to delete this bill?')) {
      setBills(prev => prev.filter(b => b.id !== billId));
    }
  };

  const handleOpenEditPO = (po: any) => {
    setEditingPO(po);
    setOrderForm({
      vendorId: po.vendorId || po.vendor?.id || '',
      orderDate: (po.orderDate || '').slice(0, 10),
      expectedDate: (po.expectedDeliveryDate || po.expectedDate || '').slice(0, 10),
      reference: po.reference || '',
      notes: po.notes || '',
      lines: (po.lines && po.lines.length > 0) ? po.lines.map((l: any) => ({
        description: l.description || '',
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        discountAmount: Number(l.discountAmount) || 0,
        taxRate: Number(l.taxRate) || 0.11,
      })) : [
        {
          description: po.description || 'Hardware & Server Procurement',
          quantity: 1,
          unitPrice: Number(po.subtotal) || Number(po.totalAmount) || 85000000,
          discountAmount: 0,
          taxRate: 0.11,
        }
      ],
    });
    setIsEditPOOpen(true);
  };

  const handleSaveEditPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    const updated = {
      ...editingPO,
      vendorId: orderForm.vendorId,
      orderDate: orderForm.orderDate,
      expectedDeliveryDate: orderForm.expectedDate,
      reference: orderForm.reference,
      notes: orderForm.notes,
      subtotal: orderPreviewTotals.subtotal,
      taxAmount: orderPreviewTotals.tax,
      totalAmount: orderPreviewTotals.total,
    };
    setOrders(prev => prev.map(o => o.id === editingPO.id ? updated : o));
    setIsEditPOOpen(false);
    setEditingPO(null);
  };

  const handleDeletePO = (poId: string) => {
    if (confirm(language === 'id' ? 'Apakah Anda yakin ingin menghapus Pesanan Pembelian ini?' : 'Are you sure you want to delete this Purchase Order?')) {
      setOrders(prev => prev.filter(o => o.id !== poId));
    }
  };

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* Metrics board */}
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
              <p className="font-bold">Purchases & Accounts Payable API Error</p>
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
                {language === 'en' ? 'Purchases & Accounts Payable' : 'Pengadaan & Utang Usaha (AP)'}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PostgreSQL Sub-ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Manage Purchase Orders, Vendor Bills, AP aging, and automated double-entry GL expense postings'
                : 'Kelola Pesanan Pembelian (PO), Tagihan Vendor, umur utang, dan posting otomatis beban GL'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl flex items-center gap-1">
              <button
                onClick={() => setActiveTab('bills')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'bills'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {t('vendorBills')}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {language === 'en' ? 'Purchase Orders' : 'Pesanan Pembelian'}
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

            {activeTab === 'bills' ? (
              <button
                type="button"
                onClick={handleOpenAddBill}
                className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition transform active:scale-98 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('newBill')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddOrder}
                className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition transform active:scale-98 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {language === 'en' ? 'New Purchase Order' : 'PO Baru'}
              </button>
            )}
          </div>
        </div>

        {/* VENDOR BILLS TAB */}
        {activeTab === 'bills' && (
          <div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Bill #</th>
                    <th scope="col" className="px-5 py-3.5">{t('vendor')}</th>
                    <th scope="col" className="px-5 py-3.5">{t('billDate')}</th>
                    <th scope="col" className="px-5 py-3.5">{t('dueDate')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('subtotal')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('tax')}</th>
                    <th scope="col" className="px-5 py-3.5 text-right">{t('total')}</th>
                    <th scope="col" className="px-5 py-3.5 text-center">{t('status')}</th>
                    <th scope="col" className="px-5 py-3.5 text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {effectiveBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-xs text-slate-400">
                        {isLoading ? (
                          <div className="flex justify-center items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                            Loading vendor bills from PostgreSQL...
                          </div>
                        ) : (
                          language === 'en'
                            ? 'No vendor bills found. Click New Bill to record and post your first bill.'
                            : 'Tidak ada tagihan vendor ditemukan. Klik Tagihan Baru untuk mencatat dan memposting tagihan pertama Anda.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    effectiveBills.map((bill: any) => (
                      <tr
                        key={bill.id}
                        className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                          {bill.billNumber}
                          {bill.vendorReference && (
                            <span className="block text-[10px] text-slate-400 font-normal">Ref: {bill.vendorReference}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {bill.vendor?.name || 'Vendor'}
                          <p className="text-[10px] text-slate-400 font-normal">{bill.vendor?.vendorCode}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {bill.billDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {bill.dueDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {formatCurrency(Number(bill.subtotal))}
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-slate-400 dark:text-slate-500">
                          {formatCurrency(Number(bill.taxAmount))}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-900 dark:text-white">
                          {formatCurrency(Number(bill.totalAmount))}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <BillStatusBadge
                            status={bill.status}
                            postingStatus={bill.postingStatus}
                          />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              title={language === 'en' ? 'Edit Bill' : 'Ubah Tagihan'}
                              onClick={() => handleOpenEditBill(bill)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title={language === 'en' ? 'Delete Bill' : 'Hapus Tagihan'}
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {bill.postingStatus === 'UNPOSTED' && bill.status !== 'CANCELLED' && (
                              <button
                                title={language === 'en' ? 'Post to General Ledger' : 'Posting ke Buku Besar'}
                                onClick={() => handlePostBill(bill.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {bill.status !== 'CANCELLED' && (
                              <button
                                title={language === 'en' ? 'Cancel / Reverse' : 'Batalkan / Reversal'}
                                onClick={() => setIsCancelConfirmOpen(bill.id)}
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
              {effectiveBills.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
                  {language === 'en' ? 'No vendor bills found.' : 'Tidak ada tagihan vendor ditemukan.'}
                </div>
              ) : (
                effectiveBills.map((bill: any) => (
                  <div
                    key={bill.id}
                    className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 block mb-0.5">
                          {bill.billNumber}
                        </span>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {bill.vendor?.name}
                        </h4>
                      </div>
                      <BillStatusBadge
                        status={bill.status}
                        postingStatus={bill.postingStatus}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-800/40 p-2 rounded-xl text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">{t('billDate')}</span>
                        <span className="font-semibold">{bill.billDate.slice(0, 10)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">{t('dueDate')}</span>
                        <span className="font-semibold">{bill.dueDate.slice(0, 10)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 font-sans">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">{t('total')}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white block">
                          {formatCurrency(Number(bill.totalAmount))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          title={language === 'en' ? 'Edit' : 'Ubah'}
                          onClick={() => handleOpenEditBill(bill)}
                          className="p-2 text-slate-400 hover:text-primary-600 rounded-xl transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          title={language === 'en' ? 'Delete' : 'Hapus'}
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {bill.postingStatus === 'UNPOSTED' && bill.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handlePostBill(bill.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {bill.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setIsCancelConfirmOpen(bill.id)}
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

        {/* PURCHASE ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
                <tr>
                  <th scope="col" className="px-5 py-3.5">PO #</th>
                  <th scope="col" className="px-5 py-3.5">{t('vendor')}</th>
                  <th scope="col" className="px-5 py-3.5">Order Date</th>
                  <th scope="col" className="px-5 py-3.5">Expected Delivery</th>
                  <th scope="col" className="px-5 py-3.5 text-right">{t('total')}</th>
                  <th scope="col" className="px-5 py-3.5 text-center">{t('status')}</th>
                  <th scope="col" className="px-5 py-3.5 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-slate-400">
                      No purchase orders found. Click New Purchase Order to begin.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr
                      key={po.id}
                      className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                        {po.poNumber}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {po.vendor?.name}
                        <p className="text-[10px] text-slate-400 font-normal">{po.vendor?.vendorCode}</p>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {po.orderDate.slice(0, 10)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {po.expectedDate ? po.expectedDate.slice(0, 10) : '-'}
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(po.totalAmount))}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <POStatusBadge status={po.status} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title={language === 'en' ? 'Edit PO' : 'Ubah PO'}
                            onClick={() => handleOpenEditPO(po)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={language === 'en' ? 'Delete PO' : 'Hapus PO'}
                            onClick={() => handleDeletePO(po.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {po.status === 'DRAFT' && (
                            <button
                              onClick={() => handleApproveOrder(po.id)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {po.status === 'APPROVED' && (
                            <button
                              onClick={() => handleCreateBillFromPO(po.id)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> Create Bill
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
        )}
      </div>

      {/* Create Vendor Bill Modal */}
      {isAddBillOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Create Vendor Bill (AP)' : 'Buat Tagihan Vendor (AP)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Calculates PPN 11% Input Tax and creates balanced AP entries' : 'Hitung PPN Masukan 11% dan posting jurnal utang usaha'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBillOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('vendor')} *
                  </label>
                  <select
                    required
                    value={billForm.vendorId}
                    onChange={(e) => setBillForm({ ...billForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorCode} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Vendor Invoice / Reference
                  </label>
                  <input
                    type="text"
                    value={billForm.vendorReference}
                    onChange={(e) => setBillForm({ ...billForm, vendorReference: e.target.value })}
                    placeholder="e.g. INV-SUPPLIER-889"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('billDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
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
                    value={billForm.dueDate}
                    onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bill Expense Lines
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBillLine}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {billForm.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Expense Item Description (e.g. Office Cloud Services)"
                        value={line.description}
                        onChange={(e) => handleBillLineChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white outline-none"
                      />
                      {billForm.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBillLine(idx)}
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
                          onChange={(e) => handleBillLineChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Unit Price</span>
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleBillLineChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Discount</span>
                        <input
                          type="number"
                          min="0"
                          value={line.discountAmount}
                          onChange={(e) => handleBillLineChange(idx, 'discountAmount', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Tax (Input VAT)</span>
                        <select
                          value={line.taxRate}
                          onChange={(e) => handleBillLineChange(idx, 'taxRate', Number(e.target.value))}
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
                  <span>{formatCurrency(billPreviewTotals.subtotal)}</span>
                </div>
                {billPreviewTotals.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount:</span>
                    <span>-{formatCurrency(billPreviewTotals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Input VAT (PPN Masukan 11%):</span>
                  <span>{formatCurrency(billPreviewTotals.tax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total (AP Payable):</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(billPreviewTotals.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/40 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBillOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveBill(e, false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveBill(e, true)}
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Save & Post to GL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isAddOrderOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'New Purchase Order' : 'Buat Purchase Order Baru'}
                </h3>
                <p className="text-xs text-slate-400">
                  Commercial commitment — creates ZERO accounting journal entries
                </p>
              </div>
              <button onClick={() => setIsAddOrderOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Vendor *
                  </label>
                  <select
                    required
                    value={orderForm.vendorId}
                    onChange={(e) => setOrderForm({ ...orderForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorCode} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    PO Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-PROJECT-XYZ"
                    value={orderForm.reference}
                    onChange={(e) => setOrderForm({ ...orderForm, reference: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={orderForm.expectedDate}
                    onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Order Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Order Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    className="font-bold text-primary-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {orderForm.lines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Item Description (e.g. Hardware Components)"
                        value={line.description}
                        onChange={(e) => handleOrderLineChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white outline-none"
                      />
                      {orderForm.lines.length > 1 && (
                        <button type="button" onClick={() => handleRemoveOrderLine(idx)} className="p-1 text-slate-400 hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleOrderLineChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Unit Price</span>
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleOrderLineChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Discount</span>
                        <input
                          type="number"
                          min="0"
                          value={line.discountAmount}
                          onChange={(e) => handleOrderLineChange(idx, 'discountAmount', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tax</span>
                        <select
                          value={line.taxRate}
                          onChange={(e) => handleOrderLineChange(idx, 'taxRate', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                        >
                          <option value="0.11">11% PPN</option>
                          <option value="0">0% Non-Tax</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-md cursor-pointer"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Bill Modal */}
      {isEditBillOpen && editingBill && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Edit Vendor Bill' : 'Ubah Tagihan Vendor'}
                </h3>
                <p className="text-xs text-slate-400">{editingBill.billNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditBillOpen(false);
                  setEditingBill(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBill} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('vendor')} *
                  </label>
                  <select
                    required
                    value={billForm.vendorId}
                    onChange={(e) => setBillForm({ ...billForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorCode} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Vendor Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    value={billForm.vendorReference}
                    onChange={(e) => setBillForm({ ...billForm, vendorReference: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('billDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
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
                    value={billForm.dueDate}
                    onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Bill Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bill Expense Items</h4>
                  <button
                    type="button"
                    onClick={handleAddBillLine}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {billForm.lines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Expense Description (e.g. Server Hosting)"
                          value={line.description}
                          onChange={(e) => handleBillLineChange(idx, 'description', e.target.value)}
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
                          onChange={(e) => handleBillLineChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <input
                          type="number"
                          required
                          placeholder="Unit Price"
                          value={line.unitPrice}
                          onChange={(e) => handleBillLineChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveBillLine(idx)}
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
                  <span>{formatCurrency(billPreviewTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Input VAT (PPN 11%):</span>
                  <span>{formatCurrency(billPreviewTotals.tax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(billPreviewTotals.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/40 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditBillOpen(false);
                    setEditingBill(null);
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

      {/* Edit Purchase Order Modal */}
      {isEditPOOpen && editingPO && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700/60 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Edit Purchase Order' : 'Ubah Pesanan Pembelian'}
                </h3>
                <p className="text-xs text-slate-400">{editingPO.poNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditPOOpen(false);
                  setEditingPO(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPO} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('vendor')} *
                  </label>
                  <select
                    required
                    value={orderForm.vendorId}
                    onChange={(e) => setOrderForm({ ...orderForm, vendorId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorCode} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    PO Reference
                  </label>
                  <input
                    type="text"
                    value={orderForm.reference}
                    onChange={(e) => setOrderForm({ ...orderForm, reference: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={orderForm.expectedDate}
                    onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Order Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</h4>
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {orderForm.lines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Item description"
                          value={line.description}
                          onChange={(e) => handleOrderLineChange(idx, 'description', e.target.value)}
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
                          onChange={(e) => handleOrderLineChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <input
                          type="number"
                          required
                          placeholder="Unit Price"
                          value={line.unitPrice}
                          onChange={(e) => handleOrderLineChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderLine(idx)}
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
                  <span>{formatCurrency(orderPreviewTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>VAT (PPN 11%):</span>
                  <span>{formatCurrency(orderPreviewTotals.tax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white">
                  <span>Grand Total:</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(orderPreviewTotals.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/40 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPOOpen(false);
                    setEditingPO(null);
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

      {/* Cancel Bill Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
                Cancel Vendor Bill
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                If posted, an immutable reversing journal entry will automatically be created in the General Ledger to ensure double-entry integrity.
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
                onClick={handleCancelBill}
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

export default Purchases;
