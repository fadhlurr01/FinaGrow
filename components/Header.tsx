import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, ChevronDown, Check, Globe, Languages, Menu, LogOut, CheckCircle2, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';

interface HeaderProps {
  currentView: string;
  isMobileSidebarOpen?: boolean;
  setIsMobileSidebarOpen?: (open: boolean) => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, isMobileSidebarOpen, setIsMobileSidebarOpen, onLogout }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLocalization();
  const { state, dispatch } = useFMS();
  const isPro = state.subscription === 'Pro';
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine user identity dynamically adapting to actual logged-in credentials
  const registeredUsers = (() => {
    try {
      const data = localStorage.getItem('fms_registered_users');
      return data ? JSON.parse(data) : [];
    } catch (_) {
      return [];
    }
  })();

  const activeEmail = state.currentUserEmail;
  const activeUserFromList = activeEmail ? registeredUsers.find((u: any) => u.email.toLowerCase() === activeEmail.toLowerCase()) : null;
  const userName = activeUserFromList ? activeUserFromList.name : (state.users?.[0]?.name || (state.role === 'User' ? 'Demo User' : 'Demo Admin'));
  const userEmail = activeEmail || 'demo_admin@fms.com';
  const userPlan = state.role === 'Admin' ? 'Pro Plan' : 'Standard Plan';
  
  // Load avatar image dynamically from localStorage or fallback
  const userAvatar = localStorage.getItem('fms_avatar_' + userEmail) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100';

  const formatViewName = (view: string) => {
    return t(view.toLowerCase().replace(/ & /g, '').replace(/ /g, ''));
  };

  return (
    <header className="flex items-center justify-between h-20 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/40 z-20 sticky top-0">
      {/* Title block */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-800 dark:text-white uppercase">
          {formatViewName(currentView)}
        </h1>
      </div>

      {/* Control panel buttons */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        {/* Mobile Premium Switch */}
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'SET_SUBSCRIPTION', payload: isPro ? 'Free' : 'Pro' });
          }}
          className="md:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border cursor-pointer border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
          title={isPro ? 'Deactivate Pro Plan' : 'Activate Pro Plan'}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
          <span>{isPro ? 'PRO' : 'FREE'}</span>
        </button>

        {/* Toggle Lang */}
        <button
          type="button"
          onClick={toggleLanguage}
          title={language === 'en' ? 'Switch Language' : 'Ganti Bahasa'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-155 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all active:scale-95"
        >
          <Languages className="w-3.5 h-3.5 text-primary-500" />
          <span>{language.toUpperCase()}</span>
        </button>

        {/* Toggle Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          title={language === 'en' ? 'Switch Theme' : 'Ganti Tema'}
          className="p-2.5 rounded-xl border border-slate-155 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Notifications Menu with Dynamic Seeding & Controls */}
        <div className="relative" ref={notifRef}>
          <button 
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title={language === 'en' ? 'Notifications' : 'Notifikasi'}
            className="p-2.5 rounded-xl border border-slate-155 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition-all active:scale-95 cursor-pointer flex items-center justify-center placeholder:select-none"
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            {((state.notifications || []).filter((n: any) => !n.isRead).length) > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black leading-none text-white bg-rose-500 rounded-full animate-pulse">
                {(state.notifications || []).filter((n: any) => !n.isRead).length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2.5 w-[320px] sm:w-[360px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/60 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
                <span className="text-[10px] font-extrabold text-slate-850 dark:text-white uppercase tracking-wider">
                  {language === 'en' ? 'Notifications' : 'Notifikasi'}
                </span>
                {((state.notifications || []).filter((n: any) => !n.isRead).length) > 0 && (
                  <button
                    onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: 'all' })}
                    className="text-[10px] font-bold text-primary-600 dark:text-indigo-400 hover:underline hover:scale-102 active:scale-98 cursor-pointer transition-all"
                  >
                    {language === 'en' ? 'Mark all read' : 'Tandai semua dibaca'}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
                {(state.notifications || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl mb-2.5 text-slate-405">
                      <Bell className="w-5 h-5 text-slate-400 dark:text-slate-550" />
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {language === 'en' ? 'All caught up!' : 'Semua telah dibaca'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {language === 'en' ? 'No new or historical alerts for your user account.' : 'Tidak terdapat pemberitahuan atau pesan riwayat akun Anda saat ini.'}
                    </p>
                  </div>
                ) : (
                  (state.notifications || []).map((notif: any) => {
                    const NotifIcon = notif.type === 'success' 
                      ? CheckCircle2 
                      : notif.type === 'warning' 
                      ? AlertTriangle 
                      : Info;

                    const iconColor = notif.type === 'success'
                      ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                      : notif.type === 'warning'
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20'
                      : 'text-sky-500 bg-sky-50 dark:bg-sky-950/20';

                    return (
                      <div 
                        key={notif.id} 
                        className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all relative group ${
                          !notif.isRead ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        <div className={`p-2 h-9 w-9 rounded-xl shrink-0 flex items-center justify-center ${iconColor}`}>
                          <NotifIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p onClick={() => {
                            if (!notif.isRead) {
                              dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notif.id });
                            }
                          }} className={`text-xs text-slate-850 dark:text-slate-100 line-clamp-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 select-none ${
                            !notif.isRead ? 'font-black text-slate-900 dark:text-white' : 'font-medium'
                          }`}>
                            {notif.title}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                            {notif.message}
                          </p>
                          <p className="text-[9px] text-slate-350 dark:text-slate-500 mt-1 font-bold">
                            {notif.date}
                          </p>
                        </div>

                        {/* Interactive items actions */}
                        <div className="absolute right-3 top-3 flex items-center gap-1">
                          {!notif.isRead && (
                            <button
                              onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notif.id })}
                              title={language === 'en' ? 'Mark read' : 'Tandai dibaca'}
                              className="p-1 rounded-lg text-slate-350 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all cursor-pointer border border-transparent hover:border-slate-100"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => dispatch({ type: 'DELETE_NOTIFICATION', payload: notif.id })}
                            title={language === 'en' ? 'Delete' : 'Hapus'}
                            className="p-1 rounded-lg text-slate-350 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer border border-transparent hover:border-slate-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider line */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

        {/* User Card avatar drop-down menu */}
        <div className="relative" ref={profileRef}>
          <button 
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800/60 focus:outline-none"
          >
            <img 
              className="h-8 w-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" 
              src={userAvatar} 
              alt="Avatar" 
              referrerPolicy="no-referrer"
            />
            <div className="hidden md:block text-left pr-1">
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{userEmail}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl py-1.5 border border-slate-100 dark:border-slate-700/60 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-750">
                <p className="text-xs font-black text-slate-800 dark:text-white">{userName}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{userEmail}</p>
              </div>
              <div className="p-1">
                <div className="px-3 py-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                  {userPlan} • {state.role === 'User' ? 'Standard User' : 'Owner Admin'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                {t('profile')}
              </button>
              <button 
                type="button" 
                onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                className="w-full text-left px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                {t('settings')}
              </button>
              {onLogout && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1"></div>
                  <button 
                    type="button" 
                    onClick={() => { onLogout(); setIsProfileOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'id' ? 'Logout / Keluar' : 'Logout Account'}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
