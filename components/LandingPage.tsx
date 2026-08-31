import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { useTheme } from '../hooks/useTheme';
import { 
  ChartPieIcon, 
  ShieldCheckIcon, 
  GlobeAltIcon, 
  BoltIcon, 
  SunIcon, 
  MoonIcon,
  CheckIcon,
  BotIcon,
  UsersIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  XMarkIcon
} from './icons/IconComponents';

interface LandingPageProps {
  onNavigate: (state: 'landing' | 'auth' | 'subscription' | 'app', mode?: 'login' | 'register') => void;
}

// Custom Localized translations for the Landing Page to maximize SEO and UX impact
const landingTranslations = {
  en: {
    navFeatures: "Features",
    navIssues: "Challenges",
    navDemo: "Interactive Demo",
    navPricing: "Pricing",
    navTestimonials: "Testimonials",
    getStarted: "Get Started",
    login: "Log In",
    heroBadge: "🚀 AI-Powered Financial Control Station",
    heroTitle: "Financial Management",
    heroTitleSub: "Made Scalable.",
    heroDesc: "From emerging local UMKM to global conglomerates, FINAGROW automates your financial workflows. Consolidate multi-entity sheets, track real-time payments, execute payroll in one click, and access certified tax reports — all enhanced by an AI financial partner.",
    ctaTrial: "Start 14-Day Free Trial",
    ctaDemo: "Simulate Live System",
    
    // Issues & Solutions
    issuesTitle: "Common Pitfalls of Manual Bookkeeping",
    solTitle: "The Future of Accounting: FINAGROW",
    issuesLabel: "The Nightmares",
    solLabel: "The Remedies",
    issuesDesc: "Why traditional spreadsheets are silently draining your productivity and growth:",
    solDesc: "How FINAGROW instantly revitalizes your business efficiency via active modules:",
    
    issue1: "Manual Spreadsheet Errors",
    issue1Desc: "Typing mistakes lead to huge accounting variances and untreatable losses in cash flow.",
    issue2: "Invoicing Drag & Late Payments",
    issue2Desc: "Forgetting collections or delaying invoices starves your company's active runway.",
    issue3: "Multi-Entity Consolidation Mess",
    issue3Desc: "Hours of manual work stitching multiple branch currencies, Excel tabs, and transaction logs.",
    issue4: "Tax Filing Complexities & Fines",
    issue4Desc: "Struggling with local tax compliance (PPN, PPh 21) causing expensive audit delays.",
    
    sol1: "Automated Double-Entry Ledger",
    sol1Desc: "Sells, purchases, and cash transactions map natively to our journal system instantly.",
    sol2: "Smart Invoices & Auto-Reminders",
    sol2Desc: "Billing triggers instantly. Automatic emails remind partners before due dates smoothly.",
    sol3: "Unified Global Group Consolidation",
    sol3Desc: "Instantly translate branch balances with live intercompany eliminations and clear dashboards.",
    sol4: "Compliant Automated Tax Engine",
    sol4Desc: "Generate certified, submission-ready tax reports in clicks, matching updated rules.",

    // Interactive Demo
    demoTitle: "Interactive System Preview",
    demoSub: "Don't just take our word. Click the interactive tabs to explore our live system interfaces, simulating continuous operations.",
    tabDashboard: "Financial Dashboard",
    tabPayroll: "Payroll Operations",
    tabInvoicing: "Invoices & Revenue",
    tabAI: "AI Assistant Studio",
    demoPlay: "Start Simulation Walkthrough",
    demoPause: "Pause Preview Mode",
    
    // Testimony
    testiTitle: "Loved by CFOs & Founders Across the Country",
    testiSub: "See how modern teams scale their operations and focus on growth with FINAGROW.",
    
    // Pricing
    pricingTitle: "Incredible Plans Tailored for Your Growth Stage",
    pricingSub: "Sign up in 30 seconds. Switch scales or cancel anytime.",
    monthly: "Monthly Plan",
    annual: "Annual Plan (Save 20%)",
    popular: "Most Popular",
    starterPlan: "Starter",
    proPlan: "Professional",
    entPlan: "Enterprise",
    perMonth: "/mo",
    contactSales: "Contact Sales",
    incStarter: "Freelancers & small UMKM",
    incPro: "Growing businesses with teams",
    incEnt: "Large-scale consolidated operations",
    
    // Footer & Popup
    contactText: "Dibuat oleh Contech.id — Empowering business intelligence with hyper-scalable automation, secure cloud servers, and advanced intelligence.",
    copyright: "All rights reserved. Styled with meticulous craftsmanship.",
    modalClose: "Close Window",
  },
  id: {
    navFeatures: "Fitur",
    navIssues: "Masalah & Solusi",
    navDemo: "Demo Interaktif",
    navPricing: "Paket Harga",
    navTestimonials: "Testimoni",
    getStarted: "Mulai Sekarang",
    login: "Masuk",
    heroBadge: "🚀 Pusat Keu No.1 untuk UMKM & Korporasi",
    heroTitle: "Manajemen Keuangan",
    heroTitleSub: "Jadi Lebih Skalabel.",
    heroDesc: "Dari UMKM lokal hingga korporasi besar, FINAGROW mengotomatiskan alur kerja keuangan Anda. Konsolidasikan multi-entitas, lacak transaksi real-time, jalankan penggajian sekali klik, dan miliki perhitungan pajak patuh regulasi — didukung asisten cerdas AI.",
    ctaTrial: "Mulai Uji Coba 14 Hari",
    ctaDemo: "Simulasi Sistem Demo",
    
    // Issues & Solutions
    issuesTitle: "Mimpi Buruk Pembukuan Manual",
    solTitle: "Masa Depan Keuangan: FINAGROW",
    issuesLabel: "Tantangan Klasik",
    solLabel: "Solusi Cerdas",
    issuesDesc: "Mengapa spreadsheet tradisional diam-diam menghambat produktivitas dan ekspansi Anda:",
    solDesc: "Bagaimana FINAGROW memulihkan efisiensi bisnis Anda secara menyeluruh melalui modul aktif:",
    
    issue1: "Salah Input Spreadsheet Manual",
    issue1Desc: "Typo kecil di Excel menghasilkan selisih laporan saldo besar yang sulit dideteksi ditiap kuartal.",
    issue2: "Penagihan Terhambat & Cashflow Macet",
    issue2Desc: "Lupa menagih invoice yang jatuh tempo membuat kas operasional perusahaan Anda tercekik.",
    issue3: "Konsolidasi Multi-Entitas yang Memusingkan",
    issue3Desc: "Ratusan jam terbuang untuk menggabungkan laporan keuangan antar cabang dan valuta asing.",
    issue4: "Kepatuhan Pajak Rumit & Denda Audit",
    issue4Desc: "Kebingungan menghitung PPN dan PPh 21 lokal yang berujung pada denda terlambat lapor.",
    
    sol1: "Jurnal Otomatis Double-Entry",
    sol1Desc: "Setiap transaksi penjualan dan pembelian langsung terposting ke buku besar secara presisi.",
    sol2: "Invoice Instan & Pengingat Otomatis",
    sol2Desc: "Hasilkan tagihan elegan dan atur pengingat otomatis ke pelanggan sebelum jatuh tempo.",
    sol3: "Konsolidasi Grup dalam Satu Dasbor",
    sol3Desc: "Pantau kinerja gabungan seluruh cabang usaha dengan eliminasi transaksi timbal-balik instan.",
    sol4: "Mesin Pajak Digital Sesuai Aturan",
    sol4Desc: "Hitung PPN dan PPh 21 secara otomatis, hasilkan draf lapor pajak resmi dalam milidetik.",

    // Interactive Demo
    demoTitle: "Simulasi Tampilan Sistem Real-Time",
    demoSub: "Jangan hanya percaya kata kami. Silakan klik tab interaktif di bawah untuk menguji keandalan dasbor, sistem penggajian, dan asisten AI kami.",
    tabDashboard: "Bagan Analitis Dasbor",
    tabPayroll: "Sistem Penggajian",
    tabInvoicing: "Manajemen Invoice",
    tabAI: "Asisten Cerdas AI",
    demoPlay: "Mulai Putar Otomatis",
    demoPause: "Jeda Simulasi",
    
    // Testimony
    testiTitle: "Dipercaya oleh CFO & Pendiri Bisnis Terbaik",
    testiSub: "Lihat bagaimana tim modern mengotomatiskan keuangan mereka untuk fokus merancang pertumbuhan bisnis bersama FINAGROW.",
    
    // Pricing
    pricingTitle: "Pilihan Paket Harga Terbaik Sesuai Skala Bisnis Anda",
    pricingSub: "Pendaftaran instan dalam 30 detik. Upgrade, downgrade, atau batalkan kapan saja dengan mudah.",
    monthly: "Bayar Bulanan",
    annual: "Bayar Tahunan (Hemat 20%)",
    popular: "Terpopuler",
    starterPlan: "Starter",
    proPlan: "Professional",
    entPlan: "Enterprise",
    perMonth: "/bln",
    contactSales: "Hubungi Penjualan",
    incStarter: "Cocok untuk pekerja lepas & UMKM rintisan",
    incPro: "Untuk bisnis berkembang dengan tim aktif",
    incEnt: "Fitur canggih untuk korporasi skala besar",
    
    // Footer & Popup
    contactText: "Dibuat oleh Contech.id — Memberdayakan intelegensi bisnis dengan otomatisasi terskala, server cloud aman, dan kecerdasan artifisial canggih.",
    copyright: "Hak cipta dilindungi undang-undang. Didesain dengan presisi tinggi.",
    modalClose: "Tutup Jendela",
  }
};

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { language, toggleLanguage } = useLocalization();
  const { theme, toggleTheme } = useTheme();

  // Pick landing translation safely
  const local = landingTranslations[language] || landingTranslations.en;

  // Header scroll detection state
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

  // Policy modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Video walkthrough player states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoChapter, setVideoChapter] = useState(0);

  // Interactive mockup simulator states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payroll' | 'invoice' | 'ai'>('dashboard');
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [demoProgress, setDemoProgress] = useState(0);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pricing mode state locked to monthly only as requested
  const [pricingMode] = useState<'monthly' | 'annual'>('monthly');

  // Interactive Testimonial Filter Category & Expand Case study states
  const [testimonialCategory, setTestimonialCategory] = useState<'all' | 'corporate' | 'umkm' | 'advisor'>('all');
  const [hoverTestimonialId, setHoverTestimonialId] = useState<number | null>(null);
  const [selectedCaseStudyId, setSelectedCaseStudyId] = useState<number | null>(null);

  // Custom Pricing Interactivity Addons
  const [pricingAddons, setPricingAddons] = useState({
    auditGuard: false,
    multiEntity: false,
    prioritySupport: false
  });

  // Video Device Preview (Desktop vs Mobile)
  const [videoDeviceMode, setVideoDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // Track scroll direction to show/hide navbar organically
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Handle transparent to blurred solid transition
      if (currentScrollY < 40) {
        setIsAtTop(true);
      } else {
        setIsAtTop(false);
      }

      // Handle scrolling direction
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down: Hide
        setIsNavbarVisible(false);
      } else {
        // Scrolling up: Show
        setIsNavbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Demo autoplay loop cycling through interfaces
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingDemo) {
      interval = setInterval(() => {
        setDemoProgress((prev) => {
          if (prev >= 100) {
            // Cycle tab
            setActiveTab((current) => {
              if (current === 'dashboard') return 'payroll';
              if (current === 'payroll') return 'invoice';
              if (current === 'invoice') return 'ai';
              return 'dashboard';
            });
            return 0;
          }
          return prev + 2; // Increments smoothly
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlayingDemo, activeTab]);

  const handleTabChange = (tab: 'dashboard' | 'payroll' | 'invoice' | 'ai') => {
    setActiveTab(tab);
    setDemoProgress(0);
    setIsPlayingDemo(false); // Stop autoplay when user manually interacts
  };

  const handleScrollToSegment = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-gray-50 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-300 selection:bg-primary-500 selection:text-white">
      
      {/* 1. Header/Navbar (Scroll-to-hide, with rounded glassmorphism aesthetic) */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-500 transform ${
          isNavbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        } ${
          isMobileMenuOpen
            ? 'bg-white dark:bg-slate-900 shadow-xl border-b border-slate-200 dark:border-slate-800 py-2 px-4'
            : isAtTop 
              ? 'bg-transparent border-transparent pt-4 px-4' 
              : 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-800/50 py-2 px-4'
        }`}
      >
        <div className={`max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto h-full flex items-center justify-between transition-all duration-300 ${
          isMobileMenuOpen ? 'px-4' : isAtTop ? 'bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm px-6' : 'px-4'
        }`}>
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/logo.png" 
              alt="FINAGROW" 
              className="w-10 h-10 rounded-xl object-contain shadow-md shadow-emerald-500/20"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                FINAGROW <span className="text-primary-500 dark:text-primary-400"></span>
              </span>
              <span className="text-[9px] font-mono tracking-wider uppercase text-slate-500 dark:text-slate-400">Scalable Financial Hub</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleScrollToSegment('issues-solutions')} 
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {local.navIssues}
            </button>
            <button 
              onClick={() => handleScrollToSegment('demo')} 
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {local.navDemo}
            </button>
            <button 
              onClick={() => handleScrollToSegment('pricing')} 
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {local.navPricing}
            </button>
            <button 
              onClick={() => handleScrollToSegment('testimonials')} 
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {local.navTestimonials}
            </button>
          </div>

          {/* Action Hub (Theme, Localization, and Login buttons) */}
          <div className="hidden lg:flex items-center space-x-4">
            
            {/* Direct Language Toggle */}
            <button 
              onClick={toggleLanguage} 
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
              title="Toggle Language / Ubah Bahasa"
            >
              <GlobeAltIcon className="w-4 h-4 text-slate-500" />
              <span>{language === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
            </button>

            {/* Direct Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <MoonIcon className="w-5 h-5 text-slate-700" />
              ) : (
                <SunIcon className="w-5 h-5 text-yellow-400" />
              )}
            </button>

            <button 
              onClick={() => onNavigate('auth', 'login')} 
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white px-3 py-2 transition-colors"
            >
              {local.login}
            </button>
            
            <button 
              onClick={() => onNavigate('auth', 'register')} 
              className="bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/10 hover:shadow-primary-600/25 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
            >
              {local.getStarted}
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <div className="lg:hidden flex items-center space-x-3">
            {/* Theme & Language buttons also in mobile header for convenience */}
            <button 
              onClick={toggleLanguage} 
              className="px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold"
            >
              {language === 'en' ? 'ID' : 'EN'}
            </button>
            <button 
              onClick={toggleTheme} 
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800"
            >
              {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4 text-yellow-400" />}
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-white dark:bg-slate-950 shadow-2xl border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col space-y-4 animate-fadeIn">
            <button onClick={() => handleScrollToSegment('issues-solutions')} className="text-left py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {local.navIssues}
            </button>
            <button onClick={() => handleScrollToSegment('demo')} className="text-left py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {local.navDemo}
            </button>
            <button onClick={() => handleScrollToSegment('pricing')} className="text-left py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {local.navPricing}
            </button>
            <button onClick={() => handleScrollToSegment('testimonials')} className="text-left py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {local.navTestimonials}
            </button>
            <hr className="border-slate-200 dark:border-slate-800" />
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onNavigate('auth', 'login')} 
                className="w-full text-center border border-slate-200 dark:border-slate-800 py-3 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300"
              >
                {local.login}
              </button>
              <button 
                onClick={() => onNavigate('auth', 'register')} 
                className="w-full text-center bg-primary-600 text-white py-3 rounded-xl font-bold text-sm"
              >
                {local.getStarted}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for sticky header */}
      <div className="h-24"></div>

      {/* 2. Hero Section (SEO optimized copy, beautiful gradient grid background) */}
      <header className="relative max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 pt-12 pb-24 md:pb-32 text-center overflow-hidden">
        {/* Abstract futuristic glowing circles */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary-400/10 to-emerald-400/5 blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-1/3 left-10 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/40 dark:border-primary-800/40 text-xs font-bold uppercase tracking-wider mb-8 animate-pulse text-center">
          <span>{local.heroBadge}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight max-w-5xl mx-auto">
          <span className="text-slate-900 dark:text-white">{local.heroTitle}</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-blue-500 to-emerald-500 font-black">
            {local.heroTitleSub}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          {local.heroDesc}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button 
            onClick={() => onNavigate('auth', 'register')} 
            className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary-600/20 hover:shadow-primary-600/40 transition-all transform hover:-translate-y-1"
          >
            {local.ctaTrial}
          </button>
          <button 
            onClick={() => handleScrollToSegment('demo')} 
            className="w-full sm:w-auto bg-white/70 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-800 font-bold text-lg px-8 py-4 rounded-2xl transition-all"
          >
            {local.ctaDemo}
          </button>
        </div>

        {/* Small Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <span>✔️ OJK Standards Client Config</span>
          <span>•</span>
          <span>✔️ ISO 27001 Certified Host</span>
          <span>•</span>
          <span>✔️ Bank-Grade 256-bit Hash</span>
        </div>
      </header>

      {/* 3. Red styled Challenges & Green styled Solutions comparative Section */}
      <section id="issues-solutions" className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 py-20 border-t border-b border-slate-200/50 dark:border-slate-800/80">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-14 items-stretch">
          
          {/* CRITICAL: Problem Column (Red themed aesthetic - High Polish) */}
          <div className="flex flex-col justify-between p-8 sm:p-12 rounded-3xl bg-red-50/20 dark:bg-red-950/5 border border-red-200/40 dark:border-red-900/10 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            {/* Subtle red atmospheric gradient bg element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
            
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-100/80 dark:bg-red-950/80 text-red-700 dark:text-red-400 text-xs font-black uppercase tracking-wider mb-8 border border-red-200/50 dark:border-red-900/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>🚨 {local.issuesLabel}</span>
              </div>
              
              <h3 className="text-2xl sm:text-4xl font-extrabold text-red-950 dark:text-red-400 tracking-tight mb-4 leading-tight">
                {local.issuesTitle}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl text-sm sm:text-base leading-relaxed">
                {local.issuesDesc}
              </p>

              <div className="space-y-6">
                {/* Issue card 1 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-red-100/20 dark:border-red-900/10 hover:border-red-200/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400 text-xl font-bold">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.issue1}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 px-2 py-0.5 bg-red-50 dark:bg-red-950/60 rounded">Accrual Variance</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.issue1Desc}</p>
                  </div>
                </div>

                {/* Issue card 2 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-red-100/20 dark:border-red-900/10 hover:border-red-200/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400 text-xl font-bold">
                    ⏳
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.issue2}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 px-2 py-0.5 bg-red-50 dark:bg-red-950/60 rounded">Days Sales Out (DSO)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.issue2Desc}</p>
                  </div>
                </div>

                {/* Issue card 3 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-red-100/20 dark:border-red-900/10 hover:border-red-200/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400 text-xl font-bold">
                    📊
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.issue3}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 px-2 py-0.5 bg-red-50 dark:bg-red-950/60 rounded">Fragmented Data</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.issue3Desc}</p>
                  </div>
                </div>

                {/* Issue card 4 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-red-100/20 dark:border-red-900/10 hover:border-red-200/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400 text-xl font-bold">
                    🚨
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.issue4}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 px-2 py-0.5 bg-red-50 dark:bg-red-950/60 rounded">Fines Risk</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.issue4Desc}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-6 border-t border-red-200/40 dark:border-red-900/20 flex items-center justify-between text-xs font-mono text-red-700/80 dark:text-red-400/80">
              <span>✖️ Cost of overhead increases annually</span>
              <span className="font-bold">Loss Probability: High</span>
            </div>
          </div>

          {/* CRITICAL: Solution Column (Green themed aesthetic - High Polish) */}
          <div className="flex flex-col justify-between p-8 sm:p-12 rounded-3xl bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-200/40 dark:border-emerald-900/25 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            {/* Subtle emerald atmospheric gradient bg element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
            
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-8 border border-emerald-200/50 dark:border-emerald-900/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>✨ {local.solLabel}</span>
              </div>
              
              <h3 className="text-2xl sm:text-4xl font-extrabold text-emerald-950 dark:text-emerald-400 tracking-tight mb-4 leading-tight">
                {local.solTitle}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-xl text-sm sm:text-base leading-relaxed">
                {local.solDesc}
              </p>

              <div className="space-y-6">
                {/* Solution card 1 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-emerald-100/20 dark:border-emerald-900/10 hover:border-emerald-250/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.sol1}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded">Double-Entry Core</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.sol1Desc}</p>
                  </div>
                </div>

                {/* Solution card 2 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-emerald-100/20 dark:border-emerald-900/10 hover:border-emerald-250/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.sol2}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded">Trigger Automation</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.sol2Desc}</p>
                  </div>
                </div>

                {/* Solution card 3 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-emerald-100/20 dark:border-emerald-900/10 hover:border-emerald-250/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.sol3}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded">Multi-Branch Engine</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.sol3Desc}</p>
                  </div>
                </div>

                {/* Solution card 4 */}
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/30 border border-emerald-100/20 dark:border-emerald-900/10 hover:border-emerald-250/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex-shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{local.sol4}</h4>
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded">Auditor compliant</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{local.sol4Desc}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-emerald-200/40 dark:border-emerald-900/20 flex items-center justify-between text-xs font-mono text-emerald-700/80 dark:text-emerald-400/80">
              <span>✔️ Mitigates human input risk securely</span>
              <span className="font-bold">Gain Score: Excellent</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Interactive Video Demo Simulator Section */}
      <section id="demo" className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-100 dark:bg-primary-950/80 px-4 py-1.5 rounded-full">
            🎞️ Screen walkthrough
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 text-slate-900 dark:text-white">
            {local.demoTitle}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
            {local.demoSub}
          </p>
        </div>

        {/* Demo Controller Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 w-full mb-6 bg-slate-100/85 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 backdrop-blur-md">
          {/* Auto cycles helper banner */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                setIsPlayingDemo(!isPlayingDemo);
                if (!isPlayingDemo) setDemoProgress(0);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 shadow-sm ${
                isPlayingDemo 
                  ? 'bg-amber-500 text-white hover:bg-amber-600' 
                  : 'bg-primary-650 hover:bg-primary-750 text-white bg-primary-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full bg-white ${isPlayingDemo ? 'animate-ping' : ''}`}></span>
              <span>{isPlayingDemo ? local.demoPause : local.demoPlay}</span>
            </button>
            <span className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isPlayingDemo ? '⚡ Simulated play rotation online' : '⏸️ Paused (Interactive mode)'}
            </span>
          </div>

          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
            {(['dashboard', 'payroll', 'invoice', 'ai'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition-all relative ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-900/40'
                }`}
              >
                {tab === 'dashboard' && local.tabDashboard}
                {tab === 'payroll' && local.tabPayroll}
                {tab === 'invoice' && local.tabInvoicing}
                {tab === 'ai' && local.tabAI}
                
                {/* Visual duration progress bar inside active tab when playing */}
                {activeTab === tab && isPlayingDemo && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-gradient-to-r from-primary-600 to-emerald-400 transition-all duration-100" style={{ width: `${demoProgress}%` }}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Outer Laptop Deck Simulator */}
        <div className="w-full rounded-3xl border-4 border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-3 relative overflow-hidden group">
          <div className="flex items-center space-x-1.5 pb-3 px-1 border-b border-slate-200 dark:border-slate-800">
            <div className="w-3.5 h-3.5 rounded-full bg-red-400 flex items-center justify-center font-bold text-[8px] text-red-800">×</div>
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-[8px] text-yellow-800">−</div>
            <div className="w-3.5 h-3.5 rounded-full bg-green-400 flex items-center justify-center font-bold text-[8px] text-green-800">+</div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pl-4">https://cloud.fmspro.net/workspace</span>
          </div>

          {/* Sub-layout view based on selection */}
          <div className="min-h-[380px] sm:min-h-[480px] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 transition-all duration-500 animate-fadeIn">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Live Analytical Summary</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">All entities combined consolidation (IDR Mode)</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-green-150 text-green-800 bg-green-500/10 rounded-full text-green-600 dark:text-green-400">● LIVE RUNNING</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Total Revenue</span>
                    <span className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">Rp 1,489,000,000</span>
                    <span className="text-[10px] text-emerald-600 block mt-1">▲ +14.2% vs last month</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Total Expenses</span>
                    <span className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">Rp 842,400,000</span>
                    <span className="text-[10px] text-red-500 block mt-1">▼ -4.1% reduction</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Net Profit</span>
                    <span className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">Rp 646,600,000</span>
                    <span className="text-[10px] text-emerald-600 block mt-1">▲ +18.9% yield margin</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Cash Balances</span>
                    <span className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">Rp 950,000,000</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Safe Runway Reserve</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 sm:p-5">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white block mb-4">Cash Analytics Curve</span>
                  <div className="h-44 sm:h-52 w-full flex items-end justify-between px-4 pb-2 pt-6">
                    {/* Simulated chart bars */}
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-20 relative"><div className="absolute bottom-0 w-full bg-primary-600 rounded-lg h-12"></div></div>
                      <span className="text-[10px] text-slate-400">Jan</span>
                    </div>
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-24 relative"><div className="absolute bottom-0 w-full bg-primary-600 rounded-lg h-16"></div></div>
                      <span className="text-[10px] text-slate-400">Feb</span>
                    </div>
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-28 relative"><div className="absolute bottom-0 w-full bg-primary-600 rounded-lg h-22"></div></div>
                      <span className="text-[10px] text-slate-400">Mar</span>
                    </div>
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-32 relative"><div className="absolute bottom-0 w-full bg-primary-600 rounded-lg h-29"></div></div>
                      <span className="text-[10px] text-slate-400">Apr</span>
                    </div>
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-36 relative"><div className="absolute bottom-0 w-full bg-emerald-500 rounded-lg h-32"></div></div>
                      <span className="text-[10px] text-slate-400">May</span>
                    </div>
                    <div className="flex flex-col items-center w-[12%] space-y-2">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-lg h-40 relative"><div className="absolute bottom-0 w-full bg-emerald-500 rounded-lg h-38"></div></div>
                      <span className="text-[10px] text-slate-400">Jun</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payroll' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Automated Payroll System</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">One-click staff disbursement & taxation (PPh 21 format)</p>
                  </div>
                  <button className="bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm">
                    Run Payroll Period
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Period</th>
                        <th className="p-3">Gross Salary</th>
                        <th className="p-3">PPh 21 Tax</th>
                        <th className="p-3">Net payout</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="p-3 font-bold text-slate-950 dark:text-white">Adi Nugraha</td>
                        <td className="p-3">June 2026</td>
                        <td className="p-3">Rp 12,500,000</td>
                        <td className="p-3">Rp 650,000</td>
                        <td className="p-3 font-semibold">Rp 11,850,000</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-850 rounded-full font-bold dark:bg-emerald-950/40 dark:text-emerald-400">✓ Paid</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-950 dark:text-white">Jessica Tan</td>
                        <td className="p-3">June 2026</td>
                        <td className="p-3">Rp 15,000,000</td>
                        <td className="p-3">Rp 780,000</td>
                        <td className="p-3 font-semibold">Rp 14,220,000</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-850 rounded-full font-bold dark:bg-emerald-950/40 dark:text-emerald-400">✓ Paid</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-950 dark:text-white">Deni Pratama</td>
                        <td className="p-3">June 2026</td>
                        <td className="p-3">Rp 8,500,000</td>
                        <td className="p-3">Rp 320,000</td>
                        <td className="p-3 font-semibold">Rp 8,180,000</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-850 rounded-full font-bold dark:bg-emerald-950/40 dark:text-emerald-400">✓ Paid</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/10">
                    <span className="text-[10px] text-orange-600 block uppercase font-bold">Consolidated Salary Tax</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-white mt-1 block">Rp 1,750,000 paid to DJP</span>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/10">
                    <span className="text-[10px] text-blue-600 block uppercase font-bold">Disbursement Hubs</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-white mt-1 block">Seamless Bank Transfer integrated</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Active AR/Invoicing Modules</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track pending client cash inflows visually</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Fully Settled</span>
                    <span className="text-xl font-black block mt-2">Rp 480M</span>
                    <span className="text-[10px] text-slate-500 block mt-1">29 Invoices Paid</span>
                  </div>
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Outstanding Collections</span>
                    <span className="text-xl font-black block mt-2">Rp 120M</span>
                    <span className="text-[10px] text-slate-500 block mt-1">11 Awaiting payments</span>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Critically Overdue</span>
                    <span className="text-xl font-black block mt-2">Rp 4.5M</span>
                    <span className="text-[10px] text-slate-500 block mt-1">1 Awaiting auto-reminder</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-850 overflow-hidden">
                  <div className="p-3 bg-slate-55 bg-slate-100 dark:bg-slate-850 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                    <span>Recent Bills</span>
                    <span className="text-primary-600 dark:text-primary-400 cursor-pointer">View CRM Ledger →</span>
                  </div>
                  <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-xs pb-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">Astra Trading Co. (INV-0098)</span>
                        <span className="text-[10px] text-slate-400">Issued 14 Jun 2026</span>
                      </div>
                      <span className="text-emerald-500 font-extrabold font-mono">Rp 55,000,000</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 pb-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">Mitra Mandiri CV (INV-0097)</span>
                        <span className="text-[10px] text-slate-400">Issued 12 Jun 2026</span>
                      </div>
                      <span className="text-slate-500 font-extrabold font-mono">Rp 12,500,000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    <BotIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">FINAGROW Cognitive Consultant</h3>
                    <p className="text-[10px] text-slate-400">Online • Live Gemini 1.5 PRO Model Integration</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-inner min-h-[220px] flex flex-col justify-end">
                  
                  {/* Mock Chat Conversation */}
                  <div className="space-y-4 text-xs font-medium">
                    <div className="flex items-start space-x-2 justify-end">
                      <div className="bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 p-3 rounded-2xl rounded-tr-none max-w-[80%] border border-primary-100/50 dark:border-primary-900/30">
                        "FINAGROW AI, analyze our Q2 margin metrics. Where is the highest leak?"
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <div className="w-7 h-7 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center text-white">
                        <BotIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] border border-slate-200/50 dark:border-slate-800/50">
                        <span className="font-bold text-primary-600 dark:text-primary-400 block mb-1">🤖 Cognitive Summary:</span>
                        "Your main expense leak resides in <span className="font-bold text-red-500">Unassigned Logistics</span> under Lestari Corp (branch B), swelling 22% this quarter due to manual mileage payouts. Mitigating this via central purchase pre-approvals represents a potential recovery of <span className="font-bold text-emerald-500">Rp 45,000,000</span>."
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    placeholder="Ask about your financial drivers..." 
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                    disabled
                  />
                  <button className="bg-primary-600 text-white px-4 py-3 rounded-xl font-bold text-xs" disabled>
                    Consult
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* HIGH-FIDELITY VIDEO DEMO SHOWCASE COMPONENT */}
        {/* ========================================== */}
        <div className="w-full mt-16 pt-16 border-t border-slate-200/50 dark:border-slate-800/80">
          <div className="text-center mb-8">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 text-xs font-black uppercase tracking-widest mb-3 border border-primary-200/40 dark:border-primary-800/40">
              <span>🎥</span>
              <span>{language === 'en' ? 'FINAGROW OFFICIAL VIDEO TOUR' : 'VIDEO TOUR RESMI FINAGROW'}</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {language === 'en' ? 'Watch FINAGROW in Action (3-Min Quick Tour)' : 'Tonton Demo Video Sistem Real FINAGROW (3 Menit)'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto">
              {language === 'en' 
                ? 'Deconstruct manual bookkeeping inefficiencies. See how our automation handles transactions, taxes and payroll flawlessly.' 
                : 'Pahami bagaimana FINAGROW memotong 90% waktu administrasi pembukuan dan pajak melalui pilar otomatisasi tercanggih kami.'}
            </p>
          </div>

          {/* Segmented Device View Controls */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() => setVideoDeviceMode('desktop')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  videoDeviceMode === 'desktop'
                    ? 'bg-white dark:bg-slate-800 text-primary-650 dark:text-primary-400 shadow-md scale-[1.02] font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>💻 Desktop View</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoDeviceMode('mobile')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  videoDeviceMode === 'mobile'
                    ? 'bg-white dark:bg-slate-800 text-primary-650 dark:text-primary-400 shadow-md scale-[1.02] font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📱 Mobile View</span>
              </button>
            </div>
          </div>

          {videoDeviceMode === 'desktop' ? (
            /* Premium Video Container (Simulated Real Player with fully interactive frames) - Desktop */
            <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-950 shadow-2xl overflow-hidden aspect-video group w-full">
              {/* Background High Fidelity Thumbnail with Gradient Mask */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 flex flex-col justify-between p-6 transition-all duration-500 group-hover:scale-[1.01]">
                
                {/* Thumbnail Header Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 z-10">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm">F</div>
                    <div>
                      <span className="text-xs font-black text-white block">FMS_Pro_System_Walkthrough_2026.mp4</span>
                      <span className="text-[9px] text-slate-400 font-mono">Size: 42.4 MB • 1080p Ultra HD</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider bg-red-600 text-white rounded-md animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    <span>PREVIEW</span>
                  </span>
                </div>

                {/* Graphic charts inside video background for rich fidelity mock */}
                <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto w-full opacity-35 filter blur-[0.5px]">
                  <div className="space-y-2 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div className="w-8 h-1 bg-white/20 rounded"></div>
                    <div className="h-10 bg-gradient-to-t from-primary-500/30 to-transparent rounded-lg"></div>
                  </div>
                  <div className="space-y-2 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div className="w-10 h-1 bg-white/20 rounded"></div>
                    <div className="h-14 bg-gradient-to-t from-emerald-500/30 to-transparent rounded-lg"></div>
                  </div>
                  <div className="space-y-2 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div className="w-6 h-1 bg-white/20 rounded"></div>
                    <div className="h-8 bg-gradient-to-t from-primary-500/30 to-transparent rounded-lg"></div>
                  </div>
                  <div className="space-y-2 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <div className="w-12 h-1 bg-white/20 rounded"></div>
                    <div className="h-12 bg-gradient-to-t from-amber-500/30 to-transparent rounded-lg"></div>
                  </div>
                </div>

                {/* Thumbnail Footer specs list */}
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-white/5 pt-3 z-10">
                  <span>© Contech.id Studio Productions</span>
                  <span>Subtitles: {language === 'en' ? 'English (auto)' : 'Bahasa Indonesia (auto)'}</span>
                </div>
              </div>

              {/* Simulated Glass Reflection Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none"></div>

              {/* Play Button Trigger with double pulse radar rings */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <button 
                  onClick={() => {
                    setIsVideoPlaying(true);
                    setVideoChapter(0);
                  }}
                  className="w-20 h-20 bg-primary-600 hover:bg-primary-550 text-white rounded-full flex items-center justify-center shadow-3xl hover:scale-110 active:scale-95 transition-all relative group/play cursor-pointer animate-scaleUp"
                  aria-label="Play video tour"
                >
                  {/* Radial rings */}
                  <div className="absolute inset-0 rounded-full border border-primary-500/40 animate-ping -z-10 scale-125"></div>
                  <div className="absolute inset-0 rounded-full border border-primary-500/20 animate-pulse -z-10 scale-150"></div>
                  
                  <svg className="w-8 h-8 ml-1 text-white group-hover/play:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </button>
              </div>

              {/* Playback Control Bar UI at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent p-5 pt-10 flex flex-col space-y-3 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
                
                {/* Scrubber slot */}
                <div className="h-1.5 w-full bg-white/20 rounded-full relative overflow-hidden cursor-pointer">
                  <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-r from-primary-600 to-emerald-400 rounded-full"></div>
                  <div className="absolute left-[25%] -translate-x-1/2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md"></div>
                </div>

                {/* Status and toggles */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => {
                        setIsVideoPlaying(true);
                        setVideoChapter(0);
                      }}
                      className="hover:text-primary-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <span className="text-[11px] font-mono">00:46 / 03:00</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Volume icon */}
                    <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.25-2.5-4.06v8.11c1.48-.81 2.5-2.29 2.5-4.05z"/></svg>
                    
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/25">1080p HD</span>
                    
                    {/* Subtitles icon */}
                    <span className="text-[10px] bg-primary-500/20 text-primary-400 hover:text-white cursor-pointer px-1 py-0.5 rounded font-black">CC</span>
                    
                    {/* Fullscreen tag */}
                    <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Premium Phone Walkthrough Frame - Mobile Demo */
            <div className="flex justify-center my-6 relative w-full animate-fadeIn select-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 bg-primary-500/10 dark:bg-primary-500/5 blur-3xl pointer-events-none -z-10"></div>
              
              <div className="relative w-[310px] h-[610px] border-[12px] border-slate-900 dark:border-slate-800 rounded-[50px] shadow-2xl bg-slate-950 overflow-hidden ring-4 ring-slate-200 dark:ring-slate-900 group">
                
                {/* Smartphone Top Speaker Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-3xl z-40 flex items-center justify-between px-3 border border-white/5 shadow-inner">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-950/20"></div>
                  <div className="h-1.5 w-10 bg-slate-900/50 rounded-full"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900/30"></div>
                </div>

                {/* Smartphone top status bar */}
                <div className="absolute top-0 left-0 right-0 h-10 px-6 pt-3.5 flex items-center justify-between text-[10px] font-sans font-bold text-white z-35 pointer-events-none">
                  <span>09:41</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[8px]">5G</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <div className="w-5 h-2.5 border border-white/40 rounded-sm p-0.5 flex items-center">
                      <div className="h-full w-3.5 bg-emerald-500 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* Video Content viewport inside the phone */}
                <div className="absolute inset-0 pt-10 pb-6 flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white select-none">
                  
                  {/* Floating play button trigger */}
                  <div className="absolute inset-0 flex items-center justify-center z-25">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsVideoPlaying(true);
                        setVideoChapter(0);
                      }}
                      className="w-16 h-16 bg-primary-600 hover:bg-primary-550 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative cursor-pointer"
                      aria-label="Play mobile walk"
                    >
                      <div className="absolute inset-0 rounded-full border border-primary-500/40 animate-ping scale-110"></div>
                      <svg className="w-6 h-6 ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </button>
                  </div>

                  {/* Smartphone App Header */}
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between mt-2 z-10 bg-slate-950/80 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-primary-600 to-emerald-500 flex items-center justify-center text-[9px] font-black">F</div>
                      <span className="text-[10px] font-black uppercase tracking-wider">FMS Mobile App</span>
                    </div>
                    <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black animate-pulse">PREVIEW</span>
                  </div>

                  {/* Smartphone dashboard mock content */}
                  <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto z-10 opacity-70 group-hover:opacity-85 transition-opacity duration-350">
                    
                    {/* Account selector pill */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Default Entity Balance</span>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-bold">Active</span>
                      </div>
                      <h4 className="text-base font-black">Rp 1.489.000.000</h4>
                    </div>

                    {/* Quick micro stats cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Net Profit</span>
                        <span className="text-xs font-extrabold text-emerald-450 text-emerald-400 font-mono">Rp 646.6M</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Payroll</span>
                        <span className="text-xs font-extrabold text-primary-400 font-mono">Rp 842.4M</span>
                      </div>
                    </div>

                    {/* Interactive Mobile Chart Sparkline representation */}
                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-bold text-slate-300">Annual Growth Trend</span>
                        <span className="text-[8px] font-mono text-emerald-400">▲ +14.2%</span>
                      </div>
                      <div className="h-16 flex items-end justify-between px-1 pt-4">
                        <div className="w-[14%] bg-primary-600/30 rounded-t h-6"></div>
                        <div className="w-[14%] bg-primary-600/50 rounded-t h-10"></div>
                        <div className="w-[14%] bg-primary-600/70 rounded-t h-8"></div>
                        <div className="w-[14%] bg-primary-600/90 rounded-t h-12"></div>
                        <div className="w-[14%] bg-emerald-500 rounded-t h-15"></div>
                      </div>
                    </div>

                    {/* Tax section mock */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between space-x-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-md">⚖️</span>
                        <div>
                          <span className="text-[8px] font-mono text-indigo-400 block font-bold leading-none uppercase">Tax Compliance</span>
                          <span className="text-[8.5px] text-slate-350 block truncate max-w-[150px] mt-0.5">Compliant PPN & PPh 21 pay slips</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">➔</span>
                    </div>

                  </div>

                  {/* Smartphone Playback Bottom controls */}
                  <div className="p-4 bg-slate-950 border-t border-white/5 space-y-2 z-25 relative">
                    <div className="h-1 w-full bg-white/10 rounded-full relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-2/5 bg-gradient-to-r from-primary-600 to-emerald-400"></div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
                      <span>01:12 / 03:00</span>
                      <span>CC • 1080p Ultra HD</span>
                    </div>
                  </div>

                  {/* Smartphone home gesture bar at bottom */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full z-45"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INTERACTIVE WALKTHROUGH TOUR CONTENT (TRIGGERS IN A MODAL TO PREVENT IFRAME SANDBOX VIDEO FAILS) */}
        {isVideoPlaying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setIsVideoPlaying(false)}></div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full z-10 shadow-2xl relative flex flex-col h-[85vh] animate-scaleUp overflow-hidden text-white">
              
              {/* Close tool */}
              <button 
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white z-50 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              {/* Title bar */}
              <div className="border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 font-mono">Chapter {videoChapter + 1} of 3</span>
                  <h4 className="text-lg sm:text-xl font-black text-white">FINAGROW Interactive System Walkthrough</h4>
                </div>
                <span className="text-xs font-mono text-slate-500 mr-8 hidden sm:inline">Press ESC to exit</span>
              </div>

              {/* Main player workspace inside modal */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
                
                {/* Simulated video frame window */}
                <div className="col-span-1 md:col-span-3 bg-black rounded-2xl border border-slate-800 relative flex flex-col justify-between p-4 overflow-hidden shadow-inner">
                  
                  {/* Floating chapter notification badge */}
                  <div className="absolute top-4 left-4 inline-block px-3 py-1 bg-primary-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider shadow-md">
                    {videoChapter === 0 && (language === 'en' ? 'Core Journal Engine' : 'Otomatisasi Jurnal Keuangan')}
                    {videoChapter === 1 && (language === 'en' ? 'Tax compliance & Salaries' : 'Perhitungan Gaji & Pajak')}
                    {videoChapter === 2 && (language === 'en' ? 'Cognitive Assistant consult' : 'Konsultasi Finansial AI')}
                  </div>

                  {/* High Resolution visual mock center based on chapter state */}
                  <div className="my-auto text-center py-10 px-4 animate-scaleUp">
                    {videoChapter === 0 && (
                      <div className="space-y-4 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-primary-650 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-primary-500/20">📖</div>
                        <h5 className="text-lg font-black text-white">100% Automated Double-Entry Ledger</h5>
                        <p className="text-xs text-slate-400">
                          {language === 'en' 
                            ? 'Watch how invoice issuances immediately post compound entries into the bookkeeping balance book.' 
                            : 'Lihat bagaimana pembuatan invoice langsung menerbitkan jurnal pembukuan buku besar ganda seimbang secara otomatis.'}
                        </p>
                        
                        {/* Interactive analytical row mock */}
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left space-y-1 text-[10px] font-mono">
                          <div className="text-emerald-400 flex justify-between"><span>[DEBIT] Cash Receivables Account</span><span>+ Rp 12,500,000</span></div>
                          <div className="text-blue-400 flex justify-between"><span>[CREDIT] Product Service Sales Revenue</span><span>- Rp 12,500,000</span></div>
                          <div className="text-slate-500 border-t border-slate-800 pt-1 mt-1 text-right">Status: Balanced double-entry validated ✔️</div>
                        </div>
                      </div>
                    )}

                    {videoChapter === 1 && (
                      <div className="space-y-4 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-emerald-650 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20">💸</div>
                        <h5 className="text-lg font-black text-white">One-Click Salary Disbursement & PPh 21</h5>
                        <p className="text-xs text-slate-400">
                          {language === 'en'
                            ? 'Distribute salary slips to all active branches and calculate regional withholding tax rates automatically.'
                            : 'Kirimkan slip gaji karyawan ditiap cabang dengan perhitungan PPh 21 terintegrasi peraturan DJP dalam satu klik saja.'}
                        </p>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left space-y-1 text-[10px] font-mono">
                          <div className="flex justify-between text-slate-300"><span>Staff: Jessica Tan (Professional ID)</span><span className="font-bold">IDR 15,000,000</span></div>
                          <div className="flex justify-between text-red-400"><span>PPh 21 Regional Tax Withholding</span><span>- IDR 780,000</span></div>
                          <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1 mt-1"><span>Net salary disbursed instantly</span><span>+ IDR 14,220,000</span></div>
                        </div>
                      </div>
                    )}

                    {videoChapter === 2 && (
                      <div className="space-y-4 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-violet-650 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-violet-500/20">🤖</div>
                        <h5 className="text-lg font-black text-white">Active Cognitive Financial Assistant</h5>
                        <p className="text-xs text-slate-400">
                          {language === 'en'
                            ? 'Run conversational audit commands utilizing active accounting records securely with Gemini APIs.'
                            : 'Jalankan konsultasi cerdas berbasis chat langsung menggunakan buku besar perusahaan secara aman menggunakan sensor AI.'}
                        </p>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left space-y-2 text-[10px] font-mono">
                          <p className="text-slate-400 italic">"User: Analyze our logistics leakage..."</p>
                          <p className="text-violet-400 font-bold">"FINAGROW AI: Detected 22% leak inside Lestari branch B mileage claims. Central approvals will secure Rp 45M payout recovery."</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subtitles Overlay state */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center text-xs sm:text-sm font-semibold max-w-2xl mx-auto text-primary-300">
                    {videoChapter === 0 && (
                      language === 'en' 
                        ? '"FINAGROW establishes perfect zero-error ledger logs by updating entries simultaneously across all multi-entity tabs."'
                        : '"FINAGROW menghapus total resiko salah ketik akuntansi dengan memposting transaksi jurnal ke buku besar cabang secara real-time."'
                    )}
                    {videoChapter === 1 && (
                      language === 'en'
                        ? '"Send salaries securely. FINAGROW calculates PPh 21 guidelines dynamically and generates submission-ready tax documents."'
                        : '"Lupakan sakit kepala pajak bulanan. Hitung PPh 21 karyawan dan terbitkan SPT Masa Pajak digital patuh regulasi Kementerian Keuangan."'
                    )}
                    {videoChapter === 2 && (
                      language === 'en'
                        ? '"Your active ledger is analyzed in real-time. Interact conversationally with your accounting database via secure cognitive routines."'
                        : '"Kuasai informasi bisnis Anda. Cari tahu bocoran anggaran atau tren margin dengan berkonsultasi langsung ke AI Asisten kami."'
                    )}
                  </div>

                </div>

                {/* Chapters Menu Column */}
                <div className="hidden md:flex flex-col space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pl-2">System Chapters</span>
                  
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setVideoChapter(idx)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border font-bold text-xs relative overflow-hidden ${
                        videoChapter === idx
                          ? 'bg-slate-850 border-primary-500 text-primary-450 text-primary-400 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] p-1 bg-slate-800 text-slate-350 rounded">0{idx + 1}</span>
                        <span>
                          {idx === 0 && (language === 'en' ? 'General Ledger' : 'Buku Besar')}
                          {idx === 1 && (language === 'en' ? 'Salaries & Taxes' : 'Gaji & Pajak')}
                          {idx === 2 && (language === 'en' ? 'Asisten AI' : 'Asisten AI')}
                        </span>
                      </div>
                      
                      {/* Interactive audio track visual effect on active chapter card */}
                      {videoChapter === idx && (
                        <div className="flex space-x-0.5 justify-end mt-2">
                          <span className="w-1 h-3 bg-primary-500 rounded animate-pulse"></span>
                          <span className="w-1 h-4 bg-primary-400 rounded animate-bounce"></span>
                          <span className="w-1 h-2 bg-primary-500 rounded animate-pulse"></span>
                        </div>
                      )}
                    </button>
                  ))}

                  <div className="mt-auto bg-slate-950 p-4 border border-slate-850 rounded-2xl text-center space-y-1">
                    <span className="text-[10.5px] font-mono text-slate-400 block font-bold">Need Personal Tour?</span>
                    <button 
                      onClick={() => {
                        setIsVideoPlaying(false);
                        onNavigate('auth', 'register');
                      }}
                      className="w-full bg-primary-600 hover:bg-primary-550 text-white font-black text-[10px] py-1.5 rounded-lg uppercase tracking-wider block transition-all"
                    >
                      Start Free Trial
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom modal toolbar and navigation actions */}
              <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setVideoChapter((prev) => (prev > 0 ? prev - 1 : 2))}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ⬅️ Prev
                  </button>
                  <button 
                    onClick={() => setVideoChapter((prev) => (prev < 2 ? prev + 1 : 0))}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Next ➡️
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsVideoPlaying(false)}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    Close Player
                  </button>
                  <button 
                    onClick={() => {
                      setIsVideoPlaying(false);
                      onNavigate('auth', 'register');
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-700/10"
                  >
                    Join FINAGROW Today
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </section>

      {/* 5. Pricing Section (Directly maps plans found inside Subscription.tsx) */}
      <section id="pricing" className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 py-20 border-t border-b border-slate-200/50 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fadeIn">
          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-100 dark:bg-primary-950/80 px-4 py-1.5 rounded-full">
            💳 {local.pricingTitle}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold mt-6 tracking-tight text-slate-900 dark:text-white">
            {language === 'en' ? 'Simple, Transparent Pricing' : 'Skema Paket Harga Transparan'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
            {language === 'en'
              ? 'No complex credits, no hidden multi-branch deployment rates. Simple flat monthly licensing built for businesses.'
              : 'Tanpa biaya tambahan tersembunyi, satu lisensi flat bulanan yang mencakup semua pengelolaan modul krusial Anda.'}
          </p>
          <div className="inline-flex items-center space-x-2 mt-6 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'en' ? 'Monthly Flat Plan Active' : 'Sistem Pembayaran Bulanan Flat Aktif'}</span>
          </div>
        </div>

        {/* Interactive Addons Panel */}
        <div className="max-w-4xl mx-auto mb-12 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-inner">
          <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest mb-3 text-center flex items-center justify-center space-x-2">
            <span>⚙️</span>
            <span>{language === 'en' ? 'Interactive Custom Add-on Extensions' : 'Simulasi Fitur Tambahan Interaktif'}</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6 text-center max-w-xl mx-auto">
            {language === 'en' 
              ? 'Select system add-on packages to calculate. Adjusted prices are computed into licensing options below instantly!' 
              : 'Pilih add-on sistem di bawah untuk disimulasikan. Penyesuaian lisensi langsung didefinisikan ke dalam paket secara real-time!'}
          </p>
          
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Addon 1 */}
            <label className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
              pricingAddons.auditGuard 
                ? 'bg-primary-50 px-4 dark:bg-primary-950/20 border-primary-500 shadow-md ring-2 ring-primary-500/10 scale-[1.02]' 
                : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/40'
            }`}>
              <input 
                type="checkbox"
                checked={pricingAddons.auditGuard}
                onChange={(e) => setPricingAddons(prev => ({ ...prev, auditGuard: e.target.checked }))}
                className="w-4.5 h-4.5 text-primary-600 rounded focus:ring-primary-555 border-slate-350 dark:border-slate-700 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-black text-slate-850 dark:text-white block">🛡️ Audit Shield</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold mt-0.5">+Rp 100.000/bln</span>
              </div>
            </label>

            {/* Addon 2 */}
            <label className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
              pricingAddons.multiEntity 
                ? 'bg-emerald-50 px-4 dark:bg-emerald-950/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/10 scale-[1.02]' 
                : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/40'
            }`}>
              <input 
                type="checkbox"
                checked={pricingAddons.multiEntity}
                onChange={(e) => setPricingAddons(prev => ({ ...prev, multiEntity: e.target.checked }))}
                className="w-4.5 h-4.5 text-emerald-600 rounded focus:ring-emerald-555 border-slate-350 dark:border-slate-700 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-black text-slate-850 dark:text-white block">🏢 Multi-Entity Hub</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold mt-0.5">+Rp 300.000/bln</span>
              </div>
            </label>

            {/* Addon 3 */}
            <label className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
              pricingAddons.prioritySupport 
                ? 'bg-indigo-50 px-4 dark:bg-indigo-950/20 border-indigo-500 shadow-md ring-2 ring-indigo-500/10 scale-[1.02]' 
                : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/40'
            }`}>
              <input 
                type="checkbox"
                checked={pricingAddons.prioritySupport}
                onChange={(e) => setPricingAddons(prev => ({ ...prev, prioritySupport: e.target.checked }))}
                className="w-4.5 h-4.5 text-indigo-600 rounded focus:ring-indigo-555 border-slate-350 dark:border-slate-700 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-black text-slate-850 dark:text-white block">💬 On-Call Support</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold mt-0.5">+Rp 250.000/bln</span>
              </div>
            </label>
          </div>
        </div>

        {/* Dynamic Pricing Cards (Now set to w-full to align perfectly with navbar content) */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch w-full animate-fadeIn">
          
          {/* Plan 1: Starter */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900 p-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl h-full">
            <div className="flex-grow flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-505">INDIVIDUAL / UMKM</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mt-1">{local.starterPlan}</h3>
                <p className="text-xs text-slate-500 mt-2 font-semibold">{local.incStarter}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                    Rp {((150000 + (pricingAddons.auditGuard ? 100000 : 0) + (pricingAddons.multiEntity ? 300000 : 0) + (pricingAddons.prioritySupport ? 250000 : 0))).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 ml-1.5">{local.perMonth}</span>
                </div>

                <ul className="mt-8 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-grow">
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Up to 100 transactions/mo</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Basic Ledger Invoicing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>1 Seat User Role</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Standard Report Generals</span>
                  </li>
                  {pricingAddons.auditGuard && (
                    <li className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 font-extrabold">
                      <CheckIcon className="w-4 h-4 text-primary-500 animate-pulse" />
                      <span>Shield Protection Active</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button 
                  onClick={() => onNavigate('auth', 'register')}
                  className="w-full bg-slate-100 hover:bg-slate-250 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 py-3.5 rounded-2xl font-black text-xs text-center block transition-all hover:scale-[1.01] cursor-pointer"
                >
                  Choose This Plan
                </button>
              </div>
            </div>
          </div>

          {/* Plan 2: Professional (Highlight Popular) */}
          <div className="border-2 border-primary-500 rounded-3xl shadow-xl bg-white dark:bg-slate-900 p-8 flex flex-col justify-between relative transform scale-100 md:scale-102 lg:scale-[1.03] z-10 transition-all duration-300 h-full">
            <span className="absolute top-0 right-10 -translate-y-1/2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">
              🔥 {local.popular}
            </span>
            
            <div className="flex-grow flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">GROWING BUSINESS</span>
                <h3 className="text-xl font-black text-primary-600 dark:text-primary-400 uppercase tracking-wider mt-1">{local.proPlan}</h3>
                <p className="text-xs text-slate-500 mt-2 font-semibold">{local.incPro}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                    Rp {((450000 + (pricingAddons.auditGuard ? 100000 : 0) + (pricingAddons.multiEntity ? 300000 : 0) + (pricingAddons.prioritySupport ? 250000 : 0))).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 ml-1.5">{local.perMonth}</span>
                </div>

                <ul className="mt-8 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-grow">
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-950 dark:text-white font-bold">Unlimited General Transactions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Up to 5 Users Seat Assigns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Comprehensive Payroll run</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Inventory tracker & valuation</span>
                  </li>
                  <li className="flex items-center space-x-2 font-bold text-primary-600 dark:text-primary-400">
                    <CheckIcon className="w-4 h-4 text-primary-500" />
                    <span>AI Financial Partner Included</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button 
                  onClick={() => onNavigate('auth', 'register')}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-450 text-white py-3.5 rounded-2xl font-black text-xs text-center block transition-all shadow-lg hover:scale-[1.01] shadow-primary-600/20 cursor-pointer"
                >
                  Choose This Plan
                </button>
              </div>
            </div>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900 p-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl h-full">
            <div className="flex-grow flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">LARGE ENTERPRISE</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mt-1">{local.entPlan}</h3>
                <p className="text-xs text-slate-500 mt-2 font-semibold">{local.incEnt}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                    Rp {((1500000 + (pricingAddons.auditGuard ? 100000 : 0) + (pricingAddons.multiEntity ? 300000 : 0) + (pricingAddons.prioritySupport ? 250000 : 0))).toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 ml-1.5">{local.perMonth}</span>
                </div>

                <ul className="mt-8 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-grow">
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Consolidated Group Multi-Entities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Unlimited Seats & API Access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Custom advanced role permissions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-emerald-500" />
                    <span>Dedicated Key Account Advisor</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button 
                  onClick={() => onNavigate('auth', 'register')}
                  className="w-full bg-slate-900 hover:bg-slate-850 dark:bg-slate-850 dark:hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs text-center block transition-all hover:scale-[1.01] cursor-pointer"
                >
                  Choose This Plan
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Section Testimoni (4 high accuracy card layout matching design requirements) */}
      <section id="testimonials" className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 py-24 border-b border-slate-200/50 dark:border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-100 dark:bg-primary-950/80 px-4 py-1.5 rounded-full">
            💬 Success Stories
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-6 text-slate-900 dark:text-white">
            {local.testiTitle}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed text-sm">
            {language === 'en' 
              ? 'Real-world results from companies who reduced accounting overhead by 75% or migrated safely from old spreadsheets.'
              : 'Hasil verifikasi nyata dari bisnis lokal yang memangkas waktu kerja manual pembukuan hingga 75%.'}
          </p>

          {/* Interactive Filtering Tabs for Testimonials */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {[
              { id: 'all', label: language === 'en' ? '👥 All Industries' : '👥 Semua Industri' },
              { id: 'corporate', label: language === 'en' ? '🏢 CFO & Corporate' : '🏢 CFO & Korporat' },
              { id: 'umkm', label: language === 'en' ? '🛍️ SMEs & Growth' : '🛍️ UMKM & Ritel' },
              { id: 'advisor', label: language === 'en' ? '🛡️ Advisors & Tax' : '🛡️ Konsultan & Pajak' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTestimonialCategory(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  testimonialCategory === tab.id
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/15 scale-102 font-black'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Testimonials List (Widescreen layout aligning with navbar width limitations) */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full items-stretch">
          {/* Card 1: Enterprise/Corporate */}
          {((testimonialCategory === 'all' || testimonialCategory === 'corporate')) && (
            <div 
              onMouseEnter={() => setHoverTestimonialId(1)}
              onMouseLeave={() => setHoverTestimonialId(null)}
              onClick={() => setSelectedCaseStudyId(selectedCaseStudyId === 1 ? null : 1)}
              className={`group relative p-6 rounded-3xl bg-white dark:bg-slate-900/60 border dark:border-slate-800/65 shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between h-full cursor-pointer select-none ${
                hoverTestimonialId === 1 
                  ? 'border-primary-500 shadow-xl ring-2 ring-primary-500/10 scale-[1.02]' 
                  : 'border-slate-200/60'
              }`}
            >
              <div className="absolute top-0 right-0 p-6 text-primary-500/5 dark:text-primary-500/10 text-6xl font-sans font-black pointer-events-none select-none">“</div>
              <div>
                <div className="flex items-center space-x-1 text-amber-500 mb-4">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-relaxed mb-6 block relative z-10">
                  "FINAGROW multi-entity dashboard is a true game-changer. What used to take our accounting analysts 40 hours of manual Excel stitching and currency adjustments every month is now finished live in seconds. Outstanding ROI!"
                </p>
                
                {selectedCaseStudyId === 1 && (
                  <div className="p-3 mb-4 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-500/20 text-[10px] text-slate-600 dark:text-slate-300 animate-slideUp">
                    <strong className="block text-primary-600 dark:text-primary-400 mb-1">📈 Key Metric:</strong>
                    • Excel reporting cycle cut from 5 days to real-time.<br/>
                    • Automatic FX translation for 3 Singaporean subsidiaries.
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-500 font-black flex items-center justify-center text-white text-xs shadow-md shadow-primary-500/20 transform group-hover:scale-105 transition-all">
                  DS
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-950 dark:text-white truncate">Dian Sastrowardoyo</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">Chief Financial Officer • Lestari Group</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: UMKM/SMEs */}
          {((testimonialCategory === 'all' || testimonialCategory === 'umkm')) && (
            <div 
              onMouseEnter={() => setHoverTestimonialId(2)}
              onMouseLeave={() => setHoverTestimonialId(null)}
              onClick={() => setSelectedCaseStudyId(selectedCaseStudyId === 2 ? null : 2)}
              className={`group relative p-6 rounded-3xl bg-white dark:bg-slate-900/60 border dark:border-slate-800/65 shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between h-full cursor-pointer select-none ${
                hoverTestimonialId === 2 
                  ? 'border-emerald-555 border-emerald-500 shadow-xl ring-2 ring-emerald-500/10 scale-[1.02]' 
                  : 'border-slate-200/60'
              }`}
            >
              <div className="absolute top-0 right-0 p-6 text-emerald-500/5 dark:text-emerald-500/10 text-6xl font-sans font-black pointer-events-none select-none">“</div>
              <div>
                <div className="flex items-center space-x-1 text-amber-500 mb-4">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-relaxed mb-6 block relative z-10">
                  "We started with the Starter package as a humble craft UMKM branch. FINAGROW helped us organize cash receipts perfectly. Now that we scaled to 5 regional operations, upgrading plans were completely frictionless."
                </p>

                {selectedCaseStudyId === 2 && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-[10px] text-slate-600 dark:text-slate-300 animate-slideUp">
                    <strong className="block text-emerald-600 dark:text-emerald-400 mb-1">📈 Key Metric:</strong>
                    • Multi-warehouse inventory valuation live accuracy.<br/>
                    • Cash receipts reconciled in 1-click instead of cross-referencing ledger.
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 font-black flex items-center justify-center text-white text-xs shadow-md shadow-emerald-500/20 transform group-hover:scale-105 transition-all">
                  RH
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-950 dark:text-white truncate">Rudi Hermawan</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">Founder • Hermawan Craft & Decors</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: UMKM/SMEs Tech */}
          {((testimonialCategory === 'all' || testimonialCategory === 'umkm')) && (
            <div 
              onMouseEnter={() => setHoverTestimonialId(3)}
              onMouseLeave={() => setHoverTestimonialId(null)}
              onClick={() => setSelectedCaseStudyId(selectedCaseStudyId === 3 ? null : 3)}
              className={`group relative p-6 rounded-3xl bg-white dark:bg-slate-900/60 border dark:border-slate-800/65 shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between h-full cursor-pointer select-none ${
                hoverTestimonialId === 3 
                  ? 'border-indigo-505 border-indigo-500 shadow-xl ring-2 ring-indigo-500/10 scale-[1.02]' 
                  : 'border-slate-200/60'
              }`}
            >
              <div className="absolute top-0 right-0 p-6 text-indigo-500/5 dark:text-indigo-500/10 text-6xl font-sans font-black pointer-events-none select-none">“</div>
              <div>
                <div className="flex items-center space-x-1 text-amber-500 mb-4">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-relaxed mb-6 block relative z-10">
                  "The AI Financial Assistant feels like having an on-call elite business consultant. I can casually query 'explain expense spikes last week' inside the chat, and it instantly isolated shipping deviations. Absolutely priceless."
                </p>

                {selectedCaseStudyId === 3 && (
                  <div className="p-3 mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 text-[10px] text-slate-600 dark:text-slate-300 animate-slideUp">
                    <strong className="block text-indigo-600 dark:text-indigo-400 mb-1">📈 Key Metric:</strong>
                    • Zero manual formulas written for dynamic expense tracking.<br/>
                    • Discovered 12% excess spend on duplicated cloud server storage.
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 font-black flex items-center justify-center text-white text-xs shadow-md shadow-indigo-500/20 transform group-hover:scale-105 transition-all">
                  SL
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-950 dark:text-white truncate">Sarah Lim</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">Head of Operations • TechCorp</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Advisors/Complaince */}
          {((testimonialCategory === 'all' || testimonialCategory === 'advisor')) && (
            <div 
              onMouseEnter={() => setHoverTestimonialId(4)}
              onMouseLeave={() => setHoverTestimonialId(null)}
              onClick={() => setSelectedCaseStudyId(selectedCaseStudyId === 4 ? null : 4)}
              className={`group relative p-6 rounded-3xl bg-white dark:bg-slate-900/60 border dark:border-slate-800/65 shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between h-full cursor-pointer select-none ${
                hoverTestimonialId === 4 
                  ? 'border-rose-505 border-rose-500 shadow-xl ring-2 ring-rose-500/10 scale-[1.02]' 
                  : 'border-slate-200/60'
              }`}
            >
              <div className="absolute top-0 right-0 p-6 text-rose-500/5 dark:text-rose-500/10 text-6xl font-sans font-black pointer-events-none select-none">“</div>
              <div>
                <div className="flex items-center space-x-1 text-amber-500 mb-4">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold leading-relaxed mb-6 block relative z-10">
                  "The automatic tax calculated ledger is remarkably accurate. Compliant generation of PPN invoice reports and PPh 21 pay slips eliminated 99% of audit and compliance friction before deadlines. Highly recommended."
                </p>

                {selectedCaseStudyId === 4 && (
                  <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-[10px] text-slate-600 dark:text-slate-300 animate-slideUp">
                    <strong className="block text-rose-600 dark:text-rose-400 mb-1">📈 Key Metric:</strong>
                    • Compliant monthly tax reports generated with zero audit errors.<br/>
                    • Tax advisory reconciliation time reduced from 2 weeks to 3 hours.
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 font-black flex items-center justify-center text-white text-xs shadow-md shadow-rose-500/20 transform group-hover:scale-105 transition-all">
                  BS
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-950 dark:text-white truncate">Budi Santoso</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">Managing Partner • Santoso Certified</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 7. CTA (Call To Action) Section (Sophisticated support of light/dark elegant theme) */}
      <section id="cta" className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-tr from-primary-50 via-emerald-50/50 to-emerald-100/30 dark:from-slate-950 dark:via-primary-950/20 dark:to-slate-900 text-slate-900 dark:text-white p-8 sm:p-20 text-center border border-slate-200/80 dark:border-slate-800/80 shadow-xl dark:shadow-2xl">
          {/* Subtle neon glowing mesh nodes in background */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none select-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary-500/10 dark:bg-primary-500/5 blur-3xl pointer-events-none select-none"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              {language === 'en' ? 'Get Back 10 Hours of Finance Overhead Every Single Week' : 'Hemat 10 Jam Pembukuan Manual Tiap Minggu Mulai Hari ini'}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mt-6 text-sm sm:text-base font-medium leading-relaxed">
              {language === 'en' ? 'Try the full platform with all capabilities for 14 days. No payment card requested. Set up inside 60 seconds.' : 'Uji coba seluruh fitur premium FINAGROW selama 14 hari penuh. Tanpa kartu kredit. Selesai atur dalam 60 detik.'}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <button 
                onClick={() => onNavigate('auth', 'register')}
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-550 text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary-600/15 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase tracking-wider font-mono"
              >
                {language === 'en' ? 'Start Your Free Trial' : 'Uji Coba Gratis Sekarang'}
              </button>
              <button 
                onClick={() => handleScrollToSegment('demo')}
                className="w-full sm:w-auto px-8 py-4 bg-slate-200/75 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl transition-all cursor-pointer"
              >
                {language === 'en' ? 'See System Simulation' : 'Lihat Simulasi Sistem'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer (Perfect spacing, Contech.id creator attribution, 100% accurate brand socials, Policy Modals) */}
      <footer className="bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-900 transition-colors duration-300">
        <div className="max-w-[94%] xl:max-w-[92%] 2xl:max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-16">
          <div className="grid md:grid-cols-4 gap-12 sm:gap-8 items-start mb-12">
            
            {/* Brand column */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <img src="/logo.png" alt="FINAGROW" className="w-8 h-8 rounded-lg object-contain shadow" />
                <span className="text-xl font-black text-slate-900 dark:text-white">FINAGROW</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {local.contactText}
              </p>
              
              {/* Creator notice requested by contech */}
              <p className="text-xs text-slate-400">
                Created by{' '}
                <a 
                  href="https://contech.id" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-bold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Contech.id
                </a>
              </p>
            </div>

            {/* Quick Navigation footer links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Sitemap</h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <li><button onClick={() => handleScrollToSegment('issues-solutions')} className="hover:text-primary-500">Challenges</button></li>
                <li><button onClick={() => handleScrollToSegment('demo')} className="hover:text-primary-500">System Demo</button></li>
                <li><button onClick={() => handleScrollToSegment('pricing')} className="hover:text-primary-500">Subscription Plans</button></li>
                <li><button onClick={() => handleScrollToSegment('testimonials')} className="hover:text-primary-500 font-bold">Partner Testimonials</button></li>
              </ul>
            </div>

            {/* Legal Documents (Popups implemented as overlays for elite UX) */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Compliance</h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400 text-left">
                <li>
                  <button 
                    onClick={() => setActiveModal('privacy')} 
                    className="hover:text-primary-500 transition-colors cursor-pointer block text-left"
                  >
                    🔐 Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveModal('terms')} 
                    className="hover:text-primary-500 transition-colors cursor-pointer block text-left"
                  >
                    📜 Terms of Service
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveModal('security')} 
                    className="hover:text-primary-500 transition-colors cursor-pointer block text-left"
                  >
                    🛡️ Security Standards
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <hr className="border-slate-200 dark:border-slate-900 my-8" />

          {/* Social media connections (100% faithful shapes to authentic brand guidelines) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-[11px] font-mono text-slate-400">
              © 2026 FINAGROW Financial Hub. {local.copyright}
            </span>

            {/* Social media links mapping Contech.id properties */}
            <div className="flex items-center space-x-5 text-slate-400 dark:text-slate-500">
              {/* Instagram URL */}
              <a 
                href="https://www.instagram.com/contech.id/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#E1306C] transition-colors"
                aria-label="Instagram contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* Threads URL */}
              <a 
                href="https://www.threads.com/@contech.id?hl=id" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-black dark:hover:text-white transition-colors"
                aria-label="Threads contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.5 0C5.6 0 0 5.6 0 12.5S5.6 25 12.5 25c1.6 0 3.1-.3 4.5-.8l-.5-1.4c-1.2.4-2.6.7-4 .7-6 0-11-5-11-11S6.5 1.5 12.5 1.5s11 5 11 11c0 2.8-1 5-2.7 6.3-1.4 1-3.2 1.3-4.8.7-1.2-.5-2.1-1.6-2.5-3 .9-.8 1.5-1.9 1.5-3.1 0-2.5-2-4.5-4.5-4.5S6 10 6 12.5s2 4.5 4.5 4.5c.8 0 1.6-.2 2.3-.6.7 1.5 1.9 2.7 3.5 3.3 2.1.8 4.4.4 6.2-.9 2.3-1.7 3.5-4.6 3.5-8.3C25 5.6 19.4 0 12.5 0zm-2 15.5c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
                </svg>
              </a>

              {/* X URL */}
              <a 
                href="https://x.com/contechofficial" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-black dark:hover:text-white transition-colors"
                aria-label="X contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Facebook URL */}
              <a 
                href="https://web.facebook.com/contech.id." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#1877F2] transition-colors"
                aria-label="Facebook contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* TikTok URL */}
              <a 
                href="https://www.tiktok.com/@contech.id" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#010101] dark:hover:text-white transition-colors"
                aria-label="TikTok contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.52-4.06-1.37a8.47 8.47 0 01-1.74-1.73v7.62a8.25 8.25 0 01-8.25 8.25A8.25 8.25 0 01.12 14.5a8.25 8.25 0 018.25-8.25c.36 0 .72.03 1.08.08V10.4c-.36-.08-.73-.12-1.1-.11a4.22 4.22 0 00-4.21 4.22 4.22 4.22 0 004.21 4.22 4.22 4.22 0 004.21-4.22V0h2.97z" />
                </svg>
              </a>

              {/* Youtube URL */}
              <a 
                href="https://www.youtube.com/@contechid1288" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#FF0000] transition-colors"
                aria-label="YouTube contech"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 9. Compliance Policy Modals (Triggered smoothly via state transitions) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-850 p-6 sm:p-8 max-w-2xl w-full z-10 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-scaleUp">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-950 dark:hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {activeModal === 'privacy' && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 block uppercase tracking-widest">🔐 Compliance Document</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Privacy & Security Commitment</h3>
                <p className="text-xs text-slate-400 mt-1">Updated on March 20, 2026</p>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed font-medium">
                  <p>
                    {language === 'en' 
                      ? 'At FINAGROW (managed under creators at Contech.id), we guarantee total security isolation of your financial ledgers. We do not sell, read, or distribute your client databases to third parties.'
                      : 'Di FINAGROW (dikelola oleh Contech.id), kami menjamin isolasi keamanan total atas buku besar keuangan Anda. Kami tidak menjual, membaca, atau mendistribusikan database klien Anda kepada pihak ketiga.'}
                  </p>
                  <p className="font-bold underline text-primary-600">
                    {language === 'en' 
                      ? '1. Triple-Mirror Redundancy Encryption' 
                      : '1. Enkripsi Redundansi Triple-Mirror'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'Every completed journal entry and accounting file is split into 256-bit encrypted hashes mirrored in three independent certified cloud data centers safely.'
                      : 'Setiap entri jurnal dan berkas akuntansi yang selesai dipisah menjadi hash terenkripsi 256-bit yang dicerminkan di tiga pusat data cloud bersertifikat secara aman.'}
                  </p>
                  <p className="font-bold underline text-slate-900 dark:text-white">
                    {language === 'en' ? '2. Local Tax API compliance limits' : '2. Batasan Kepatuhan API Pajak Lokal'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'PPN or PPh 21 tax summaries generated inside our system comply strictly with updated Kementerian Keuangan (DJP) APIs. We never submit filings automatically without manual validation of your authorized accounts.'
                      : 'Ringkasan pajak PPN atau PPh 21 yang dihasilkan sistem kami sepenuhnya mematuhi API Kementerian Keuangan (DJP) yang diperbarui. Kami tidak pernah mengirimkan berkas tanpa validasi manual dari akun resmi Anda.'}
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'terms' && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 block uppercase tracking-widest">📜 Regulatory Contract</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">User Terms of Service</h3>
                <p className="text-xs text-slate-400 mt-1">Effective Immediately</p>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed font-medium">
                  <p>
                    {language === 'en'
                      ? 'By operating the FINAGROW platform, you acknowledge the terms of financial and accounting liability representation:'
                      : 'Dengan menjalankan platform FINAGROW, Anda mengakui ketentuan representasi liabilitas keuangan dan akuntansi berikut:'}
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {language === 'en' ? '1. Zero-Friction Upgrades & Downgrades' : '1. Upgrade & Downgrade Bebas Hambatan'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'Starter, Professional, and Enterprise packages have no minimum termination lock-ins. Users are free to adjust tiers depending on temporary transaction volumes.'
                      : 'Paket Starter, Professional, dan Enterprise tidak memiliki kontrak penguncian minimum. Pengguna bebas menyesuaikan paket berdasarkan volume transaksi berkala.'}
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {language === 'en' ? '2. Accuracy of AI Cognitive Outputs' : '2. Akurasi Hasil Kognitif AI'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'Our built-in AI chat consultant processes actual balances using Gemini models. However, they are intended as cognitive analytics helpers and do not constitute authorized legal, auditing, or certified public accountant representations.'
                      : 'Asisten konsultasi AI internal kami memproses saldo riil menggunakan model Gemini. Namun, fitur ini ditujukan sebagai pembantu analitis kognitif dan tidak mewakili legalitas audit formal akuntan publik.'}
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'security' && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 block uppercase tracking-widest">🛡️ Global Security Specs</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Security & Backup Practices</h3>
                <p className="text-xs text-slate-400 mt-1">OJK Standards Compliance</p>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed font-medium">
                  <p>
                    {language === 'en'
                      ? 'FINAGROW practices enterprise-grade cybersecurity architectures with active guards:'
                      : 'FINAGROW melatih arsitektur keamanan siber tingkat korporat dengan pengamanan aktif:'}
                  </p>
                  <p className="font-bold text-emerald-600">
                    {language === 'en' ? '✓ ISO/IEC 27001 Infrastructure TLS' : '✓ Server TLS Bersertifikat ISO/IEC 27001'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'All connection vectors between clients and database repositories are wrapped in high-grade TLS streams. Intrusions are blocked and automatically reported to sysadmins.'
                      : 'Setiap aliran koneksi antara klien dan repositori database dibungkus dalam TLS tingkat tinggi. Percobaan intrusi diblokir otomatis dan dilaporkan kepada administrator.'}
                  </p>
                  <p className="font-bold text-emerald-600">
                    {language === 'en' ? '✓ Automatic Daily Snapshot Backups' : '✓ Pencadangan Snapshot Harian Otomatis'}
                  </p>
                  <p>
                    {language === 'en'
                      ? 'We trigger full secure automated snapshots state backups every single midnight at 00:00 UTC. In the event of network anomalies, your ledger system recovers instantly inside 5 minutes.'
                      : 'Kami memicu cadangan status snapshot otomatis penuh setiap tengah malam pukul 00:00 UTC. Jika terjadi anomali jaringan, buku besar Anda pulih instan dalam 5 menit.'}
                  </p>
                </div>
              </div>
            )}

            <button 
              onClick={() => setActiveModal(null)}
              className="mt-8 w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs py-3.5 rounded-xl transition-colors"
            >
              {local.modalClose}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
