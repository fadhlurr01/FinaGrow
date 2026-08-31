import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Reports from './components/Reports';
import GeneralLedger from './components/GeneralLedger';
import Projects from './components/Projects';
import Vendors from './components/Vendors';
import Payroll from './components/Payroll';
import Entities from './components/Entities';
import Tax from './components/Tax';
import Settings from './components/Settings';
import Inventory from './components/Inventory';
import CashBank from './components/CashBank';
import Budgeting from './components/Budgeting';
import Assets from './components/Assets';
import Users from './components/Users';
import Profile from './components/Profile';
import AIChatBot from './components/AIChatBot';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Subscription from './components/Subscription';
import { 
  BotIcon, HomeIcon, ScaleIcon, DocumentChartBarIcon, BuildingStorefrontIcon,
  BookOpenIcon, TruckIcon, BanknotesIcon, ArrowsRightLeftIcon, ReceiptPercentIcon,
  ArchiveBoxIcon, CubeIcon, BriefcaseIcon, UsersIcon, ChartPieIcon,
  RectangleStackIcon, UserGroupIcon, Cog6ToothIcon, UserCircleIcon
} from './components/icons/IconComponents';
import { Lock, LogOut, MoreHorizontal, X } from 'lucide-react';
import { FMSProvider, useFMS } from './context/FMSContext';
import { LanguageProvider } from './context/LanguageContext';
import { useLocalization } from './hooks/useLocalization';
import { authApi } from './src/services/api/authApi';

import { subscriptionApi } from './src/services/api/subscriptionApi';
import { clearApiCache } from './src/services/api/client';

export const ThemeContext = React.createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export type AuthStatus = 'CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
export const AuthContext = React.createContext<{
  authStatus: AuthStatus;
  setAuthStatus: (status: AuthStatus) => void;
  refreshAuth: () => Promise<void>;
}>({
  authStatus: 'CHECKING',
  setAuthStatus: () => {},
  refreshAuth: async () => {},
});
export const useAuth = () => useContext(AuthContext);

const LayoutContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useFMS();
  const { authStatus, setAuthStatus } = useAuth();
  const { language, t } = useLocalization();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    clearApiCache();
    dispatch({ type: 'LOGOUT_USER' });
    setAuthStatus('UNAUTHENTICATED');
    navigate('/login');
  };

  // Scroll to top on navigation path changes
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Sync active view highlights based on active paths
  const viewMap: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/coa': 'Chart of Accounts',
    '/ledger': 'General Ledger',
    '/sales': 'Sales',
    '/purchases': 'Purchases',
    '/vendors': 'Vendors',
    '/reports': 'Reports',
    '/projects': 'Projects',
    '/payroll': 'Payroll',
    '/inventory': 'Inventory',
    '/entities': 'Entities',
    '/tax': 'Tax',
    '/cash-bank': 'Cash & Bank',
    '/budgeting': 'Budgeting',
    '/assets': 'Assets',
    '/users': 'Users',
    '/profile': 'Profile',
    '/settings': 'Settings'
  };

  const currentView = viewMap[location.pathname] || 'Dashboard';
  const isPro = state.subscription === 'Pro';

  // Check ban state
  const currentUser = state.users?.find((u: any) => u.email === state.currentUserEmail);
  let isBanned = !!(currentUser && (currentUser.status === 'Banned' || currentUser.isBanned));

  try {
    const stored = localStorage.getItem('fms_registered_users');
    if (stored && state.currentUserEmail) {
      const usersList = JSON.parse(stored);
      const matched = usersList.find((u: any) => u.email?.toLowerCase() === state.currentUserEmail?.toLowerCase());
      if (matched && (matched.status === 'Banned' || matched.isBanned)) {
        isBanned = true;
      }
    }
  } catch (e) {
    console.error('Error reading ban status', e);
  }

  // Periodic living dynamic notification generator inside LayoutContainer
  const generateDynamicNotification = useCallback(() => {
    const randomEvents = language === 'id' ? [
      { title: 'Aktivitas Log Baru', message: 'Divisi treasury melakukan rekonsiliasi berkala buku besar kas kecil.', type: 'info' as const },
      { title: 'Sinkronisasi Cloud Berhasil', message: 'Seluruh arsip pembukuan lokal telah di-backup ke Cloud Run Storage.', type: 'success' as const },
      { title: 'Kurs Mata Uang Baru', message: 'Daftar kurs harian IDR ke USD berhasil dikalibrasi secara real-time.', type: 'info' as const },
      { title: 'Anggaran Mendekati Limit', message: 'Biaya promosi digital departemen marketing menyentuh 80% dari plafon budget.', type: 'warning' as const },
      { title: 'Pembayaran Vendor Tercatat', message: 'Faktur operasional dari CV. Agung Abadi disetujui untuk pembayaran.', type: 'info' as const },
      { title: 'Penyusutan Aset Terhitung', message: 'Penyusutan reguler aset tetap bulan ini telah dibukukan otomatis.', type: 'success' as const },
    ] : [
      { title: 'New Activity Logged', message: 'Treasury operators updated the operational petty cash ledger balances.', type: 'info' as const },
      { title: 'Cloud Backup Complete', message: 'Corporate ledger database was safely replicated within Cloud Run nodes.', type: 'success' as const },
      { title: 'FX Exchange Rates Calibrated', message: 'Dynamic standard exchange index values updated for multi-currency transactions.', type: 'info' as const },
      { title: 'Budget Limit approaching', message: 'Departmental spending is nearing the 80% threshold of monthly budgeting structures.', type: 'warning' as const },
      { title: 'Vendor Direct Bill Approved', message: 'A digital invoice from our storage provider has cleared audit checks.', type: 'info' as const },
      { title: 'Depreciation Computed', message: 'Monthly recurring carrying reductions was registered on current assets.', type: 'success' as const },
    ];

    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    const newNotif = {
      id: 'N_GEN_' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      title: event.title,
      message: event.message,
      date: new Date().toISOString().slice(0, 10),
      isRead: false,
      type: event.type
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotif });
  }, [dispatch, language]);

  useEffect(() => {
    if (!state.currentUserEmail) return;

    // Trigger first random living notification in 45 seconds
    const timer = setTimeout(() => {
      generateDynamicNotification();
    }, 45000);

    const interval = setInterval(() => {
      generateDynamicNotification();
    }, 120000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [state.currentUserEmail, generateDynamicNotification]);

  if (isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/50 p-8 rounded-3xl text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            🚫
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-white animate-pulse">
              {language === 'id' ? 'Akses Akun Ditangguhkan' : 'Account Suspended'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'id' 
                ? `Akun Anda (${state.currentUserEmail}) telah ditangguhkan atau di-banned oleh Administrator Utama.` 
                : `Your account (${state.currentUserEmail}) has been suspended or banned by the Primary Administrator.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            {language === 'id' ? 'Keluar Beranda' : 'Exit to Home'}
          </button>
        </div>
      </div>
    );
  }

  const directItems = [
    { name: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
    { name: 'Chart of Accounts', icon: ScaleIcon, path: '/coa' },
    { name: 'Sales', icon: DocumentChartBarIcon, path: '/sales' },
    { name: 'Purchases', icon: BuildingStorefrontIcon, path: '/purchases' },
  ];

  const moreItems = [
    { name: 'General Ledger', icon: BookOpenIcon, path: '/ledger', module: 'transactions' },
    { name: 'Vendors', icon: TruckIcon, path: '/vendors', module: 'invoices' },
    { name: 'Cash & Bank', icon: BanknotesIcon, path: '/cash-bank', module: 'cashbank' },
    { name: 'Budgeting', icon: ArrowsRightLeftIcon, path: '/budgeting', module: 'budgeting' },
    { name: 'Tax', icon: ReceiptPercentIcon, path: '/tax', module: 'tax' },
    { name: 'Assets', icon: ArchiveBoxIcon, path: '/assets', module: 'assets' },
    { name: 'Inventory', icon: CubeIcon, path: '/inventory', module: 'inventory', isProRequired: true },
    { name: 'Projects', icon: BriefcaseIcon, path: '/projects', module: 'projects' }, 
    { name: 'Payroll', icon: UsersIcon, path: '/payroll', module: 'payroll', isProRequired: true },
    { name: 'Reports', icon: ChartPieIcon, path: '/reports', module: 'reports' }, 
    { name: 'Entities', icon: RectangleStackIcon, path: '/entities', module: 'entities' },
    { name: 'Users', icon: UserGroupIcon, path: '/users', module: 'users', isAdminOnly: true },
    { name: 'Profile', icon: UserCircleIcon, path: '/profile' },
    { name: 'Settings', icon: Cog6ToothIcon, path: '/settings' },
  ].filter(item => {
    if (item.isAdminOnly && (state.role === 'User' || state.role === 'user')) {
      return false;
    }
    return !item.module || state.modules[item.module];
  });

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          const pathMap: { [key: string]: string } = {
            'Dashboard': '/dashboard',
            'Chart of Accounts': '/coa',
            'General Ledger': '/ledger',
            'Sales': '/sales',
            'Purchases': '/purchases',
            'Vendors': '/vendors',
            'Reports': '/reports',
            'Projects': '/projects',
            'Payroll': '/payroll',
            'Inventory': '/inventory',
            'Entities': '/entities',
            'Tax': '/tax',
            'Cash & Bank': '/cash-bank',
            'Budgeting': '/budgeting',
            'Assets': '/assets',
            'Users': '/users',
            'Profile': '/profile',
            'Settings': '/settings'
          };
          navigate(pathMap[view] || '/dashboard');
        }} 
        onLogout={handleLogout} 
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          currentView={currentView} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onLogout={handleLogout}
        />
        <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-around items-center z-40 md:hidden shadow-lg px-2 pb-safe">
        {directItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="truncate max-w-[65px]">
                {t(item.name.toLowerCase().replace(/ & /g, 'and').replace(/ /g, ''))}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-black uppercase tracking-wider transition-all active:scale-90 cursor-pointer ${
            isMoreMenuOpen
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>{language === 'en' ? 'More' : 'Lainnya'}</span>
        </button>
      </div>

      {/* Mobile More Menu Bottom Sheet Dropup Overlay */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-45 bg-slate-900/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200 flex flex-col justify-end">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsMoreMenuOpen(false)} />
          
          <div className="relative w-full max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-100 dark:border-slate-800 shadow-2xl p-5 pb-8 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest">
                {language === 'en' ? 'More Menus' : 'Menu Lainnya'}
              </h3>
              <button 
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {moreItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isProPlan = state.subscription === 'Pro';
                const subRequiredAndLocked = item.isProRequired && !isProPlan;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (!subRequiredAndLocked) {
                        navigate(item.path);
                        setIsMoreMenuOpen(false);
                      }
                    }}
                    disabled={subRequiredAndLocked}
                    className={`flex flex-col items-center justify-center p-3 bg-slate-50/60 dark:bg-slate-800/40 border rounded-2xl transition hover:bg-slate-100 dark:hover:bg-slate-800/85 cursor-pointer text-center relative ${
                      isActive 
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/10 dark:bg-primary-950/10 font-bold' 
                        : 'border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    } ${subRequiredAndLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <item.icon className={`w-5 h-5 mb-1.5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`} />
                    <span className="text-[9px] font-bold leading-tight line-clamp-1 block">
                      {t(item.name.toLowerCase().replace(/ & /g, 'and').replace(/ /g, ''))}
                    </span>

                    {subRequiredAndLocked && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded p-0.5" title="Locked">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  handleLogout();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/10 p-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{language === 'id' ? 'Keluar dari Akun' : 'Logout Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 z-30 cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <BotIcon className="w-6 h-6" />
      </button>
      {isAIChatOpen && <AIChatBot onClose={() => setIsAIChatOpen(false)} />}
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus } = useAuth();

  if (authStatus === 'CHECKING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 animate-pulse">
            Authenticating Workspace...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace />;
  }

  return <LayoutContainer>{children}</LayoutContainer>;
};

const AppContent: React.FC = () => {
  const { state, dispatch } = useFMS();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('CHECKING');

  const refreshAuth = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res && res.user) {
        if (res.organization?.id) {
          localStorage.setItem('fms_active_organization_id', res.organization.id);
        }
        if (res.entity?.id) {
          localStorage.setItem('fms_active_entity_id', res.entity.id);
        }
        localStorage.setItem('fms_active_user_email', res.user.email);
        localStorage.setItem('fms_active_user_name', res.user.fullName || res.user.email.split('@')[0]);

        let subPlan: 'Free' | 'Pro' = 'Free';
        try {
          const sub = await subscriptionApi.getCurrentSubscription();
          if (sub && (sub.planCode === 'PRO' || sub.planCode === 'ENTERPRISE')) {
            subPlan = 'Pro';
          }
        } catch (_) {}

        const assignedRole = (res.role === 'OWNER' || res.role === 'ADMIN') ? 'Admin' : 'User';

        dispatch({
          type: 'LOGIN_USER',
          payload: {
            email: res.user.email,
            stateData: {
              role: assignedRole,
              subscription: subPlan,
              activeEntityId: res.entity?.id || '',
              activeEntity: res.entity?.name || res.entity?.code || 'HQ-01',
              entities: res.entity ? [{
                id: res.entity.id,
                code: res.entity.code,
                name: res.entity.name,
                currency: res.entity.baseCurrency || 'IDR',
              }] : [],
            },
          },
        });
        setAuthStatus('AUTHENTICATED');
      } else {
        throw new Error('No user authenticated');
      }
    } catch (_) {
      clearApiCache();
      localStorage.removeItem('fms_active_user_email');
      localStorage.removeItem('fms_active_organization_id');
      localStorage.removeItem('fms_active_entity_id');
      dispatch({ type: 'LOGOUT_USER' });
      setAuthStatus('UNAUTHENTICATED');
    }
  }, [dispatch]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  const authValue = useMemo(() => ({ authStatus, setAuthStatus, refreshAuth }), [authStatus, refreshAuth]);

  // Navigate helper to map landing/auth components onNavigate callbacks
  const handleLandingNavigate = (targetState: 'landing' | 'auth' | 'subscription' | 'app', authMode?: 'login' | 'register') => {
    if (targetState === 'auth') {
      navigate(authMode === 'register' ? '/register' : '/login');
    } else if (targetState === 'subscription') {
      navigate('/subscription');
    } else if (targetState === 'app') {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleAuthNavigate = (targetState: 'landing' | 'auth' | 'subscription' | 'app') => {
    if (targetState === 'landing') {
      navigate('/');
    } else if (targetState === 'subscription') {
      navigate('/subscription');
    } else if (targetState === 'app') {
      navigate('/dashboard');
    }
  };

  const handleSubNavigate = (targetState: 'landing' | 'auth' | 'subscription' | 'app') => {
    if (targetState === 'landing') {
      navigate('/');
    } else if (targetState === 'app') {
      navigate('/dashboard');
    }
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthContext.Provider value={authValue}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage onNavigate={handleLandingNavigate} />} />
          <Route path="/login" element={<Auth mode="login" onNavigate={handleAuthNavigate} />} />
          <Route path="/register" element={<Auth mode="register" onNavigate={handleAuthNavigate} />} />
          <Route path="/subscription" element={
            authStatus === 'AUTHENTICATED' ? <Subscription onNavigate={handleSubNavigate} /> : <Navigate to="/login" replace />
          } />

          {/* Private Layout-nested App Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/coa" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><GeneralLedger /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
          <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/entities" element={<ProtectedRoute><Entities /></ProtectedRoute>} />
          <Route path="/tax" element={<ProtectedRoute><Tax /></ProtectedRoute>} />
          <Route path="/cash-bank" element={<ProtectedRoute><CashBank /></ProtectedRoute>} />
          <Route path="/budgeting" element={<ProtectedRoute><Budgeting /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback Catch-all routing rules */}
          <Route path="*" element={authStatus === 'AUTHENTICATED' ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
        </Routes>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <FMSProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </FMSProvider>
    </BrowserRouter>
  );
};

export default App;
