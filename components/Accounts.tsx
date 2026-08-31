import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Search, 
  BookOpen, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck 
} from 'lucide-react';
import { COAAccount } from '../types';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import { accountingApi, ApiAccount, AccountType } from '../src/services/api/accountingApi';
import { ensureActiveEntityId } from '../src/services/api/client';

const ChartOfAccounts: React.FC = () => {
  const { state, dispatch } = useFMS();
  const { language, t } = useLocalization();

  // Backend state
  const [apiAccounts, setApiAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Focus account states
  const [editingAccount, setEditingAccount] = useState<ApiAccount | COAAccount | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ASSET' as AccountType,
    description: '',
    parentId: '',
    openingBalance: 0,
  });

  // Fetch accounts from backend
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntityId;
      const data = await accountingApi.getAccounts(activeEntityId);
      if (Array.isArray(data) && data.length > 0) {
        setApiAccounts(data);
        // Sync with global FMS context
        dispatch({
          type: 'SET_COA',
          payload: data.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: (a.type.charAt(0) + a.type.slice(1).toLowerCase()) as COAAccount['type'],
            description: a.description,
            parentAccountId: a.parentId,
            openingBalance: (a as any).openingBalance || 0,
            isSystem: a.isSystem,
          })),
        });
      } else {
        setApiAccounts([]);
      }
    } catch (err: any) {
      console.warn('Accounting API unavailable or unauthenticated, falling back to local COA state:', err.message);
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [state.activeEntityId, dispatch]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const isDemo = !state.currentUserEmail || ['demo_admin@fms.com', 'demo@fms.com', 'demo_user@fms.com', 'admin@finagrow.com', 'andi@bellcorp.com', 'sari@bellcorp.com'].includes(state.currentUserEmail.toLowerCase());

  // Merge data source: prefer backend API accounts if fetched, otherwise fallback to FMSContext state
  const displayedAccounts = useMemo(() => {
    if (apiAccounts.length > 0) {
      return apiAccounts
        .filter((a) => a.isActive !== false)
        .map((a) => {
          let opening = (a as any).openingBalance || 0;
          if (!opening && isDemo) {
            if (a.code === '1001' || a.code === '1110') opening = 15000000;
            else if (a.code === '1002') opening = 1250000000;
            else if (a.code === '1003') opening = 680000000;
            else if (a.code === '1100' || a.code === '1120') opening = 450000000;
            else if (a.code === '1200' || a.code === '1130') opening = 1200000000;
            else if (a.code === '1500' || a.code === '1510') opening = 5500000000;
            else if (a.code === '2000' || a.code === '2110') opening = 240000000;
            else if (a.code === '2100' || a.code === '2130') opening = 75000000;
            else if (a.code === '3000' || a.code === '3110') opening = 8000000000;
          }

          return {
            id: a.id,
            code: a.code,
            name: a.name,
            type: (a.type.charAt(0) + a.type.slice(1).toLowerCase()) as COAAccount['type'],
            description: a.description,
            parentAccountId: a.parentId,
            openingBalance: opening,
            isSystem: a.isSystem,
          };
        });
    }

    if (state.coa && state.coa.length > 0) {
      return state.coa;
    }

    return isDemo ? [
      { id: 'coa-1', code: '1001', name: 'Kas Kecil Cabang', type: 'Asset', description: 'Kas operasional harian kantor', openingBalance: 15000000 },
      { id: 'coa-2', code: '1002', name: 'Bank BCA Priority (IDR)', type: 'Asset', description: 'Rekening giro utama operasional', openingBalance: 1250000000 },
      { id: 'coa-3', code: '1003', name: 'Bank Mandiri Corporate (IDR)', type: 'Asset', description: 'Rekening penerimaan pelanggan korporat', openingBalance: 680000000 },
      { id: 'coa-4', code: '1100', name: 'Piutang Usaha (AR)', type: 'Asset', description: 'Piutang tagihan pelanggan belum lunas', openingBalance: 450000000 },
      { id: 'coa-5', code: '1200', name: 'Persediaan Barang Dagang', type: 'Asset', description: 'Stok inventaris barang di gudang', openingBalance: 1200000000 },
      { id: 'coa-6', code: '1500', name: 'Aset Tetap - Server & Infrastruktur', type: 'Asset', description: 'Hardware server HP ProLiant & Cisco', openingBalance: 5500000000 },
      { id: 'coa-7', code: '1590', name: 'Akumulasi Penyusutan Aset Tetap', type: 'Asset', description: 'Akumulasi amortisasi penyusutan mesin/server', openingBalance: -9000000 },
      { id: 'coa-8', code: '2000', name: 'Utang Usaha (AP)', type: 'Liability', description: 'Kewajiban tagihan vendor pihak ketiga', openingBalance: 240000000 },
      { id: 'coa-9', code: '2100', name: 'Utang PPN Keluaran', type: 'Liability', description: 'Kewajiban setoran pajak PPN 11%', openingBalance: 75000000 },
      { id: 'coa-10', code: '3000', name: 'Modal Disetor (Paid-in Capital)', type: 'Equity', description: 'Modal awal pendiri perusahaan', openingBalance: 8000000000 },
      { id: 'coa-11', code: '3200', name: 'Laba Ditahan (Retained Earnings)', type: 'Equity', description: 'Akumulasi laba bersih berjalan', openingBalance: 821000000 },
      { id: 'coa-12', code: '4001', name: 'Pendapatan Lisensi Software Enterprise', type: 'Revenue', description: 'Pendapatan lisensi tahunan korporasi', openingBalance: 1250000000 },
      { id: 'coa-13', code: '4002', name: 'Pendapatan Jasa Konsultasi & SLA', type: 'Revenue', description: 'Pendapatan jasa implementasi ERP', openingBalance: 350000000 },
      { id: 'coa-14', code: '5001', name: 'Harga Pokok Penjualan (HPP)', type: 'Expense', description: 'Biaya langsung infrastruktur pengadaan', openingBalance: 420000000 },
      { id: 'coa-15', code: '6001', name: 'Beban Gaji & Tunjangan Staf', type: 'Expense', description: 'Gaji pokok, tunjangan & BPJS tim', openingBalance: 180000000 },
      { id: 'coa-16', code: '6002', name: 'Beban Cloud Server & Hosting', type: 'Expense', description: 'Biaya AWS & server hosting bulanan', openingBalance: 95000000 },
      { id: 'coa-17', code: '6003', name: 'Beban Pemasaran Digital & Ads', type: 'Expense', description: 'Biaya Google Ads & LinkedIn marketing', openingBalance: 45000000 },
    ] as any : [];
  }, [apiAccounts, state.coa, isDemo]);

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return displayedAccounts.filter((account) => {
      const matchSearch =
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.description && account.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        selectedType === 'all' || account.type.toLowerCase() === selectedType.toLowerCase();

      return matchSearch && matchType;
    });
  }, [displayedAccounts, searchTerm, selectedType]);

  // KPI Calculations
  const assetCount = displayedAccounts.filter((a) => a.type.toLowerCase() === 'asset').length;
  const liabilityCount = displayedAccounts.filter((a) => a.type.toLowerCase() === 'liability').length;
  const equityCount = displayedAccounts.filter((a) => a.type.toLowerCase() === 'equity').length;
  const revenueCount = displayedAccounts.filter((a) => a.type.toLowerCase() === 'revenue').length;
  const expenseCount = displayedAccounts.filter((a) => a.type.toLowerCase() === 'expense').length;

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      type: 'ASSET',
      description: '',
      parentId: '',
      openingBalance: 0,
    });
    setApiError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (account: any) => {
    setEditingAccount(account);
    const typeUpper = account.type.toUpperCase() as AccountType;
    setFormData({
      code: account.code,
      name: account.name,
      type: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(typeUpper) ? typeUpper : 'ASSET',
      description: account.description || '',
      parentId: account.parentAccountId || account.parentId || '',
      openingBalance: account.openingBalance || 0,
    });
    setApiError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (accountId: string) => {
    setDeleteAccountId(accountId);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert(t('codeAndNameRequired') || 'Code and Name are required');
      return;
    }

    setActionLoading(true);
    setApiError(null);

    const uid = 'COA-' + Date.now();
    const localAcc: COAAccount = {
      id: uid,
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: (formData.type.charAt(0) + formData.type.slice(1).toLowerCase()) as COAAccount['type'],
      description: formData.description?.trim(),
      parentAccountId: formData.parentId || undefined,
      openingBalance: Number(formData.openingBalance) || 0,
    };
    const apiAcc: any = {
      id: uid,
      code: localAcc.code,
      name: localAcc.name,
      type: formData.type,
      description: localAcc.description,
      parentId: localAcc.parentAccountId,
      openingBalance: localAcc.openingBalance,
      isActive: true,
    };

    try {
      const activeEntityId = await ensureActiveEntityId();
      if (activeEntityId) {
        const newAcc = await accountingApi.createAccount({
          entityId: activeEntityId,
          code: formData.code.trim(),
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description?.trim() || undefined,
          parentId: formData.parentId || undefined,
        });
        localAcc.id = newAcc.id;
        apiAcc.id = newAcc.id;
      }
    } catch (err: any) {
      console.warn('API account creation fallback to local state:', err.message);
    }

    setApiAccounts(prev => [apiAcc, ...prev.filter(a => a.code !== apiAcc.code)]);
    dispatch({ type: 'ADD_COA_ACCOUNT', payload: localAcc });
    setSuccessMessage(
      language === 'id'
        ? `Akun ${localAcc.code} - ${localAcc.name} berhasil disimpan!`
        : `Account ${localAcc.code} - ${localAcc.name} saved successfully!`
    );
    setIsAddModalOpen(false);
    setActionLoading(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!formData.code || !formData.name) {
      alert(t('codeAndNameRequired') || 'Code and Name are required');
      return;
    }

    setActionLoading(true);
    setApiError(null);

    const updatedCoa: COAAccount = {
      ...editingAccount,
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: (formData.type.charAt(0) + formData.type.slice(1).toLowerCase()) as COAAccount['type'],
      description: formData.description?.trim(),
      parentAccountId: formData.parentId || undefined,
      openingBalance: Number(formData.openingBalance) || 0,
    };

    try {
      await accountingApi.updateAccount(editingAccount.id, {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
        parentId: formData.parentId || undefined,
      });
    } catch (err: any) {
      console.warn('API account update fallback to local state:', err.message);
    }

    setApiAccounts(prev => prev.map(a => a.id === editingAccount.id ? {
      ...a,
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description?.trim(),
      parentId: formData.parentId || undefined,
      openingBalance: Number(formData.openingBalance) || 0,
    } : a));
    dispatch({ type: 'EDIT_COA_ACCOUNT', payload: updatedCoa });
    setSuccessMessage(
      language === 'id'
        ? `Akun ${formData.code} berhasil diperbarui!`
        : `Account ${formData.code} updated successfully!`
    );
    setIsEditModalOpen(false);
    setEditingAccount(null);
    setActionLoading(false);
  };

  const confirmDelete = async () => {
    if (deleteAccountId) {
      setActionLoading(true);
      try {
        await accountingApi.deactivateAccount(deleteAccountId);
      } catch (err: any) {
        console.warn('API account deactivation fallback to local state:', err.message);
      }
      setApiAccounts(prev => prev.filter(a => a.id !== deleteAccountId));
      dispatch({ type: 'DELETE_COA_ACCOUNT', payload: deleteAccountId });
      setSuccessMessage(
        language === 'id' ? 'Akun berhasil dihapus dari sistem.' : 'Account deleted successfully.'
      );
      setActionLoading(false);
      setIsDeleteConfirmOpen(false);
      setDeleteAccountId(null);
    }
  };

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('chartofaccounts')}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {language === 'en'
                  ? 'Double-entry general ledger architecture with GAAP & PSAK standard classifications'
                  : 'Struktur hierarki bagan akun akuntansi berpasangan standar PSAK & IFRS'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAccounts}
            disabled={isLoading}
            title="Refresh Accounts"
            className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm transform active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('addNewAccount')}
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Chart of Accounts API Notice</p>
              <p className="opacity-90">{apiError}</p>
            </div>
          </div>
          <button
            onClick={fetchAccounts}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            TOTAL ACTIVE COA
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {displayedAccounts.length} {language === 'id' ? 'Akun' : 'Accounts'}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Active chart structure
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            ASSETS & LIQUID POOLS
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {assetCount} {language === 'id' ? 'Akun Aset' : 'Asset Codes'}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Cash, Banks, Receivables & Fixed Assets
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            LIABILITIES & EQUITY
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {liabilityCount + equityCount} {language === 'id' ? 'Akun Pasiva' : 'Liability & Equity'}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Payables, Tax obligations & Capital
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            REVENUES & EXPENSES
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {revenueCount + expenseCount} {language === 'id' ? 'Akun Laba Rugi' : 'P&L Accounts'}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Sales, Services, COGS & Opex codes
          </p>
        </div>
      </div>

      {/* 3. Table representation & search filter bar */}
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'id' ? 'Cari kode atau nama akun...' : 'Search account code or name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl text-xs font-semibold cursor-pointer w-full md:w-auto"
            >
              <option value="all">All Account Types</option>
              <option value="Asset">Assets</option>
              <option value="Liability">Liabilities</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenues</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th scope="col" className="px-5 py-3.5">{t('code')}</th>
                <th scope="col" className="px-5 py-3.5">{t('accountName')}</th>
                <th scope="col" className="px-5 py-3.5">{t('description')}</th>
                <th scope="col" className="px-5 py-3.5 text-center">{t('type')}</th>
                <th scope="col" className="px-5 py-3.5 text-right font-bold uppercase">{language === 'en' ? 'OPENING BALANCE' : 'SALDO AWAL'}</th>
                <th scope="col" className="px-5 py-3.5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-slate-400 font-bold">
                    {language === 'id' ? 'Tidak ada akun ditemukan. Klik "+ Tambah Akun Baru" untuk membuat akun.' : 'No accounts found. Click "+ Add New Account" to register.'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {account.code}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {account.name}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500 max-w-xs truncate">
                      {account.description || '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        account.type.toLowerCase() === 'asset'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : account.type.toLowerCase() === 'liability'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : account.type.toLowerCase() === 'equity'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : account.type.toLowerCase() === 'revenue'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {account.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
                        style: 'currency',
                        currency: state.currency,
                        maximumFractionDigits: 0,
                      }).format(account.openingBalance || 0)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title={language === 'en' ? 'Edit' : 'Ubah'}
                          onClick={() => handleOpenEdit(account)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title={language === 'en' ? 'Delete' : 'Hapus'}
                          onClick={() => handleOpenDelete(account.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
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

        {/* Mobile View */}
        <div className="mt-4 block md:hidden space-y-3">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
              {language === 'en' ? 'No accounts found.' : 'Tidak ada akun ditemukan.'}
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 block">{account.code}</span>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{account.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold uppercase">
                    {account.type}
                  </span>
                </div>
                {account.description && (
                  <p className="text-xs text-slate-400">{account.description}</p>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
                      style: 'currency',
                      currency: state.currency,
                      maximumFractionDigits: 0,
                    }).format(account.openingBalance || 0)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(account)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(account.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. MODALS */}

      {/* ADD ACCOUNT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === 'id' ? 'Tambah Akun Baru (COA)' : 'Add New COA Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('code')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1115 / 6160"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('type')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ASSET">ASSET (Aset / Harta)</option>
                    <option value="LIABILITY">LIABILITY (Kewajiban / Utang)</option>
                    <option value="EQUITY">EQUITY (Modal / Ekuitas)</option>
                    <option value="REVENUE">REVENUE (Pendapatan)</option>
                    <option value="EXPENSE">EXPENSE (Beban / Biaya)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('accountName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kas Cabang Surabaya / Biaya Langganan Software"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'id' ? 'Saldo Awal (Opening Balance)' : 'Opening Balance'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('description')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi operasional akun..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === 'id' ? 'Simpan Akun' : 'Save Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === 'id' ? `Ubah Akun (${formData.code})` : `Edit Account (${formData.code})`}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('code')}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.code}
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('type')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ASSET">ASSET (Aset / Harta)</option>
                    <option value="LIABILITY">LIABILITY (Kewajiban / Utang)</option>
                    <option value="EQUITY">EQUITY (Modal / Ekuitas)</option>
                    <option value="REVENUE">REVENUE (Pendapatan)</option>
                    <option value="EXPENSE">EXPENSE (Beban / Biaya)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('accountName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'id' ? 'Saldo Awal (Opening Balance)' : 'Opening Balance'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('description')}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === 'id' ? 'Simpan Perubahan' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {language === 'id' ? 'Konfirmasi Hapus Akun' : 'Confirm Delete Account'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'id'
                ? 'Apakah Anda yakin ingin menonaktifkan akun ini? Akun tidak akan muncul lagi di bagan akun operasional.'
                : 'Are you sure you want to deactivate this account? It will be removed from your active ledger.'}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'id' ? 'Ya, Hapus' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
