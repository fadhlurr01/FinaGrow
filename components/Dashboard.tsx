import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Metric, ChartData } from '../types';
import StatCard from './StatCard';
import RevenueChart from './RevenueChart';
import RecentTransactions from './RecentTransactions';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { dashboardApi, DashboardSummary, RevenueExpenseItem, RecentTransactionItem } from '../src/services/api/dashboardApi';
import { ArrowUpRight, TrendingUp, DollarSign, Briefcase, RefreshCw, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { language, t } = useLocalization();
  const { state, dispatch } = useFMS();

  const [periodPreset, setPeriodPreset] = useState<string>('THIS_YEAR');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, chartRes, txRes] = await Promise.all([
        dashboardApi.getSummary({
          entityId: state.activeEntityId || undefined,
          periodPreset,
        }),
        dashboardApi.getRevenueVsExpenses({
          entityId: state.activeEntityId || undefined,
          year: new Date().getFullYear().toString(),
        }),
        dashboardApi.getRecentTransactions({
          entityId: state.activeEntityId || undefined,
        }, 10),
      ]);

      setSummary(sumRes);
      setChartData(
        chartRes.map((c) => ({
          name: c.name,
          revenue: c.revenue,
          expenses: c.expenses,
        }))
      );
      setRecentTransactions(txRes);
    } catch (err: any) {
      console.warn('Dashboard data sync notice:', err.message);
      if (err.status === 403 || err.status === 401 || err.message?.includes('organization')) {
        try {
          localStorage.removeItem('fms_active_organization_id');
          localStorage.removeItem('fms_active_entity_id');
        } catch (_) {}
      }
      // For new accounts or offline states, keep clean 0 metrics without error banner
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [state.activeEntityId, periodPreset, language]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: state.currency || 'IDR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleGoToCOA = () => {
    dispatch({ type: 'SET_VIEW', payload: 'Chart of Accounts' });
  };

  const effectiveChartData = useMemo(() => {
    return chartData;
  }, [chartData]);

  const effectiveWatchlist = useMemo(() => {
    return summary?.accountWatchlist || [];
  }, [summary]);

  const effectiveRecentTransactions = useMemo(() => {
    return recentTransactions;
  }, [recentTransactions]);

  const metrics: Metric[] = useMemo(() => {
    if (summary) {
      return [
        {
          title: t('totalRevenue') || 'Total Revenue',
          value: formatCurrency(summary.totalRevenue),
          change: summary.revenueChangePercent,
          changeType: 'increase',
        },
        {
          title: t('totalExpenses') || 'Total Expenses',
          value: formatCurrency(summary.totalExpenses),
          change: summary.expenseChangePercent,
          changeType: 'increase',
        },
        {
          title: t('netProfit') || 'Net Profit',
          value: formatCurrency(summary.netProfit),
          change: summary.netProfitChangePercent,
          changeType: summary.netProfit >= 0 ? 'increase' : 'decrease',
        },
        {
          title: t('cashBalance') || 'Cash & Bank Balance',
          value: formatCurrency(summary.cashBalance),
          change: summary.cashBalanceChangePercent,
          changeType: 'decrease',
        },
      ];
    }

    return [
      {
        title: t('totalRevenue') || 'Total Revenue',
        value: formatCurrency(0),
        change: '+0.0%',
        changeType: 'increase',
      },
      {
        title: t('totalExpenses') || 'Total Expenses',
        value: formatCurrency(0),
        change: '+0.0%',
        changeType: 'increase',
      },
      {
        title: t('netProfit') || 'Net Profit',
        value: formatCurrency(0),
        change: '+0.0%',
        changeType: 'increase',
      },
      {
        title: t('cashBalance') || 'Cash & Bank Balance',
        value: formatCurrency(0),
        change: '+0.0%',
        changeType: 'increase',
      },
    ];
  }, [summary, state.currency, t, language]);

  return (
    <div className="container mx-auto space-y-6 pb-12">
      {/* Header Greeting & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === 'id' ? 'Dasbor Manajemen Finansial' : 'Financial Management Dashboard'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'id' 
              ? 'Tinjauan metrik keuangan Anda secara real-time dari database PostgreSQL'
              : 'Real-time overview of your company financial metrics powered by PostgreSQL'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Filter Dropdown */}
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-2 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="THIS_MONTH">{language === 'id' ? 'Bulan Ini' : 'This Month'}</option>
            <option value="LAST_MONTH">{language === 'id' ? 'Bulan Lalu' : 'Last Month'}</option>
            <option value="THIS_QUARTER">{language === 'id' ? 'Kuartal Ini' : 'This Quarter'}</option>
            <option value="THIS_YEAR">{language === 'id' ? 'Tahun Ini' : 'This Year'}</option>
            <option value="ALL">{language === 'id' ? 'Semua Periode' : 'All Time'}</option>
          </select>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title={language === 'id' ? 'Segarkan Data' : 'Refresh Data'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition cursor-pointer"
          >
            {language === 'id' ? 'Coba Lagi' : 'Retry'}
          </button>
        </div>
      )}

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Main analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Chart */}
        <div className="lg:col-span-2">
          <RevenueChart data={effectiveChartData} />
        </div>

        {/* Account watchlist panel */}
        <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('accountWatchlist') || 'Account Watchlist'}
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {effectiveWatchlist.length > 0 ? (
                effectiveWatchlist.map((account: any) => {
                  const isNegativeText = account.type === 'LIABILITY' || account.type === 'EXPENSE';
                  return (
                    <li key={account.id} className="flex justify-between items-center py-4">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                          {account.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {account.code} • {account.type}
                        </p>
                      </div>
                      <p className={`font-bold text-sm ${isNegativeText ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(account.currentBalance)}
                      </p>
                    </li>
                  );
                })
              ) : (
                <li className="py-6 text-center text-xs text-slate-400">
                  {language === 'id' ? 'Tidak ada akun dipantau' : 'No monitored accounts'}
                </li>
              )}
            </ul>
          </div>

          <button 
            type="button"
            onClick={handleGoToCOA}
            className="mt-6 w-full flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-98"
          >
            {t('viewAllAccounts') || 'View All Accounts'} 
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Detailed ledger transactions stream */}
      <div>
        <RecentTransactions transactions={effectiveRecentTransactions as any} />
      </div>
    </div>
  );
};

export default Dashboard;
