# FINAGROW — Legacy Cleanup & Source-of-Truth Audit

**Phase 11 Architectural Hardening & Cleanup Report**  
*Date:* August 31, 2026

---

## 1. Browser Storage Classification

Every usage of `localStorage` and `sessionStorage` in the codebase has been audited and classified according to the following framework:

- **Category A (Business Data - REMOVED):** Storing authoritative business records (transactions, invoices, COA, budgets, inventory) in browser storage has been completely eliminated. PostgreSQL is the authoritative source.
- **Category B (Auth Legacy - REMOVED):** Storing plain text registered user lists (`fms_registered_users`) or mock passwords in localStorage has been removed in favor of NestJS session auth tokens.
- **Category C (UI Preferences - RETAINED):** Harmless client preferences (theme, language, active UI tabs) are retained with backend sync.
- **Category D (Volatile Cache - RETAINED):** Ephemeral UI session state (such as chat dialogue during tab navigation).

### Complete Storage Key Registry

| Storage Key | Type | Purpose | Initial State | Final Status | Authoritative Replacement |
| :--- | :---: | :--- | :--- | :---: | :--- |
| `fms_session` / `fms_token` | `localStorage` | Client bearer/session token | Prototype string | **ACTIVE (Secure)** | NestJS Session & JWT Authentication |
| `fms_active_user_email` | `localStorage` | Fast UI email hint for avatar/header | Prototype identifier | **ACTIVE (UI Hint)** | NestJS `@CurrentUser()` session |
| `theme` | `localStorage` | Dark / Light theme selection | Client state | **ACTIVE (UI Cache)** | Synchronized with `UserSettings` in PostgreSQL |
| `fms_language` | `localStorage` | Locale preference (`id` / `en`) | Client state | **ACTIVE (UI Cache)** | Synchronized with `UserSettings` in PostgreSQL |
| `fms_pro_chat_history_v2` | `sessionStorage` | Ephemeral AI chat conversation cache | Volatile cache | **ACTIVE (UI Cache)** | Client session memory |
| `fms_state_user_*` | `localStorage` | Legacy mock business ledger state | Business state | **REMOVED** | PostgreSQL Models & Prisma ORM |
| `fms_registered_users` | `localStorage` | Plain text users repository | Security hazard | **REMOVED** | PostgreSQL `User` & `OrganizationMember` |
| `fms_global_modules` | `localStorage` | Client-side module visibility | Client override | **REMOVED** | `UserSettings.enabledModules` in PostgreSQL |
| `fms_state_react_v1` | `localStorage` | Legacy prototype snapshot | Business state | **REMOVED** | PostgreSQL Database |

---

## 2. FMSContext Audit & Before/After Comparison

### Before Phase 11
- Contained 500+ lines of mock enterprise financial data (`getSeededStateForUser`).
- Maintained 25+ CRUD prototype reducer actions (`ADD_TRANSACTION`, `ADD_INVOICE`, `ADD_BUDGET`, `ADD_ASSET`, `ADD_INVENTORY_ITEM`, `ADD_PROJECT`, `ADD_USER`, etc.).
- Created dual-write synchronization bugs where UI components wrote to local state while backend persisted to PostgreSQL.

### After Phase 11
- `FMSContext` is reduced strictly to a **lightweight UI context**:
  - `activeEntity`: Code of currently selected active business unit (e.g. `BC`, `E1`).
  - `activeEntityId`: Database UUID of currently selected entity passed in API query headers.
  - `activePeriod`: Fiscal period filter (e.g. `2026-08`).
  - `currency`: Active display currency symbol (`IDR`, `USD`).
  - `subscription`: Active tenant subscription badge (`Free`, `Pro`).
  - `role`: Active user role for UI navigation visibility (`Admin`, `User`).
  - `modules`: Navigation module visibility map.
  - `notifications`: Client UI notifications tray.
- All 25+ obsolete reducer CRUD actions removed.
- All business mutations occur exclusively through typed REST API clients in `src/services/api/`.

---

## 3. Mock Data & Seed Audit

| Location / Data | Category | Treatment in Phase 11 |
| :--- | :--- | :--- |
| `components/LandingPage.tsx` | Marketing Demo Illustrations | **Retained as decorative static content** (Clearly isolated from authenticated app) |
| `backend/prisma/seed.ts` | Development Database Seeds | **Retained for development initialization** (Run via `npm run seed`) |
| `backend/src/**/*.spec.ts` | Test Fixtures | **Retained for automated Jest unit tests** |
| `context/FMSContext.tsx` | Production Business Mocks | **REMOVED** |
| `components/Dashboard.tsx` | Hardcoded Financial Fallbacks | **REMOVED** (Zero mock fallback; live GL queries only) |
| `components/Reports.tsx` | Client-side Calculation Fallbacks | **REMOVED** (Server-side reports calculation only) |

---

## 4. API Client & Type Consolidation

- All frontend REST calls standardized under `src/services/api/client.ts` with typed error handling and automatic bearer authentication.
- Single source of truth for domain types matching backend DTO schemas.
- Zero direct browser Gemini secret exposure.
