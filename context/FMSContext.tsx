import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { FMSState, COAAccount } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: string) => d.slice(0, 7);

export const DEFAULT_COA: COAAccount[] = [
  { id: 'coa-1', code: '1001', name: 'Kas Kecil Cabang Jakarta', type: 'Asset', description: 'Kas kecil operasional HO', openingBalance: 15000000 },
  { id: 'coa-2', code: '1002', name: 'Bank BCA Priority', type: 'Asset', description: 'Rekening bank utama perusahaan', openingBalance: 1250000000 },
  { id: 'coa-3', code: '1003', name: 'Bank Mandiri Corporate', type: 'Asset', description: 'Rekening bank giro', openingBalance: 680000000 },
  { id: 'coa-4', code: '1100', name: 'Piutang Usaha Korporat', type: 'Asset', description: 'Piutang institusi klien', openingBalance: 450000000 },
  { id: 'coa-5', code: '1200', name: 'Persediaan Finished Goods', type: 'Asset', description: 'Persediaan barang utama', openingBalance: 1200000000 },
  { id: 'coa-6', code: '1500', name: 'Aset Tetap Gedung Merdeka', type: 'Asset', description: 'Gedung pencakar langit', openingBalance: 5500000000 },
  { id: 'coa-8', code: '2000', name: 'Utang Dagang Supplier', type: 'Liability', description: 'Utang bahan baku', openingBalance: 240000000 },
  { id: 'coa-9', code: '2100', name: 'Utang PPN Masukan', type: 'Liability', description: 'PPN 11%', openingBalance: 75000000 },
  { id: 'coa-10', code: '3000', name: 'Modal Ventura Seri-A', type: 'Equity', description: 'Modal disetor Investor', openingBalance: 8000000000 },
  { id: 'coa-11', code: '4000', name: 'Pendapatan Kontrak Software', type: 'Revenue', description: 'Pendapatan subscription enterprise', openingBalance: 0 },
  { id: 'coa-12', code: '4100', name: 'Pendapatan Lisensi API', type: 'Revenue', description: 'Pendapatan Integrasi API', openingBalance: 0 },
  { id: 'coa-13', code: '5000', name: 'HPP Layanan Cloud', type: 'Expense', description: 'Biaya server AWS/Google Cloud', openingBalance: 0 },
  { id: 'coa-14', code: '5100', name: 'Beban Gaji Direksi & Staf', type: 'Expense', description: 'Beban kompensasi tim', openingBalance: 0 },
  { id: 'coa-15', code: '5200', name: 'Beban Sewa Data Center', type: 'Expense', description: 'Sewa fasilitas rack', openingBalance: 0 },
  { id: 'coa-16', code: '5300', name: 'Beban Marketing & Promo', type: 'Expense', description: 'Iklan digital & PR', openingBalance: 0 },
];

export const DEFAULT_STATE: FMSState = {
  version: '2.0-cloud',
  currency: 'IDR',
  lang: 'id',
  theme: 'light',
  role: 'Admin',
  subscription: 'Pro',
  activeEntity: 'BC',
  activeEntityId: '',
  activePeriod: monthKey(today()),
  currentView: 'Dashboard',
  currentUserEmail: 'demo_admin@fms.com',
  modules: {
    dashboard: true,
    transactions: true,
    invoices: true,
    cashbank: true,
    budgeting: true,
    tax: true,
    assets: true,
    inventory: true,
    coa: true,
    entities: true,
    users: true,
    settings: true,
  },
  entities: [
    { id: 'e-bc', code: 'BC', name: 'BellCorp Indonesia', currency: 'IDR' },
    { id: 'e-ob', code: 'OB', name: 'OptiBiz Global', currency: 'USD' },
  ],
  users: [],
  coa: DEFAULT_COA,
  transactions: [
    {
      id: 'tx-1',
      date: '2026-08-31',
      description: 'Terima Termin 1 PT. Astra International',
      type: 'income',
      category: 'Sales',
      amount: 350000000,
      status: 'Completed',
      dr: '1002',
      cr: '1100',
    },
    {
      id: 'tx-2',
      date: '2026-08-30',
      description: 'Bayar Cloud Server AWS',
      type: 'expense',
      category: 'Operational',
      amount: 55000000,
      status: 'Completed',
      dr: '5000',
      cr: '1002',
    },
    {
      id: 'tx-3',
      date: '2026-08-29',
      description: 'Distribusi Payroll Bulanan Direksi',
      type: 'expense',
      category: 'Payroll',
      amount: 185000000,
      status: 'Completed',
      dr: '5100',
      cr: '1003',
    },
    {
      id: 'tx-4',
      date: '2026-08-27',
      description: 'SaaS Agreement - Singapore Corp',
      type: 'income',
      category: 'Sales',
      amount: 48000,
      status: 'Completed',
      dr: '1002',
      cr: '4000',
    },
    {
      id: 'tx-5',
      date: '2026-08-25',
      description: 'Bayar Kampanye Digital agency',
      type: 'expense',
      category: 'Marketing',
      amount: 50000000,
      status: 'Completed',
      dr: '5300',
      cr: '1002',
    },
  ],
  invoices: [],
  budgets: [],
  assets: [],
  inventory: [],
  projects: [],
  vendors: [],
  payrollRuns: [],
  notifications: [
    {
      id: 'N1',
      title: 'FINAGROW Cloud Connected',
      message: 'Sistem pembukuan multi-entitas FINAGROW aktif dan tersambung ke PostgreSQL.',
      date: today(),
      isRead: false,
      type: 'info',
    },
  ],
};

