import React from 'react';
import { ChartPieIcon, HomeIcon, Cog6ToothIcon, UserGroupIcon, UsersIcon, BanknotesIcon, BuildingStorefrontIcon, BriefcaseIcon, BookOpenIcon, TruckIcon, ScaleIcon, DocumentChartBarIcon, ArrowsRightLeftIcon, ReceiptPercentIcon, CubeIcon, ArchiveBoxIcon, RectangleStackIcon, UserCircleIcon } from './icons/IconComponents';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import { useTheme } from '../hooks/useTheme';
import { LogOut, Check, Lock, Zap, Sparkles, X, Star } from 'lucide-react';
import { subscriptionApi } from '../src/services/api/subscriptionApi';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
  isMobileSidebarOpen?: boolean;
  setIsMobileSidebarOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  onLogout,
  isMobileSidebarOpen = false,
  setIsMobileSidebarOpen
}) => {
  const { state, dispatch } = useFMS();
  const { language, t } = useLocalization();
  const { theme } = useTheme();

  const isPro = state.subscription === 'Pro';
  const isDark = theme === 'dark';

  // Sync subscription state on mount
  React.useEffect(() => {
    subscriptionApi.getCurrentSubscription()
      .then((sub) => {
        const isPlanPro = sub.planCode === 'PRO' || sub.planCode === 'ENTERPRISE';
        dispatch({ type: 'SET_SUBSCRIPTION', payload: isPlanPro ? 'Pro' : 'Free' });
      })
      .catch(() => {});
  }, [dispatch]);

  const allNavItems = [
    { name: 'Dashboard', icon: HomeIcon, module: 'dashboard' },
    { name: 'Chart of Accounts', icon: ScaleIcon, module: 'coa' },
    { name: 'General Ledger', icon: BookOpenIcon, module: 'transactions' },
    { name: 'Sales', icon: DocumentChartBarIcon, module: 'invoices' },
    { name: 'Purchases', icon: BuildingStorefrontIcon, module: 'invoices' },
    { name: 'Vendors', icon: TruckIcon, module: 'invoices' },
    { name: 'Cash & Bank', icon: BanknotesIcon, module: 'cashbank' },
    { name: 'Budgeting', icon: ArrowsRightLeftIcon, module: 'budgeting' },
    { name: 'Tax', icon: ReceiptPercentIcon, module: 'tax' },
    { name: 'Assets', icon: ArchiveBoxIcon, module: 'assets' },
    { name: 'Inventory', icon: CubeIcon, module: 'inventory', isProRequired: true },
    { name: 'Projects', icon: BriefcaseIcon, module: 'projects' }, 
    { name: 'Payroll', icon: UsersIcon, module: 'payroll', isProRequired: true },
    { name: 'Reports', icon: ChartPieIcon, module: 'reports' }, 
    { name: 'Entities', icon: RectangleStackIcon, module: 'entities' },
    { name: 'Users', icon: UserGroupIcon, module: 'users' },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.name === 'Users' && (state.role === 'User' || state.role === 'user')) {
      return false;
    }
    return state.modules[item.module] || !item.module;
  });

  const handleTogglePlan = async () => {
    const nextPlan = isPro ? 'Free' : 'Pro';
    const nextPlanCode = isPro ? 'FREE' : 'PRO';
    try {
      await subscriptionApi.changePlan(nextPlanCode);
      dispatch({ type: 'SET_SUBSCRIPTION', payload: nextPlan });
    } catch (e) {
      console.error('Failed to change subscription plan:', e);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity cursor-pointer animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Wrapper Container */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 z-55 flex flex-col h-full shrink-0 select-none transition-transform duration-300 shadow-xl md:shadow-none border-r 
          bg-white dark:bg-slate-900/95 border-slate-100 dark:border-slate-800/60 md:relative md:translate-x-0 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Brand Area */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="FINAGROW"
              className="w-9 h-9 rounded-xl object-contain shadow-md"
            />
            <div>
              <h1 className="text-sm font-extrabold text-slate-850 dark:text-white tracking-wide leading-none uppercase">
                FINAGROW
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase mt-1">
                {isPro ? 'Premium Pro' : 'Free Suite'}
              </p>
            </div>
          </div>
          
          {/* Mobile close button inside header */}
          {setIsMobileSidebarOpen && (
            <button 
              type="button" 
              onClick={() => setIsMobileSidebarOpen(false)} 
              className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div 
          className="flex-1 py-4 overflow-y-auto px-3 space-y-1 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.name;
              const subRequiredAndLocked = item.isProRequired && !isPro;

              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView(item.name);
                      if (setIsMobileSidebarOpen) setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between h-11 px-4 rounded-xl text-left text-xs font-bold tracking-wide transition-all active:scale-98 cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-sm shadow-primary-600/10 font-bold' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      <item.icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{t(item.name.toLowerCase().replace(/ & /g, 'and').replace(/ /g, ''))}</span>
                    </div>

                    {/* Pro key lock indicator badges */}
                    {subRequiredAndLocked && (
                      <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg ml-2 hover:scale-105 transition-transform" title="Pro Feature Locked">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Dynamic Free / Pro Subscription Control Panel */}
        <div className="p-4 flex-shrink-0 border-t border-slate-100 dark:border-slate-800/50 space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-150/80 dark:border-slate-700/50 shadow-sm space-y-3.5">
            {/* Plan badges */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-705/30 pb-2.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">
                {language === 'en' ? 'Active Plane' : 'Status Akun'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isPro 
                  ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-650'
              }`}>
                {isPro ? 'Pro Active' : 'Free Mode'}
              </span>
            </div>

            {/* Quick Toggle switch button */}
            <button
              type="button"
              onClick={handleTogglePlan}
              className={`w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95 shadow-sm cursor-pointer ${
                isPro 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10' 
                  : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:opacity-95 shadow-primary-600/10'
              }`}
            >
              {isPro ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>{language === 'id' ? 'Keluar Mode Pro (Nonaktif)' : 'Deactivate Pro Mode'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-300 animate-bounce" />
                  <span>{language === 'id' ? 'Aktifkan Mode Pro' : 'Activate Pro Mode'}</span>
                </>
              )}
            </button>
          </div>

          {/* Logout controls */}
          {onLogout && (
            <button 
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 py-2.5 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition text-[11px] font-extrabold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'id' ? 'Keluar dari Akun' : 'Logout Account'}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
