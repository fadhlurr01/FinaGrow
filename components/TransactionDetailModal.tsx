import React from 'react';
import { Transaction } from '../types';
import { XMarkIcon, CalendarDaysIcon, TagIcon, CreditCardIcon, UserCircleIcon, BuildingOfficeIcon, InformationCircleIcon, BanknotesIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from './icons/IconComponents';
import { useLocalization } from '../hooks/useLocalization';

const StatusBadge: React.FC<{ status: Transaction['status']; withIcon?: boolean }> = ({ status, withIcon = false }) => {
  const { t } = useLocalization();
  const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center';
  let specificClasses = '';
  let Icon = null;

  switch (status) {
    case 'Completed':
      specificClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      Icon = CheckCircleIcon;
      break;
    case 'Pending':
      specificClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      Icon = ClockIcon;
      break;
    case 'Cancelled':
      specificClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      Icon = XCircleIcon;
      break;
  }
  return (
    <span className={`${baseClasses} ${specificClasses}`}>
        {withIcon && Icon && <Icon className="w-4 h-4 mr-1.5" />}
        {t(status.toLowerCase())}
    </span>
  );
};

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: string | React.ReactNode }> = ({ icon: Icon, label, value }) => {
    if (!value) return null;
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

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, onClose }) => {
  const { t } = useLocalization();
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md flex flex-col transform transition-all duration-300 scale-95"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}
      >
        <header className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{transaction.description}</h3>
            <p className={`text-2xl font-bold mt-1 ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.amount)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 ml-4 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="p-5 overflow-y-auto">
            <DetailRow
                icon={transaction.type === 'income' ? UserCircleIcon : BuildingOfficeIcon}
                label={transaction.type === 'income' ? t('customer') : t('vendor')}
                value={transaction.customer || transaction.vendor}
            />
            <DetailRow
                icon={CalendarDaysIcon}
                label={t('date')}
                value={transaction.date}
            />
            <DetailRow
                icon={TagIcon}
                label={t('category')}
                value={transaction.category}
            />
             <DetailRow
                icon={BanknotesIcon}
                label={t('type')}
                value={<span className={`capitalize font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{t(transaction.type)}</span>}
            />
            <DetailRow
                icon={CreditCardIcon}
                label={t('paymentMethod')}
                value={transaction.paymentMethod}
            />
             <DetailRow
                icon={CheckCircleIcon}
                label={t('status')}
                value={<StatusBadge status={transaction.status} withIcon />}
            />
            <DetailRow
                icon={InformationCircleIcon}
                label={t('notes')}
                value={transaction.notes || t('noNotesProvided')}
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

export default TransactionDetailModal;