import React, { useState } from 'react';
import { Transaction } from '../types';
import { Plus, Trash, Edit2, X } from 'lucide-react';
import TransactionDetailModal from './TransactionDetailModal';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const StatusBadge: React.FC<{ status: Transaction['status'] }> = ({ status }) => {
  const { t } = useLocalization();
  const baseClasses = 'px-2.5 py-1 text-xs font-bold rounded-full inline-block';
  let specificClasses = '';

  switch (status) {
    case 'Completed':
      specificClasses = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
      break;
    case 'Pending':
      specificClasses = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
      break;
    case 'Cancelled':
      specificClasses = 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400';
      break;
  }
  return <span className={`${baseClasses} ${specificClasses}`}>{t(status.toLowerCase())}</span>;
};

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const { state, dispatch } = useFMS();
  const { language, t } = useLocalization();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'income' as 'income' | 'expense',
    category: 'Sales',
    status: 'Completed' as Transaction['status'],
    dr: '',
    cr: '',
    notes: '',
  });

  const effectiveList = React.useMemo(() => {
    const list = [...(state.transactions || []), ...(transactions || [])];
    const seen = new Set();
    return list.filter((t) => {
      const key = t.id || `${t.date}-${t.description}-${t.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [state.transactions, transactions]);

  const handleOpenAddModal = () => {
    const defaultDr = state.coa.find(a => a.type === 'Asset')?.code || '1002';
    const defaultCr = state.coa.find(a => a.type === 'Revenue')?.code || '4001';
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: 'Sales',
      status: 'Completed',
      dr: defaultDr,
      cr: defaultCr,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    setEditingTx(tx);
    setFormData({
      description: tx.description,
      amount: String(tx.amount),
      date: tx.date,
      type: tx.type,
      category: tx.category,
      status: tx.status,
      dr: tx.dr || '1002',
      cr: tx.cr || '4001',
      notes: (tx as any).notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.dr || !formData.cr) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'Silakan isi semua bidang yang diperlukan');
      return;
    }

    const payload = {
      description: formData.description,
      amount: Number(formData.amount),
      date: formData.date,
      type: formData.type,
      category: formData.category,
      status: formData.status,
      dr: formData.dr,
      cr: formData.cr,
      notes: formData.notes,
      cur: state.currency,
      entity: state.activeEntity,
    };

    dispatch({ type: 'ADD_TRANSACTION', payload });
    setIsAddModalOpen(false);
  };

  const handleSaveEditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!formData.description || !formData.amount || !formData.dr || !formData.cr) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'Silakan isi semua bidang yang diperlukan');
      return;
    }

    const updated = {
      ...editingTx,
      description: formData.description,
      amount: Number(formData.amount),
      date: formData.date,
      type: formData.type,
      category: formData.category,
      status: formData.status,
      dr: formData.dr,
      cr: formData.cr,
      notes: formData.notes,
    };

    dispatch({ type: 'EDIT_TRANSACTION', payload: updated });
    setIsEditModalOpen(false);
    setEditingTx(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, txId: string) => {
    e.stopPropagation();
    setIsDeleteConfirmOpen(txId);
  };

  const confirmDelete = () => {
    if (isDeleteConfirmOpen) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: isDeleteConfirmOpen });
      setIsDeleteConfirmOpen(null);
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">{t('recentTransactions')}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {language === 'en' ? 'Detailed activities of current transaction ledger records' : 'Aktivitas terperinci dari rekaman buku besar transaksi saat ini'}
            </p>
          </div>
          <button 
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all transform active:scale-98 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('addTransaction')}
          </button>
        </div>

        {/* Desktop Table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th scope="col" className="px-5 py-3.5">{t('description')}</th>
                <th scope="col" className="px-5 py-3.5">{t('date')}</th>
                <th scope="col" className="px-5 py-3.5">{t('category')}</th>
                <th scope="col" className="px-5 py-3.5 text-right">{t('amount')}</th>
                <th scope="col" className="px-5 py-3.5 text-center">{t('status')}</th>
                <th scope="col" className="px-5 py-3.5 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {effectiveList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    {language === 'en' ? 'No transactions found. Click Add Transaction to start.' : 'Tidak ada transaksi ditemukan. Klik Tambah Transaksi untuk memulai.'}
                  </td>
                </tr>
              ) : (
                effectiveList.map((tx) => (
                  <tr 
                    key={tx.id} 
                    className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{tx.date}</td>
                    <td className="px-5 py-4 text-xs">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg text-[11px]">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-right font-bold text-xs ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrencyLocal(tx.amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title={language === 'en' ? 'Edit' : 'Ubah'}
                          onClick={(e) => handleOpenEditModal(e, tx)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title={language === 'en' ? 'Delete' : 'Hapus'}
                          onClick={(e) => handleDeleteClick(e, tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
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
          {effectiveList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
              {language === 'en' ? 'No transactions found. Click Add Transaction to start.' : 'Tidak ada transaksi ditemukan. Klik Tambah Transaksi untuk memulai.'}
            </div>
          ) : (
            effectiveList.map((tx) => (
              <div 
                key={tx.id} 
                onClick={() => setSelectedTransaction(tx)}
                className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-3 hover:bg-slate-100 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[70%]">
                    {tx.description}
                  </div>
                  <div className={`font-black text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrencyLocal(tx.amount)}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  <span>{tx.date}</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px]">
                    {tx.category}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                  <StatusBadge status={tx.status} />
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      title={language === 'en' ? 'Edit' : 'Ubah'}
                      onClick={(e) => handleOpenEditModal(e, tx)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title={language === 'en' ? 'Delete' : 'Hapus'}
                      onClick={(e) => handleDeleteClick(e, tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Transaction Detail View Modal */}
      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
        />
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-lg border border-slate-150 dark:border-slate-700/60 transition-all transform scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Add New Transaction' : 'Tambah Transaksi Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-705 text-slate-400 dark:text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Description' : 'Deskripsi'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                  placeholder={language === 'en' ? 'e.g., Office Supplies Purchase' : 'misal, Pembelian Perlengkapan Kantor'} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Amount' : 'Jumlah'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Type' : 'Tipe'}
                  </label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as 'income' | 'expense'})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="income">{language === 'en' ? 'Income' : 'Pendapatan (Kredit)'}</option>
                    <option value="expense">{language === 'en' ? 'Expense' : 'Beban (Debit)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Category' : 'Kategori'}
                  </label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Sales">{language === 'en' ? 'Sales' : 'Penjualan'}</option>
                    <option value="Operational">{language === 'en' ? 'Operational' : 'Operasional'}</option>
                    <option value="Marketing">{language === 'en' ? 'Marketing' : 'Pemasaran'}</option>
                    <option value="Payroll">{language === 'en' ? 'Payroll' : 'Gaji Karyawan'}</option>
                    <option value="Tax">{language === 'en' ? 'Tax' : 'Pajak'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Debit Account (DR)' : 'Akun Debit (DR)'} <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.dr} 
                    onChange={e => setFormData({...formData, dr: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'en' ? '-- Select Debit Account --' : '-- Pilih Akun Debit --'}</option>
                    {state.coa.map(acc => (
                      <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Credit Account (CR)' : 'Akun Kredit (CR)'} <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formData.cr} 
                    onChange={e => setFormData({...formData, cr: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'en' ? '-- Select Credit Account --' : '-- Pilih Akun Kredit --'}</option>
                    {state.coa.map(acc => (
                      <option key={acc.id} value={acc.code}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Status' : 'Status'}
                  </label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as Transaction['status']})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Completed">{t('completed')}</option>
                    <option value="Pending">{t('pending')}</option>
                    <option value="Cancelled">{t('cancelled')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/40 gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:text-slate-350 dark:hover:text-white transition"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition"
                >
                  {language === 'en' ? 'Add Transaction' : 'Tambah Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-lg border border-slate-150 dark:border-slate-700/60 transition-all transform scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/40">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Edit Transaction Record' : 'Ubah Catatan Transaksi'}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTx(null);
                }} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'en' ? 'Description' : 'Deskripsi'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Amount' : 'Jumlah'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
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
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Type' : 'Tipe'}
                  </label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as 'income' | 'expense'})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="income">{language === 'en' ? 'Income' : 'Pendapatan (Kredit)'}</option>
                    <option value="expense">{language === 'en' ? 'Expense' : 'Beban (Debit)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Category' : 'Kategori'}
                  </label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Sales">{language === 'en' ? 'Sales' : 'Penjualan'}</option>
                    <option value="Operational">{language === 'en' ? 'Operational' : 'Operasional'}</option>
                    <option value="Marketing">{language === 'en' ? 'Marketing' : 'Pemasaran'}</option>
                    <option value="Payroll">{language === 'en' ? 'Payroll' : 'Gaji Karyawan'}</option>
                    <option value="Tax">{language === 'en' ? 'Tax' : 'Pajak'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'en' ? 'Status' : 'Status'}
                  </label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as Transaction['status']})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Completed">{t('completed')}</option>
                    <option value="Pending">{t('pending')}</option>
                    <option value="Cancelled">{t('cancelled')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/40 gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTx(null);
                  }} 
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:text-slate-300 transition"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'en' ? 'Save Changes' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-150 dark:border-slate-700/50 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Trash className="w-5 h-5 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
                {language === 'en' ? 'Confirm Deletion' : 'Konfirmasi Penghapusan'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en' 
                  ? 'Are you absolutely sure you want to delete this transaction ledger record? This action cannot be undone.'
                  : 'Apakah Anda yakin ingin menghapus catatan buku besar transaksi ini? Tindakan ini tidak dapat dibatalkan.'}
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                type="button"
                onClick={() => setIsDeleteConfirmOpen(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 transition"
              >
                {t('cancel')}
              </button>
              <button 
                type="button"
                onClick={confirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition"
              >
                {language === 'en' ? 'Delete' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecentTransactions;
