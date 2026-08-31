import React from 'react';
import { Metric } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';

const StatCard: React.FC<Metric> = ({ title, value, change, changeType }) => {
  const { t } = useLocalization();
  const isIncrease = changeType === 'increase';
  const changeBg = isIncrease 
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
  const ChangeIcon = isIncrease ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className="bg-white dark:bg-slate-800/85 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-700/40 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex justify-between items-start">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h4>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold leading-none ${changeBg}`}>
          <ChangeIcon className="w-3 h-3 mr-1" />
          {change}
        </span>
      </div>
      <div className="mt-4 flex flex-col justify-end">
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">{value}</p>
        <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-1.5 inline-block"></span>
          {t('vsLastMonth')}
        </span>
      </div>
    </div>
  );
};

export default StatCard;