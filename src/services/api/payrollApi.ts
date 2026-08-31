import { apiClient } from './client';

export interface PayrollRun {
  id: string;
  organizationId: string;
  entityId: string;
  payPeriod: string;
  runDate: string;
  totalGross: number | string;
  totalTaxes: number | string;
  totalNet: number | string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  employeeCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  entity?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface PayrollEmployee {
  id: string;
  organizationId: string;
  entityId: string;
  employeeCode: string;
  name: string;
  position: string;
  baseSalary: number | string;
  allowances: number | string;
  deductions: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollMetrics {
  lastPayrollCost: number;
  employeesPaid: number;
  avgNetPay: number;
  ytdPayrollCost: number;
}

export const payrollApi = {
  getPayrollRuns: (entityId?: string) => {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<PayrollRun[]>(`/payroll/runs${query}`);
  },

  getMetrics: (entityId?: string) => {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<PayrollMetrics>(`/payroll/metrics${query}`);
  },

  getPayrollRunById: (id: string) => apiClient<PayrollRun>(`/payroll/runs/${id}`),

  createPayrollRun: (dto: {
    entityId: string;
    payPeriod: string;
    runDate: string;
    totalGross?: number;
    totalTaxes?: number;
    totalNet?: number;
    status?: string;
    employeeCount?: number;
    notes?: string;
  }) =>
    apiClient<PayrollRun>('/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updatePayrollRun: (
    id: string,
    dto: {
      status?: string;
      totalGross?: number;
      totalTaxes?: number;
      totalNet?: number;
      notes?: string;
    },
  ) =>
    apiClient<PayrollRun>(`/payroll/runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deletePayrollRun: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/payroll/runs/${id}`, {
      method: 'DELETE',
    }),

  // ─── Employees ───

  getEmployees: (entityId?: string) => {
    const query = entityId ? `?entityId=${entityId}` : '';
    return apiClient<PayrollEmployee[]>(`/payroll/employees${query}`);
  },

  createEmployee: (dto: {
    entityId: string;
    employeeCode: string;
    name: string;
    position: string;
    baseSalary: number;
    allowances?: number;
    deductions?: number;
    isActive?: boolean;
  }) =>
    apiClient<PayrollEmployee>('/payroll/employees', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  updateEmployee: (
    id: string,
    dto: {
      name?: string;
      position?: string;
      baseSalary?: number;
      allowances?: number;
      deductions?: number;
      isActive?: boolean;
    },
  ) =>
    apiClient<PayrollEmployee>(`/payroll/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  deleteEmployee: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/payroll/employees/${id}`, {
      method: 'DELETE',
    }),
};
