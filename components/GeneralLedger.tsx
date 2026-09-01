import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Plus, Trash, X, HelpCircle, RefreshCw, CheckCircle, Ban, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { accountingApi, ApiJournalEntry, ApiAccount, LedgerItem } from '../src/services/api/accountingApi';
import { ensureActiveEntityId } from '../src/services/api/client';

const GeneralLedger: React.FC = () => {
  const { language, t } = useLocalization();
  const { state, dispatch } = useFMS();

  // Backend state
  const [apiEntries, setApiEntries] = useState<ApiJournalEntry[]>([]);
  const [apiAccounts, setApiAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'journal' | 'ledger'>('journal');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dialog overlays state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    drAccountId: '',
    crAccountId: '',
    notes: '',
  });

  // Fetch backend data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = localStorage.getItem('fms_active_entity_id') || state.activeEntityId || undefined;
      const [accountsData, entriesData, ledgerData] = await Promise.allSettled([
        accountingApi.getAccounts(activeEntityId),
        accountingApi.getJournalEntries(activeEntityId ? { entityId: activeEntityId } : undefined),
        accountingApi.getGeneralLedger(activeEntityId ? { entityId: activeEntityId } : undefined),
      ]);

      if (accountsData.status === 'fulfilled' && Array.isArray(accountsData.value)) {
        setApiAccounts(accountsData.value);
      }
      if (entriesData.status === 'fulfilled' && Array.isArray(entriesData.value)) {
        setApiEntries(entriesData.value);
      }
      if (ledgerData.status === 'fulfilled' && ledgerData.value?.entries) {
        setLedgerEntries(ledgerData.value.entries);
      }
      if (entriesData.status === 'rejected') {
        console.warn('General Ledger entries load notice:', entriesData.reason?.message);
      }
    } catch (err: any) {
      console.warn('General Ledger API sync notice:', err.message);
      setApiError(null);
    } finally {
      setIsLoading(false);
    }
  }, [state.activeEntityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    const available = apiAccounts;
    const defaultDr = available.find(a => a.type === 'ASSET' || a.type === 'Asset')?.id || '';
    const defaultCr = available.find(a => a.type === 'REVENUE' || a.type === 'Revenue')?.id || '';

    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      drAccountId: defaultDr,
      crAccountId: defaultCr,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveJE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.drAccountId || !formData.crAccountId) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'Mohon lengkapi semua bidang yang wajib diisi');
      return;
    }

    const val = Number(formData.amount);
    if (isNaN(val) || val <= 0) {
      alert(language === 'en' ? 'Amount must be a positive number' : 'Jumlah harus berupa angka positif');
      return;
    }

    try {
      const activeEntityId = await ensureActiveEntityId();
      await accountingApi.createJournalEntry({
        entityId: activeEntityId,
        entryDate: formData.date,
        description: formData.description,
        reference: formData.reference || undefined,
        status: 'POSTED',
        lines: [
          { accountId: formData.drAccountId, debit: val, credit: 0, description: formData.notes || formData.description },
          { accountId: formData.crAccountId, debit: 0, credit: val, description: formData.notes || formData.description },
        ],
      });
      await fetchData();
    } catch (err: any) {
      console.warn('Backend journal creation fallback to local state:', err.message);
      const drAccount = apiAccounts.find(a => a.id === formData.drAccountId) || state.coa.find(a => a.id === formData.drAccountId);
      const crAccount = apiAccounts.find(a => a.id === formData.crAccountId) || state.coa.find(a => a.id === formData.crAccountId);

      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          description: formData.description,
          amount: val,
          date: formData.date,
          type: 'expense',
          category: 'General Journal',
          status: 'Completed',
          dr: drAccount?.code || '1001',
          cr: crAccount?.code || '4001',
          notes: formData.notes,
          cur: state.currency,
          entity: state.activeEntity,
        },
      });
    }

    setIsAddModalOpen(false);
  };

  const handleVoidClick = (id: string) => {
    setIsVoidConfirmOpen(id);
  };

  const confirmVoid = async () => {
    if (isVoidConfirmOpen) {
      try {
        await accountingApi.voidJournalEntry(isVoidConfirmOpen);
        await fetchData();
      } catch (err: any) {
        console.warn('API void failed, removing from local state:', err.message);
        dispatch({ type: 'DELETE_TRANSACTION', payload: isVoidConfirmOpen });
      }
      setIsVoidConfirmOpen(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

const KNOWN_ACCOUNTS: Record<string, { code: string; name: string }> = {
  '1001': { code: '1001', name: 'Kas Kecil Cabang Jakarta' },
  '1002': { code: '1002', name: 'Bank BCA Priority' },
  '1003': { code: '1003', name: 'Bank Mandiri Corporate' },
  '1100': { code: '1100', name: 'Piutang Usaha Korporat' },
  '1140': { code: '1140', name: 'Persediaan Barang Dagang' },
  '1150': { code: '1150', name: 'PPN Masukan (Input Tax)' },
  '1160': { code: '1160', name: 'Uang Muka Pembelian' },
  '1200': { code: '1200', name: 'Persediaan Finished Goods' },
  '1500': { code: '1500', name: 'Aset Tetap Gedung Merdeka' },
  '1510': { code: '1510', name: 'Akumulasi Penyusutan Gedung & IT' },
  '1520': { code: '1520', name: 'Aset Tetap Kendaraan' },
  '1530': { code: '1530', name: 'Akumulasi Penyusutan Kendaraan' },
  '1590': { code: '1590', name: 'Aset Tetap Tanah' },
  '2000': { code: '2000', name: 'Utang Dagang Supplier' },
  '2100': { code: '2100', name: 'Utang PPN Masukan' },
  '2110': { code: '2110', name: 'Utang PPh 21/23' },
  '2140': { code: '2140', name: 'Penerimaan Barang Belum Ditagih (GRNI)' },
  '2150': { code: '2150', name: 'Pendapatan Diterima Dimuka' },
  '3000': { code: '3000', name: 'Modal Ventura Seri-A' },
  '3200': { code: '3200', name: 'Laba Ditahan Operasional' },
  '4000': { code: '4000', name: 'Pendapatan Kontrak Software' },
  '4100': { code: '4100', name: 'Pendapatan Lisensi API' },
  '4800': { code: '4800', name: 'Pendapatan Bunga Bank' },
  '4900': { code: '4900', name: 'Keuntungan Penyesuaian Persediaan' },
  '5000': { code: '5000', name: 'HPP Layanan Cloud' },
  '5100': { code: '5100', name: 'Beban Gaji Direksi & Staf' },
  '5200': { code: '5200', name: 'Beban Sewa Data Center' },
  '5300': { code: '5300', name: 'Beban Marketing Campaign' },
  '5800': { code: '5800', name: 'Beban Penyesuaian Persediaan' },
  '6000': { code: '6000', name: 'Beban Operasional Umum' },
  '6100': { code: '6100', name: 'Beban Sewa Kantor' },
  '6500': { code: '6500', name: 'Beban Penyusutan Aset' },
  '6800': { code: '6800', name: 'Beban Administrasi Bank' },
};

  const isDemoMode = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo') || activeEmail.includes('admin@finagrow.com') || !activeEmail;
  }, [state.currentUserEmail]);

  // Convert backend apiEntries or local fallback into unified presentation format
  const displayJournalEntries = useMemo(() => {
    if (apiEntries.length > 0) {
      return apiEntries.map(entry => ({
        id: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.entryDate.slice(0, 10),
        description: entry.description,
        status: entry.status,
        lines: entry.lines.map(l => {
          const cleanId = (l.accountId || '').replace(/^AC_/, '');
          const acc = l.account 
            || apiAccounts.find(a => a.id === l.accountId || a.code === cleanId || a.id === cleanId) 
            || state.coa.find(a => a.id === l.accountId || a.code === cleanId || a.id === cleanId);
          const known = KNOWN_ACCOUNTS[acc?.code || ''] || KNOWN_ACCOUNTS[cleanId] || (acc ? { code: acc.code, name: acc.name } : null);
          const code = acc?.code || known?.code || (cleanId.match(/^\d+$/) ? cleanId : '1001');
          const name = acc?.name || known?.name || 'Akun Buku Besar';
          return {
            accountName: `AC_${code} - AC_${code}`,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          };
        }),
      }));
    }

    if (isDemoMode) {
      return [
        {
          id: 'je-1',
          entryNumber: 'JE-0001',
          date: '2026-08-31',
          description: 'Terima Termin 1 PT. Astra International',
          status: 'POSTED',
          lines: [
            { accountName: 'AC_1002 - AC_1002', debit: 350000000, credit: 0 },
            { accountName: 'AC_1100 - AC_1100', debit: 0, credit: 350000000 },
          ],
        },
        {
          id: 'je-2',
          entryNumber: 'JE-0002',
          date: '2026-08-31',
          description: 'Bayar Cloud Server AWS',
          status: 'POSTED',
          lines: [
            { accountName: 'AC_5000 - AC_5000', debit: 95000000, credit: 0 },
            { accountName: 'AC_1002 - AC_1002', debit: 0, credit: 95000000 },
          ],
        },
        {
          id: 'je-3',
          entryNumber: 'JE-0003',
          date: '2026-08-30',
          description: 'Distribusi Payroll Bulanan Direksi',
          status: 'POSTED',
          lines: [
            { accountName: 'AC_5100 - AC_5100', debit: 185000000, credit: 0 },
            { accountName: 'AC_1003 - AC_1003', debit: 0, credit: 185000000 },
          ],
        },
        {
          id: 'je-4',
          entryNumber: 'JE-0004',
          date: '2026-08-28',
          description: 'SaaS Agreement - Singapore Corp',
          status: 'POSTED',
          lines: [
            { accountName: 'AC_1002 - AC_1002', debit: 48000, credit: 0 },
            { accountName: 'AC_4000 - AC_4000', debit: 0, credit: 48000 },
          ],
        },
        {
          id: 'je-5',
          entryNumber: 'JE-0005',
          date: '2026-08-26',
          description: 'Bayar Kampanye Digital agency',
          status: 'POSTED',
          lines: [
            { accountName: 'AC_5300 - AC_5300', debit: 50000000, credit: 0 },
            { accountName: 'AC_1002 - AC_1002', debit: 0, credit: 50000000 },
          ],
        },
      ];
    }

    return [];
  }, [apiEntries, apiAccounts, state.coa, isDemoMode]);

  const availableAccounts = apiAccounts;

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* Error notification banner if API is unreachable */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">General Ledger API Offline / Disconnected</p>
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

      {/* GL Container Board and Header */}
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
                {t('generalJournal')}
              </h3>
              {apiEntries.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  PostgreSQL GL
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Review chronological debit and credit transaction journal double-entries with immutable general ledger'
                : 'Tinjau jurnal entri ganda transaksi debit dan kredit kronologis dengan buku besar permanen'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh Ledger"
              className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition transform active:scale-98 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t('addNewJournalEntry')}
            </button>
          </div>
        </div>

        {/* Chronological Table of Entries */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th scope="col" className="px-5 py-3.5 w-28">{t('date')}</th>
                <th scope="col" className="px-5 py-3.5 w-32">{t('entry')} #</th>
                <th scope="col" className="px-5 py-3.5">{t('description')}</th>
                <th scope="col" className="px-5 py-3.5">{t('account')}</th>
                <th scope="col" className="px-5 py-3.5 text-right w-36">{t('debit')}</th>
                <th scope="col" className="px-5 py-3.5 text-right w-36">{t('credit')}</th>
                <th scope="col" className="px-5 py-3.5 text-center w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayJournalEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    {language === 'en' ? 'No journal entries found. Begin by adding a journal entry.' : 'Tidak ada entri jurnal ditemukan. Mulai dengan membuat entri baru.'}
                  </td>
                </tr>
              ) : (
                displayJournalEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    {/* Header line for each Entry block */}
                    <tr className="bg-slate-50/40 dark:bg-slate-700/10 border-t border-slate-100 dark:border-slate-700/30">
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">{entry.date}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-primary-600 dark:text-primary-400 font-mono flex items-center gap-1.5">
                        {entry.entryNumber}
                        {entry.status === 'VOIDED' && (
                          <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-600 text-[9px] font-extrabold rounded">VOIDED</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-white text-xs" colSpan={4}>
                        {entry.description}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {entry.status !== 'VOIDED' && (
                          <button
                            type="button"
                            title={language === 'en' ? 'Void Entry' : 'Batalkan Jurnal'}
                            onClick={() => handleVoidClick(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Items loops */}
                    {entry.lines.map((line, index) => (
                      <tr
                        key={index}
                        className="bg-transparent hover:bg-slate-50/30 dark:hover:bg-slate-800/20 text-xs"
                      >
                        <td colSpan={3} className="px-5 py-3 border-b border-dashed border-slate-100 dark:border-slate-700/20"></td>
                        <td className={`px-5 py-3 font-semibold text-slate-600 dark:text-slate-300 border-b border-dashed border-slate-100 dark:border-slate-700/20 ${line.credit ? 'pl-8 text-slate-500 dark:text-slate-400' : ''}`}>
                          {line.accountName}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200 border-b border-dashed border-slate-100 dark:border-slate-700/20">
                          {line.debit ? formatCurrency(line.debit) : '-'}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-200 border-b border-dashed border-slate-100 dark:border-slate-700/20">
                          {line.credit ? formatCurrency(line.credit) : '-'}
                        </td>
                        <td className="px-5 py-3 border-b border-dashed border-slate-100 dark:border-slate-700/20"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards stack view */}
        <div className="block md:hidden space-y-4">
          {displayJournalEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
              {language === 'en' ? 'No journal entries found. Begin by adding a journal entry.' : 'Tidak ada entri jurnal ditemukan. Mulai dengan membuat entri baru.'}
            </div>
          ) : (
            displayJournalEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-3"
              >
                <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-slate-400 dark:text-slate-500">{entry.date}</span>
                  <span className="font-mono font-black text-primary-600 dark:text-primary-400">{entry.entryNumber}</span>
                </div>

                <div className="text-sm font-extrabold text-slate-800 dark:text-white px-1">
                  {entry.description}
                </div>

                {/* Ledger Lines */}
                <div className="space-y-2 pt-1">
                  {entry.lines.map((line, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-start text-xs p-2.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60 ${line.credit ? 'border-l-4 border-l-rose-500 pl-4' : 'border-l-4 border-l-emerald-500 pl-4'}`}
                    >
                      <div className="max-w-[65%]">
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{line.credit ? t('credit') : t('debit')}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 leading-relaxed block">{line.accountName}</span>
                      </div>
                      <div className="text-right whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                        {line.debit ? formatCurrency(line.debit) : formatCurrency(line.credit || 0)}
                      </div>
                    </div>
                  ))}
                </div>

                {entry.status !== 'VOIDED' && (
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/55">
                    <button
                      type="button"
                      title={language === 'en' ? 'Void' : 'Batalkan'}
                      onClick={() => handleVoidClick(entry.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Journal Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700/60 transition-all transform scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  {language === 'en' ? 'Add Balanced Journal Entry' : 'Tambah Jurnal Entri Berimbang'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en' ? 'Double-entry posting: Debit must equal Credit' : 'Entri ganda: Debit harus sama dengan Kredit'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJE} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Description / Transaction Memo' : 'Deskripsi Transaksi'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={language === 'en' ? 'e.g., Office Rent Payment' : 'misal, Pembayaran Sewa Kantor'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Amount (Balanced DR = CR)' : 'Nilai Transaksi (DR = CR)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Date' : 'Tanggal'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Debit Account (DR)' : 'Akun Debit (DR)'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.drAccountId}
                    onChange={(e) => setFormData({ ...formData, drAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'en' ? '-- Select Debit --' : '-- Pilih Debit --'}</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Credit Account (CR)' : 'Akun Kredit (CR)'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.crAccountId}
                    onChange={(e) => setFormData({ ...formData, crAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'en' ? '-- Select Credit --' : '-- Pilih Kredit --'}</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Reference / Voucher No.' : 'Nomor Referensi / Voucher'}
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. INV-2026-001, BKM-002"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/40 gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {language === 'en' ? 'Record Entry' : 'Catat Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Confirmation Popup */}
      {isVoidConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700/50 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6 text-rose-600 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Void Journal Entry' : 'Batalkan Jurnal Entri'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'Are you sure you want to void this posted journal entry? In accordance with accounting standards, the entry will be marked VOIDED and preserved in the audit log.'
                  : 'Apakah Anda yakin ingin membatalkan entri jurnal ini? Sesuai standar akuntansi, entri akan ditandai BATAL (VOIDED) dan disimpan dalam log audit.'}
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsVoidConfirmOpen(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmVoid}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                {language === 'en' ? 'Confirm Void' : 'Konfirmasi Batal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralLedger;
