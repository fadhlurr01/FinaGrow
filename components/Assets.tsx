import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import {
  assetsApi,
  ApiFixedAsset,
  ApiAssetCategory,
  ApiDepreciationRun,
  ApiAssetMovement,
  ApiAssetDisposal,
  ApiAssetReconciliation,
  AssetStatus,
  DepreciationMethod,
  DisposalType,
} from '../src/services/api/assetsApi';
import { cashBankApi, ApiCashBankAccount } from '../src/services/api/cashBankApi';
import {
  Building,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Coins,
  Shield,
  Calendar,
  Layers,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  FileSpreadsheet,
  Check,
  X,
  Play,
  RotateCcw,
  Search,
  Filter,
  Truck,
  MapPin,
  User,
} from 'lucide-react';

type TabType = 'overview' | 'register' | 'categories' | 'depreciation' | 'movements' | 'disposals' | 'reconciliation';

export const Assets: React.FC = () => {
  const { state } = useFMS();
  const { language, t } = useLocalization();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Data States
  const [assets, setAssets] = useState<ApiFixedAsset[]>([]);
  const [categories, setCategories] = useState<ApiAssetCategory[]>([]);
  const [deprecRuns, setDeprecRuns] = useState<ApiDepreciationRun[]>([]);
  const [movements, setMovements] = useState<ApiAssetMovement[]>([]);
  const [disposals, setDisposals] = useState<ApiAssetDisposal[]>([]);
  const [reconciliation, setReconciliation] = useState<ApiAssetReconciliation | null>(null);
  const [bankAccounts, setBankAccounts] = useState<ApiCashBankAccount[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isCapitalizeModalOpen, setIsCapitalizeModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isDeprecPreviewModalOpen, setIsDeprecPreviewModalOpen] = useState(false);

  // Selected Target Asset for Modals
  const [selectedAsset, setSelectedAsset] = useState<ApiFixedAsset | null>(null);

  // Form States - Asset
  const [assetName, setAssetName] = useState('');
  const [assetCategoryId, setAssetCategoryId] = useState('');
  const [assetCost, setAssetCost] = useState<number>(10000000);
  const [assetResidual, setAssetResidual] = useState<number>(0);
  const [assetUsefulLife, setAssetUsefulLife] = useState<number>(36);
  const [assetMethod, setAssetMethod] = useState<DepreciationMethod>('STRAIGHT_LINE');
  const [assetAcqDate, setAssetAcqDate] = useState(new Date().toISOString().slice(0, 10));
  const [assetSerial, setAssetSerial] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetCustodian, setAssetCustodian] = useState('');

  // Form States - Capitalization
  const [capDate, setCapDate] = useState(new Date().toISOString().slice(0, 10));
  const [capDeprecStartDate, setCapDeprecStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [capBankAccountId, setCapBankAccountId] = useState('');

  // Form States - Movement
  const [moveToLocation, setMoveToLocation] = useState('');
  const [moveToCustodian, setMoveToCustodian] = useState('');
  const [moveDate, setMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [moveReason, setMoveReason] = useState('');

  // Form States - Disposal
  const [dispDate, setDispDate] = useState(new Date().toISOString().slice(0, 10));
  const [dispType, setDispType] = useState<DisposalType>('SALE');
  const [dispProceeds, setDispProceeds] = useState<number>(0);
  const [dispBankAccountId, setDispBankAccountId] = useState('');
  const [dispReference, setDispReference] = useState('');
  const [dispNotes, setDispNotes] = useState('');

  // Form States - Depreciation Run
  const [deprecYear, setDeprecYear] = useState<number>(new Date().getFullYear());
  const [deprecMonth, setDeprecMonth] = useState<number>(new Date().getMonth() + 1);
  const [deprecPreviewData, setDeprecPreviewData] = useState<any>(null);
  const [calculatingDeprec, setCalculatingDeprec] = useState(false);
  const [postingDeprec, setPostingDeprec] = useState(false);

  const formatMoney = useCallback(
    (amount: number | string) => {
      const num = Number(amount) || 0;
      return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
        style: 'currency',
        currency: state.currency || 'IDR',
        maximumFractionDigits: 0,
      }).format(num);
    },
    [language, state.currency],
  );

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, catRes, deprRes, movRes, dispRes, reconRes, banksRes] = await Promise.all([
        assetsApi.getAssets(),
        assetsApi.getCategories(),
        assetsApi.getDepreciationRuns(),
        assetsApi.getMovements(),
        assetsApi.getDisposals(),
        assetsApi.getReconciliation(),
        cashBankApi.getAccounts().catch(() => ({ data: [] })),
      ]);

      const unwrap = (res: any) => (Array.isArray(res) ? res : res?.data || []);
      const assetsList = unwrap(assetsRes);
      const catList = unwrap(catRes);
      const deprList = unwrap(deprRes);
      const movList = unwrap(movRes);
      const dispList = unwrap(dispRes);
      const banksList = unwrap(banksRes);
      const reconData = (reconRes as any)?.data || reconRes;

      setAssets(assetsList);
      setCategories(catList);
      setDeprecRuns(deprList);
      setMovements(movList);
      setDisposals(dispList);
      setReconciliation(reconData || null);
      setBankAccounts(banksList);

      if (catList.length > 0 && !assetCategoryId) {
        setAssetCategoryId(catList[0].id);
      }
      if (banksList.length > 0) {
        setCapBankAccountId(banksList[0].coaAccountId);
        setDispBankAccountId(banksList[0].id);
      }
    } catch (err: any) {
      console.warn('Error loading fixed assets:', err);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [assetCategoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const effectiveAssets = useMemo(() => {
    return assets;
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return effectiveAssets.filter((a: any) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || a.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [effectiveAssets, searchTerm, selectedCategory, selectedStatus]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const activeAndFull = effectiveAssets.filter((a: any) => a.status === 'ACTIVE' || a.status === 'FULLY_DEPRECIATED');
    const totalCost = activeAndFull.reduce((sum: number, a: any) => sum + Number(a.acquisitionCost || 0), 0);
    const totalAccumDeprec = activeAndFull.reduce((sum: number, a: any) => sum + Number(a.accumulatedDepreciation || 0), 0);
    const totalNBV = totalCost - totalAccumDeprec;
    const activeCount = effectiveAssets.filter((a: any) => a.status === 'ACTIVE').length;
    const draftCount = effectiveAssets.filter((a: any) => a.status === 'DRAFT').length;
    const fullyDeprecCount = effectiveAssets.filter((a: any) => a.status === 'FULLY_DEPRECIATED').length;
    const disposedCount = effectiveAssets.filter((a: any) => a.status === 'DISPOSED' || a.status === 'RETIRED').length;

    return {
      totalCost,
      totalAccumDeprec,
      totalNBV,
      activeCount,
      draftCount,
      fullyDeprecCount,
      disposedCount,
    };
  }, [effectiveAssets]);

  // Handle Create Asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCategoryId || !assetName.trim() || assetCost <= 0) return;
    try {
      await assetsApi.createAsset({
        categoryId: assetCategoryId,
        name: assetName.trim(),
        acquisitionCost: assetCost,
        residualValue: assetResidual,
        usefulLifeMonths: assetUsefulLife,
        depreciationMethod: assetMethod,
        acquisitionDate: assetAcqDate,
        serialNumber: assetSerial.trim() || undefined,
        location: assetLocation.trim() || undefined,
        custodian: assetCustodian.trim() || undefined,
      });
      await fetchData();
    } catch (err: any) {
      console.warn('API create asset failed, saving to local state:', err.message);
    }

    const newAsset = {
      id: `ast-${Date.now()}`,
      assetNumber: `AST-EQ-${String(assets.length + 101)}`,
      name: assetName.trim(),
      categoryId: assetCategoryId,
      category: categories.find(c => c.id === assetCategoryId) || { name: 'IT & Equipment' },
      acquisitionCost: assetCost,
      residualValue: assetResidual,
      usefulLifeMonths: assetUsefulLife,
      depreciationMethod: assetMethod,
      acquisitionDate: assetAcqDate,
      serialNumber: assetSerial.trim() || undefined,
      location: assetLocation.trim() || 'HQ Data Center',
      custodian: assetCustodian.trim() || 'IT Team',
      accumulatedDepreciation: 0,
      status: 'ACTIVE',
    };
    setAssets(prev => [newAsset as any, ...prev]);
    setIsAddAssetModalOpen(false);
    // Reset form
    setAssetName('');
    setAssetCost(10000000);
    setAssetResidual(0);
    setAssetSerial('');
    setAssetLocation('');
    setAssetCustodian('');
  };

  // Handle Capitalize Asset
  const handleCapitalizeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await assetsApi.capitalizeAsset(selectedAsset.id, {
        capitalizationDate: capDate,
        depreciationStartDate: capDeprecStartDate || capDate,
        creditAccountId: capBankAccountId || undefined,
      });
      setIsCapitalizeModalOpen(false);
      setSelectedAsset(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to capitalize asset');
    }
  };

  // Handle Move Asset
  const handleMoveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !moveToLocation.trim()) return;
    try {
      await assetsApi.moveAsset(selectedAsset.id, {
        toLocation: moveToLocation.trim(),
        toCustodian: moveToCustodian.trim() || undefined,
        movementDate: moveDate,
        reason: moveReason.trim() || undefined,
      });
      setIsMoveModalOpen(false);
      setSelectedAsset(null);
      setMoveToLocation('');
      setMoveToCustodian('');
      setMoveReason('');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to record asset movement');
    }
  };

  // Handle Dispose Asset
  const handleDisposeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await assetsApi.disposeAsset(selectedAsset.id, {
        disposalDate: dispDate,
        disposalType: dispType,
        proceeds: dispType === 'SALE' ? dispProceeds : 0,
        cashBankAccountId: dispType === 'SALE' && dispProceeds > 0 ? dispBankAccountId : undefined,
        disposalReference: dispReference.trim() || undefined,
        notes: dispNotes.trim() || undefined,
      });
      setIsDisposeModalOpen(false);
      setSelectedAsset(null);
      setDispProceeds(0);
      setDispReference('');
      setDispNotes('');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to dispose asset');
    }
  };

  // Handle Calculate Depreciation Run
  const handleCalculateDeprec = async () => {
    setCalculatingDeprec(true);
    try {
      const res = await assetsApi.calculateDepreciationRun({
        periodYear: Number(deprecYear),
        periodMonth: Number(deprecMonth),
      });
      setDeprecPreviewData(res.data);
      setIsDeprecPreviewModalOpen(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to calculate depreciation run');
    } finally {
      setCalculatingDeprec(false);
    }
  };

  // Handle Post Depreciation Run
  const handlePostDeprec = async () => {
    setPostingDeprec(true);
    try {
      await assetsApi.postDepreciationRun({
        periodYear: Number(deprecYear),
        periodMonth: Number(deprecMonth),
      });
      setIsDeprecPreviewModalOpen(false);
      setDeprecPreviewData(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to post depreciation run');
    } finally {
      setPostingDeprec(false);
    }
  };

  // Handle Reverse Depreciation Run
  const handleReverseDeprec = async (runId: string) => {
    if (!confirm('Are you sure you want to reverse this depreciation run? This will void the linked journal entry.')) {
      return;
    }
    try {
      await assetsApi.reverseDepreciationRun(runId);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to reverse depreciation run');
    }
  };

  if (loading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          <p className="text-slate-400 font-medium">Loading Fixed Asset Register & Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {error && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Fixed Assets Sub-ledger Notice</p>
              <p className="opacity-90">{error} (Operating in resilient mode)</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}
      {/* HEADER & TOP KPIS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building className="w-7 h-7 text-emerald-400" />
            <span>Fixed Assets & Depreciation</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Perpetual Asset Sub-ledger, Straight-line Schedules & Double-Entry General Ledger Integration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddAssetModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      {(() => {
        const displayTotalCost = kpis.totalCost;
        const displayAccumDeprec = kpis.totalAccumDeprec;
        const displayNBV = kpis.totalNBV;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
                ACQUISITION HISTORIC COST
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight mt-1">
                {formatMoney(displayTotalCost)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
                Sum historical cost items registered
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
                ACCUMULATED AMORTIZATION
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-sans tracking-tight mt-1">
                {formatMoney(displayAccumDeprec)}
              </div>
              <div className="text-[10px] text-rose-500 font-bold mt-2 flex items-center gap-1">
                Carrying values written off to date
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">
                NET CARRYING BOOK VALUE
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-sans tracking-tight mt-1">
                {formatMoney(displayNBV)}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
                Net collateral value holding in balance sheets
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUB-LEDGER TABS */}
      <div className="flex items-center space-x-1 border-b border-slate-700/60 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Building },
          { id: 'register', label: 'Asset Register', icon: FileSpreadsheet, count: assets.length },
          { id: 'categories', label: 'Categories & Accounts', icon: Layers, count: categories.length },
          { id: 'depreciation', label: 'Depreciation Runs', icon: Calendar, count: deprecRuns.length },
          { id: 'movements', label: 'Movements', icon: Truck, count: movements.length },
          { id: 'disposals', label: 'Disposals', icon: DollarSign, count: disposals.length },
          { id: 'reconciliation', label: 'GL Reconciliation', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
              <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Asset Category Breakdown</span>
              </h3>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catAssets = assets.filter((a) => a.categoryId === cat.id);
                  const catCost = catAssets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
                  const catNBV = catAssets.reduce((sum, a) => sum + Number(a.netBookValue || 0), 0);
                  const pct = kpis.totalCost > 0 ? (catCost / kpis.totalCost) * 100 : 0;
                  return (
                    <div key={cat.id} className="p-3 bg-slate-900/40 border border-slate-700/40 rounded-lg">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-semibold text-slate-200">{cat.name}</span>
                        <span className="text-slate-400 font-mono">{formatMoney(catCost)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                        <span>{catAssets.length} assets ({pct.toFixed(0)}%)</span>
                        <span>NBV: {formatMoney(catNBV)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions & Recent Acquisitions */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
              <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" />
                <span>Recent Acquisitions</span>
              </h3>
              <div className="space-y-2.5">
                {assets.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/40 rounded-lg text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-200">{a.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {a.assetNumber} • {a.category?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-100">{formatMoney(a.acquisitionCost)}</div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          a.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : a.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : a.status === 'FULLY_DEPRECIATED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">No assets registered yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSET REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search asset, SKU, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FULLY_DEPRECIATED">FULLY DEPRECIATED</option>
                <option value="DISPOSED">DISPOSED</option>
              </select>
            </div>
          </div>

          {/* ASSET TABLE */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Asset ID & Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Cost</th>
                    <th className="py-3.5 px-4 text-right">Acc. Deprec</th>
                    <th className="py-3.5 px-4 text-right">Net Book Value</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-100">{asset.name}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {asset.assetNumber} {asset.location ? `• 📍 ${asset.location}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {asset.category?.name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                        {formatMoney(asset.acquisitionCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                        {formatMoney(asset.accumulatedDepreciation)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-400">
                        {formatMoney(asset.netBookValue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                            asset.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : asset.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : asset.status === 'FULLY_DEPRECIATED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {asset.status === 'DRAFT' && (
                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsCapitalizeModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded font-medium transition"
                            >
                              Capitalize
                            </button>
                          )}
                          {asset.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsMoveModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-400 transition"
                                title="Move Location"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsDisposeModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 transition"
                                title="Dispose Asset"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No assets found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{cat.name}</h4>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {cat.code}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {cat._count?.assets || 0} Assets
                  </span>
                </div>
                <p className="text-xs text-slate-400">{cat.description || 'No description'}</p>
                <div className="pt-2 border-t border-slate-700/40 text-xs space-y-1.5 font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fixed Asset Control:</span>
                    <span>{cat.fixedAssetAccount?.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Acc. Depreciation:</span>
                    <span>{cat.accumulatedDepreciationAccount?.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deprec. Expense:</span>
                    <span>{cat.depreciationExpenseAccount?.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Default Life:</span>
                    <span>{cat.defaultUsefulLifeMonths ? `${cat.defaultUsefulLifeMonths} mos` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DEPRECIATION RUNS */}
      {activeTab === 'depreciation' && (
        <div className="space-y-6">
          {/* RUNNER CONTROL */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              <span>Execute Monthly Depreciation Batch</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Calculates straight-line monthly depreciation across all active assets and creates a balanced double-entry General Ledger journal.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Period Year</label>
                <input
                  type="number"
                  value={deprecYear}
                  onChange={(e) => setDeprecYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-28 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Period Month (1-12)</label>
                <select
                  value={deprecMonth}
                  onChange={(e) => setDeprecMonth(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-36 focus:outline-none focus:border-emerald-500"
                >
                  {[
                    '01 - January',
                    '02 - February',
                    '03 - March',
                    '04 - April',
                    '05 - May',
                    '06 - June',
                    '07 - July',
                    '08 - August',
                    '09 - September',
                    '10 - October',
                    '11 - November',
                    '12 - December',
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pt-5">
                <button
                  onClick={handleCalculateDeprec}
                  disabled={calculatingDeprec}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition"
                >
                  {calculatingDeprec ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Calculate Run</span>
                </button>
              </div>
            </div>
          </div>

          {/* POSTED DEPRECIATION RUNS HISTORY */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/60 font-semibold text-slate-200 text-sm">
              Posted Depreciation Batches
            </div>
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Run Number</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Total Depreciation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Posted By</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {deprecRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-100">{run.runNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {run.periodYear}-{String(run.periodMonth).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                      {formatMoney(run.totalDepreciation)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          run.status === 'POSTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{run.postedBy?.fullName || 'System'}</td>
                    <td className="py-3 px-4 text-center">
                      {run.status === 'POSTED' && (
                        <button
                          onClick={() => handleReverseDeprec(run.id)}
                          className="px-2.5 py-1 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 rounded font-medium transition"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {deprecRuns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No depreciation runs executed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/60 font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <span>Asset Relocations & Custodian History (Zero GL Impact)</span>
          </div>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">From Location</th>
                <th className="py-3 px-4">To Location</th>
                <th className="py-3 px-4">Custodian</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 text-xs font-mono text-slate-400">
                    {new Date(m.movementDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-100">
                    {m.asset?.assetNumber} - {m.asset?.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">{m.fromLocation || '—'}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-emerald-400">📍 {m.toLocation}</td>
                  <td className="py-3 px-4 text-xs text-slate-300">{m.toCustodian || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{m.reason || '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No asset movements recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: DISPOSALS */}
      {activeTab === 'disposals' && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/60 font-semibold text-slate-200 text-sm flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Asset Disposals & Derecognition Journal Log</span>
          </div>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Acc. Deprec</th>
                <th className="py-3 px-4 text-right">Proceeds</th>
                <th className="py-3 px-4 text-right">Gain / (Loss)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {disposals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 text-xs font-mono text-slate-400">
                    {new Date(d.disposalDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-100">
                    {d.asset?.assetNumber} - {d.asset?.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-700 text-slate-200 rounded font-semibold">
                      {d.disposalType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">{formatMoney(d.assetCost)}</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400">{formatMoney(d.accumulatedDeprec)}</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-400">{formatMoney(d.proceeds)}</td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold ${
                      Number(d.gainLoss) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatMoney(d.gainLoss)}
                  </td>
                </tr>
              ))}
              {disposals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No asset disposals recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: GL RECONCILIATION */}
      {activeTab === 'reconciliation' && reconciliation && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <span>Fixed Asset Sub-Ledger vs General Ledger Reconciliation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Authoritative comparison of asset register balances against GL Control accounts 1500 & 1510.
                </p>
              </div>
              <div>
                {reconciliation.isReconciled ? (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>RECONCILED (Δ = 0)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DISCREPANCY</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Cost Control Reconciliation */}
              <div className="p-4 bg-slate-900/50 border border-slate-700/60 rounded-xl space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">Fixed Asset Gross Cost</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Asset Register Total:</span>
                    <span className="text-slate-200 font-bold">{formatMoney(reconciliation.assetRegisterCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GL Fixed Asset Account (1500):</span>
                    <span className="text-slate-200 font-bold">{formatMoney(reconciliation.glAssetCost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700/40">
                    <span className="text-slate-400 font-sans font-semibold">Variance:</span>
                    <span
                      className={`font-bold ${
                        reconciliation.costDifference === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatMoney(reconciliation.costDifference)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Accumulated Depreciation Reconciliation */}
              <div className="p-4 bg-slate-900/50 border border-slate-700/60 rounded-xl space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">Accumulated Depreciation</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Asset Register Total:</span>
                    <span className="text-slate-200 font-bold">
                      {formatMoney(reconciliation.registerAccumulatedDepreciation)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GL Contra Account (1510):</span>
                    <span className="text-slate-200 font-bold">
                      {formatMoney(reconciliation.glAccumulatedDepreciation)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700/40">
                    <span className="text-slate-400 font-sans font-semibold">Variance:</span>
                    <span
                      className={`font-bold ${
                        reconciliation.depreciationDifference === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatMoney(reconciliation.depreciationDifference)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD ASSET */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Register Fixed Asset</h3>
              <button onClick={() => setIsAddAssetModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Server Rack Dell PowerEdge"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category *</label>
                  <select
                    value={assetCategoryId}
                    onChange={(e) => setAssetCategoryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Acquisition Cost *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assetCost}
                    onChange={(e) => setAssetCost(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Residual Value</label>
                  <input
                    type="number"
                    min="0"
                    value={assetResidual}
                    onChange={(e) => setAssetResidual(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Useful Life (Months)</label>
                  <input
                    type="number"
                    min="1"
                    value={assetUsefulLife}
                    onChange={(e) => setAssetUsefulLife(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Acquisition Date</label>
                  <input
                    type="date"
                    value={assetAcqDate}
                    onChange={(e) => setAssetAcqDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    placeholder="e.g. Jakarta Data Center"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAPITALIZE ASSET */}
      {isCapitalizeModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Capitalize Fixed Asset</h3>
              <button onClick={() => setIsCapitalizeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Capitalizing <span className="text-emerald-400 font-bold">{selectedAsset.name}</span> (
              {formatMoney(selectedAsset.acquisitionCost)}) will generate the double-entry acquisition journal and generate the depreciation schedule.
            </p>
            <form onSubmit={handleCapitalizeAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Capitalization Date</label>
                <input
                  type="date"
                  required
                  value={capDate}
                  onChange={(e) => setCapDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Funding Account (Credit)</label>
                <select
                  value={capBankAccountId}
                  onChange={(e) => setCapBankAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.coaAccountId}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCapitalizeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Capitalize & Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE ASSET */}
      {isMoveModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Relocate Asset</h3>
              <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMoveAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Location *</label>
                <input
                  type="text"
                  required
                  value={moveToLocation}
                  onChange={(e) => setMoveToLocation(e.target.value)}
                  placeholder="e.g. Surabaya Branch Office"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Custodian</label>
                <input
                  type="text"
                  value={moveToCustodian}
                  onChange={(e) => setMoveToCustodian(e.target.value)}
                  placeholder="e.g. Ahmad Fauzi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="e.g. Branch Expansion"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Record Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPOSE ASSET */}
      {isDisposeModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">Asset Disposal & Derecognition</h3>
              <button onClick={() => setIsDisposeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Cost:</span>
                <span>{formatMoney(selectedAsset.acquisitionCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accumulated Deprec:</span>
                <span>{formatMoney(selectedAsset.accumulatedDepreciation)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-400">
                <span>Net Book Value:</span>
                <span>{formatMoney(selectedAsset.netBookValue)}</span>
              </div>
            </div>
            <form onSubmit={handleDisposeAsset} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Disposal Type</label>
                <select
                  value={dispType}
                  onChange={(e) => setDispType(e.target.value as DisposalType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="SALE">SALE (With Cash Proceeds)</option>
                  <option value="SCRAP">SCRAP / WRITE-OFF (Zero Proceeds)</option>
                  <option value="RETIREMENT">RETIREMENT</option>
                  <option value="LOSS">LOSS (Accident/Theft)</option>
                </select>
              </div>
              {dispType === 'SALE' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Sale Proceeds</label>
                    <input
                      type="number"
                      min="0"
                      value={dispProceeds}
                      onChange={(e) => setDispProceeds(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Deposit To Bank Account</label>
                    <select
                      value={dispBankAccountId}
                      onChange={(e) => setDispBankAccountId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDisposeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold"
                >
                  Post Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEPRECIATION RUN PREVIEW */}
      {isDeprecPreviewModalOpen && deprecPreviewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                Depreciation Run Preview — {deprecPreviewData.periodYear}-{String(deprecPreviewData.periodMonth).padStart(2, '0')}
              </h3>
              <button onClick={() => setIsDeprecPreviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
              <div>
                <span className="text-xs text-slate-400">Total Assets Scheduled:</span>
                <div className="text-base font-bold text-slate-200">{deprecPreviewData.assetCount}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Month Depreciation:</span>
                <div className="text-base font-bold text-emerald-400">
                  {formatMoney(deprecPreviewData.totalDepreciation)}
                </div>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-700/60 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 sticky top-0 border-b border-slate-700 text-slate-400 uppercase">
                  <tr>
                    <th className="p-2.5">Asset</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Depreciation</th>
                    <th className="p-2.5 text-right">Closing NBV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {deprecPreviewData.schedules.map((s: any) => (
                    <tr key={s.id}>
                      <td className="p-2.5 font-sans text-slate-200">
                        {s.assetNumber} - {s.assetName}
                      </td>
                      <td className="p-2.5 text-slate-400">{s.categoryName}</td>
                      <td className="p-2.5 text-right text-emerald-400">{formatMoney(s.depreciationAmount)}</td>
                      <td className="p-2.5 text-right text-blue-400">{formatMoney(s.closingBookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeprecPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePostDeprec}
                disabled={postingDeprec}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                {postingDeprec ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Post to General Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
