import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project as ProjectType, Metric } from '../types';
import { projectsApi, Project as ApiProject, ProjectMetrics } from '../src/services/api/projectsApi';
import StatCard from './StatCard';
import { PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon, PauseCircleIcon, XMarkIcon } from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';
import { useFMS } from '../context/FMSContext';
import ProjectDetailModal from './ProjectDetailModal';
import { RefreshCw, AlertTriangle, CheckCircle, Trash2, Pencil } from 'lucide-react';

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num);
};

const ProjectStatusBadge: React.FC<{ status: ApiProject['status'] | string }> = ({ status }) => {
  const { t } = useLocalization();
  const baseClasses = 'px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5';
  let specificClasses = '';
  let Icon = null;

  switch (status) {
    case 'In Progress':
      specificClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      Icon = ClockIcon;
      break;
    case 'Completed':
      specificClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      Icon = CheckCircleIcon;
      break;
    case 'On Hold':
      specificClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      Icon = PauseCircleIcon;
      break;
    case 'Cancelled':
      specificClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      Icon = XCircleIcon;
      break;
    default:
      specificClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      Icon = ClockIcon;
  }
  
  const statusKey = String(status || '').toLowerCase().replace(/ /g, '');

  return (
    <span className={`${baseClasses} ${specificClasses}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {t(statusKey) || status}
    </span>
  );
};

const ProgressBar: React.FC<{ progress: number | string }> = ({ progress }) => {
  const p = typeof progress === 'string' ? parseFloat(progress) : progress;
  const clamped = Math.min(Math.max(isNaN(p) ? 0 : p, 0), 100);
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
      <div 
        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
        style={{ width: `${clamped}%` }}
      ></div>
    </div>
  );
};

const Projects: React.FC = () => {
  const { t, language } = useLocalization();
  const { state } = useFMS();
  const activeEntityId = state.activeEntityId;

  // Data states
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    activeProjects: 0,
    totalProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    overallProfitability: 0,
    onTimeCompletion: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
  const [activeProjectForAction, setActiveProjectForAction] = useState<ApiProject | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    customer: '',
    budget: 0,
    spent: 0,
    progress: 0,
    status: 'In Progress' as ApiProject['status'],
    profitability: 0,
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [projList, metricsRes] = await Promise.all([
        projectsApi.getProjects({ entityId: activeEntityId || undefined }),
        projectsApi.getMetrics(activeEntityId || undefined).catch(() => ({
          activeProjects: 0,
          totalProjects: 0,
          totalBudget: 0,
          totalSpent: 0,
          overallProfitability: 0,
          onTimeCompletion: 0,
        })),
      ]);
      setProjects(projList);
      setMetrics(metricsRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [activeEntityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!formData.name || !formData.customer) {
      alert(language === 'id' ? 'Nama Proyek dan Klien wajib diisi.' : 'Project Name and Customer are required.');
      return;
    }
    if (!activeEntityId) {
      alert(language === 'id' ? 'Pilih entitas aktif terlebih dahulu.' : 'Please select an active entity first.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await projectsApi.createProject({
        entityId: activeEntityId,
        name: formData.name,
        code: formData.code || undefined,
        customer: formData.customer,
        budget: formData.budget,
        spent: formData.spent,
        progress: formData.progress,
        status: formData.status,
        profitability: formData.profitability,
        description: formData.description || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Proyek baru berhasil ditambahkan!' : 'Project created successfully!');
      setIsModalOpen(false);
      setFormData({ name: '', code: '', customer: '', budget: 0, spent: 0, progress: 0, status: 'In Progress', profitability: 0, description: '' });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!activeProjectForAction) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await projectsApi.updateProject(activeProjectForAction.id, {
        name: formData.name,
        code: formData.code || undefined,
        customer: formData.customer,
        budget: formData.budget,
        spent: formData.spent,
        progress: formData.progress,
        status: formData.status,
        profitability: formData.profitability,
        description: formData.description || undefined,
      });

      setSuccessMessage(language === 'id' ? 'Proyek berhasil diperbarui!' : 'Project updated successfully!');
      setIsEditModalOpen(false);
      setActiveProjectForAction(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeProjectForAction) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await projectsApi.deleteProject(activeProjectForAction.id);
      setSuccessMessage(language === 'id' ? 'Proyek berhasil dihapus.' : 'Project deleted successfully.');
      setIsDeleteModalOpen(false);
      setActiveProjectForAction(null);
      if (selectedProject?.id === activeProjectForAction.id) {
        setSelectedProject(null);
      }
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete project.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (p: ApiProject, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveProjectForAction(p);
    setFormData({
      name: p.name,
      code: p.code || '',
      customer: p.customer || '',
      budget: Number(p.budget),
      spent: Number(p.spent),
      progress: Number(p.progress),
      status: p.status,
      profitability: Number(p.profitability),
      description: p.description || '',
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (p: ApiProject, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveProjectForAction(p);
    setIsDeleteModalOpen(true);
  };

  const projectMetrics: Metric[] = useMemo(() => [
    { title: t('activeProjects'), value: String(metrics.activeProjects), change: `Total ${metrics.totalProjects}`, changeType: 'increase' },
    { title: t('totalBudget'), value: formatCurrency(metrics.totalBudget), change: `Spent ${formatCurrency(metrics.totalSpent)}`, changeType: 'increase' },
    { title: t('overallProfitability'), value: `${metrics.overallProfitability.toFixed(1)}%`, change: 'Avg Margin', changeType: 'increase' },
    { title: t('onTimeCompletion'), value: `${metrics.onTimeCompletion}%`, change: 'Success rate', changeType: 'increase' },
  ], [metrics, t]);

  return (
    <div className="container mx-auto space-y-6">
      {/* 1. METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {projectMetrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
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

      {/* 2. TABLE */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('projectsOverview')}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{language === 'id' ? 'Segarkan' : 'Refresh'}</span>
            </button>
            <button 
              onClick={() => {
                setFormData({ name: '', code: '', customer: '', budget: 0, spent: 0, progress: 0, status: 'In Progress', profitability: 0, description: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 shadow-md transition"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('newProject')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">{t('projectName')}</th>
                <th scope="col" className="px-6 py-3">{t('budgetVsSpent')}</th>
                <th scope="col" className="px-6 py-3">{t('progress')}</th>
                <th scope="col" className="px-6 py-3 text-right">{t('profitability')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('status')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const profitNum = Number(project.profitability);
                return (
                  <tr 
                    key={project.id} 
                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                    onClick={() => setSelectedProject(project)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.customer} {project.code ? `• ${project.code}` : ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800 dark:text-white">{formatCurrency(project.spent)}</p>
                      <p className="text-xs text-gray-500">{t('of')} {formatCurrency(project.budget)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full mr-2">
                          <ProgressBar progress={project.progress} />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{project.progress}%</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${profitNum >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {profitNum.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => openEdit(project, e)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-500 hover:text-primary-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => openDelete(project, e)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-500 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <p className="text-sm font-semibold">{language === 'id' ? 'Belum ada data proyek.' : 'No projects registered.'}</p>
                    <p className="text-xs mt-1 text-gray-400">{language === 'id' ? 'Klik "+ Proyek Baru" untuk membuat proyek.' : 'Click "+ New Project" to create your first project.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal 
          project={{
            id: selectedProject.id,
            name: selectedProject.name,
            customer: selectedProject.customer || '',
            budget: Number(selectedProject.budget),
            spent: Number(selectedProject.spent),
            progress: Number(selectedProject.progress),
            status: selectedProject.status,
            profitability: Number(selectedProject.profitability),
            entity: state.activeEntity,
          }}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Create / Edit Project Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl text-slate-800 dark:text-white animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold">{isEditModalOpen ? (language === 'id' ? 'Ubah Proyek' : 'Edit Project') : t('newProject')}</h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('projectName')} *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('customer')} *</label>
                <input type="text" value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('status')}</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ApiProject['status']})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="In Progress">{t('inprogress') || 'In Progress'}</option>
                  <option value="Completed">{t('completed') || 'Completed'}</option>
                  <option value="On Hold">{t('onhold') || 'On Hold'}</option>
                  <option value="Cancelled">{t('cancelled') || 'Cancelled'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('budget')} (Rp)</label>
                <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('spent')} (Rp)</label>
                <input type="number" value={formData.spent} onChange={e => setFormData({...formData, spent: Number(e.target.value)})} min={0} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('progress')} (%)</label>
                <input type="number" value={formData.progress} min="0" max="100" onChange={e => setFormData({...formData, progress: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{t('profitability')} (%)</label>
                <input type="number" value={formData.profitability} onChange={e => setFormData({...formData, profitability: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">{language === 'id' ? 'Deskripsi' : 'Description'}</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end p-5 border-t dark:border-gray-700 gap-2">
              <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer">{t('cancel')}</button>
              <button onClick={isEditModalOpen ? handleUpdate : handleCreate} disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-primary-700 shadow-md transition cursor-pointer">
                {isEditModalOpen ? (language === 'id' ? 'Simpan Perubahan' : 'Update Project') : t('saveProject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && activeProjectForAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-slate-800 dark:text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">{language === 'id' ? 'Hapus Proyek' : 'Delete Project'}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'id' 
                ? `Apakah Anda yakin ingin menghapus proyek "${activeProjectForAction.name}"?` 
                : `Are you sure you want to delete project "${activeProjectForAction.name}"?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">{t('cancel')}</button>
              <button onClick={handleDelete} disabled={actionLoading} className="bg-rose-600 text-white px-4 py-2 text-xs font-bold hover:bg-rose-700 rounded-xl shadow-md">{language === 'id' ? 'Hapus' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;