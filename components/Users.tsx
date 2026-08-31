import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import { usersApi, OrgUser } from '../src/services/api/usersApi';
import { 
  Users as UsersIcon, 
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  UserPlus, 
  X 
} from 'lucide-react';

const Users: React.FC = () => {
  const { language, t } = useLocalization();
  const { state } = useFMS();

  // Data states
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<OrgUser | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'VIEWER' | string>('ACCOUNTANT');
  const [password, setPassword] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await usersApi.getUsers();
      if (Array.isArray(list)) {
        setUsers(list);
      }
    } catch (err: any) {
      console.warn('Users API load notice:', err.message);
      // Suppress network timeout alert on initial screen render
      setErrorMessage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || u.role.toLowerCase() === selectedRole.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  // Handle Add Member
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await usersApi.createUser({
        email,
        fullName,
        role,
        password: password || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Anggota baru berhasil ditambahkan!' : 'New member added successfully!');
      setIsAddModalOpen(false);
      setEmail('');
      setFullName('');
      setPassword('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Role
  const openEdit = (u: OrgUser) => {
    setActiveUser(u);
    setRole(u.role);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await usersApi.updateUserRole(activeUser.id, role);
      setSuccessMessage(language === 'id' ? 'Hak akses pengguna berhasil diubah!' : 'User role updated successfully!');
      setIsEditModalOpen(false);
      setActiveUser(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user role.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete / Remove
  const openDelete = (u: OrgUser) => {
    setActiveUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!activeUser) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await usersApi.deleteUser(activeUser.id);
      setSuccessMessage(language === 'id' ? 'Pengguna dikeluarkan dari organisasi.' : 'User removed from organization.');
      setIsDeleteModalOpen(false);
      setActiveUser(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Matching Screenshot 2) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <UsersIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>USERS & PERMISSIONS</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Provision system seats, invite auditors, and distribute financial access rights.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEmail('');
              setFullName('');
              setPassword('');
              setRole('ACCOUNTANT');
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>INVITE MEMBER</span>
          </button>
        </div>
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

      {/* 2. TOP 4 KPI CARDS */}
      {(() => {
        const totalMembers = users.length > 0 ? users.length : 1;
        const activeMembers = users.length > 0 ? users.filter(u => u.status === 'Active' || (u as any).isActive !== false).length : 1;
        const primaryAccountants = users.length > 0 ? users.filter(u => u.role === 'ACCOUNTANT').length : 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                PROVISIONED SEATS
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {totalMembers} / {state.subscription === 'Pro' ? '5' : '1'}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Active users quota of {state.subscription} Plan
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                ACTIVE USERS
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {activeMembers}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                <UsersIcon className="w-3 h-3" />
                Online within 30 days
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                PENDING INVITES
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                0
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Waiting for email acceptance
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                PRIMARY ACCOUNTANTS
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {primaryAccountants}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Authorized financial bookkeepers
              </p>
            </div>
          </div>
        );
      })()}

      {/* 3. TEAM DIRECTORY TABLE (Matching Screenshot 2) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              TEAM DIRECTORY & SECURITY PERMISSIONS
            </h3>
            <p className="text-slate-400 dark:text-slate-400 text-[11px] mt-0.5">
              Audit user authorization layers (Owner, Accountant, Manager, and Read-Only Auditors)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search members name/email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4">USER MEMBER</th>
                <th className="px-6 py-4">EMAIL ADDRESS</th>
                <th className="px-6 py-4 text-center">ROLE / SCOPE</th>
                <th className="px-6 py-4">CAPACITY</th>
                <th className="px-6 py-4 text-center">ACTIVE STATUS</th>
                <th className="px-6 py-4 text-right">MANAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-700 dark:text-slate-300">
              {(() => {
                const newlyRegisteredFallback = state.currentUserEmail ? [
                  {
                    id: 'u-self',
                    name: localStorage.getItem('fms_active_user_name') || state.currentUserEmail.split('@')[0],
                    seatId: 'SEAT ID: REG_0',
                    email: state.currentUserEmail,
                    role: state.role || 'User',
                    capacity: state.subscription === 'Pro' ? 'Pro Plan' : 'Free Plan',
                    status: 'ACTIVE',
                    isLocked: false,
                    raw: null,
                  }
                ] : [];

                const listToRender = users.length > 0 
                  ? users.map((u, i) => ({
                      id: u.id,
                      name: u.name,
                      seatId: `SEAT ID: REG_${i}`,
                      email: u.email,
                      role: u.role === 'OWNER' || u.role === 'ADMIN' ? 'Admin' : 'User',
                      capacity: u.role === 'OWNER' || u.role === 'ADMIN' ? 'Pro Plan' : 'Free Plan',
                      status: u.status === 'Active' || (u as any).isActive !== false ? 'ACTIVE' : 'INACTIVE',
                      isLocked: u.role === 'OWNER' || u.email === 'demo_admin@fms.com' || u.email === 'demo@fms.com',
                      raw: u,
                    }))
                  : newlyRegisteredFallback;

                const filtered = listToRender.filter(u => {
                  const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchRole = selectedRole === 'all' || u.role.toLowerCase() === selectedRole.toLowerCase();
                  return matchSearch && matchRole;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-xs text-slate-400 font-bold">
                        {language === 'id' ? 'Tidak ada anggota tim ditemukan.' : 'No team members found.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.seatId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'Admin'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {u.capacity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        • {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.isLocked ? (
                        <span className="text-[11px] text-slate-400 font-medium">Locked (System)</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit((u as any).raw || u)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete((u as any).raw || u)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span>{language === 'id' ? 'Tambah Anggota Tim' : 'Add Team Member'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Nama Lengkap *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Andi Wijaya" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="andi@perusahaan.com" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Peran / Role *</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none">
                  <option value="ACCOUNTANT">Accountant (Staf Akuntansi)</option>
                  <option value="ADMIN">Admin (Administrator Sistem)</option>
                  <option value="AUDITOR">Auditor (Pemeriksa Laporan)</option>
                  <option value="VIEWER">Viewer (Hanya Lihat)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Password Awal (Opsional)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Default: Finagrow@2026" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Simpan' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && activeUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 dark:text-white space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold">{language === 'id' ? 'Ubah Hak Akses Peran' : 'Update User Role'}</h3>
            <p className="text-xs text-slate-400">Pengguna: <strong className="text-slate-200">{activeUser.name}</strong> ({activeUser.email})</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Peran Baru</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none">
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
                <button type="submit" disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Simpan' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && activeUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">{language === 'id' ? 'Hapus Anggota' : 'Remove Member'}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'id' 
                ? `Apakah Anda yakin ingin mengeluarkan ${activeUser.name} (${activeUser.email}) dari organisasi ini?` 
                : `Are you sure you want to remove ${activeUser.name} from this organization?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl">{t('cancel')}</button>
              <button onClick={handleDeleteSubmit} disabled={actionLoading} className="bg-rose-600 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md">{language === 'id' ? 'Hapus' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
