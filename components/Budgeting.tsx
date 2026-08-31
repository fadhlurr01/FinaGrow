import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import { budgetingApi, Budget } from '../src/services/api/budgetingApi';
import { accountingApi, ApiAccount as Account } from '../src/services/api/accountingApi';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  BarChart3, 
  TrendingUp, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';

const Budgeting: React.FC = () => {
  const { state } = useFMS();
  const { language, t } = useLocalization();
  const activeEntityId = state.activeEntityId;

  // Selected period state (e.g. "2024-07", "2026-08")
  const defaultPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);

  // Available periods list
  const periodsAvailable = useMemo(() => {
    const list = new Set<string>();
    list.add(defaultPeriod);
    const now = new Date();
    for (let m = 1; m <= 12; m++) {
      list.add(`${now.getFullYear()}-${String(m).padStart(2, '0')}`);
      list.add(`${now.getFullYear() - 1}-${String(m).padStart(2, '0')}`);
    }
    return Array.from(list).sort().reverse();
  }, [defaultPeriod]);

  // Data states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);

  // Form Fields
  const [accountId, setAccountId] = useState<string>('');
  const [amount, setAmount] = useState<number>(5000000);
  const [period, setPeriod] = useState<string>(selectedPeriod);
  const [notes, setNotes] = useState<string>('');

  const formatMoney = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  };

  // ─── Data Fetching ───────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [budgetsRes, accountsRes] = await Promise.all([
        budgetingApi.getBudgets({
          entityId: activeEntityId || undefined,
          period: selectedPeriod,
        }),
        accountingApi.getAccounts(activeEntityId || undefined).catch(() => []),
      ]);

      setBudgets(budgetsRes);
      setCoaAccounts(accountsRes);
      if (accountsRes.length > 0 && !accountId) {
        const expenseAcc = accountsRes.find(a => a.type === 'EXPENSE');
        setAccountId(expenseAcc?.id || accountsRes[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load budgets from backend.');
    } finally {
      setLoading(false);
    }
  }, [activeEntityId, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Accounts choice list: prefer expense or revenue accounts
  const budgetableCOA = useMemo(() => {
    return coaAccounts.filter(acc => acc.type === 'EXPENSE' || acc.type === 'REVENUE');
  }, [coaAccounts]);

  const effectiveBudgets = useMemo(() => {
    return budgets;
  }, [budgets]);

  // Overall calculations
  const summary = useMemo(() => {
    let totalBudgeted = 0;
    let totalActual = 0;
    let exceededCount = 0;

    effectiveBudgets.forEach(b => {
      const bAmt = Number(b.amount);
      const bSpent = Number(b.actualSpent);
      totalBudgeted += bAmt;
      totalActual += bSpent;
      if (b.utilization > 100) {
        exceededCount++;
      }
    });

    const netRemaining = totalBudgeted - totalActual;
    const overallUtilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalActual,
      netRemaining,
      overallUtilization,
      exceededCount,
    };
  }, [effectiveBudgets]);

  // ─── Actions ─────────────────────────────────────────────────────

  const handleAddBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntityId || !accountId || amount <= 0) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await budgetingApi.createBudget({
        entityId: activeEntityId,
        accountId,
        period,
        amount,
        notes: notes || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Anggaran baru berhasil disimpan!' : 'New budget created successfully!');
      setIsAddModalOpen(false);
      setNotes('');
      setAmount(5000000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create budget.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (b: Budget) => {
    setActiveBudget(b);
    setAccountId(b.accountId);
    setAmount(Number(b.amount));
    setPeriod(b.period);
    setNotes(b.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudget || amount <= 0) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await budgetingApi.updateBudget(activeBudget.id, {
        amount,
        notes: notes || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Anggaran berhasil diperbarui!' : 'Budget updated successfully!');
      setIsEditModalOpen(false);
      setActiveBudget(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update budget.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (b: Budget) => {
    setActiveBudget(b);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBudget = async () => {
    if (!activeBudget) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await budgetingApi.deleteBudget(activeBudget.id);
      setSuccessMessage(language === 'id' ? 'Anggaran berhasil dihapus.' : 'Budget deleted successfully.');
      setIsDeleteModalOpen(false);
      setActiveBudget(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete budget.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            <span>{language === 'id' ? 'Anggaran & Analisis Fiskal' : 'Budgeting & Fiscal Analysis'}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {language === 'id' ? 'Tetapkan pagu pengeluaran, batasi pemborosan, dan pantau realisasi dana real-time dari Buku Besar.' : 'Set control ceilings, limit over-expenditures, and benchmark real-time spending vs. allocations.'}
          </p>
        </div>

        {/* Filter & Add Actions */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
            <Calendar className="w-3.5 h-3.5 text-primary-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer px-1"
            >
              {periodsAvailable.map(p => (
                <option key={p} value={p} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPeriod(selectedPeriod);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{language === 'id' ? 'Bikin Anggaran' : 'Set Budget'}</span>
          </button>
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
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 2. STAT COMPARISONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-2">
            {language === 'id' ? 'PAGU ANGGARAN (ALLOCATED)' : 'TOTAL BUDGET LIMITS'}
          </span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatMoney(summary.totalBudgeted)}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2">
            {language === 'id' ? `Total batas belanja untuk ${selectedPeriod}` : `Cap limit across ${selectedPeriod}`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-2">
            {language === 'id' ? 'REALISASI BELANJA (ACTUAL)' : 'ACTUAL ABSORBED'}
          </span>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatMoney(summary.totalActual)}
          </h3>
          <p className="text-[10px] text-indigo-500 font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
            <span>{summary.overallUtilization.toFixed(1)}% {language === 'id' ? 'anggaran terserap' : 'absorbed'}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-2">
            {language === 'id' ? 'SISA MARGIN (SURPLUS)' : 'SURPLUS COMPLIANCE'}
          </span>
          <h3 className={`text-2xl font-black tracking-tight ${summary.netRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatMoney(summary.netRemaining)}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2">
            {summary.netRemaining >= 0 
              ? (language === 'id' ? 'Pengeluaran di bawah anggaran' : 'Favorable budget balance')
              : (language === 'id' ? 'Melebihi batas aman!' : 'Deficit bounds overspent!')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-2">
            {language === 'id' ? 'ANGGARAN OVERBEATEN' : 'OVERBUDGET ENTRIES'}
          </span>
          <h3 className={`text-2xl font-black tracking-tight ${summary.exceededCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {summary.exceededCount} {language === 'id' ? 'Akun' : 'Accounts'}
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 inline-flex items-center gap-1 font-semibold">
            {summary.exceededCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'id' ? 'Ambil tindakan proteksi' : 'Exceeds spending ceiling'}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'id' ? 'Seluruh anggaran aman' : 'All accounts spend-compliant'}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* 3. DETAILED LIST WITH METRIC PROGRESS BARS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {language === 'id' ? 'Peninjauan Detil Alokasi Kas' : 'Cost Center Budget Allocation Review'}
          </h3>
          <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
            {language === 'id' ? 'Kelola alokasi akun, pantau rincian biaya yang keluar dari jurnal akuntansi secara otomatis.' : 'Reconcile real expenditures compiled instantly from accounts ledgers vs monthly set capacities.'}
          </p>
        </div>

        {/* List Grid */}
        <div className="p-5 space-y-5">
          {effectiveBudgets.map((item: any) => {
            const runRate = Number(item.utilization) || 0;
            let barColor = 'bg-emerald-500 dark:bg-emerald-600';
            let textColor = 'text-emerald-600 dark:text-emerald-400';
            
            if (runRate >= 100) {
              barColor = 'bg-rose-500 dark:bg-rose-600 animate-pulse';
              textColor = 'text-rose-600 dark:text-rose-400';
            } else if (runRate >= 75) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-600 dark:text-amber-400';
            }

            const accCode = item.accountCode || item.account?.code || coaAccounts.find(a => a.id === item.accountId)?.code || '6000';
            const accName = item.accountName || item.account?.name || coaAccounts.find(a => a.id === item.accountId)?.name || 'Cost Account';

            return (
              <div 
                key={item.id}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-1 rounded font-bold">
                      {accCode}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1.5">{accName}</h4>
                  </div>

                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-wrap items-center gap-4 sm:gap-6 text-xs font-bold text-slate-600 dark:text-slate-300 w-full sm:w-auto">
                    <div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider block font-semibold">{language === 'id' ? 'DIPESANKAN' : 'BUDGET'}</span>
                      <span className="text-slate-800 dark:text-white block mt-0.5">{formatMoney(item.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider block font-semibold">{language === 'id' ? 'TERALOKASI' : 'ACTUAL SPENT'}</span>
                      <span className="text-slate-800 dark:text-white block mt-0.5">{formatMoney(item.actualSpent)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-wider block font-semibold">{language === 'id' ? 'SISA MARGIN' : 'REMAINING'}</span>
                      <span className={`block mt-0.5 ${Number(item.remaining) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatMoney(item.remaining)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-0 sm:pl-2 sm:border-l border-slate-100 dark:border-slate-700/50 pt-2 sm:pt-0 col-span-2 xs:col-span-1 justify-end sm:justify-start">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title={language === 'id' ? 'Ubah' : 'Edit'}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        title={language === 'id' ? 'Hapus' : 'Delete'}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-extrabold tracking-tight">
                    <span className="text-slate-400 dark:text-slate-400">Utilization metrics:</span>
                    <span className={textColor}>{runRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(runRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}

          {effectiveBudgets.length === 0 && (
            <div className="py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
              <span className="inline-flex p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-400 rounded-full mb-3">
                <HelpCircle className="w-6 h-6" />
              </span>
              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                {language === 'id' ? 'Pagu Belanja Kosong' : 'No Budgets Programmed'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {language === 'id' 
                  ? 'Anda belum menetapkan batasan kuota fiskal untuk entitas ini pada bulan terpilih.'
                  : 'Establish fiscal benchmarks for expense accounts to keep team tracks compliant.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPeriod(selectedPeriod);
                  setIsAddModalOpen(true);
                }}
                className="mt-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                {language === 'id' ? 'Set Target Baru' : 'Set First Target'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. SET BUDGET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-800 dark:text-white animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span>{language === 'id' ? 'Buat Pembatasan Anggaran' : 'Set New Cap'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBudgetSubmit} className="space-y-4 text-slate-800 dark:text-slate-100">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Akun Belanja / Pendapatan' : 'Account Target'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {budgetableCOA.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Periode Fiskal' : 'Target Month Period'}
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {periodsAvailable.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Pagu Batas Belanja (Rp)' : 'Cap Amount Value'}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Keterangan' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan anggaran..."
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  {language === 'id' ? 'Simpan' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT BUDGET MODAL */}
      {isEditModalOpen && activeBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-800 dark:text-white animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary-500" />
                <span>{language === 'id' ? 'Ubah Pagu Anggaran' : 'Edit Allocation Cap'}</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditBudgetSubmit} className="space-y-4 text-slate-800 dark:text-slate-100">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Akun & Periode' : 'Account & Period'}
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                  [{activeBudget.accountCode}] {activeBudget.accountName} ({activeBudget.period})
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Pagu Batas Belanja (Rp)' : 'Cap Amount Value'}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-slate-400 block mb-1.5">
                  {language === 'id' ? 'Keterangan' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  {language === 'id' ? 'Simpan' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && activeBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-slate-800 dark:text-white animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black uppercase tracking-wider">
                {language === 'id' ? 'Hapus Pagu Anggaran' : 'Delete Budget Cap'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'id' 
                ? `Apakah Anda yakin ingin menghapus anggaran untuk akun [${activeBudget.accountCode}] ${activeBudget.accountName} pada periode ${activeBudget.period}?`
                : `Are you sure you want to permanently remove budget for [${activeBudget.accountCode}] ${activeBudget.accountName}?`}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                {language === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDeleteBudget}
                disabled={actionLoading}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition cursor-pointer"
              >
                {language === 'id' ? 'Hapus' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgeting;
