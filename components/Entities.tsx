import React, { useState, useEffect, useCallback } from 'react';
import { useFMS } from '../context/FMSContext';
import { entitiesApi, Entity } from '../src/services/api/entitiesApi';
import { PlusIcon, XMarkIcon } from './icons/IconComponents';
import { Pencil, Trash2, AlertTriangle, HelpCircle, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

const Entities: React.FC = () => {
  const { state, dispatch } = useFMS();
  const { language, t } = useLocalization();

  // Data states
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active / focused items
  const [focusedEntity, setFocusedEntity] = useState<Entity | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [currency, setCurrency] = useState<'IDR' | 'USD' | string>('IDR');
  const [country, setCountry] = useState('ID');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await entitiesApi.getEntities();
      setEntities(list);
      // Sync with global FMS context entities list
      dispatch({
        type: 'SET_STATE',
        payload: {
          ...state,
          entities: list.map(e => ({
            id: e.id,
            code: e.code,
            name: e.name,
            currency: (e.baseCurrency as 'IDR' | 'USD') || 'IDR',
          })),
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load entities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit Add Business Division
  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) {
      alert(t('codeAndNameRequired'));
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await entitiesApi.createEntity({
        code,
        name,
        legalName: legalName || name,
        baseCurrency: currency,
        country,
        timezone,
      });

      setSuccessMessage(language === 'id' ? 'Entitas berhasil dibuat!' : 'Entity created successfully!');
      setIsAddModalOpen(false);
      setCode('');
      setName('');
      setLegalName('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create entity.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (it: Entity) => {
    setFocusedEntity(it);
    setCode(it.code);
    setName(it.name);
    setLegalName(it.legalName || it.name);
    setCurrency(it.baseCurrency);
    setCountry(it.country || 'ID');
    setTimezone(it.timezone || 'Asia/Jakarta');
    setIsEditModalOpen(true);
  };

  // Submit Edit Entity Change
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedEntity || !code || !name) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await entitiesApi.updateEntity(focusedEntity.id, {
        code,
        name,
        legalName: legalName || name,
        baseCurrency: currency,
        country,
        timezone,
      });

      setSuccessMessage(language === 'id' ? 'Perubahan entitas disimpan!' : 'Entity updated successfully!');
      setIsEditModalOpen(false);
      setFocusedEntity(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update entity.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Dialog
  const handleOpenDelete = (it: Entity) => {
    if (entities.length <= 1) {
      alert(language === 'id' ? 'Tidak dapat menonaktifkan satu-satunya entitas yang ada.' : 'Cannot deactivate the only existing entity.');
      return;
    }
    setFocusedEntity(it);
    setIsDeleteModalOpen(true);
  };

  // Submit Delete Confirmation
  const handleDeleteSubmit = async () => {
    if (!focusedEntity) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await entitiesApi.deleteEntity(focusedEntity.id);
      setSuccessMessage(language === 'id' ? 'Entitas dinonaktifkan.' : 'Entity deactivated.');
      setIsDeleteModalOpen(false);
      setFocusedEntity(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to deactivate entity.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & TITLE (Matching Screenshot 1) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            BUSINESS ENTITIES
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Add separate subsidiaries, legal ventures, branches, and monitor individual finance logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setCode('');
              setName('');
              setLegalName('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ ADD NEW ENTITY</span>
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

      {/* 2. ENTITIES TABLE (Matching Screenshot 1) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4">CODE</th>
                <th className="px-6 py-4">ENTITY NAME</th>
                <th className="px-6 py-4">BASE CURRENCY</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
              {(() => {
                const list = entities;

                if (list.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-xs text-slate-400 font-bold">
                        {language === 'id' ? 'Belum ada entitas bisnis. Klik "+ ADD NEW ENTITY" untuk mendaftarkan entitas baru.' : 'No business entities found. Click "+ ADD NEW ENTITY" to register.'}
                      </td>
                    </tr>
                  );
                }

                return list.map((entity) => {
                  const isActive = entity.code === 'BC' || entity.id === state.activeEntityId || entity.code === state.activeEntity;
                  return (
                    <tr key={entity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {entity.code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{entity.name}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-wider">
                              CURRENT ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px]">
                          {entity.baseCurrency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(entity as any)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(entity as any)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entity Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold">{t('addEntity')}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{t('entityCode')} *</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. BALI" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold uppercase outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{t('entityName')} *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cabang Bali" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Nama Badan Hukum / Legal</label>
                <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="e.g. PT Finagrow Cabang Bali" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Mata Uang</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none">
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD (Dollar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Zona Waktu</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none">
                    <option value="Asia/Jakarta">WIB (Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Bali/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Jayapura)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Simpan' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entity Modal */}
      {isEditModalOpen && focusedEntity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold">{language === 'id' ? 'Ubah Entitas' : 'Edit Entity'}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{t('entityCode')} *</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold uppercase outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{t('entityName')} *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Nama Badan Hukum / Legal</label>
                <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Mata Uang</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none">
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Zona Waktu</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none">
                    <option value="Asia/Jakarta">WIB</option>
                    <option value="Asia/Makassar">WITA</option>
                    <option value="Asia/Jayapura">WIT</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Simpan Perubahan' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && focusedEntity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">{language === 'id' ? 'Nonaktifkan Entitas' : 'Deactivate Entity'}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'id' 
                ? `Apakah Anda yakin ingin menonaktifkan entitas "${focusedEntity.name}" (${focusedEntity.code})?` 
                : `Are you sure you want to deactivate entity "${focusedEntity.name}"?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
              <button onClick={handleDeleteSubmit} disabled={actionLoading} className="bg-rose-600 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Nonaktifkan' : 'Deactivate'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entities;
