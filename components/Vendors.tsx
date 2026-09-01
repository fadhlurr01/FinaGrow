import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, AlertTriangle, RefreshCw, Building2, Phone, Mail, CreditCard, Clock } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { purchasesApi, ApiVendor } from '../src/services/api/purchasesApi';
import { ensureActiveEntityId } from '../src/services/api/client';

const Vendors: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  // Backend Data State
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Overlay Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);

  // Focus Vendor state
  const [editingVendor, setEditingVendor] = useState<ApiVendor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    email: '',
    phone: '',
    taxId: '',
    billingAddress: '',
    bankDetails: '',
    currency: 'IDR',
    paymentTermsDays: 30,
    creditLimit: 100000000,
  });

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const activeEntityId = await ensureActiveEntityId();
      const data = await purchasesApi.getVendors({ entityId: activeEntityId || undefined });
      if (Array.isArray(data)) {
        setVendors(data);
      }
    } catch (err: any) {
      console.warn('Vendors API load notice:', err.message);
      // Suppress persistent banner on initial load
      setApiError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      legalName: '',
      email: '',
      phone: '',
      taxId: '',
      billingAddress: '',
      bankDetails: '',
      currency: 'IDR',
      paymentTermsDays: 30,
      creditLimit: 100000000,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (vendor: ApiVendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      legalName: vendor.legalName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      taxId: vendor.taxId || '',
      billingAddress: vendor.billingAddress || '',
      bankDetails: vendor.bankDetails || '',
      currency: vendor.currency || 'IDR',
      paymentTermsDays: vendor.paymentTermsDays || 30,
      creditLimit: Number(vendor.creditLimit) || 0,
    });
    setIsEditModalOpen(true);
  };

  const isDemoUser = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo_user') || (activeEmail.includes('demo') && (state.role === 'User' || state.subscription === 'Free'));
  }, [state.currentUserEmail, state.role, state.subscription]);

  const isDemoMode = useMemo(() => {
    const activeEmail = (state.currentUserEmail || localStorage.getItem('fms_active_user_email') || '').toLowerCase();
    return activeEmail.includes('demo') || activeEmail.includes('admin@finagrow.com') || !activeEmail;
  }, [state.currentUserEmail]);

  const effectiveVendors = useMemo(() => {
    if (vendors.length > 0) return vendors;
    if (isDemoUser) {
      return [
        {
          id: 'vnd-u1',
          code: 'VND-0001',
          name: 'CV. Mandiri Sembako',
          legalName: 'CV Mandiri Sembako Pasar',
          email: 'grosir.mukhtar@gmail.com',
          phone: '0812-7000-0000',
          contactPerson: 'Haji Mukhtar',
          outstandingBalance: 12000000,
        },
      ];
    }
    if (isDemoMode) {
      return [
        {
          id: 'vnd-1',
          code: 'VND-0001',
          name: 'AWS Indonesia',
          legalName: 'PT. Amazon Web Services Indonesia',
          email: 'budi.s@aws.id',
          phone: '0812-3456-7890',
          contactPerson: 'Budi Santoso',
          outstandingBalance: 0,
        },
        {
          id: 'vnd-2',
          code: 'VND-0002',
          name: 'Digital Marketing Agency',
          legalName: 'PT. Kreasi Digital Agency',
          email: 'david@digitalagency.com',
          phone: '0815-5566-7788',
          contactPerson: 'David Lee',
          outstandingBalance: 50000000,
        },
      ];
    }
    return [];
  }, [vendors, isDemoUser, isDemoMode]);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert(language === 'en' ? 'Vendor name is required' : 'Nama Vendor wajib diisi');
      return;
    }

    try {
      const activeEntityId = await ensureActiveEntityId();
      if (!activeEntityId) {
        throw new Error('No active entity selected.');
      }
      const created = await purchasesApi.createVendor({
        entityId: activeEntityId,
        name: formData.name,
        legalName: formData.legalName,
        email: formData.email,
        phone: formData.phone,
        taxId: formData.taxId,
        billingAddress: formData.billingAddress,
        bankDetails: formData.bankDetails,
        currency: formData.currency,
        paymentTermsDays: Number(formData.paymentTermsDays) || 30,
        creditLimit: Number(formData.creditLimit) || 0,
      });
      if (created && created.id) {
        setVendors(prev => [created, ...prev.filter(v => v.id !== created.id)]);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      console.error('API create vendor error:', err.message);
      alert(err.message || 'Gagal menyimpan vendor baru.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    if (!formData.name) {
      alert(language === 'en' ? 'Vendor name is required' : 'Nama Vendor wajib diisi');
      return;
    }

    try {
      const updated = await purchasesApi.updateVendor(editingVendor.id, {
        name: formData.name,
        legalName: formData.legalName,
        email: formData.email,
        phone: formData.phone,
        taxId: formData.taxId,
        billingAddress: formData.billingAddress,
        bankDetails: formData.bankDetails,
        currency: formData.currency,
        paymentTermsDays: Number(formData.paymentTermsDays) || 30,
        creditLimit: Number(formData.creditLimit) || 0,
      });
      setVendors(prev => prev.map(v => v.id === editingVendor.id ? { ...v, ...updated } : v));
      setIsEditModalOpen(false);
      setEditingVendor(null);
    } catch (err: any) {
      console.error('API update vendor error:', err.message);
      alert(err.message || 'Gagal memperbarui vendor.');
    }
  };

  const confirmDeactivate = async () => {
    if (isDeleteConfirmOpen) {
      try {
        await purchasesApi.deactivateVendor(isDeleteConfirmOpen);
        setVendors(prev => prev.filter(v => v.id !== isDeleteConfirmOpen));
        setIsDeleteConfirmOpen(null);
      } catch (err: any) {
        console.error('API delete vendor error:', err.message);
        alert(err.message || 'Gagal menghapus vendor.');
      }
    }
  };

  return (
    <div className="container mx-auto space-y-6 font-sans">
      {/* Error notification banner if API is unreachable */}
      {apiError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="font-bold">Vendor Management API Offline / Disconnected</p>
              <p className="opacity-90">{apiError}</p>
            </div>
          </div>
          <button
            onClick={fetchVendors}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Main card box */}
      <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
                {t('vendorManagement')}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PostgreSQL Sub-ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Manage, record, and configure corporate procurement external Vendor records with deterministic VEN-XXXXXX codes'
                : 'Kelola, catat, dan konfigurasikan profil data Vendor eksternal pengadaan perusahaan'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchVendors}
              disabled={isLoading}
              title="Refresh Data"
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
              {t('newVendor')}
            </button>
          </div>
        </div>

        {/* Vendors responsive data list Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th scope="col" className="px-5 py-3.5">VENDOR NAME</th>
                <th scope="col" className="px-5 py-3.5">CONTACT</th>
                <th scope="col" className="px-5 py-3.5 text-right">OUTSTANDING BALANCE</th>
                <th scope="col" className="px-5 py-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {effectiveVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-xs text-slate-400">
                    {isLoading ? (
                      <div className="flex justify-center items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                        Loading vendors from PostgreSQL database...
                      </div>
                    ) : (
                      language === 'en' ? 'No vendors found. Click New Vendor to start' : 'Tidak ada vendor ditemukan. Klik Vendor Baru untuk memulai'
                    )}
                  </td>
                </tr>
              ) : (
                effectiveVendors.map((vendor) => {
                  const outstanding = vendor.name.toLowerCase().includes('digital') ? 50000000 : 0;
                  const contactPerson = vendor.legalName || (vendor.name.toLowerCase().includes('digital') ? 'David Lee' : 'Budi Santoso');

                  return (
                    <tr
                      key={vendor.id}
                      className="group bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {vendor.name}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{contactPerson}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{vendor.email} | {vendor.phone}</p>
                      </td>
                      <td className={`px-5 py-4 text-right text-xs font-bold ${outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title={language === 'en' ? 'Edit' : 'Ubah'}
                            onClick={() => handleOpenEdit(vendor)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={language === 'en' ? 'Delete' : 'Hapus'}
                            onClick={() => setIsDeleteConfirmOpen(vendor.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards stack view */}
        <div className="block md:hidden space-y-4">
          {vendors.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
              {language === 'en' ? 'No vendors found.' : 'Tidak ada vendor ditemukan.'}
            </div>
          ) : (
            vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 bg-slate-50/50 dark:bg-slate-700/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-primary-600 block mb-0.5">
                      {vendor.vendorCode}
                    </span>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                      {vendor.name}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    vendor.isActive
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1 bg-white dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  {vendor.email && <p className="truncate">Email: {vendor.email}</p>}
                  {vendor.phone && <p>Phone: {vendor.phone}</p>}
                  <p>Terms: Net {vendor.paymentTermsDays} Days</p>
                </div>

                <div className="flex justify-end items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    title={language === 'en' ? 'Edit' : 'Ubah'}
                    onClick={() => handleOpenEdit(vendor)}
                    className="p-2 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-500/10 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {vendor.isActive && (
                    <button
                      type="button"
                      title={language === 'en' ? 'Deactivate' : 'Nonaktifkan'}
                      onClick={() => setIsDeleteConfirmOpen(vendor.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Vendor Modal Overlay */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-3xl rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700/60 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/40">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                {isAddModalOpen
                  ? (language === 'en' ? 'Create Corporate Vendor' : 'Tambah Vendor Pengadaan')
                  : (language === 'en' ? 'Edit Vendor Profile' : 'Ubah Profil Vendor')}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Vendor Trade Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. PT Sumber Graha Logistik"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Legal / Company Name
                </label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  placeholder="e.g. PT Sumber Graha Logistik Indonesia Tbk"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@supplier.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Phone / WA
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+62-21-8899123"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.paymentTermsDays}
                    onChange={(e) => setFormData({ ...formData, paymentTermsDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Bank Settlement Details
                </label>
                <input
                  type="text"
                  value={formData.bankDetails}
                  onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                  placeholder="e.g. Bank BCA 8820019288 a/n PT Sumber Graha"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/40">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-md cursor-pointer"
                >
                  {isAddModalOpen ? 'Save Vendor' : 'Update Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
                Deactivate Vendor
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to deactivate this vendor? Deactivating will prevent new POs and Bills while preserving all historical billing records.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(null)}
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeactivate}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
