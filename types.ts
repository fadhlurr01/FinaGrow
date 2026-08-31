// Fix: Import React to use React.ElementType
import React from 'react';

// --- NEW UNIFIED STATE MODEL ---

export interface FMSModules {
  [key: string]: boolean;
  dashboard: boolean;
  transactions: boolean;
  invoices: boolean;
  cashbank: boolean;
  budgeting: boolean;
  tax: boolean;
  assets: boolean;
  inventory: boolean;
  coa: boolean;
  entities: boolean;
  users: boolean;
  settings: boolean;
}

export interface Entity {
  id: string;
  code: string;
  name: string;
  currency: 'IDR' | 'USD';
}

export interface COAAccount {
    id: string;
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    description?: string;
    parentAccountId?: string;
    openingBalance?: number;
}

export interface Budget {
    id: string;
    accountId: string;
    period: string; // e.g., "2024-07"
    amount: number;
    entity: string;
}

export interface FMSState {
  version: string;
  currency: 'IDR' | 'USD' | 'EUR';
  lang: 'id' | 'en';
  theme: 'light' | 'dark';
  role: string;
  activeEntity: string;
  activeEntityId?: string;
  activePeriod: string;
  currentView?: string;
  modules: FMSModules;
  entities: Entity[];
  users: any[]; // Define user type later
  coa: COAAccount[];
  transactions: Transaction[];
  invoices: Invoice[];
  budgets: Budget[];
  assets: any[]; // Define asset type later
  inventory: any[]; // Define inventory type later
  projects: Project[];
  vendors: Vendor[];
  payrollRuns: PayrollRun[];
  currentUserEmail?: string;
  subscription?: 'Free' | 'Pro';
  notifications?: NotificationItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  titleId?: string;
  message: string;
  messageId?: string;
  date: string;
  isRead: boolean;
  type: 'info' | 'warning' | 'success' | 'alert';
}

// --- LANGUAGE & TRANSLATIONS ---
export type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};


// --- EXISTING COMPONENT-SPECIFIC TYPES ---

export interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Cash' | 'Credit Card' | 'E-Wallet';
  balance: number;
  accountNumber?: string;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  vendor?: string;
  customer?: string;
  paymentMethod?: string;
  notes?: string;
  // Fields from prototype for GL
  entity?: string;
  dr: string;
  cr: string;
  cur?: string;
}

export interface Metric {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

export interface ChartData {
  name: string;
  revenue: number;
  expenses: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email: string;
  };
  issueDate: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  // Fields from prototype for AR/AP
  entity?: string;
  type?: 'AR' | 'AP';
  party?: string;
  desc?: string;
  vat?: number;
  cur?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  vendor: {
    name: string;
  };
  billDate: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface ReportCardType {
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'Financial Statements' | 'Sales & Receivables' | 'Purchases & Payables' | 'Tax';
}

export interface JournalEntryLine {
  accountName: string;
  debit?: number;
  credit?: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  budget: number;
  spent: number;
  progress: number;
  status: 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  profitability: number;
  entity?: string;
}

export interface Vendor {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    outstandingBalance: number;
}

export interface PayrollRun {
  id: string;
  payPeriod: string;
  runDate: string;
  totalGross: number;
  totalTaxes: number;
  totalNet: number;
  status: 'Completed' | 'In Progress' | 'Scheduled';
}