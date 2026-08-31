# FINAGROW — Authoritative Source of Truth Specification

**System Architecture & Data Lineage Standard**  
*Date:* August 31, 2026

---

## 1. Domain-by-Domain Source of Truth Matrix

| Business Domain | Authoritative Data Layer | Primary PostgreSQL Tables | Backend Service | Client API Module |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Sessions** | PostgreSQL | `users`, `sessions`, `organization_members` | `AuthService` | `authApi.ts` |
| **User & RBAC Management** | PostgreSQL | `users`, `organization_members`, `roles` | `UsersService` | `usersApi.ts` |
| **Multi-Entity & Branches** | PostgreSQL | `entities`, `organizations` | `EntitiesService` | `entitiesApi.ts` |
| **Chart of Accounts (COA)** | PostgreSQL | `accounts`, `accounting_settings` | `AccountingService` | `accountingApi.ts` |
| **General Ledger & Journals** | PostgreSQL | `journal_entries`, `journal_lines` | `AccountingService` | `accountingApi.ts` |
| **Sales & Invoicing (AR)** | PostgreSQL | `customers`, `sales_invoices`, `sales_invoice_lines` | `SalesService` | `salesApi.ts` |
| **Purchasing & Bills (AP)** | PostgreSQL | `vendors`, `purchase_orders`, `vendor_bills` | `PurchasesService` | `purchasesApi.ts` |
| **Cash & Bank Management** | PostgreSQL | `cash_bank_accounts`, `payments`, `bank_reconciliations` | `CashBankService` | `cashBankApi.ts` |
| **Inventory & FIFO Layers** | PostgreSQL | `inventory_items`, `stock_movements`, `valuation_layers` | `InventoryService` | `inventoryApi.ts` |
| **Fixed Asset Register** | PostgreSQL | `fixed_assets`, `depreciation_runs`, `asset_disposals` | `AssetsService` | `assetsApi.ts` |
| **Indonesian Tax Engine** | PostgreSQL | `tax_codes`, `tax_periods`, `tax_transactions`, `tax_payments` | `TaxService` | `taxApi.ts` |
| **Fiscal Budgeting** | PostgreSQL | `budgets`, `journal_lines` (GL actuals aggregate) | `BudgetsService` | `budgetingApi.ts` |
| **Project Tracking** | PostgreSQL | `projects` | `ProjectsService` | `projectsApi.ts` |
| **Payroll Processing** | PostgreSQL | `payroll_runs`, `payroll_employees` | `PayrollService` | `payrollApi.ts` |
| **Subscription Plans** | PostgreSQL | `subscriptions`, `organizations` | `SubscriptionsService` | `subscriptionApi.ts` |
| **Dashboard KPIs & Charts** | PostgreSQL | `journal_lines` (Posted GL only), `cash_bank_accounts`, `sales_invoices`, `vendor_bills` | `DashboardService` | `dashboardApi.ts` |
| **Financial Statements** | PostgreSQL | `journal_lines`, `accounts` (Double-entry classification) | `ReportsService` | `reportsApi.ts` |
| **AI Advisory Assistant** | NestJS Proxy | LLM API (Proxy through backend) | `AIService` | `aiApi.ts` |

---

## 2. Operational vs Accounting Metric Rules

To guarantee financial data integrity and eliminate semantic ambiguity:

1. **Accounting Metrics (Revenue, Expenses, Net Profit):**
   - Derived exclusively from **Posted General Ledger lines** (`JournalLine` with `AccountType.REVENUE` / `AccountType.EXPENSE`).
   - If no posted journals exist, the system returns 0. No silent fallback to operational invoices or bills is permitted.
2. **Operational Sales Metrics (Invoiced, Collected, AR Outstanding):**
   - Derived from `sales_invoices` and `customers`.
3. **Operational Purchase Metrics (Billed, Paid, AP Outstanding):**
   - Derived from `vendor_bills` and `vendors`.
4. **Cash Balances:**
   - Derived from `cash_bank_accounts` balances reconciled with GL cash accounts.
5. **Inventory Value:**
   - Derived from `valuation_layers` and active FIFO/AVCO layer sums.

---

## 3. Immutability & Soft-Deletion Standard

- **Posted Journals & Tax Transactions:** Hard deletion is prohibited. Corrections must occur via reversal journals / credit notes.
- **Completed Payroll Runs:** Locked upon execution; cannot be arbitrarily deleted.
- **Master Data (Employees, Accounts, Customers, Vendors, Entities):** Deletion executes a soft deactivation (`isActive: false`) to preserve referential integrity and historical audit trails.
