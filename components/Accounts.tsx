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
      if (Array.isArray(data)) {
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
      console.error('Accounting API error:', err.message);
      setApiError(err.message || 'Gagal memuat Chart of Accounts.');
    } finally {
      setIsLoading(false);
    }
  }, [state.activeEntityId, dispatch]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const isDemoUser = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo_user') || (activeEmail.includes('demo') && (state.role === 'User' || state.subscription === 'Free'));
  }, [state.currentUserEmail, state.role, state.subscription]);

  const isDemoMode = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo') || activeEmail.includes('admin@finagrow.com') || !activeEmail;
  }, [state.currentUserEmail]);

  // Data source from PostgreSQL backend records with exact demo fallback matching Screenshot 4
  const displayedAccounts = useMemo(() => {
    if (apiAccounts.length > 0) {
      return apiAccounts
        .filter((a) => a.isActive !== false)
        .map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: (a.type.charAt(0) + a.type.slice(1).toLowerCase()) as COAAccount['type'],
          description: a.description,
          parentAccountId: a.parentId,
          openingBalance: (a as any).openingBalance || 0,
          isSystem: a.isSystem,
        }));
    }

    if (isDemoUser) {
      return [
        { id: 'coa-u1001', code: '1001', name: 'Cash Register Laci Utama', description: 'Uang tunai cash register', type: 'Asset' as COAAccount['type'], openingBalance: 2500000 },
        { id: 'coa-u1002', code: '1002', name: 'Bank Jatim UKM', description: 'Rekening operasional bank lokal', type: 'Asset' as COAAccount['type'], openingBalance: 45000000 },
        { id: 'coa-u1100', code: '1100', name: 'Piutang Langganan Warung', description: 'Piutang retail kecil', type: 'Asset' as COAAccount['type'], openingBalance: 7500000 },
        { id: 'coa-u1200', code: '1200', name: 'Persediaan Sembako & Barang', description: 'Stok dagangan toko', type: 'Asset' as COAAccount['type'], openingBalance: 50000000 },
        { id: 'coa-u2000', code: '2000', name: 'Utang Agen Supplier Sembako', description: 'Utang ke grosiran', type: 'Liability' as COAAccount['type'], openingBalance: 12000000 },
        { id: 'coa-u3000', code: '3000', name: 'Modal Muklas Pribadi', description: 'Modal awal pendiri toko', type: 'Equity' as COAAccount['type'], openingBalance: 93000000 },
        { id: 'coa-u4000', code: '4000', name: 'Pendapatan Retail Harian', description: 'Penjualan retail langsung sembako', type: 'Revenue' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-u5100', code: '5100', name: 'Beban Gaji Karyawan Toko', description: 'Gaji penjaga kasir', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-u5200', code: '5200', name: 'Beban Listrik & Air Ruko', description: 'Biaya utilitas toko bulanan', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
      ];
    }

    if (isDemoMode) {
      return [
        { id: 'coa-1001', code: '1001', name: 'Kas Kecil Cabang Jakarta', description: 'Kas kecil operasional HQ', type: 'Asset' as COAAccount['type'], openingBalance: 15000000 },
        { id: 'coa-1002', code: '1002', name: 'Bank BCA Priority', description: 'Rekening bank utama perusahaan', type: 'Asset' as COAAccount['type'], openingBalance: 1250000000 },
        { id: 'coa-1003', code: '1003', name: 'Bank Mandiri Corporate', description: 'Rekening bank giro', type: 'Asset' as COAAccount['type'], openingBalance: 680000000 },
        { id: 'coa-1100', code: '1100', name: 'Piutang Usaha Korporat', description: 'Piutang retribusi klien', type: 'Asset' as COAAccount['type'], openingBalance: 450000000 },
        { id: 'coa-1200', code: '1200', name: 'Persediaan Finished Goods', description: 'Persediaan barang utama', type: 'Asset' as COAAccount['type'], openingBalance: 1200000000 },
        { id: 'coa-1500', code: '1500', name: 'Aset Tetap Gedung Merdeka', description: 'Gedung penerbitan berwujud', type: 'Asset' as COAAccount['type'], openingBalance: 5500000000 },
        { id: 'coa-2000', code: '2000', name: 'Utang Dagang Supplier', description: 'Utang bahan baku', type: 'Liability' as COAAccount['type'], openingBalance: 240000000 },
        { id: 'coa-2100', code: '2100', name: 'Utang PPN Masukan', description: 'PPN 11%', type: 'Liability' as COAAccount['type'], openingBalance: 75000000 },
        { id: 'coa-3000', code: '3000', name: 'Modal Ventura Seri-A', description: 'Modal disetor investor', type: 'Equity' as COAAccount['type'], openingBalance: 8000000000 },
        { id: 'coa-4000', code: '4000', name: 'Pendapatan Kontrak Software', description: 'Pendapatan subscription enterprise', type: 'Revenue' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-4100', code: '4100', name: 'Pendapatan Lisensi API', description: 'Pendapatan integrasi API', type: 'Revenue' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-5000', code: '5000', name: 'HPP Layanan Cloud', description: 'Biaya server AWS/Google Cloud', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-5100', code: '5100', name: 'Beban Gaji Direksi & Staf', description: 'Beban kompensasi tim', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-5200', code: '5200', name: 'Beban Sewa Data Center', description: 'Sewa fasilitas rack', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
        { id: 'coa-5300', code: '5300', name: 'Beban Marketing Campaign', description: 'Ads & PR outreach', type: 'Expense' as COAAccount['type'], openingBalance: 0 },
      ];
    }

    return [];
  }, [apiAccounts, isDemoUser, isDemoMode]);

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

    try {
      const activeEntityId = await ensureActiveEntityId();
      if (!activeEntityId) {
        throw new Error('No active entity available.');
      }
      const newAcc = await accountingApi.createAccount({
        entityId: activeEntityId,
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
        parentId: formData.parentId || undefined,
      });

      setApiAccounts(prev => [newAcc, ...prev.filter(a => a.code !== newAcc.code)]);
      dispatch({
        type: 'ADD_COA_ACCOUNT',
        payload: {
          id: newAcc.id,
          code: newAcc.code,
          name: newAcc.name,
          type: (newAcc.type.charAt(0) + newAcc.type.slice(1).toLowerCase()) as COAAccount['type'],
          description: newAcc.description,
          parentAccountId: newAcc.parentId,
          openingBalance: 0,
          isSystem: newAcc.isSystem,
        },
      });
      setSuccessMessage(
        language === 'id'
          ? `Akun ${newAcc.code} - ${newAcc.name} berhasil disimpan!`
          : `Account ${newAcc.code} - ${newAcc.name} saved successfully!`
      );
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('API account creation error:', err.message);
      setApiError(err.message || 'Gagal menyimpan akun.');
    } finally {
      setActionLoading(false);
    }
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

    try {
      await accountingApi.updateAccount(editingAccount.id, {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim() || undefined,
        parentId: formData.parentId || undefined,
      });

      setApiAccounts(prev => prev.map(a => a.id === editingAccount.id ? {
        ...a,
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description?.trim(),
        parentId: formData.parentId || undefined,
        openingBalance: Number(formData.openingBalance) || 0,
      } : a));
      dispatch({
        type: 'EDIT_COA_ACCOUNT',
        payload: {
          ...editingAccount,
          code: formData.code.trim(),
          name: formData.name.trim(),
          type: (formData.type.charAt(0) + formData.type.slice(1).toLowerCase()) as COAAccount['type'],
          description: formData.description?.trim(),
          parentAccountId: formData.parentId || undefined,
          openingBalance: Number(formData.openingBalance) || 0,
        },
      });
      setSuccessMessage(
        language === 'id'
          ? `Akun ${formData.code} berhasil diperbarui!`
          : `Account ${formData.code} updated successfully!`
      );
      setIsEditModalOpen(false);
      setEditingAccount(null);
    } catch (err: any) {
      console.error('API account update error:', err.message);
      setApiError(err.message || 'Gagal memperbarui akun.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteAccountId) return;
    setActionLoading(true);
    setApiError(null);
    try {
      await accountingApi.deactivateAccount(deleteAccountId);
      setApiAccounts(prev => prev.filter(a => a.id !== deleteAccountId));
      dispatch({ type: 'DELETE_COA_ACCOUNT', payload: deleteAccountId });
      setSuccessMessage(
        language === 'id' ? 'Akun berhasil dihapus dari sistem.' : 'Account deleted successfully.'
      );
      setIsDeleteConfirmOpen(false);
      setDeleteAccountId(null);
    } catch (err: any) {
      console.error('API account delete error:', err.message);
      setApiError(err.message || 'Gagal menghapus akun.');
    } finally {
      setActionLoading(false);
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
