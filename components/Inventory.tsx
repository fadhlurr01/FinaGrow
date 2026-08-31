import React, { useState, useEffect, useCallback } from 'react';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import {
  inventoryApi,
  ApiInventoryItem,
  ApiGoodsReceipt,
  ApiDelivery,
  ApiStockTransfer,
  ApiStockAdjustment,
  ApiStockCard,
  ApiWarehouse,
  ApiInventoryReconciliation,
  ApiGrniReconciliation,
} from '../src/services/api/inventoryApi';
import {
  Package,
  Layers,
  Truck,
  ArrowLeftRight,
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Check,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  TrendingUp,
} from 'lucide-react';

type InventoryTab =
  | 'items'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'stockCard'
  | 'reconciliation';

export const Inventory: React.FC = () => {
  const { state } = useFMS();
  const { language } = useLocalization();

  const [activeTab, setActiveTab] = useState<InventoryTab>('items');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [items, setItems] = useState<ApiInventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [receipts, setReceipts] = useState<ApiGoodsReceipt[]>([]);
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([]);
  const [transfers, setTransfers] = useState<ApiStockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<ApiStockAdjustment[]>([]);
  const [stockCard, setStockCard] = useState<ApiStockCard | null>(null);
  const [selectedStockCardItemId, setSelectedStockCardItemId] = useState<string>('');
  const [invReconciliation, setInvReconciliation] = useState<ApiInventoryReconciliation | null>(null);
  const [grniReconciliation, setGrniReconciliation] = useState<ApiGrniReconciliation | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Form States - Item
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    description: '',
    valuationMethod: 'FIFO' as 'FIFO' | 'WEIGHTED_AVERAGE',
    reorderLevel: 5,
    sellingPrice: 0,
    purchasePrice: 0,
  });

  // Form States - Receipt
  const [receiptForm, setReceiptForm] = useState({
    warehouseId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    itemId: '',
    quantity: 1,
    unitCost: 0,
  });

  // Form States - Delivery
  const [deliveryForm, setDeliveryForm] = useState({
    warehouseId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    itemId: '',
    quantity: 1,
  });

  // Form States - Transfer
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: new Date().toISOString().split('T')[0],
    reference: '',
    itemId: '',
    quantity: 1,
  });

  // Form States - Adjustment
  const [adjustmentForm, setAdjustmentForm] = useState({
    warehouseId: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    adjustmentType: 'INCREASE' as 'INCREASE' | 'DECREASE',
    reason: '',
    itemId: '',
    quantity: 1,
    unitCost: 0,
  });

  const activeEntityId = state.currentEntity?.id || 'default-entity';

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Load active tab data
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'items') {
        const data = await inventoryApi.getItems();
        setItems(data);
      } else if (activeTab === 'receipts') {
        const [grData, whData, itmData] = await Promise.all([
          inventoryApi.getReceipts(),
          inventoryApi.getWarehouses(),
          inventoryApi.getItems(),
        ]);
        setReceipts(grData);
        setWarehouses(whData);
        setItems(itmData);
      } else if (activeTab === 'deliveries') {
        const [delData, whData, itmData] = await Promise.all([
          inventoryApi.getDeliveries(),
          inventoryApi.getWarehouses(),
          inventoryApi.getItems(),
        ]);
        setDeliveries(delData);
        setWarehouses(whData);
        setItems(itmData);
      } else if (activeTab === 'transfers') {
        const [trfData, whData, itmData] = await Promise.all([
          inventoryApi.getTransfers(),
          inventoryApi.getWarehouses(),
          inventoryApi.getItems(),
        ]);
        setTransfers(trfData);
        setWarehouses(whData);
        setItems(itmData);
      } else if (activeTab === 'adjustments') {
        const [adjData, whData, itmData] = await Promise.all([
          inventoryApi.getAdjustments(),
          inventoryApi.getWarehouses(),
          inventoryApi.getItems(),
        ]);
        setAdjustments(adjData);
        setWarehouses(whData);
        setItems(itmData);
      } else if (activeTab === 'stockCard') {
        const itmData = await inventoryApi.getItems();
        setItems(itmData);
        if (itmData.length > 0 && !selectedStockCardItemId) {
          setSelectedStockCardItemId(itmData[0].id);
          const card = await inventoryApi.getStockCard({ itemId: itmData[0].id });
          setStockCard(card);
        } else if (selectedStockCardItemId) {
          const card = await inventoryApi.getStockCard({ itemId: selectedStockCardItemId });
          setStockCard(card);
        }
      } else if (activeTab === 'reconciliation') {
        const [invRecon, grniRecon] = await Promise.all([
          inventoryApi.getInventoryReconciliation(activeEntityId),
          inventoryApi.getGrniReconciliation(activeEntityId),
        ]);
        setInvReconciliation(invRecon);
        setGrniReconciliation(grniRecon);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load inventory records.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeEntityId, selectedStockCardItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load stock card when item changes
  const handleSelectStockCardItem = async (itemId: string) => {
    setSelectedStockCardItemId(itemId);
    setLoading(true);
    try {
      const card = await inventoryApi.getStockCard({ itemId });
      setStockCard(card);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load stock card.');
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handlePostReceipt = async (id: string) => {
    try {
      setLoading(true);
      await inventoryApi.postReceipt(id);
      setSuccessMessage('Goods Receipt posted successfully. Inventory & GRNI updated.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post Goods Receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverseReceipt = async (id: string) => {
    try {
      setLoading(true);
      await inventoryApi.reverseReceipt(id);
      setSuccessMessage('Goods Receipt reversed successfully.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reverse Goods Receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelivery = async (id: string) => {
    try {
      setLoading(true);
      await inventoryApi.postDelivery(id);
      setSuccessMessage('Delivery posted successfully. COGS recognized and inventory reduced.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post delivery.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverseDelivery = async (id: string) => {
    try {
      setLoading(true);
      await inventoryApi.reverseDelivery(id);
      setSuccessMessage('Delivery reversed successfully. Inventory layers restored.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reverse delivery.');
    } finally {
      setLoading(false);
    }
  };

  // Form Submits
  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryApi.createItem({
        entityId: activeEntityId,
        sku: itemForm.sku,
        name: itemForm.name,
        description: itemForm.description,
        valuationMethod: itemForm.valuationMethod,
        reorderLevel: Number(itemForm.reorderLevel),
        sellingPrice: Number(itemForm.sellingPrice),
        purchasePrice: Number(itemForm.purchasePrice),
      });
      setIsItemModalOpen(false);
      setSuccessMessage('Inventory item registered successfully.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create inventory item.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryApi.createReceipt({
        entityId: activeEntityId,
        warehouseId: receiptForm.warehouseId,
        receiptDate: receiptForm.receiptDate,
        reference: receiptForm.reference,
        notes: receiptForm.notes,
        lines: [
          {
            itemId: receiptForm.itemId,
            quantityReceived: Number(receiptForm.quantity),
            unitCost: Number(receiptForm.unitCost),
          },
        ],
      });
      setIsReceiptModalOpen(false);
      setSuccessMessage('Goods Receipt draft created.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create Goods Receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryApi.createDelivery({
        entityId: activeEntityId,
        warehouseId: deliveryForm.warehouseId,
        deliveryDate: deliveryForm.deliveryDate,
        reference: deliveryForm.reference,
        notes: deliveryForm.notes,
        lines: [
          {
            itemId: deliveryForm.itemId,
            quantityDelivered: Number(deliveryForm.quantity),
          },
        ],
      });
      setIsDeliveryModalOpen(false);
      setSuccessMessage('Delivery draft created.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create delivery.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryApi.createTransfer({
        entityId: activeEntityId,
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        transferDate: transferForm.transferDate,
        reference: transferForm.reference,
        lines: [
          {
            itemId: transferForm.itemId,
            quantity: Number(transferForm.quantity),
          },
        ],
      });
      setIsTransferModalOpen(false);
      setSuccessMessage('Stock transfer executed successfully with preserved cost basis.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute stock transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryApi.createAdjustment({
        entityId: activeEntityId,
        warehouseId: adjustmentForm.warehouseId,
        adjustmentDate: adjustmentForm.adjustmentDate,
        adjustmentType: adjustmentForm.adjustmentType,
        reason: adjustmentForm.reason,
        lines: [
          {
            itemId: adjustmentForm.itemId,
            quantity: Number(adjustmentForm.quantity),
            unitCost: Number(adjustmentForm.unitCost),
          },
        ],
      });
      setIsAdjustmentModalOpen(false);
      setSuccessMessage('Inventory physical adjustment posted successfully.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post inventory adjustment.');
    } finally {
      setLoading(false);
    }
  };

  const totalInventoryValuation = items.reduce((sum, i) => sum + (i.inventoryValue || 0), 0);
  const totalStockUnits = items.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0);

  const displayValuation = totalInventoryValuation;
  const displayItemsCount = items.length;
  const displayTotalUnits = totalStockUnits;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'id' ? 'Manajemen Inventaris & Valuasi HPP' : 'Inventory Master & COGS Valuation'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'id'
                  ? 'Sistem perpetual FIFO & Moving Weighted Average terhubung langsung ke Buku Besar'
                  : 'Production perpetual inventory subsystem with double-entry accounting integration'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
            TOTAL INVENTORY VALUATION
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight mt-1">
            {formatMoney(displayValuation)}
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            Synced Balance Method
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
            DISTINCT STOCK ITEMS
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight mt-1">
            {displayItemsCount} SKU
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 block font-medium">
            All active products inventory
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
            COLLECTIVE QUANTITY UNIT
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight mt-1">
            {displayTotalUnits} Pcs
          </div>
          <span className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            All items match safe shelf guidelines
          </span>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'items'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{language === 'id' ? 'Master Produk & Stok' : 'Items & Stock'}</span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'receipts'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>{language === 'id' ? 'Penerimaan Barang (GR)' : 'Goods Receipts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'deliveries'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === 'id' ? 'Pengiriman & HPP (DO)' : 'Deliveries & COGS'}</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'transfers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>{language === 'id' ? 'Transfer Antar Gudang' : 'Stock Transfers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'adjustments'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{language === 'id' ? 'Penyesuaian Fisik (Opname)' : 'Stock Adjustments'}</span>
        </button>

        <button
          onClick={() => setActiveTab('stockCard')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'stockCard'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{language === 'id' ? 'Kartu Stok & Audit Layer' : 'Stock Card & Audit'}</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition ${
            activeTab === 'reconciliation'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === 'id' ? 'Rekonsiliasi Persediaan & GRNI' : 'GL Reconciliation'}</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'id' ? 'Cari SKU atau nama item...' : 'Search SKU or name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>

            <button
              onClick={() => {
                setItemForm({
                  sku: `SKU-${Math.floor(Math.random() * 8999 + 1000)}`,
                  name: '',
                  description: '',
                  valuationMethod: 'FIFO',
                  reorderLevel: 5,
                  sellingPrice: 0,
                  purchasePrice: 0,
                });
                setIsItemModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Daftarkan Item Baru' : 'New Inventory Item'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">{language === 'id' ? 'Nama Item' : 'Item Name'}</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Valuation</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Stok Fisik' : 'Qty On Hand'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Rata-rata Biaya' : 'Avg Cost'}</th>
                  <th className="px-5 py-3.5 text-right">{language === 'id' ? 'Nilai Persediaan' : 'Total Valuation'}</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {(() => {
                  const list = items;
                  const filtered = list.filter(
                    (i) =>
                      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      i.name.toLowerCase().includes(searchTerm.toLowerCase()),
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-xs text-slate-400 font-bold">
                          {language === 'id' ? 'Belum ada item barang terdaftar.' : 'No inventory items registered.'}
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.sku}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        {item.name}
                        {item.description && (
                          <span className="block text-[10px] text-slate-400 font-normal">{item.description}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                          {item.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px]">
                          {item.valuationMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.quantityOnHand} {item.unitOfMeasure?.code || 'PCS'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatMoney(item.averageCost)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(item.inventoryValue)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {item.isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {language === 'id' ? 'Stok Rendah' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {language === 'id' ? 'Tersedia' : 'In Stock'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GOODS RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'id' ? 'Daftar Penerimaan Barang Gudang' : 'Goods Receipts Sub-Ledger'}
            </span>
            <button
              onClick={() => {
                setReceiptForm({
                  warehouseId: warehouses[0]?.id || '',
                  receiptDate: new Date().toISOString().split('T')[0],
                  reference: '',
                  notes: '',
                  itemId: items[0]?.id || '',
                  quantity: 10,
                  unitCost: 100000,
                });
                setIsReceiptModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Buat Penerimaan Baru (GR)' : 'New Goods Receipt'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">GR Number</th>
                  <th className="px-5 py-3.5">Vendor</th>
                  <th className="px-5 py-3.5">PO Ref</th>
                  <th className="px-5 py-3.5">Warehouse</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Total Value</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {receipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {gr.receiptNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {gr.vendor?.name || 'Direct Receipt'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {gr.purchaseOrder?.poNumber || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {gr.warehouse?.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(gr.receiptDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(gr.totalValue)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          gr.status === 'POSTED'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : gr.status === 'REVERSED'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {gr.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {gr.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostReceipt(gr.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Post GL</span>
                          </button>
                        )}
                        {gr.status === 'POSTED' && (
                          <button
                            onClick={() => handleReverseReceipt(gr.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-100 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERIES & COGS */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'id' ? 'Daftar Pengiriman & Pengakuan HPP' : 'Deliveries & COGS Sub-Ledger'}
            </span>
            <button
              onClick={() => {
                setDeliveryForm({
                  warehouseId: warehouses[0]?.id || '',
                  deliveryDate: new Date().toISOString().split('T')[0],
                  reference: '',
                  notes: '',
                  itemId: items[0]?.id || '',
                  quantity: 1,
                });
                setIsDeliveryModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Buat Pengiriman Baru (DO)' : 'New Delivery'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">DO Number</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Sales Invoice</th>
                  <th className="px-5 py-3.5">Warehouse</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Recognized COGS</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {del.deliveryNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {del.customer?.name || 'Direct Customer'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {del.salesInvoice?.invoiceNumber || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {del.warehouse?.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(del.deliveryDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatMoney(del.totalCost)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          del.status === 'POSTED'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : del.status === 'REVERSED'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                      >
                        {del.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {del.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostDelivery(del.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Post COGS</span>
                          </button>
                        )}
                        {del.status === 'POSTED' && (
                          <button
                            onClick={() => handleReverseDelivery(del.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-100 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'id' ? 'Daftar Transfer Fisik Antar Gudang' : 'Inter-Warehouse Transfers'}
            </span>
            <button
              onClick={() => {
                setTransferForm({
                  fromWarehouseId: warehouses[0]?.id || '',
                  toWarehouseId: warehouses[1]?.id || '',
                  transferDate: new Date().toISOString().split('T')[0],
                  reference: '',
                  itemId: items[0]?.id || '',
                  quantity: 1,
                });
                setIsTransferModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Transfer Baru' : 'New Stock Transfer'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Transfer Number</th>
                  <th className="px-5 py-3.5">From Warehouse</th>
                  <th className="px-5 py-3.5">To Warehouse</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Preserved Cost Value</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {trf.transferNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {trf.fromWarehouse?.name}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {trf.toWarehouse?.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(trf.transferDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(trf.totalCost)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {trf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ADJUSTMENTS */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'id' ? 'Penyesuaian Fisik & Kerugian Selisih Stok' : 'Physical Count Adjustments'}
            </span>
            <button
              onClick={() => {
                setAdjustmentForm({
                  warehouseId: warehouses[0]?.id || '',
                  adjustmentDate: new Date().toISOString().split('T')[0],
                  adjustmentType: 'INCREASE',
                  reason: 'Physical count surplus',
                  itemId: items[0]?.id || '',
                  quantity: 1,
                  unitCost: 100000,
                });
                setIsAdjustmentModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'id' ? 'Input Penyesuaian' : 'New Stock Adjustment'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Adj Number</th>
                  <th className="px-5 py-3.5">Warehouse</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">GL Adjustment Value</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {adj.adjustmentNumber}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {adj.warehouse?.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          adj.adjustmentType === 'INCREASE'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {adj.adjustmentType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {adj.reason}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(adj.adjustmentDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(adj.totalCost)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {adj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: STOCK CARD */}
      {activeTab === 'stockCard' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {language === 'id' ? 'Pilih Item Persediaan' : 'Select Inventory Item'}
              </label>
              <select
                value={selectedStockCardItemId}
                onChange={(e) => handleSelectStockCardItem(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} — {i.name}
                  </option>
                ))}
              </select>
            </div>

            {stockCard && (
              <div className="flex gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Saldo Unit Akhir</span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {stockCard.closingQuantity} {stockCard.item?.unitOfMeasure?.code || 'PCS'}
                  </span>
                </div>
                <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Nilai Valuasi Akhir</span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatMoney(stockCard.closingValue)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Movement No</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Warehouse</th>
                  <th className="px-5 py-3.5 text-right">In Qty</th>
                  <th className="px-5 py-3.5 text-right">Out Qty</th>
                  <th className="px-5 py-3.5 text-right">Unit Cost</th>
                  <th className="px-5 py-3.5 text-right">Running Balance</th>
                  <th className="px-5 py-3.5 text-right">Running Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {stockCard?.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(line.movementDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {line.movementNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                        {line.movementType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {line.warehouse?.name}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {line.inQuantity > 0 ? `+${line.inQuantity}` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {line.outQuantity > 0 ? `-${line.outQuantity}` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                      {formatMoney(line.unitCost)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {line.runningQuantity}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(line.runningValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inventory Control vs GL 1140 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'id' ? 'Rekonsiliasi Persediaan Fisik vs GL' : 'Inventory Sub-Ledger vs GL Control'}
                </h3>
                <p className="text-xs text-slate-500">Account 1140 (Persediaan Barang Dagang)</p>
              </div>
              {invReconciliation?.isReconciled ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RECONCILED
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-xs flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  UNRECONCILED
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <span className="text-slate-500 font-medium">Sub-ledger Physical Layer Valuation</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(invReconciliation?.subledgerValue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <span className="text-slate-500 font-medium">GL Account 1140 Posted Balance</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(invReconciliation?.glBalance || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Unreconciled Difference</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(invReconciliation?.difference || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* GRNI Clearing vs GL 2140 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'id' ? 'Rekonsiliasi Hutang GRNI vs GL' : 'GRNI Clearing vs GL Liability'}
                </h3>
                <p className="text-xs text-slate-500">Account 2140 (Penerimaan Belum Ditagih)</p>
              </div>
              {grniReconciliation?.isReconciled ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RECONCILED
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-xs flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  UNRECONCILED
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <span className="text-slate-500 font-medium">Unbilled Received PO Value</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(grniReconciliation?.unbilledReceiptsValue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <span className="text-slate-500 font-medium">GL Account 2140 Posted Balance</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(grniReconciliation?.glGrniBalance || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Unreconciled Difference</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(grniReconciliation?.difference || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Daftarkan Item Inventaris Baru' : 'Register New Inventory Item'}
            </h3>
            <form onSubmit={handleCreateItemSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Valuation</label>
                  <select
                    value={itemForm.valuationMethod}
                    onChange={(e) => setItemForm({ ...itemForm, valuationMethod: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="FIFO">FIFO</option>
                    <option value="WEIGHTED_AVERAGE">Weighted Average (AVCO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Purchase Cost (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.purchasePrice}
                    onChange={(e) => setItemForm({ ...itemForm, purchasePrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Selling Price (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.sellingPrice}
                    onChange={(e) => setItemForm({ ...itemForm, sellingPrice: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RECEIPT MODAL */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Penerimaan Barang Baru (GR)' : 'Create Goods Receipt'}
            </h3>
            <form onSubmit={handleCreateReceiptSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Warehouse</label>
                  <select
                    value={receiptForm.warehouseId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, warehouseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.receiptDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Item to Receive</label>
                <select
                  value={receiptForm.itemId}
                  onChange={(e) => setReceiptForm({ ...receiptForm, itemId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiptForm.quantity}
                    onChange={(e) => setReceiptForm({ ...receiptForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Unit Cost (IDR)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiptForm.unitCost}
                    onChange={(e) => setReceiptForm({ ...receiptForm, unitCost: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Create GR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DELIVERY MODAL */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Pengiriman Barang Baru (DO)' : 'Create Sales Delivery'}
            </h3>
            <form onSubmit={handleCreateDeliverySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Warehouse</label>
                  <select
                    value={deliveryForm.warehouseId}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, warehouseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryForm.deliveryDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Item to Deliver</label>
                <select
                  value={deliveryForm.itemId}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, itemId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name} ({i.quantityOnHand} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Quantity Delivered</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={deliveryForm.quantity}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Create Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Transfer Fisik Antar Gudang' : 'Inter-Warehouse Stock Transfer'}
            </h3>
            <form onSubmit={handleCreateTransferSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Source Warehouse</label>
                  <select
                    value={transferForm.fromWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Destination Warehouse</label>
                  <select
                    value={transferForm.toWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Item to Transfer</label>
                <select
                  value={transferForm.itemId}
                  onChange={(e) => setTransferForm({ ...transferForm, itemId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Penyesuaian Fisik (Stock Opname)' : 'Physical Count Adjustment'}
            </h3>
            <form onSubmit={handleCreateAdjustmentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Warehouse</label>
                  <select
                    value={adjustmentForm.warehouseId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, warehouseId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Adjustment Type</label>
                  <select
                    value={adjustmentForm.adjustmentType}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="INCREASE">Surplus (INCREASE)</option>
                    <option value="DECREASE">Shortage (DECREASE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical count discrepancy"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Item to Adjust</label>
                <select
                  value={adjustmentForm.itemId}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, itemId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.sku} — {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Adjustment Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                {adjustmentForm.adjustmentType === 'INCREASE' && (
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Unit Cost Basis</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={adjustmentForm.unitCost}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, unitCost: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
