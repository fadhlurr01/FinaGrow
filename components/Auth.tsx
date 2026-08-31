import React, { useState, useContext, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Languages, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Check, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck, 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Building2, 
  CheckCircle,
  Gem,
  CheckCircle2,
  LockKeyhole
} from 'lucide-react';
import { useFMS, DEFAULT_STATE, getSeededStateForUser } from '../context/FMSContext';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../App';
import { authApi } from '../src/services/api/authApi';

interface AuthProps {
  mode: 'login' | 'register';
  onNavigate: (state: 'landing' | 'auth' | 'subscription' | 'app') => void;
}

const localAuthTrans = {
  en: {
    backToHome: "Back to Home",
    signInTitle: "Access FINAGROW Suite",
    signInSubtitle: "Connect to your unified secure financial ledger",
    signUpTitle: "Register New Account",
    signUpSubtitle: "Start your 14-day free trial. No credit card required.",
    fullName: "Full Name",
    fullNamePlaceholder: "e.g., Dian Sastrowardoyo",
    phoneNumber: "Phone Number",
    phoneNumberPlaceholder: "e.g., 081234567890",
    emailAddress: "Email Address",
    emailPlaceholder: "yourname@company.com",
    password: "Password",
    passwordPlaceholder: "•••••••• (min. 6 characters)",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    rememberMe: "Remember me for 30 days",
    forgotPassword: "Forgot password?",
    signInBtn: "Sign In Securely",
    signUpBtn: "Register & Gain Access",
    noAccount: "Don't have a FINAGROW account?",
    haveAccount: "Already have an account?",
    trialOffer: "Start your 14-day free trial",
    loginInstead: "Sign In instead",
    demoAccountNotice: "⚡ Demo Space Available",
    useDemoAdmin: "Masuk sebagai Admin Demo",
    useDemoUser: "Masuk sebagai User Demo",
    orSeparator: "OR AUTHENTICATE SECURELY",
    errorRequired: "Please fill in all required fields.",
    errorPassLength: "Password must be at least 6 characters.",
    errorPassMatch: "Confirm password does not match.",
    errorEmailExists: "This email address is already registered.",
    errorEmailNotRegistered: "Email is not registered. Please register first or use the Demo account.",
    errorIncorrectPassword: "Incorrect password. Please verify and try again.",
    roleOwner: "Corporate Owner",
    systemSeeded: "Demo data auto-seeds on login",
    liveIndicator: "CONSOLIDATION HUB",
    leftTitle: "High Precision Financial Ledger",
    leftSubtitle: "Consolidate thousands of multi-currency enterprise branch receipts in real-time with zero discrepancy.",
    leftCheck1: "Multi-branch & multi-entity real-time currency conversion",
    leftCheck2: "PPN reporting & PPh compliant automatic generations",
    leftCheck3: "Automated real-time multi-warehouse inventory valuation",
    leftCheck4: "AI Financial Assistant context-driven analytical insights",
    systemStatus: "Security Standard: AES-256 Bit Encryption",
  },
  id: {
    backToHome: "Kembali ke Beranda",
    signInTitle: "Masuk ke FINAGROW Suite",
    signInSubtitle: "Sambungkan dengan buku besar keuangan terpadu Anda",
    signUpTitle: "Daftar Akun Baru",
    signUpSubtitle: "Mulai uji coba gratis 14 hari Anda. Tanpa kartu kredit.",
    fullName: "Nama Lengkap",
    fullNamePlaceholder: "misal. Dian Sastrowardoyo",
    phoneNumber: "Nomor Telepon",
    phoneNumberPlaceholder: "misal. 081234567890",
    emailAddress: "Alamat Email",
    emailPlaceholder: "nama@perusahaan.com",
    password: "Kata Sandi",
    passwordPlaceholder: "•••••••• (min. 6 karakter)",
    confirmPassword: "Konfirmasi Kata Sandi",
    confirmPasswordPlaceholder: "Masukkan kembali kata sandi Anda",
    rememberMe: "Ingat saya selama 30 hari",
    forgotPassword: "Lupa kata sandi?",
    signInBtn: "Masuk Secara Aman",
    signUpBtn: "Daftar & Dapatkan Akses",
    noAccount: "Belum memiliki akun FINAGROW?",
    haveAccount: "Sudah memiliki akun?",
    trialOffer: "Mulai uji coba gratis 14 hari",
    loginInstead: "Masuk saja",
    demoAccountNotice: "⚡ Akses Cepat Demo",
    useDemoAdmin: "Masuk sebagai Admin Demo",
    useDemoUser: "Masuk sebagai User Demo",
    orSeparator: "ATAU SAMBUNGKAN SECARA MANUAL",
    errorRequired: "Silakan lengkapi semua kolom input wajib.",
    errorPassLength: "Kata sandi minimal harus 6 karakter.",
    errorPassMatch: "Konfirmasi kata sandi tidak cocok.",
    errorEmailExists: "Alamat email ini sudah terdaftar.",
    errorEmailNotRegistered: "Email belum terdaftar. Silakan daftar terlebih dahulu atau klik Akun Demo.",
    errorIncorrectPassword: "Kata sandi salah. Silakan periksa kembali dan coba lagi.",
    roleOwner: "Pemilik Korporat",
    systemSeeded: "Data demo di-seed otomatis saat masuk",
    liveIndicator: "KONSOLIDASI NASIONAL",
    leftTitle: "Buku Besar Finansial Presisi Tinggi",
    leftSubtitle: "Konsolidasikan ribuan transaksi cabang korporasi multi-mata uang secara live tanpa selisih saldo.",
    leftCheck1: "Konversi mata uang otomatis multi-cabang & multi-entitas",
    leftCheck2: "Laporan faktur PPN & kepatuhan pajak PPh otomatis online",
    leftCheck3: "Penilaian inventaris gudang real-time multi-lokasi",
    leftCheck4: "Asisten Keuangan AI interaktif berbasis konteks riil",
    systemStatus: "Standar Keamanan: Enkripsi Perbankan AES-256 Bit",
  }
};

