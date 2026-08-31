# FINAGROW — Dashboard & Reports Data Mapping

**Phase 10 Architecture & Data Lineage Specification**  
*Date:* August 31, 2026

---

## 1. Dashboard UI Element to Database Lineage

| UI Section / Card / Widget | Required Data Points | Backend Endpoint | Authoritative Database Source | Calculation & Formula |
| :--- | :--- | :--- | :--- | :--- |
| **Total Revenue KPI** | `totalRevenue`, change % | `GET /api/v1/dashboard/summary` | `JournalLine` (join `Account` type `REVENUE`), `SalesInvoice` | Sum of credits minus debits on posted Revenue accounts. |
| **Total Expenses KPI** | `totalExpenses`, change % | `GET /api/v1/dashboard/summary` | `JournalLine` (join `Account` type `EXPENSE`), `VendorBill` | Sum of debits minus credits on posted Expense accounts. |
| **Net Profit KPI** | `netProfit`, change % | `GET /api/v1/dashboard/summary` | Derived from GL Revenue & Expense | `Total Revenue - Total Expenses` |
| **Cash & Bank Balance KPI** | `cashBalance`, change % | `GET /api/v1/dashboard/summary` | `CashBankAccount`, `Account` (`1001`, `1002`, `1003`) | Sum of current balances across active cash/bank accounts. |
| **Revenue vs Expense Chart** | 12-month series: `name`, `revenue`, `expenses` | `GET /api/v1/dashboard/revenue-expense` | `JournalLine`, `JournalEntry` (POSTED) | Monthly group aggregation of Revenue & Expense GL lines for selected year. |
| **Account Watchlist** | Balances for Petty Cash (1001), BCA (1002), Mandiri (1003), AR (1100), AP (2000) | `GET /api/v1/dashboard/summary` | `Account`, `JournalLine` | Authoritative GL normal balance formula for each monitored account code. |
| **Recent Activity / Stream** | Normalized list: `id`, `date`, `description`, `amount`, `type`, `status` | `GET /api/v1/dashboard/recent-transactions` | `SalesInvoice`, `VendorBill`, `Payment`, `JournalEntry` | Top 10-20 most recent transactions ordered by `date desc, createdAt desc`. |

---

## 2. Reports UI Element to Database Lineage

| Report Name & Card | Report Category | Backend Endpoint | Authoritative Database Source | Output Columns & Aggregations |
| :--- | :--- | :--- | :--- | :--- |
| **Profit and Loss (`pnl`)** | Financial Statements | `GET /api/v1/reports/profit-loss` | `Account`, `JournalLine` | Revenue, COGS, Gross Profit, Operating Expenses, Net Profit. |
| **Balance Sheet (`balanceSheet`)** | Financial Statements | `GET /api/v1/reports/balance-sheet` | `Account`, `JournalLine` | Assets, Liabilities, Equity (Assets = Liabilities + Equity). |
| **Cash Flow (`cashFlow`)** | Financial Statements | `GET /api/v1/reports/cash-flow` | `CashBankAccount`, `Payment`, `JournalLine` | Cash Inflows, Cash Outflows, Net Cash Change, Ending Balances. |
| **Invoice Aging (`invoiceAging`)** | Sales & Receivables | `GET /api/v1/reports/ar-aging` | `SalesInvoice`, `Customer` | Invoice Number, Customer, Issue Date, Due Date, Total, Outstanding, Aging Brackets (Current, 1-30, 31-60, 61-90, 90+ days). |
| **Sales by Customer (`salesByCustomer`)** | Sales & Receivables | `GET /api/v1/reports/sales-by-customer` | `SalesInvoice`, `Customer` | Customer Name, Invoice Count, Total Sales, Total Paid, Outstanding Balance. |
| **Bills Aging (`billsAging`)** | Purchases & Payables | `GET /api/v1/reports/ap-aging` | `VendorBill`, `Vendor` | Bill Number, Vendor, Issue Date, Due Date, Total, Outstanding, Aging Brackets. |
| **Expenses by Vendor (`expensesByVendor`)** | Purchases & Payables | `GET /api/v1/reports/expenses-by-vendor` | `VendorBill`, `Vendor` | Vendor Name, Bill Count, Total Invoiced, Total Paid, Outstanding Balance. |
| **VAT Report (`vatReport`)** | Tax | `GET /api/v1/reports/vat-summary` | `TaxTransaction`, `TaxPeriod` | Period, PPN Keluaran (Output VAT), PPN Masukan (Input VAT), Net VAT Payable/Refund, Status. |
| **Payroll Tax Report (`payrollTaxReport`)** | Tax | `GET /api/v1/reports/payroll-summary` | `PayrollRun`, `PayrollEmployee` | Pay Period, Run Date, Total Gross Pay, PPh 21 Deductions, Net Pay, Employee Count, Status. |

---

## 3. Filtering & Scope Protocol

- **Multi-Tenant Isolation:** All queries filter on `@CurrentTenant('id') organizationId`.
- **Multi-Entity Isolation:** If `entityId` is provided in query params, results are strictly filtered to that entity. If omitted, organization-wide aggregation is returned.
- **Date Range Boundaries:** Supports predefined presets (`THIS_MONTH`, `LAST_MONTH`, `THIS_QUARTER`, `THIS_YEAR`) as well as explicit `startDate` / `endDate` ISO-8601 strings.
