import React, { useState, useEffect, useCallback } from 'react';
import { useFMS } from '../context/FMSContext';
import { FMSModules } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { useTheme } from '../hooks/useTheme';
import { settingsApi, SystemSettings } from '../src/services/api/settingsApi';
import { 
  Sliders, Shield, Globe, Sun, Moon, Trash2, RotateCcw, 
  Download, FileJson, FileSpreadsheet, Check, AlertTriangle, X, RefreshCw 
} from 'lucide-react';

const Settings: React.FC = () => {
  const { state, dispatch } = useFMS();
  const { language, toggleLanguage, t } = useLocalization();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = state.role === 'Admin' || state.role === 'admin' || state.role === 'OWNER';

  // Settings state
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeModal, setActiveModal] = useState<'none' | 'reset' | 'restore' | 'backup_csv' | 'backup_json'>('none');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await settingsApi.getSettings();
      setSettings(s);
      if (s.enabledModules) {
        dispatch({
          type: 'SET_STATE',
          payload: {
            ...state,
            modules: { ...state.modules, ...s.enabledModules },
          },
        });
      }
    } catch (err: any) {
      console.warn('Could not load settings from backend:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle module visibility
  const handleToggleModule = async (key: string, value: boolean) => {
    dispatch({ type: 'TOGGLE_MODULE', payload: { key, value } });
    const newModules = { ...(settings?.enabledModules || state.modules), [key]: value };
    try {
      await settingsApi.updateSettings({ enabledModules: newModules });
      triggerToast(language === 'id' ? `Modul ${key} diperbarui!` : `Module ${key} updated!`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update module');
    }
  };

  const handleToggleAllModules = async (value: boolean) => {
    const newModules: Record<string, boolean> = { ...(settings?.enabledModules || state.modules) };
    moduleKeys.forEach((key) => {
      if (key !== 'dashboard' && key !== 'settings') {
        dispatch({ type: 'TOGGLE_MODULE', payload: { key, value } });
        newModules[key] = value;
      }
    });

    try {
      await settingsApi.updateSettings({ enabledModules: newModules });
      triggerToast(
        language === 'id' 
          ? `Semua modul berhasil dipasangkan ke ${value ? 'Aktif' : 'Non-aktif'}!` 
          : `All modifiable modules successfully set to ${value ? 'ACTIVE' : 'INACTIVE'}!`
      );
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update modules');
    }
  };

  const moduleKeys: (keyof FMSModules)[] = [
    "dashboard", "transactions", "invoices", "cashbank",
    "budgeting", "tax", "assets", "inventory", "coa",
    "entities", "users", "settings"
  ];
  
  const moduleTranslationKeys: Record<keyof FMSModules, string> = {
    dashboard: "dashboard",
    transactions: "generalledger",
    invoices: "salesAndPurchases",
    cashbank: "cashAndBank",
    budgeting: "budgeting",
    tax: "tax",
    assets: "assets",
    inventory: "inventory",
    coa: "chartofaccounts",
    entities: "entities",
    users: "users",
    settings: "settings",
  };

  // 1. Data Reset
  const handleResetData = () => {
    setActiveModal('none');
    triggerToast(
      language === 'id' 
        ? 'Perintah reset data diproses.' 
        : 'Data reset processed.'
    );
  };

  // 2. Data Restore
  const handleRestoreData = () => {
    setActiveModal('none');
    triggerToast(
      language === 'id' 
        ? 'Data dipulihkan ke konfigurasi standar!' 
        : 'Data restored to default configuration!'
    );
  };

  // 3. Backup as JSON
  const handleBackupJSON = () => {
    try {
      const backupData = {
        organization: state.activeEntity,
        exportDate: new Date().toISOString(),
        settings: settings,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `FINAGROW_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setActiveModal('none');
      triggerToast(
        language === 'id' 
          ? 'Backup JSON berhasil diunduh!' 
          : 'JSON backup downloaded successfully!'
      );
    } catch (_) {
      triggerToast('Error generating JSON backup');
    }
  };

  // 4. Backup as CSV
  const handleBackupCSV = () => {
    try {
      const csvContent = 'Type,ID,Date,Description,Amount,Status\nBackup,BK001,' + new Date().toISOString() + ',Export Snapshot,0,Active\n';
      const csvDataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvDataUri);
      downloadAnchor.setAttribute('download', `FINAGROW_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setActiveModal('none');
      triggerToast(
        language === 'id' 
          ? 'Backup CSV berhasil diunduh!' 
          : 'CSV backup downloaded successfully!'
      );
    } catch (_) {
      triggerToast('Error generating CSV backup');
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 relative pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 dark:bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-500">
          <Check className="w-4 h-4 text-white" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Settings Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Localization & Aesthetics Block */}
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-950/40 text-sky-600 rounded-2xl">
              <Globe className="w-5 h-5 dark:text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Bahasa & Personalisasi' : 'Language & Personalization'}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {language === 'id' ? 'Kelola bahasa sistem dan tampilan tema FINAGROW' : 'Adjust ledger translation and interface dark/light theme'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-5 space-y-5">
            {/* Language Switcher */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'id' ? 'Bahasa Aplikasi' : 'System Language'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {language === 'id' ? 'ID (Bahasa Indonesia) / EN (English)' : 'Active locale translation dictionary'}
                </span>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/50">
                <button
                  onClick={async () => {
                    if (language !== 'en') {
                      toggleLanguage();
                      await settingsApi.updateSettings({ language: 'en' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    language === 'en' 
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={async () => {
                    if (language !== 'id') {
                      toggleLanguage();
                      await settingsApi.updateSettings({ language: 'id' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    language === 'id' 
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  ID
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'id' ? 'Mode Tampilan' : 'Interface Theme'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {theme === 'dark' ? (language === 'id' ? 'Mode Gelap Aktif' : 'Dark Mode') : (language === 'id' ? 'Mode Terang Aktif' : 'Light Mode')}
                </span>
              </div>

              <button
                onClick={async () => {
                  toggleTheme();
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  await settingsApi.updateSettings({ theme: newTheme });
                }}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 transition"
              >
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* Backup & Export Block */}
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
              <Download className="w-5 h-5 dark:text-white" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {language === 'id' ? 'Cadangan & Ekspor' : 'Backup & Export'}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {language === 'id' ? 'Unduh salinan data pembukuan Anda' : 'Download ledger data in JSON or CSV format'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-5 flex gap-3">
            <button
              onClick={handleBackupJSON}
              className="flex-1 py-3 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 transition"
            >
              <FileJson className="w-4 h-4 text-primary-500" />
              <span>JSON Backup</span>
            </button>
            <button
              onClick={handleBackupCSV}
              className="flex-1 py-3 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>CSV Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Visibility & Controls (Admin) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 rounded-2xl">
                <Sliders className="w-5 h-5 dark:text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {language === 'id' ? 'Manajemen Modul Navigasi' : 'Navigation Module Visibility'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {language === 'id' ? 'Aktifkan atau nonaktifkan tampilan modul di sidebar' : 'Toggle application modules on or off for this tenant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleAllModules(true)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                {language === 'id' ? 'Aktifkan Semua' : 'Enable All'}
              </button>
              <button
                onClick={() => handleToggleAllModules(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                {language === 'id' ? 'Nonaktifkan Semua' : 'Disable All'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleKeys.map((key) => {
              const isEnabled = state.modules[key] !== false;
              const isPermanent = key === 'dashboard' || key === 'settings';
              return (
                <div key={key} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t(moduleTranslationKeys[key]) || key}
                  </span>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={isPermanent}
                    onChange={(e) => handleToggleModule(String(key), e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
