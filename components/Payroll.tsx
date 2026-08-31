import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Metric } from '../types';
import { payrollApi, PayrollRun, PayrollMetrics, PayrollEmployee } from '../src/services/api/payrollApi';
import { subscriptionApi } from '../src/services/api/subscriptionApi';
import StatCard from './StatCard';
import { PlusIcon, ClockIcon, CheckCircleIcon, CalendarDaysIcon, XMarkIcon } from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { Lock, Sparkles, Check, Flame, RefreshCw, AlertTriangle, Trash2, Users, CheckCircle2 } from 'lucide-react';

const PayrollStatusBadge: React.FC<{ status: PayrollRun['status'] | string }> = ({ status }) => {
  const { t } = useLocalization();
  const baseClasses = 'px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5';
  let specificClasses = '';
  let Icon = null;

  switch (status) {
    case 'Completed':
      specificClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      Icon = CheckCircleIcon;
      break;
    case 'In Progress':
      specificClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      Icon = ClockIcon;
      break;
    case 'Scheduled':
    default:
      specificClasses = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      Icon = CalendarDaysIcon;
      break;
  }
  const statusKey = String(status || '').toLowerCase().replace(/ /g, '');
  return (
    <span className={`${baseClasses} ${specificClasses}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {t(statusKey) || status}
    </span>
  );
};

const Payroll: React.FC = () => {
  const { language, t } = useLocalization();
  const { state, dispatch } = useFMS();
  const activeEntityId = state.activeEntityId;

  // Data states
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [metrics, setMetrics] = useState<PayrollMetrics>({
    lastPayrollCost: 0,
    employeesPaid: 0,
    avgNetPay: 0,
    ytdPayrollCost: 0,
  });
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isPro, setIsPro] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  // Form states
  const defaultRunDate = new Date().toISOString().split('T')[0];
  const [payPeriod, setPayPeriod] = useState(`${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`);
  const [runDate, setRunDate] = useState(defaultRunDate);
  const [totalGross, setTotalGross] = useState<number>(0);
  const [totalTaxes, setTotalTaxes] = useState<number>(0);
  const [totalNet, setTotalNet] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Employee Form
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empSalary, setEmpSalary] = useState(5000000);
  const [empAllowances, setEmpAllowances] = useState(500000);
  const [empDeductions, setEmpDeductions] = useState(100000);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [runsRes, metricsRes, empRes, subRes] = await Promise.all([
        payrollApi.getPayrollRuns(activeEntityId || undefined),
        payrollApi.getMetrics(activeEntityId || undefined).catch(() => ({
          lastPayrollCost: 0,
          employeesPaid: 0,
          avgNetPay: 0,
          ytdPayrollCost: 0,
        })),
        payrollApi.getEmployees(activeEntityId || undefined).catch(() => []),
        subscriptionApi.getCurrentSubscription().catch(() => null),
      ]);

      setRuns(runsRes);
      setMetrics(metricsRes);
      setEmployees(empRes);
      if (subRes) {
        setIsPro(subRes.planCode === 'PRO' || subRes.planCode === 'ENTERPRISE' || state.subscription === 'Pro');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  }, [activeEntityId, state.subscription]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivatePro = async () => {
    try {
      await subscriptionApi.changePlan('PRO');
      setIsPro(true);
      dispatch({ type: 'SET_SUBSCRIPTION', payload: 'Pro' });
      setSuccessMessage(language === 'id' ? 'Mode Pro berhasil diaktifkan!' : 'Pro Mode activated successfully!');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upgrade to Pro.');
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntityId) {
      alert(language === 'id' ? 'Pilih entitas aktif terlebih dahulu.' : 'Please select an active entity first.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await payrollApi.createPayrollRun({
        entityId: activeEntityId,
        payPeriod,
        runDate,
        totalGross: totalGross > 0 ? totalGross : undefined,
        totalTaxes: totalTaxes > 0 ? totalTaxes : undefined,
        totalNet: totalNet > 0 ? totalNet : undefined,
        notes: notes || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Penggajian berhasil diproses!' : 'Payroll run executed successfully!');
      setIsNewRunModalOpen(false);
      setNotes('');
      setTotalGross(0);
      setTotalTaxes(0);
      setTotalNet(0);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute payroll run.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntityId || !empCode || !empName) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await payrollApi.createEmployee({
        entityId: activeEntityId,
        employeeCode: empCode,
        name: empName,
        position: empPosition || 'Staff',
        baseSalary: empSalary,
        allowances: empAllowances,
        deductions: empDeductions,
      });

      setSuccessMessage(language === 'id' ? 'Karyawan baru berhasil ditambahkan!' : 'Employee created successfully!');
      setIsAddEmployeeModalOpen(false);
      setEmpCode('');
      setEmpName('');
      setEmpPosition('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(language === 'id' ? 'Hapus karyawan ini?' : 'Delete this employee?')) return;
    try {
      await payrollApi.deleteEmployee(id);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete employee.');
    }
  };

  const payrollMetrics: Metric[] = useMemo(() => [
    { title: t('lastPayrollCost'), value: formatCurrency(metrics.lastPayrollCost), change: '+1.2%', changeType: 'increase' },
    { title: t('employeesPaid'), value: String(metrics.employeesPaid), change: `${employees.length} active`, changeType: 'increase' },
    { title: t('avgNetPay'), value: formatCurrency(metrics.avgNetPay), change: 'Per Staff', changeType: 'increase' },
    { title: t('ytdPayrollCost'), value: formatCurrency(metrics.ytdPayrollCost), change: 'YTD Total', changeType: 'increase' },
  ], [metrics, employees.length, language, state.currency, t]);

  return (
    <div className="relative min-h-[calc(100vh-10rem)] space-y-6">
      {/* 1. LOCK SCREEN OVERLAY IF FREE SUBSCRIPTION */}
      {!isPro && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 mb-6">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight max-w-lg leading-snug">
            {language === 'id' ? 'Fitur Penggajian & PPh Karyawan Terkunci' : 'Payroll & Employee Tax Suite is Locked'}
          </h2>
          
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
            {language === 'id' 
              ? 'Lacak gaji kotor, potong pajak PPh 21, BPJS Kesehatan, ketenagakerjaan, serta cetak slip gaji secara massal dan aman otomatis.' 
              : 'Calculate gross employee wages, process PPh 21 tax deductions, social medical BPJS, and bulk generate secure payslips automatically.'}
          </p>

          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 max-w-sm text-left shadow-sm space-y-2.5">
            <div className="font-extrabold text-[11px] text-primary-600 dark:text-primary-400 uppercase tracking-widest flex items-center justify-between">
              <span>{language === 'id' ? 'MANFAAT AKTIF PRO' : 'PRO ACTIVATED BENEFITS'}</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{language === 'id' ? 'Pelaporan PPh 21 & BPJS Otomatis' : 'Auto PPh 21 employee tax calculation'}</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{language === 'id' ? 'Cetak Slip Gaji Masal & Slip PDF' : 'Bulk dynamic secure payslip exports'}</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{language === 'id' ? 'Kelola Database Karyawan & Tunjangan' : 'Employee database & allowance tracking'}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleActivatePro}
            className="mt-8 bg-gradient-to-r from-primary-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-8 rounded-xl shadow-lg shadow-primary-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>{language === 'id' ? 'Aktifkan Mode Pro Sekarang' : 'Activate Pro Mode Now'}</span>
          </button>
        </div>
      )}

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
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 2. PAYROLL DATA UI */}
      <div className={`space-y-6 ${!isPro ? 'opacity-25 pointer-events-none select-none filter blur-xs' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {payrollMetrics.map((metric) => (
            <StatCard key={metric.title} {...metric} />
          ))}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('payrollHistory')}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
              </button>
              <button 
                onClick={() => setIsEmployeeModalOpen(true)}
                className="flex items-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
              >
                <Users className="w-4 h-4 mr-1.5" />
                <span>{language === 'id' ? 'Kelola Karyawan' : 'Employees'} ({employees.length})</span>
              </button>
              <button 
                onClick={() => setIsNewRunModalOpen(true)}
                className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 shadow-md transition"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('runNewPayroll')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('payPeriod')}</th>
                  <th scope="col" className="px-6 py-3">{t('runDate')}</th>
                  <th scope="col" className="px-6 py-3 text-right">{t('grossPay')}</th>
                  <th scope="col" className="px-6 py-3 text-right">{t('taxesAndDeductions')}</th>
                  <th scope="col" className="px-6 py-3 text-right">{t('netPay')}</th>
                  <th scope="col" className="px-6 py-3 text-center">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {run.payPeriod}
                    </td>
                    <td className="px-6 py-4">{new Date(run.runDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(run.totalGross)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-500">
                      {formatCurrency(run.totalTaxes)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(run.totalNet)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PayrollStatusBadge status={run.status} />
                    </td>
                  </tr>
                ))}

                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      <p className="text-sm font-semibold">{language === 'id' ? 'Belum ada riwayat penggajian.' : 'No payroll runs recorded.'}</p>
                      <p className="text-xs mt-1 text-gray-400">{language === 'id' ? 'Klik "Proses Penggajian Baru" untuk memulai perhitungan.' : 'Click "Run New Payroll" to process a period.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Process New Payroll Modal */}
      {isNewRunModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-primary-500" />
                <span>{language === 'id' ? 'Proses Penggajian Baru' : 'Run New Payroll'}</span>
              </h3>
              <button onClick={() => setIsNewRunModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('payPeriod')} *</label>
                <input 
                  type="text" 
                  value={payPeriod} 
                  onChange={e => setPayPeriod(e.target.value)} 
                  placeholder="e.g. August 2026" 
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none font-bold" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('runDate')} *</label>
                <input 
                  type="date" 
                  value={runDate} 
                  onChange={e => setRunDate(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" 
                  required 
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-primary-600 dark:text-primary-400">💡 Auto Calculation Mode:</p>
                <p>Biarkan nilai di bawah 0 jika ingin sistem otomatis menghitung total gaji dari {employees.length} karyawan aktif yang terdaftar.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Override Gaji Kotor</label>
                  <input type="number" value={totalGross} onChange={e => setTotalGross(Number(e.target.value))} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Override Pajak / PPh</label>
                  <input type="number" value={totalTaxes} onChange={e => setTotalTaxes(Number(e.target.value))} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{language === 'id' ? 'Catatan' : 'Notes'}</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan payroll..." className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm outline-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button type="button" onClick={() => setIsNewRunModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 text-xs font-bold hover:bg-primary-700 rounded-xl shadow-md">
                  {language === 'id' ? 'Eksekusi Penggajian' : 'Execute Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Employees Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 text-slate-800 dark:text-white space-y-4 max-h-[85vh] flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                <span>{language === 'id' ? 'Database Karyawan' : 'Employees Database'} ({employees.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 shadow-sm"
                >
                  + {language === 'id' ? 'Tambah Karyawan' : 'Add Employee'}
                </button>
                <button onClick={() => setIsEmployeeModalOpen(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-600">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded font-bold">{emp.employeeCode}</span>
                      <h4 className="text-xs font-bold">{emp.name}</h4>
                      <span className="text-[10px] text-gray-500">({emp.position})</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-300 mt-1">
                      Gaji Pokok: {formatCurrency(emp.baseSalary)} • Tunjangan: {formatCurrency(emp.allowances)}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-gray-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {employees.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  {language === 'id' ? 'Belum ada karyawan terdaftar.' : 'No employees registered.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold">{language === 'id' ? 'Tambah Karyawan Baru' : 'Add New Employee'}</h3>
            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">NIK / Kode Karyawan *</label>
                <input type="text" value={empCode} onChange={e => setEmpCode(e.target.value)} placeholder="EMP001" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nama Lengkap *</label>
                <input type="text" value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Budi Santoso" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Posisi / Jabatan</label>
                <input type="text" value={empPosition} onChange={e => setEmpPosition(e.target.value)} placeholder="Staff Akuntansi" className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Gaji Pokok</label>
                  <input type="number" value={empSalary} onChange={e => setEmpSalary(Number(e.target.value))} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Tunjangan</label>
                  <input type="number" value={empAllowances} onChange={e => setEmpAllowances(Number(e.target.value))} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-xs outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button type="button" onClick={() => setIsAddEmployeeModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Simpan' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;