# FINAGROW — Comprehensive Frontend-to-Backend Integration Status Matrix

**Phase 10 Final Complete Integration Audit Matrix**  
*Generated: August 31, 2026*  
*Architecture:* React 18 + TypeScript → REST API Client (`src/services/api/`) → NestJS 10 Controllers & Services → Prisma ORM → PostgreSQL 16 (Multi-Tenant & Multi-Entity)

---

## 1. Master Module Integration Matrix

| Module / Page Component | Frontend Exists? | Backend Controller / Service | Prisma & Postgres Model | Authoritative Persistence | Multi-Tenant & Multi-Entity | Mock Data / localStorage Status | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Authentication** (`Auth.tsx`) | ✅ | `AuthModule` (`/api/v1/auth/*`) | `User`, `Session`, `OrganizationMember` | PostgreSQL | ✅ Isolated per tenant | Zero mock data. Cookie / Bearer tokens. | **MIGRATED & ACTIVE** |
| **Chart of Accounts** (`COA.tsx`) | ✅ | `AccountingModule` (`/api/v1/accounts`) | `Account`, `AccountingSettings` | PostgreSQL | ✅ Organization + Entity isolated | Pure REST API (`accountingApi.ts`). | **MIGRATED & ACTIVE** |
| **General Ledger & Journals** (`GeneralLedger.tsx`) | ✅ | `AccountingModule` (`/api/v1/journal-entries`) | `JournalEntry`, `JournalLine` | PostgreSQL | ✅ Multi-entity double entry | Pure REST API (`accountingApi.ts`). | **MIGRATED & ACTIVE** |
| **Sales & Invoicing (AR)** (`Sales.tsx`, `Invoices.tsx`) | ✅ | `SalesModule` (`/api/v1/sales/*`) | `Customer`, `SalesInvoice`, `SalesInvoiceLine` | PostgreSQL | ✅ Sub-ledger to GL linked | Pure REST API (`salesApi.ts`). | **MIGRATED & ACTIVE** |
| **Purchasing & Bills (AP)** (`Purchases.tsx`) | ✅ | `PurchasesModule` (`/api/v1/purchases/*`) | `Vendor`, `PurchaseOrder`, `VendorBill` | PostgreSQL | ✅ GRNI & Three-way matching | Pure REST API (`purchasesApi.ts`). | **MIGRATED & ACTIVE** |
| **Cash & Bank** (`CashBank.tsx`, `BankReconciliation.tsx`) | ✅ | `CashBankModule` (`/api/v1/cash-bank/*`) | `CashBankAccount`, `Payment`, `BankReconciliation` | PostgreSQL | ✅ Multi-currency + MT940 | Pure REST API (`cashBankApi.ts`). | **MIGRATED & ACTIVE** |
| **Inventory & FIFO/MWA** (`Inventory.tsx`) | ✅ | `InventoryModule` (`/api/v1/inventory/*`) | `InventoryItem`, `StockMovement`, `ValuationLayer` | PostgreSQL | ✅ Auto COGS & GRNI clear | Pure REST API (`inventoryApi.ts`). | **MIGRATED & ACTIVE** |
| **Fixed Assets** (`Assets.tsx`) | ✅ | `AssetsModule` (`/api/v1/assets/*`) | `FixedAsset`, `DepreciationRun`, `AssetDisposal` | PostgreSQL | ✅ Real-time straight-line depreciation | Pure REST API (`assetsApi.ts`). | **MIGRATED & ACTIVE** |
| **Indonesian Tax Engine** (`Tax.tsx`) | ✅ | `TaxModule` (`/api/v1/tax/*`) | `TaxCode`, `TaxPeriod`, `TaxTransaction`, `TaxPayment` | PostgreSQL | ✅ PPN 12%, PPh 23, PPh 4(2), SPT Masa | Pure REST API (`taxApi.ts`). | **MIGRATED & ACTIVE** |
| **Budgeting** (`Budgeting.tsx`) | ✅ | `BudgetsModule` (`/api/v1/budgets`) | `Budget`, `JournalLine` aggregate | PostgreSQL | ✅ Entity & Account linked | Pure REST API (`budgetingApi.ts`). | **MIGRATED & ACTIVE** |
| **Projects** (`Projects.tsx`) | ✅ | `ProjectsModule` (`/api/v1/projects`) | `Project` | PostgreSQL | ✅ Entity linked | Pure REST API (`projectsApi.ts`). | **MIGRATED & ACTIVE** |
| **Payroll** (`Payroll.tsx`) | ✅ | `PayrollModule` (`/api/v1/payroll/*`) | `PayrollRun`, `PayrollEmployee` | PostgreSQL | ✅ Entity linked + Pro gating | Pure REST API (`payrollApi.ts`). | **MIGRATED & ACTIVE** |
| **Entities & Branches** (`Entities.tsx`) | ✅ | `EntitiesModule` (`/api/v1/entities`) | `Entity` | PostgreSQL | ✅ Organization isolated | Pure REST API (`entitiesApi.ts`). | **MIGRATED & ACTIVE** |
| **Users & RBAC** (`Users.tsx`) | ✅ | `UsersModule` (`/api/v1/users`) | `User`, `OrganizationMember` | PostgreSQL | ✅ Tenant membership RBAC | Pure REST API (`usersApi.ts`). | **MIGRATED & ACTIVE** |
| **User Profile** (`Profile.tsx`) | ✅ | `UsersModule` (`/api/v1/profile`) | `User` | PostgreSQL | ✅ User session authenticated | Pure REST API (`profileApi.ts`). | **MIGRATED & ACTIVE** |
| **Settings** (`Settings.tsx`) | ✅ | `UsersModule` (`/api/v1/settings`) | `UserSettings`, `Organization` | PostgreSQL | ✅ User & Tenant settings | Pure REST API (`settingsApi.ts`). | **MIGRATED & ACTIVE** |
| **Subscription Pricing** (`Subscription.tsx`) | ✅ | `SubscriptionsModule` (`/api/v1/subscriptions`) | `Subscription` | PostgreSQL | ✅ Tenant plan persistent | Pure REST API (`subscriptionApi.ts`). | **MIGRATED & ACTIVE** |
| **AI Advisory Chat** (`AIChatBot.tsx`) | ✅ | `AIModule` (`/api/v1/ai/query`) | N/A (Gemini LLM Proxy + Audit) | Backend Proxy | ✅ Zero browser API key exposure | Secure backend proxy (`geminiService.ts`). | **MIGRATED & ACTIVE** |
| **Dashboard** (`Dashboard.tsx`) | ✅ | `DashboardModule` (`/api/v1/dashboard/*`) | `JournalLine`, `SalesInvoice`, `VendorBill`, `CashBankAccount` | PostgreSQL | ✅ Multi-tenant & multi-entity aggregation | Pure REST API (`dashboardApi.ts`). Zero mock fallback. | **MIGRATED & ACTIVE (Phase 10)** |
| **Financial Reports** (`Reports.tsx`) | ✅ | `ReportsModule` (`/api/v1/reports/*`) | All Sub-ledger & GL models | PostgreSQL | ✅ Double-entry sub-ledger server aggregation | Pure REST API (`reportsApi.ts`). Live modal view + CSV export. | **MIGRATED & ACTIVE (Phase 10)** |

---

## 2. Browser Storage & Fallback Audit

| Storage Type | Key / Scope | Intended Purpose | Authoritative vs Cache | Compliance Status |
| :--- | :--- | :--- | :--- | :--- |
| `localStorage` | `fms_token` / `fms_session` | Client auth session token | Cache | ✅ Allowed (Auth token storage) |
| `localStorage` | `theme` | UI Dark/Light preference | UI State Cache | ✅ Allowed (Synchronized with DB) |
| `localStorage` | `fms_language` | UI Locale selection (`id`/`en`) | UI State Cache | ✅ Allowed (Synchronized with DB) |
| `sessionStorage` | `fms_pro_chat_history_v2` | Preserves active chatbot dialogue during tab switch | Volatile UI Cache | ✅ Allowed (Non-authoritative ephemeral) |
| `localStorage` | `fms_registered_users` (Legacy) | Old client-only mock users | **REMOVED** | ✅ Cleaned up |
| `localStorage` | `fms_mock_transactions` (Legacy) | Old client-only mock transactions | **REMOVED** | ✅ Cleaned up |
