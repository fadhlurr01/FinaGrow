import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { FMSState, COAAccount } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: string) => d.slice(0, 7);

export const DEFAULT_COA: COAAccount[] = [
  { id: 'coa-1', code: '1001', name: 'Kas Kecil Cabang', type: 'Asset', description: 'Kas operasional harian kantor', openingBalance: 15000000 },
  { id: 'coa-2', code: '1002', name: 'Bank BCA Priority (IDR)', type: 'Asset', description: 'Rekening giro utama operasional', openingBalance: 1250000000 },
  { id: 'coa-3', code: '1003', name: 'Bank Mandiri Corporate (IDR)', type: 'Asset', description: 'Rekening penerimaan pelanggan korporat', openingBalance: 680000000 },
  { id: 'coa-4', code: '1100', name: 'Piutang Usaha (AR)', type: 'Asset', description: 'Piutang tagihan pelanggan belum lunas', openingBalance: 450000000 },
  { id: 'coa-5', code: '1200', name: 'Persediaan Barang Dagang', type: 'Asset', description: 'Stok inventaris barang di gudang', openingBalance: 1200000000 },
  { id: 'coa-6', code: '1500', name: 'Aset Tetap - Server & Infrastruktur', type: 'Asset', description: 'Hardware server HP ProLiant & Cisco', openingBalance: 5500000000 },
  { id: 'coa-7', code: '1590', name: 'Akumulasi Penyusutan Aset Tetap', type: 'Asset', description: 'Akumulasi amortisasi penyusutan mesin/server', openingBalance: -9000000 },
  { id: 'coa-8', code: '2000', name: 'Utang Usaha (AP)', type: 'Liability', description: 'Kewajiban tagihan vendor pihak ketiga', openingBalance: 240000000 },
  { id: 'coa-9', code: '2100', name: 'Utang PPN Keluaran', type: 'Liability', description: 'Kewajiban setoran pajak PPN 11%', openingBalance: 75000000 },
  { id: 'coa-10', code: '3000', name: 'Modal Disetor (Paid-in Capital)', type: 'Equity', description: 'Modal awal pendiri perusahaan', openingBalance: 8000000000 },
  { id: 'coa-11', code: '3200', name: 'Laba Ditahan (Retained Earnings)', type: 'Equity', description: 'Akumulasi laba bersih berjalan', openingBalance: 821000000 },
  { id: 'coa-12', code: '4001', name: 'Pendapatan Lisensi Software Enterprise', type: 'Revenue', description: 'Pendapatan lisensi tahunan korporasi', openingBalance: 1250000000 },
  { id: 'coa-13', code: '4002', name: 'Pendapatan Jasa Konsultasi & SLA', type: 'Revenue', description: 'Pendapatan jasa implementasi ERP', openingBalance: 350000000 },
  { id: 'coa-14', code: '5001', name: 'Harga Pokok Penjualan (HPP)', type: 'Expense', description: 'Biaya langsung infrastruktur pengadaan', openingBalance: 420000000 },
  { id: 'coa-15', code: '6001', name: 'Beban Gaji & Tunjangan Staf', type: 'Expense', description: 'Gaji pokok, tunjangan & BPJS tim', openingBalance: 180000000 },
  { id: 'coa-16', code: '6002', name: 'Beban Cloud Server & Hosting', type: 'Expense', description: 'Biaya AWS & server hosting bulanan', openingBalance: 95000000 },
  { id: 'coa-17', code: '6003', name: 'Beban Pemasaran Digital & Ads', type: 'Expense', description: 'Biaya Google Ads & LinkedIn marketing', openingBalance: 45000000 },
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
  transactions: [],
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