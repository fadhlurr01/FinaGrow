import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { profileApi, UserProfile } from '../src/services/api/profileApi';
import { User, Mail, Phone, Shield, Gem, Save, CheckCircle, AlertTriangle, RefreshCw, Key } from 'lucide-react';

const Profile: React.FC = () => {
  const { language, t } = useLocalization();

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setAvatar(data.avatarUrl || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage(language === 'id' ? 'File terlalu besar! Maksimal ukuran adalah 2MB.' : 'File too large! Max size 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const updatePayload: any = {
        fullName: name,
        phone: phone || undefined,
        avatarUrl: avatar || undefined,
      };

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error(language === 'id' ? 'Konfirmasi kata sandi baru tidak cocok!' : 'Password confirmation does not match!');
        }
        if (!currentPassword) {
          throw new Error(language === 'id' ? 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi!' : 'Current password is required to change password!');
        }
        updatePayload.currentPassword = currentPassword;
        updatePayload.newPassword = newPassword;
      }

      await profileApi.updateProfile(updatePayload);
      setSuccessMessage(language === 'id' ? 'Profil berhasil diperbarui!' : 'Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-850 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            <span>{language === 'id' ? 'Profil Pengguna' : 'User Profile'}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {language === 'id' ? 'Kelola kredensial akun, foto profil, dan preferensi keamanan Anda.' : 'Manage your personal account credentials, profile picture, and security.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
        </button>
      </div>

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
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold">✕</button>
        </div>
      )}

      {/* 2. PROFILE CARD */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-6 sm:p-8 space-y-6 text-slate-800 dark:text-white">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/50">
            <div className="relative group">
              {avatar ? (
                <img src={avatar} alt={name} className="w-24 h-24 rounded-full object-cover border-2 border-primary-500 shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {name ? name.substring(0, 2).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div className="text-center sm:text-left space-y-2">
              <h3 className="text-lg font-bold">{name || 'Pengguna'}</h3>
              <p className="text-xs text-slate-400">{profile?.email} • {profile?.organizationName || 'FINAGROW'}</p>
              <div>
                <label className="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition inline-block">
                  <span>{language === 'id' ? 'Ganti Foto' : 'Change Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="sm:ml-auto flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-black text-xs rounded-full flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>{profile?.role || 'MEMBER'}</span>
              </span>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {language === 'id' ? 'Nama Lengkap' : 'Full Name'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {language === 'id' ? 'Nomor Telepon' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {language === 'id' ? 'Organisasi / Tenant' : 'Organization'}
              </label>
              <input
                type="text"
                value={profile?.organizationName || 'FINAGROW Tenant'}
                disabled
                className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-primary-500" />
              <span>{language === 'id' ? 'Ubah Kata Sandi (Opsional)' : 'Change Password (Optional)'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'id' ? 'Kata Sandi Saat Ini' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'id' ? 'Kata Sandi Baru' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'id' ? 'Konfirmasi Kata Sandi Baru' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'id' ? 'Simpan Perubahan' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
