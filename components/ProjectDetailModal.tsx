import React from 'react';
import { Project } from '../types';
import { useFMS } from '../context/FMSContext';
import { XMarkIcon, UserCircleIcon, CurrencyDollarIcon, BanknotesIcon, BriefcaseIcon, CheckCircleIcon, ClockIcon, XCircleIcon, PauseCircleIcon, RectangleStackIcon } from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';

const ProjectStatusBadge: React.FC<{ status: Project['status']; withIcon?: boolean }> = ({ status, withIcon = false }) => {
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
    }
    const statusKey = status.toLowerCase().replace(/ /g, '');
    return (
        <span className={`${baseClasses} ${specificClasses}`}>
            {withIcon && Icon && <Icon className="w-4 h-4 mr-1.5" />}
            {t(statusKey)}
        </span>
    );
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div 
            className="bg-primary-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
        ></div>
    </div>
);

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: string | React.ReactNode }> = ({ icon: Icon, label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <Icon className="w-5 h-5 text-gray-400 mr-4 mt-1 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <div className="text-base font-medium text-gray-800 dark:text-gray-200">{value}</div>
            </div>
        </div>
    );
};

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  const { t } = useLocalization();
  const { state } = useFMS();
  const entityName = state.entities.find(e => e.id === project.entity)?.name || project.entity;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg flex flex-col transform transition-all duration-300 scale-95"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
      >
        <header className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h3>
             <div className="mt-1">
                <ProjectStatusBadge status={project.status} withIcon={true} />
            </div>
          </div>
          <button onClick={onClose} className="p-1 ml-4 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-5 overflow-y-auto">
            <DetailRow
                icon={UserCircleIcon}
                label={t('customer')}
                value={project.customer}
            />
            <DetailRow
                icon={CurrencyDollarIcon}
                label={t('budget')}
                value={formatCurrency(project.budget)}
            />
            <DetailRow
                icon={BanknotesIcon}
                label={t('spent')}
                value={formatCurrency(project.spent)}
            />
            <DetailRow
                icon={BriefcaseIcon}
                label={t('progress')}
                value={
                    <div className="flex items-center">
                        <div className="w-full mr-2">
                           <ProgressBar progress={project.progress} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{project.progress}%</span>
                    </div>
                }
            />
             <DetailRow
                icon={BriefcaseIcon}
                label={t('profitabilityMargin')}
                value={
                    <span className={`font-semibold ${project.profitability >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {project.profitability.toFixed(1)}%
                    </span>
                }
            />
             <DetailRow
                icon={RectangleStackIcon}
                label={t('assignedEntity')}
                value={entityName}
            />
        </main>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectDetailModal;