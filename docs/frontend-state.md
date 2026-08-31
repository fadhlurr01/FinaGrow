# FINAGROW — Frontend State Management Architecture

## 1. Architectural Division of Responsibilities

FINAGROW divides state into three distinct, non-overlapping categories:

```
┌──────────────────────────────────────────────────────────┐
│                   FINAGROW State Layers                  │
├──────────────────────────┬───────────────────────────────┤
│ 1. Server State          │ PostgreSQL Database           │
│    (Authoritative)       │ Access via REST APIs          │
├──────────────────────────┼───────────────────────────────┤
│ 2. Global UI State       │ FMSContext (UI Provider)      │
│    (Session & Tenant)    │ activeEntityId, activePeriod, │
│                          │ currency, subscription, role  │
├──────────────────────────┼───────────────────────────────┤
│ 3. Client Preferences    │ LocalStorage Cache            │
│    (Non-authoritative)   │ theme, language               │
└──────────────────────────┴───────────────────────────────┘
```

---

## 2. Guidelines for Component State

1. **Component-Local Data Fetching:**
   - Components fetch live records via dedicated API client methods (e.g. `accountingApi.getAccounts()`, `salesApi.getInvoices()`).
   - Mutations (Create, Update, Delete) are sent to backend REST endpoints; on resolution, components re-fetch or optimistically update local view.
2. **Entity Context Propagation:**
   - Header entity switcher updates `state.activeEntityId`.
   - Components watch `state.activeEntityId` via `useEffect` and automatically refresh their datasets for the newly selected entity.
3. **Zero Dual-Write:**
   - Components never write business records (accounts, transactions, bills, invoices) to `FMSContext` or `localStorage`.
