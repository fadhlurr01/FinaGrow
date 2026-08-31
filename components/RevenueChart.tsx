import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartData } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { useTheme } from '../hooks/useTheme';

interface RevenueChartProps {
  data: ChartData[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const { t } = useLocalization();
  const { theme } = useTheme();

  if (!AreaChart) return <div>Loading chart...</div>;

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#e2e8f0' : '#475569';
  const legendColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm h-96">
      <h3 className="text-sm font-black text-slate-850 dark:text-white mb-6 uppercase tracking-wider">{t('revenueVsExpenses')}</h3>
      <ResponsiveContainer key={theme} width="100%" height="86%">
        <AreaChart
          data={data}
          margin={{
            top: 5, right: 10, left: 0, bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            stroke={axisColor} 
            tick={{ fill: axisColor, fontSize: 10, fontWeight: '600' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke={axisColor} 
            tick={{ fill: axisColor, fontSize: 10, fontWeight: '600' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff', 
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '1rem',
              color: isDark ? '#f8fafc' : '#0f172a',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
              fontSize: '11px',
              fontFamily: 'sans-serif'
            }}
            labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px', color: legendColor, paddingTop: '10px' }} 
            formatter={(value) => <span className="text-slate-700 dark:text-slate-200 font-semibold">{value === 'revenue' ? t('revenue') || 'Revenue' : t('expenses') || 'Expenses'}</span>} 
          />
          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
          <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
