# FINAGROW — DEMO WORKSPACE VS REAL USER TENANT ISOLATION REPORT

## 1. Executive Summary & Root Cause Analysis
During live demonstration, a critical bug was identified where newly registered real accounts (e.g., `kakang` / `abc@gmail.com`) entered FINAGROW and observed approximately 24 Chart of Accounts, active demo journals, pre-populated invoices, and a `PRO ACTIVE` subscription status.

### Root Cause Identification
1. **Unconditional Mock Fallbacks in Client UI Components**:
   - `FMSContext.tsx` seeded `DEFAULT_STATE` with `DEFAULT_COA` (24 demo accounts), demo entities, and demo transactions by default.
   - UI components (`Accounts.tsx`, `Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Vendors.tsx`, `Inventory.tsx`, `Tax.tsx`, `Users.tsx`, `CashBank.tsx`, `Budgeting.tsx`, `Assets.tsx`, `GeneralLedger.tsx`) contained `isDemo` flags and synthetic mock arrays that rendered fallback demo data whenever database queries returned empty lists.
2. **Backend Guard Unauthenticated Demo Fallbacks**:
   - `SessionAuthGuard` previously executed `prisma.user.findFirst({ where: { isActive: true } })` if no valid session token or cookie was provided, automatically authenticating unauthenticated requests as the first seeded demo user (`demo_admin@fms.com`).
   - `TenantGuard` allowed cross-tenant access without throwing strict `403 Forbidden` errors when clients provided mismatched `x-organization-id` headers.
3. **Default Subscription Plan**:
   - The Prisma schema default for `Subscription.planCode` was `"PRO"` instead of `"FREE"`, causing newly registered companies to automatically receive a `PRO` subscription.
4. **Client-Side Auth Token Management**:
   - LocalStorage was previously used to store fake mock user profiles and fallback session tokens.

---

## 2. Architectural Changes & Security Enhancements

### A. Strict Backend Guard Enforcement
- **`backend/src/auth/guards/session-auth.guard.ts`**:
  - Removed all `prisma.user.findFirst` fallback code.
  - Guard extracts `finagrow_session` from signed HttpOnly cookies. If the cookie is absent or session is expired/invalid, it immediately throws `401 Unauthorized`.
  - Strictly matches authenticated tenant context against user's verified `organizationMembers`.
- **`backend/src/common/guards/tenant.guard.ts`**:
  - Validates `x-organization-id` against user's actual organization memberships.
  - Throws `ForbiddenException('You do not have access to the requested organization.')` (HTTP 403) upon any foreign tenant request.

### B. Database Schema & Subscriptions Default
- **`backend/prisma/schema.prisma`**:
  - Changed `Subscription` model `planCode` default from `"PRO"` to `"FREE"`.
- **`backend/prisma/seed.ts`**:
  - Added explicit `Subscription` upsert with `planCode: 'PRO', status: 'ACTIVE'` targeted exclusively to the demo organization (`Berkah Cahaya Group Corp`).
- **`backend/src/auth/auth.service.ts`**:
  - `register`: Explicitly creates a `Subscription` with `planCode: 'FREE', status: 'ACTIVE'` within the atomic registration transaction.
  - `login` & `getMe`: Normalized auth payloads, set HttpOnly cookies, and stripped sensitive tokens from public response bodies.

### C. Clean Client State Architecture
- **`context/FMSContext.tsx`**:
  - Replaced all default demo data with clean `EMPTY_STATE` (`role: 'User'`, `subscription: 'Free'`, `coa: []`, `transactions: []`, `invoices: []`, `budgets: []`, `assets: []`, `inventory: []`, `vendors: []`, `entities: []`).
  - Removed all hardcoded demo auto-logins from reducer and provider initializers.
- **`App.tsx`**:
  - Implemented `AuthContext` with strict `authStatus: 'CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'`.
  - Bootstrap calls `authApi.getMe()` on application mount to resolve authentic tenant identity and current subscription from PostgreSQL.
  - `ProtectedRoute` renders a splash loader during `CHECKING`, redirects to `/login` on `UNAUTHENTICATED`, and renders authenticated layout only when verified.
- **Frontend Components De-mocking**:
  - Removed synthetic mock arrays and `isDemo` overrides across all 12 modules (`Accounts`, `Dashboard`, `Sales`, `Purchases`, `Vendors`, `Inventory`, `Tax`, `Users`, `CashBank`, `Budgeting`, `Assets`, `GeneralLedger`).
  - Every screen now renders honest, isolated database records directly from PostgreSQL. If an organization has 0 items, a clean empty state with "+ Tambah Baru" CTA is displayed.

---

## 3. Demo vs Real User Account Comparison

| Feature / Workspace Property | Demo Account (`demo_admin@fms.com`) | Newly Registered Real Account (`kakang`, `abc@gmail.com`) |
| :--- | :--- | :--- |
| **Authentication Source** | Database seed (`demo_admin@fms.com`) | Direct registration in PostgreSQL |
| **Organization Tenant** | `Berkah Cahaya Group Corp` | Unique user organization (e.g., `Kakang Co`) |
| **Active Entity** | `BC-HO` (HQ Jakarta) | 1 HQ Entity (e.g., `Perusahaan Utama`) |
| **Subscription Plan** | **PRO ACTIVE** | **FREE ACTIVE** |
| **Chart of Accounts** | 24 seeded accounts | **0 Accounts (Clean Slate)** |
| **General Ledger Journals** | Seeded historical transactions | **0 Journal Entries** |
| **Sales & Invoices** | Seeded corporate AR invoices | **0 Invoices (Rp 0)** |
| **Purchases & Bills** | Seeded vendor AP bills | **0 Bills (Rp 0)** |
| **Vendors & Contacts** | Seeded enterprise vendors | **0 Vendors** |
| **Inventory & Stock** | Seeded warehouse SKU units | **0 Stock Items** |
| **Fixed Assets** | Seeded capital assets | **0 Assets** |
| **Tax Records** | Seeded VAT DPP records | **Rp 0 Output/Input VAT** |

---

## 4. Verification & Automated Test Results

### 1. Backend Automated Test Suite
- **Command**: `npm test` in `backend/`
- **Result**: **17 test suites passed, 121 tests passed (100% success)**
- **Coverage**:
  - `auth.service.spec.ts`: PASSED
  - `tenant.guard.spec.ts`: PASSED
  - `roles.guard.spec.ts`: PASSED
  - `subscriptions.service.spec.ts`: PASSED
  - `accounting.service.spec.ts`: PASSED
  - `sales.service.spec.ts`: PASSED
  - `purchases.service.spec.ts`: PASSED
  - `cash-bank.service.spec.ts`: PASSED
  - `inventory.service.spec.ts`: PASSED
  - `assets.service.spec.ts`: PASSED
  - `tax.service.spec.ts`: PASSED
  - `budgets.service.spec.ts`: PASSED
  - `payroll.service.spec.ts`: PASSED
  - `reports.service.spec.ts`: PASSED
  - `dashboard.service.spec.ts`: PASSED
  - `projects.service.spec.ts`: PASSED
  - `ai.service.spec.ts`: PASSED

### 2. Frontend & Backend Compilation
- **Backend Build**: `npm run build` (`prisma generate && nest build`) -> **Exit code 0 (Success)**
- **Frontend Build**: `npm run build` (`vite build`) -> **Exit code 0 (2819 modules transformed, 0 errors)**