/**
 * Harmless initial state generator for compatibility
 */
export function getSeededStateForUser(email: string, role: string): FMSState {
  return {
    ...DEFAULT_STATE,
    currentUserEmail: email,
    role: (role === 'Admin' || role === 'admin') ? 'Admin' : 'User',
  };
}

const FMSContext = createContext<{ state: FMSState; dispatch: React.Dispatch<any> }>({
  state: DEFAULT_STATE,
  dispatch: () => null,
});

type Action =
  | { type: 'SET_STATE'; payload: FMSState }
  | { type: 'TOGGLE_MODULE'; payload: { key: string; value: boolean } }
  | { type: 'SET_SUBSCRIPTION'; payload: 'Free' | 'Pro' }
  | { type: 'SET_VIEW'; payload: string }
  | { type: 'SET_ENTITY'; payload: { activeEntity: string; activeEntityId?: string } }
  | { type: 'SET_PERIOD'; payload: string }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'SET_COA'; payload: COAAccount[] }
  | { type: 'ADD_COA_ACCOUNT'; payload: COAAccount }
  | { type: 'EDIT_COA_ACCOUNT'; payload: COAAccount }
  | { type: 'DELETE_COA_ACCOUNT'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: any }
  | { type: 'EDIT_TRANSACTION'; payload: any }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'LOGIN_USER'; payload: { email: string; stateData?: Partial<FMSState> } }
  | { type: 'LOGOUT_USER' }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: any }
  | { type: 'DELETE_NOTIFICATION'; payload: string };

const fmsReducer = (state: FMSState, action: Action): FMSState => {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SUBSCRIPTION':
      return { ...state, subscription: action.payload };
    case 'SET_ENTITY':
      return { 
        ...state, 
        activeEntity: action.payload.activeEntity,
        activeEntityId: action.payload.activeEntityId || state.activeEntityId,
      };
    case 'SET_PERIOD':
      return { ...state, activePeriod: action.payload };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload as 'IDR' | 'USD' | 'EUR' };
    case 'SET_COA':
      return { ...state, coa: action.payload };
    case 'ADD_COA_ACCOUNT':
      return {
        ...state,
        coa: [action.payload, ...(state.coa || []).filter(a => a.id !== action.payload.id && a.code !== action.payload.code)],
      };
    case 'EDIT_COA_ACCOUNT':
      return {
        ...state,
        coa: (state.coa || []).map(a => a.id === action.payload.id ? action.payload : a),
      };
    case 'DELETE_COA_ACCOUNT':
      return {
        ...state,
        coa: (state.coa || []).filter(a => a.id !== action.payload),
      };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [
          {
            ...action.payload,
            id: action.payload.id || `tx-${Date.now()}`,
          },
          ...(state.transactions || []),
        ],
      };
    case 'EDIT_TRANSACTION':
      return {
        ...state,
        transactions: (state.transactions || []).map((t) => t.id === action.payload.id ? action.payload : t),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: (state.transactions || []).filter((t) => t.id !== action.payload),
      };
    case 'TOGGLE_MODULE':
      return {
        ...state,
        modules: {
          ...state.modules,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: (state.notifications || []).map((notif) =>
          action.payload === 'all' || notif.id === action.payload
            ? { ...notif, isRead: true }
            : notif
        ),
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: (state.notifications || []).filter((notif) => notif.id !== action.payload),
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...(state.notifications || [])],
      };
    case 'LOGIN_USER':
      return {
        ...state,
        currentUserEmail: action.payload.email,
        ...(action.payload.stateData || {}),
      };
    case 'LOGOUT_USER':
      try {
        localStorage.removeItem('fms_active_user_email');
        localStorage.removeItem('fms_active_organization_id');
        localStorage.removeItem('fms_active_entity_id');
      } catch (_) {}
      return {
        ...DEFAULT_STATE,
        currentUserEmail: undefined,
        activeEntityId: '',
      };
    default:
      return state;
  }
};

export const FMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(fmsReducer, DEFAULT_STATE, (initial) => {
    try {
      const activeEmail = localStorage.getItem('fms_active_user_email');
      const savedTheme = localStorage.getItem('theme') || 'light';
      const savedLang = (localStorage.getItem('fms_language') as 'id' | 'en') || 'id';

      return {
        ...initial,
        theme: savedTheme,
        lang: savedLang,
        currentUserEmail: activeEmail || undefined,
      };
    } catch {
      return initial;
    }
  });

  return (
    <FMSContext.Provider value={{ state, dispatch }}>
      {children}
    </FMSContext.Provider>
  );
};

export const useFMS = () => useContext(FMSContext);