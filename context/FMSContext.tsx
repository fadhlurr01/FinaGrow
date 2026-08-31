import React, { createContext, useReducer, useContext, useEffect } from 'react';
import { FMSState, COAAccount } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: string) => d.slice(0, 7);

export const EMPTY_STATE: FMSState = {
  version: '2.0-cloud',
  currency: 'IDR',
  lang: 'id',
  theme: 'light',
  role: 'User',
  subscription: 'Free',
  activeEntity: '',
  activeEntityId: '',
  activePeriod: monthKey(today()),
  currentView: 'Dashboard',
  currentUserEmail: undefined,
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
  entities: [],
  users: [],
  coa: [],
  transactions: [],
  invoices: [],
  budgets: [],
  assets: [],
  inventory: [],
  projects: [],
  vendors: [],
  payrollRuns: [],
  notifications: [],
};

export const DEFAULT_STATE: FMSState = EMPTY_STATE;

/**
 * Harmless initial state generator for compatibility
 */
export function getSeededStateForUser(email: string, role: string): FMSState {
  return {
    ...EMPTY_STATE,
    currentUserEmail: email,
    role: (role === 'Admin' || role === 'admin' || role === 'OWNER') ? 'Admin' : 'User',
  };
}

const FMSContext = createContext<{ state: FMSState; dispatch: React.Dispatch<any> }>({
  state: EMPTY_STATE,
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
    case 'LOGIN_USER': {
      return {
        ...EMPTY_STATE,
        theme: state.theme,
        lang: state.lang,
        currentUserEmail: action.payload.email,
        ...(action.payload.stateData || {}),
      };
    }
    case 'LOGOUT_USER':
      try {
        localStorage.removeItem('fms_active_user_email');
        localStorage.removeItem('fms_active_organization_id');
        localStorage.removeItem('fms_active_entity_id');
      } catch (_) {}
      return {
        ...EMPTY_STATE,
        theme: state.theme,
        lang: state.lang,
        currentUserEmail: undefined,
      };
    default:
      return state;
  }
};

export const FMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(fmsReducer, EMPTY_STATE, (initial) => {
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