const Auth: React.FC<AuthProps> = ({ mode: initialMode, onNavigate }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Eye toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Contexts
  const { dispatch } = useFMS();
  const { language, toggleLanguage } = useContext(LanguageContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  const t = (key: keyof typeof localAuthTrans['en']) => {
    return localAuthTrans[language as 'en' | 'id'][key] || key;
  };

  // Pre-seed default registered accounts into localStorage
  useEffect(() => {
    const defaultSeededUsers = [
      { name: 'Andi Wijaya', phone: '081211112222', email: 'andi@bellcorp.com', password: '123456', status: 'Active' },
      { name: 'Sari Indah', phone: '081322223333', email: 'sari@bellcorp.com', password: '123456', status: 'Active' },
      { name: 'Demo Admin', phone: '08123456781', email: 'demo_admin@fms.com', password: '123456', isDemo: true, demoRole: 'Admin', status: 'Active' },
      { name: 'Demo User', phone: '08123456782', email: 'demo_user@fms.com', password: '123456', isDemo: true, demoRole: 'User', status: 'Active' },
      { name: 'Demo Account', phone: '08123456789', email: 'demo@fms.com', password: '123456', isDemo: true, demoRole: 'Admin', status: 'Active' }
    ];
    if (!localStorage.getItem('fms_registered_users')) {
      localStorage.setItem('fms_registered_users', JSON.stringify(defaultSeededUsers));
    }
  }, []);

  const getRegisteredUsers = () => {
    try {
      const data = localStorage.getItem('fms_registered_users');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Error reading registered users", e);
    }
    return [
      { name: 'Andi Wijaya', phone: '081211112222', email: 'andi@bellcorp.com', password: '123456', status: 'Active' },
      { name: 'Sari Indah', phone: '081322223333', email: 'sari@bellcorp.com', password: '123456', status: 'Active' },
      { name: 'Demo Admin', phone: '08123456781', email: 'demo_admin@fms.com', password: '123456', isDemo: true, demoRole: 'Admin', status: 'Active' },
      { name: 'Demo User', phone: '08123456782', email: 'demo_user@fms.com', password: '123456', isDemo: true, demoRole: 'User', status: 'Active' },
      { name: 'Demo Account', phone: '08123456789', email: 'demo@fms.com', password: '123456', isDemo: true, demoRole: 'Admin', status: 'Active' }
    ];
  };

  const handleImmediateDemoLogin = async (roleToUse: 'Admin' | 'User') => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    const targetEmail = roleToUse === 'Admin' ? 'demo_admin@fms.com' : 'demo_user@fms.com';

    try {
      // Authenticate via backend API (server sets session cookie)
      const authRes = await authApi.login({ email: targetEmail, password: '123456' });
      if (authRes.organization?.id) {
        localStorage.setItem('fms_active_organization_id', authRes.organization.id);
      }
      if (authRes.entity?.id) {
        localStorage.setItem('fms_active_entity_id', authRes.entity.id);
      }
      localStorage.setItem('fms_active_user_email', targetEmail);
      dispatch({
        type: 'LOGIN_USER',
        payload: {
          email: targetEmail,
          stateData: {
            role: roleToUse,
            subscription: 'Pro',
            activeEntityId: authRes.entity?.id || '',
            activeEntity: authRes.entity?.name || authRes.entity?.code || 'BC-HO',
          },
        },
      });
    } catch (e) {
      console.warn('Demo live backend login error, using local fallback:', e);
      localStorage.setItem('fms_active_user_email', targetEmail);
      dispatch({
        type: 'LOGIN_USER',
        payload: { email: targetEmail, stateData: { role: roleToUse, subscription: 'Pro' } }
      });
    }

    setIsLoading(false);
    onNavigate('app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const normalEmail = email.trim().toLowerCase();

    // 1. Basic required fields checks
    if (!normalEmail || !password || (mode === 'register' && (!name || !phone || !confirmPassword))) {
      setError(t('errorRequired'));
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('errorPassLength'));
      setIsLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError(t('errorPassMatch'));
      setIsLoading(false);
      return;
    }

    if (mode === 'register') {
      try {
        const regRes = await authApi.register({
          email: normalEmail,
          password,
          fullName: name.trim(),
          phoneNumber: phone.trim(),
        });

        localStorage.setItem('fms_active_user_email', normalEmail);
        if (regRes.organization?.id) {
          localStorage.setItem('fms_active_organization_id', regRes.organization.id);
        }
        if (regRes.entity?.id) {
          localStorage.setItem('fms_active_entity_id', regRes.entity.id);
        }

        dispatch({
          type: 'LOGIN_USER',
          payload: { 
            email: normalEmail, 
            stateData: { 
              role: 'Admin', 
              subscription: 'Free',
              activeEntityId: regRes.entity?.id || '',
              activeEntity: regRes.entity?.name || regRes.entity?.code || 'HQ-01',
            } 
          }
        });

        setSuccess(language === 'id' ? 'Pendaftaran berhasil! Mengalihkan...' : 'Registration successful! Launching setup...');
        setTimeout(() => {
          setIsLoading(false);
          onNavigate('subscription');
        }, 800);
      } catch (err: any) {
        console.warn('Backend registration error, initializing local clean profile:', err.message);
        localStorage.setItem('fms_active_user_email', normalEmail);
        dispatch({
          type: 'LOGIN_USER',
          payload: {
            email: normalEmail,
            stateData: {
              role: 'Admin',
              subscription: 'Free',
              activeEntityId: 'e-new',
              activeEntity: `${name.trim() || 'Cabang Baru'} (HQ)`,
              coa: [],
              transactions: [],
              invoices: [],
              budgets: [],
              assets: [],
              inventory: [],
            },
          },
        });
        setSuccess(language === 'id' ? 'Pendaftaran berhasil! Mengalihkan...' : 'Registration successful! Launching setup...');
        setTimeout(() => {
          setIsLoading(false);
          onNavigate('subscription');
        }, 800);
      }
    } else {
      // LOGIN WORKFLOW
      try {
        const authRes = await authApi.login({
          email: normalEmail,
          password,
        });

        localStorage.setItem('fms_active_user_email', normalEmail);
        if (authRes.organization?.id) {
          localStorage.setItem('fms_active_organization_id', authRes.organization.id);
        }
        if (authRes.entity?.id) {
          localStorage.setItem('fms_active_entity_id', authRes.entity.id);
        }

        const assignedRole = authRes.role === 'OWNER' || authRes.role === 'ADMIN' ? 'Admin' : 'User';
        dispatch({
          type: 'LOGIN_USER',
          payload: { 
            email: normalEmail, 
            stateData: { 
              role: assignedRole,
              activeEntityId: authRes.entity?.id || '',
              activeEntity: authRes.entity?.name || authRes.entity?.code || 'HQ-01',
            } 
          }
        });

        setIsLoading(false);
        onNavigate('app');
      } catch (err: any) {
        // Fallback for demo users
        if (normalEmail.includes('demo') && password === '123456') {
          const userRole = normalEmail === 'demo_user@fms.com' ? 'User' : 'Admin';
          localStorage.setItem('fms_active_user_email', normalEmail);
          dispatch({
            type: 'LOGIN_USER',
            payload: { email: normalEmail, stateData: { role: userRole, subscription: 'Pro' } }
          });
          setIsLoading(false);
          onNavigate('app');
          return;
        }

        setError(err.message || t('errorIncorrectPassword'));
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      
      {/* LEFT COLUMN: GORGEOUS, COOL & BUSY INFO PANEL WITH SEEDED GRAPHS & FEATURE LISTS */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] bg-gradient-to-br from-primary-900 via-emerald-950 to-slate-900 border-r border-emerald-900/40 relative flex-col justify-between p-12 text-white overflow-hidden">
        {/* Glow Overlay items */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] pointer-events-none select-none"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none select-none"></div>
        
        {/* Subtitle / System status bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <img src="/logo.png" alt="FINAGROW" className="w-10 h-10 rounded-2xl object-contain shadow-md active:scale-95 transition-transform" />
            <span className="font-bold text-lg tracking-tight font-sans uppercase">FINAGROW</span>
          </div>
          <span className="text-[10px] bg-slate-800/80 border border-slate-700/60 text-emerald-400 font-mono font-bold tracking-widest px-3 py-1 rounded-full uppercase">
            {t('liveIndicator')}
          </span>
        </div>

        {/* Dynamic Simulated Graphics Area (Making it visually packed/busy) */}
        <div className="my-auto relative z-10 space-y-8 select-none">
          <div className="space-y-4">
            <span className="text-secondary-400 text-xs font-black uppercase tracking-widest bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg">
              📈 FINANCIAL ENGINE v1.4
            </span>
            <h1 className="text-3xl xl:text-4xl 2xl:text-5.5xl font-black tracking-tight leading-none text-white drop-shadow-sm">
              {t('leftTitle')}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              {t('leftSubtitle')}
            </p>
          </div>

          {/* Interactive Simulated Glassmorphic Chart Widget */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-2xl relative group hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-3 right-3 flex space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">CONSOLIDATED REVENUE</span>
                <span className="text-xl font-bold tracking-tight text-white font-sans">Rp 8.423.500.000<span className="text-[10px] text-emerald-400 font-bold ml-1 font-mono">+18.4%</span></span>
              </div>
              <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
                <TrendingUp className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="h-16 flex items-end justify-between gap-1.5 pt-2">
              {[40, 55, 30, 45, 80, 65, 95, 75, 110, 85, 125].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full rounded-t bg-gradient-to-t from-emerald-500/40 to-primary-500/85 transition-all duration-1000 group-hover:bg-gradient-to-t group-hover:from-emerald-400 group-hover:to-primary-400" 
                    style={{ height: `${val / 1.3}px` }}
                  ></div>
                  <span className="text-[7px] text-slate-500 font-mono mt-1">M{i+1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature List Checklist */}
          <div className="space-y-3.5 pt-4">
            {[
              t('leftCheck1'),
              t('leftCheck2'),
              t('leftCheck3'),
              t('leftCheck4')
            ].map((text, i) => (
              <div key={i} className="flex items-start space-x-3 text-sm text-slate-300 font-medium group cursor-pointer hover:text-white transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0 flex items-center justify-center mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition-all transform group-hover:scale-105 duration-300">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom system footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-mono pt-4 border-t border-slate-800/40">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>{t('systemStatus')}</span>
          </div>
          <span>v1.0-TS</span>
        </div>
      </div>

      {/* RIGHT COLUMN: GORGEOUS FORM SECTION WITH INTEGRATED THEME/LANG CONTROLS */}
      <div className="flex-1 flex flex-col justify-between py-8 px-6 sm:px-12 lg:px-16 xl:px-24 bg-white dark:bg-slate-950 relative overflow-y-auto">
        
        {/* Dynamic header row with navigation and responsive custom selector toggles */}
        <div className="flex items-center justify-between w-full mb-8">
          <button 
            onClick={() => onNavigate('landing')}
            className="group flex items-center space-x-2 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-emerald-400 transition-colors bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-4 py-2.5 rounded-full cursor-pointer hover:shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>{t('backToHome')}</span>
          </button>

          {/* Action Hub controllers Row */}
          <div className="flex items-center space-x-2">
            
            {/* Bilingual Selector */}
            <button
              onClick={toggleLanguage}
              title={language === 'id' ? 'Switch to English' : 'Beralih ke Bahasa Indonesia'}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              <Languages className="w-3.5 h-3.5 text-primary-500" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Dark Mode Responsive Switch */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Activate Light Mode' : 'Aktifkan Mode Gelap'}
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-800 cursor-pointer transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Central Core Form Element Grid */}
        <div className="my-auto max-w-md w-full mx-auto space-y-7 animate-slideUp">
          
          <div className="text-center sm:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-4">
              <img src="/logo.png" alt="FINAGROW" className="w-12 h-12 rounded-2xl object-contain shadow-lg" />
            </div>
            <h2 className="text-2.5xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {mode === 'login' ? t('signInTitle') : t('signUpTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-normal">
              {mode === 'login' ? t('signInSubtitle') : t('signUpSubtitle')}
            </p>
          </div>

          {/* Validation Alert Prompter */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-start space-x-2 animate-bounce">
              <span className="text-base select-none mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Form container */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* REGISTER CONTROLS (Only visible under sign up mode) */}
            {mode === 'register' && (
              <div className="space-y-3.5">
                {/* 1. Nama Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1 pl-1">
                    {t('fullName')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={t('fullNamePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-all font-semibold text-sm"
                    />
                  </div>
                </div>

                {/* 2. No telpon Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1 pl-1">
                    {t('phoneNumber')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder={t('phoneNumberPlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-all font-semibold text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SHARED INPUT: EMAIL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1 pl-1">
                {t('emailAddress')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  type="email"
                  required
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-all font-semibold text-sm"
                />
              </div>
            </div>

            {/* INPUT: PASSWORD WITH EYE ICON INTEGRATOR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1 pl-1">
                {t('password')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock key="lock-icon" className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-all font-semibold text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-650 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* REGISTER ONLY INPUT: CONFIRM PASSWORD WITH EYE INTEGRATOR */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1 pl-1">
                  {t('confirmPassword')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <LockKeyhole className="w-4.5 h-4.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder={t('confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 transition-all font-semibold text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-650 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* REMEMBER ME & FORGOT PASSWORD (Only under Sign In) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs font-semibold pt-1">
                <label className="flex items-center text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-800 mr-2" />
                  <span>{t('rememberMe')}</span>
                </label>
                <a href="#" className="text-primary-600 dark:text-emerald-400 hover:underline">{t('forgotPassword')}</a>
              </div>
            )}

            {/* SUBMIT BUTTON ROW */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer flex items-center justify-center space-x-2 py-3 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-md active:scale-98 disabled:opacity-75 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>{mode === 'login' ? t('signInBtn') : t('signUpBtn')}</span>
                )}
              </button>
            </div>
          </form>

          {/* QUICK DEMO ACCOUNT SEEDING SHORTCUT (Busy component adding interactive options) */}
          {mode === 'login' && (
            <div className="space-y-4 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <span className="relative px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 tracking-wider">
                  {t('orSeparator')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50/20 to-primary-50/20 dark:from-emerald-950/10 dark:to-primary-950/10 border border-emerald-500/10 dark:border-emerald-500/20 flex flex-col items-center text-center space-y-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-emerald-500 text-xs">⚡</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{t('demoAccountNotice')}</span>
                </div>
                <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                  {t('systemSeeded')}
                </p>
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleImmediateDemoLogin('Admin')}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[11px] py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    {t('useDemoAdmin')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImmediateDemoLogin('User')}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    {t('useDemoUser')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC MODE TOGGLER */}
          <div className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
            <span>{mode === 'login' ? t('noAccount') : t('haveAccount')} </span>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccess('');
              }}
              className="text-primary-600 dark:text-emerald-400 font-black hover:underline transition-colors pl-1 cursor-pointer"
            >
              {mode === 'login' ? t('trialOffer') : t('loginInstead')}
            </button>
          </div>

        </div>

        {/* Small Responsive Footer indicators */}
        <div className="w-full text-center text-[10px] text-slate-400 select-none py-2 font-semibold">
          © 2026 FINAGROW Suite Inc. All Rights Reserved. ISO 27001 Certified.
        </div>
      </div>

    </div>
  );
};

export default Auth;
