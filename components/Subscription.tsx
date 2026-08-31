import React, { useState, useEffect } from 'react';
import { CheckIcon } from './icons/IconComponents';
import { subscriptionApi, Subscription as SubType } from '../src/services/api/subscriptionApi';
import { useFMS } from '../context/FMSContext';
import { useLocalization } from '../hooks/useLocalization';
import { Sparkles, Check, Flame, ArrowRight, ShieldCheck } from 'lucide-react';

interface SubscriptionProps {
  onNavigate: (state: 'landing' | 'auth' | 'subscription' | 'app') => void;
}

const Subscription: React.FC<SubscriptionProps> = ({ onNavigate }) => {
  const { state, dispatch } = useFMS();
  const { language } = useLocalization();
  const [currentSub, setCurrentSub] = useState<SubType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('PRO');

  useEffect(() => {
    subscriptionApi.getCurrentSubscription()
      .then((sub) => {
        setCurrentSub(sub);
        setSelectedPlan(sub.planCode);
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    setIsLoading(true);
    try {
      const updated = await subscriptionApi.changePlan(plan);
      setCurrentSub(updated);
      dispatch({ type: 'SET_SUBSCRIPTION', payload: plan === 'PRO' || plan === 'ENTERPRISE' ? 'Pro' : 'Free' });
      setTimeout(() => {
        setIsLoading(false);
        onNavigate('app');
      }, 800);
    } catch (err) {
      console.warn('Subscription update failed:', err);
      dispatch({ type: 'SET_SUBSCRIPTION', payload: plan === 'PRO' || plan === 'ENTERPRISE' ? 'Pro' : 'Free' });
      setIsLoading(false);
      onNavigate('app');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paket Berlangganan FINAGROW</span>
          </div>
          <h2 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            {language === 'id' ? 'Pilih Paket Finansial Terbaik untuk Bisnis Anda' : 'Choose the Right Plan for Your Business'}
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            {language === 'id' 
              ? 'Mulai pembukuan multi-entitas, rekonsiliasi bank otomatis, kepatuhan pajak PPN & PPh, serta analisis AI modern.' 
              : 'Empower your company with double-entry accounting, VAT/PPh tax engines, and AI-driven fiscal control.'}
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {/* Starter Plan */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 transition-transform hover:-translate-y-1 hover:shadow-xl">
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Starter</h3>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">{language === 'id' ? 'Cocok untuk freelancer dan UMKM rintisan.' : 'Perfect for freelancers and small UMKM.'}</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Rp 150k</span>
                <span className="text-base font-medium text-gray-500 dark:text-gray-400">/bln</span>
              </p>
              <button 
                onClick={() => handleSubscribe('STARTER')} 
                disabled={isLoading} 
                className="mt-8 block w-full bg-primary-50 dark:bg-gray-700 text-primary-700 dark:text-white border border-transparent rounded-xl py-3 px-6 text-center font-bold hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {isLoading ? 'Memproses...' : (language === 'id' ? 'Pilih Paket Starter' : 'Select Starter')}
              </button>
            </div>
            <div className="pt-6 pb-8 px-8">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{language === 'id' ? 'Fitur Termasuk' : "What's included"}</h4>
              <ul className="mt-6 space-y-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Jurnal Umum & Buku Besar Standar</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Penjualan & Pembelian Kas</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 1 Entitas Usaha</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Laporan Laba Rugi Dasar</li>
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary-500 rounded-3xl shadow-xl divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 relative transform lg:scale-105 z-10">
            <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center">
              <span className="bg-primary-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Paling Populer</span>
              </span>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Pro Enterprise</h3>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">{language === 'id' ? 'Solusi lengkap bisnis berkembang & skala menengah.' : 'Complete suite for growing businesses.'}</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Rp 350k</span>
                <span className="text-base font-medium text-gray-500 dark:text-gray-400">/bln</span>
              </p>
              <button 
                onClick={() => handleSubscribe('PRO')} 
                disabled={isLoading} 
                className="mt-8 block w-full bg-primary-600 text-white border border-transparent rounded-xl py-3 px-6 text-center font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/30 transition-colors cursor-pointer"
              >
                {isLoading ? 'Memproses...' : (language === 'id' ? 'Aktifkan Akses Penuh' : 'Activate Full Access')}
              </button>
            </div>
            <div className="pt-6 pb-8 px-8">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{language === 'id' ? 'Fitur Unggulan' : "What's included"}</h4>
              <ul className="mt-6 space-y-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Multi-Entitas & Multi-Cabang Terisolasi</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Mesin Pajak PPN (12%), PPh 23 & PPh 4(2)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Modul Penggajian & PPh 21 Karyawan</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Rekonsiliasi Bank Otomatis & MT940</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> AI Financial Advisor Terintegrasi</li>
              </ul>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 transition-transform hover:-translate-y-1 hover:shadow-xl">
            <div className="p-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Custom / Korporasi</h3>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">{language === 'id' ? 'Kustomisasi penuh dengan SLA dedicated.' : 'Full customization and dedicated support.'}</p>
              <p className="mt-8">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">Rp 950k</span>
                <span className="text-base font-medium text-gray-500 dark:text-gray-400">/bln</span>
              </p>
              <button 
                onClick={() => handleSubscribe('ENTERPRISE')} 
                disabled={isLoading} 
                className="mt-8 block w-full bg-primary-50 dark:bg-gray-700 text-primary-700 dark:text-white border border-transparent rounded-xl py-3 px-6 text-center font-bold hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {isLoading ? 'Memproses...' : (language === 'id' ? 'Hubungi Korporasi' : 'Contact Enterprise')}
              </button>
            </div>
            <div className="pt-6 pb-8 px-8">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{language === 'id' ? 'Fitur Khusus' : "What's included"}</h4>
              <ul className="mt-6 space-y-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Pengguna Tak Terbatas (Unlimited Seats)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Dedicated Account Manager & Training</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Audit Log Forensik & Rekonsiliasi Kompleks</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => onNavigate('app')}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <span>{language === 'id' ? 'Kembali ke Aplikasi Utama' : 'Return to Main Application'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
