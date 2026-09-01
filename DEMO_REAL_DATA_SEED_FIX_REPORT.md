# FINAGROW — CRITICAL HOTFIX 2 REPORT
## Demo Database Seed Preservation + True Empty Real Tenant Isolation

**Date:** September 1, 2026  
**Status:** FULLY RESOLVED & VALIDATED

---

### 1. Executive Summary

This hotfix permanently resolves the issue where newly registered real tenants in production received 24 Chart of Accounts, while ensuring the Demo dataset (`demo_admin@fms.com` and `demo_user@fms.com`) remains intact, rich, and powered 100% by PostgreSQL/Supabase without frontend mocks.

---

### 2. Exact Source of the 24 Automatic Accounts

- **Location:** `DEFAULT_CHART_OF_ACCOUNTS` array (24 accounts) and `seedDefaultAccounts()` method in `backend/src/accounting/accounting.service.ts`.
- **Root Cause:** In prior iterations, `seedDefaultAccounts()` had been invoked during registration or accounting initialization, populating earlier test accounts in Supabase with 24 default account rows.
- **Action Taken:** Completely removed `DEFAULT_CHART_OF_ACCOUNTS` and `seedDefaultAccounts()` from `AccountingService`. No backend service or controller contains any logic to auto-seed starter accounts.

---

### 3. Comprehensive GET Endpoint Side-Effect Audit

All GET endpoints in FINAGROW backend were audited to verify zero mutation / zero auto-seeding behavior:

| Service / Endpoint | HTTP Method | Mutates DB? | Verified Behavior |
| :--- | :--- | :--- | :--- |
| `AccountingService.getAccounts` | `GET /accounting/accounts` | **NO** | Pure read `prisma.account.findMany`. Fresh tenant returns `[]`. |
| `DashboardService.getSummary` | `GET /dashboard/summary` | **NO** | Pure aggregation query. Returns 0 metrics for fresh tenant. |
| `ReportsService.*` | `GET /reports/*` | **NO** | Pure read aggregations on general ledger. |
| `SubscriptionsService.getCurrentSubscription` | `GET /subscriptions/current` | **NO** | Reads existing or returns `FREE`. |
| `EntitiesService.getEntitiesByOrganization` | `GET /entities` | **NO** | Pure read `prisma.entity.findMany`. |
| `SalesService.*` | `GET /sales/*` | **NO** | Pure read queries. |
| `PurchasesService.*` | `GET /purchases/*` | **NO** | Pure read queries. |
| `InventoryService.*` | `GET /inventory/*` | **NO** | Pure read queries. |
| `TaxService.*` | `GET /tax/*` | **NO** | Pure read queries. |

---

### 4. Identity & Tenant Data Matrix

| Identity Scenario | Email | Organization Slug | Subscription | Accounts in DB | Business Data (Invoices, Journals, etc.) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Demo Admin** | `demo_admin@fms.com` | `berkah-cahaya-group` | **PRO** | **35 Accounts** (PostgreSQL) | Full Seeded Enterprise Dataset |
| **Demo User** | `demo_user@fms.com` | `berkah-cahaya-group` | **PRO** | **35 Accounts** (PostgreSQL) | Same Dataset (Restricted RBAC) |
| **Fresh Real User** | `user@company.com` | Unique (`org-xxxx`) | **FREE** | **0 Accounts** | **0 (True Clean Slate)** |

---

### 5. Demo Seed Architecture & Idempotency

- **Location:** `backend/prisma/seed.ts`.
- **Target Organization:** `Berkah Cahaya Group Corp` (`slug: berkah-cahaya-group`).
- **Account Count:** Exactly 35 non-duplicated, enterprise-grade accounts structured for multi-entity operations (13 Assets, 5 Liabilities, 2 Equity, 5 Revenue, 10 Expenses).
- **Idempotency:** Utilizes Prisma `upsert` with composite unique indexes (`entityId_code`, `slug`, `email`). Re-running the seed script never produces duplicates.

---

### 6. Cache Isolation & Identity Switching

- **Frontend Client Cache:** In-memory API cache (`apiCache`) in `src/services/api/client.ts` is scoped by active organization and entity headers and is explicitly cleared via `clearApiCache()` on:
  1. `handleImmediateDemoLogin()`
  2. `handleSubmit()` (Login & Register)
  3. `handleLogout()`
  4. Identity switching

---

### 7. Verification & Build Results

1. **Backend Unit Tests:**
   - Command: `npm test`
   - Result: **17 passed, 17 total (121 unit tests passed)**
2. **Backend TypeScript Check:**
   - Command: `npm run build`
   - Result: **0 errors**
3. **Frontend TypeScript Check:**
   - Command: `npx tsc --noEmit`
   - Result: **0 errors**
4. **Frontend Production Build:**
   - Command: `npm run build`
   - Result: **Built successfully with Vite v6.4.3**
