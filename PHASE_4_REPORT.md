# FINAGROW — Phase 4 Report: Purchases, Vendors & Accounts Payable (AP)

**Project:** FINAGROW Enterprise Financial Management System  
**Phase:** Phase 4 — Purchases, Vendors & Accounts Payable Sub-ledger  
**Status:** Completed & Fully Validated  

---

## 1. Executive Summary

Phase 4 delivers FINAGROW's second major operational sub-ledger: **Purchases, Vendors, and Accounts Payable (AP)**, integrated with the Phase 2 Core Double-Entry Accounting Engine and complementing Phase 3 Sales/AR.

A strict architectural distinction is established between **Purchase Orders** (commercial commitments with guaranteed zero GL impact) and **Vendor Bills** (operational financial obligations that post compound double-entry journal entries upon authorization).

---

## 2. Architecture & Sub-ledger Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 React 19 Frontend Components                │
│       Purchases.tsx (Bills, POs & AP Sub-ledger)            │
│       Vendors.tsx   (Corporate B2B Vendor Management)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ purchasesApi.ts
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           NestJS Purchases Module (/api/v1/purchases)       │
│  VendorsService  │  OrdersService  │   PurchasesService     │
│  - VEN-XXXXXX    │  - PO-YYYY-XXXX │  - BILL-YYYY-XXXXXX    │
│  - Soft Deactiv  │  - ZERO GL      │  - DR Expense / DR Tax │
│                  │  - Approvals    │  - CR AP Control       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Calls AccountingService
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Phase 2 Double-Entry Accounting Engine            │
│  - AccountingSettings Mapping (AP, Expense, Input VAT)      │
│  - Enforces SUM(Debits) === SUM(Credits)                    │
│  - Atomically posts to journal_entries & journal_lines      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Key Sub-ledger Capabilities Delivered

### A. Vendor Management
- Entity-scoped B2B vendor records with deterministic numbering (`VEN-000001`).
- Payment terms (`paymentTermsDays`), bank details, and credit limits with Decimal precision.
- Soft-deactivation prevents breaking historical bills and audit trails.

### B. Purchase Orders (ZERO GL Impact Guarantee)
- Purchase Orders represent procurement commitments without General Ledger postings.
- Full lifecycle management: `DRAFT` $\to$ `APPROVED` $\to$ `PARTIALLY_BILLED` $\to$ `FULLY_BILLED` $\to$ `CANCELLED`.
- 1-click conversion from approved PO to draft Vendor Bill with full line item copy.

### C. Vendor Bills & Double-Entry Posting
- Bills are created in `DRAFT` / `UNPOSTED` status (zero accounting impact).
- Posting a bill retrieves `AccountingSettings` (`apAccountId`, `inputTaxAccountId`, `defaultExpenseAccountId`) and creates a balanced compound journal:
  - $\text{DR Operating Expense Account(s)}$
  - $\text{DR Input Tax Receivable (PPN Masukan 11\% if } > 0\text{)}$
  - $\text{CR Accounts Payable Control Account}$
- Supports multi-expense account splitting across different procurement expense categories.
- Authoritative backend recalculation of subtotals, discounts, tax, and totals using Decimal arithmetic.

### D. Accounting-Safe Cancellation & Reversal
- Posted bills cannot be deleted or directly mutated.
- Cancelling a posted bill generates an explicit immutable reversing journal in the general ledger (`DR AP`, `CR Expense`, `CR Tax`), setting `status = CANCELLED` and `postingStatus = REVERSED`.

### E. Accounts Payable Analytics & Reconciliation
- Real-time AP metrics and aging buckets (`CURRENT`, `1-30`, `31-60`, `61-90`, `90+` days).
- Automated AP Sub-ledger to General Ledger reconciliation verifying $\sum \text{Open Bills Amount Due} \equiv \text{GL AP Control Account Balance}$.

### F. Frontend Migration & Mock Fallback Removal
- Migrated [`components/Purchases.tsx`](file:///d:/Kerja%20Praktik/Laporan%20selama%20Kerja%20Praktik/Day-12/finagrow-main/components/Purchases.tsx) and [`components/Vendors.tsx`](file:///d:/Kerja%20Praktik/Laporan%20selama%20Kerja%20Praktik/Day-12/finagrow-main/components/Vendors.tsx) to live REST API.
- Completely removed silent mock data fallbacks, replacing them with explicit API error alert banners and retry actions.

---

## 4. Test & Build Validation Results

| Test / Build Step | Command | Status | Result |
| :--- | :--- | :--- | :--- |
| **Prisma Schema** | `npx prisma validate` | **PASS** | Validated cleanly 🚀 |
| **Prisma Client** | `npx prisma generate` | **PASS** | Generated models |
| **Backend Test Suite** | `npx jest` | **PASS** | **7/7 Suites Passed, 58/58 Tests Passed** |
| **Backend Build** | `npx nest build` | **PASS** | 0 Errors (Compiled to `dist/`) |
| **Frontend Lint** | `npm run lint` | **PASS** | `tsc --noEmit` 0 Errors |
| **Frontend Build** | `npm run build` | **PASS** | `vite build` Production Bundle |

---

## 5. Artifacts and Files Created / Modified

### Backend Modules (`backend/`)
- `backend/prisma/schema.prisma` — Extended with `Vendor`, `PurchaseOrder`, `PurchaseOrderLine`, `VendorBill`, `VendorBillLine`.
- `backend/prisma/seed.ts` — Seeded `AccountingSettings` with AP, Input Tax, and Expense accounts + starter vendors.
- `backend/src/purchases/dto/*` — `CreateVendorDto`, `UpdateVendorDto`, `CreateOrderDto`, `CreateBillDto`, etc.
- `backend/src/purchases/vendors.service.ts`, `orders.service.ts`, `purchases.service.ts` — Sub-ledger services.
- `backend/src/purchases/purchases.controller.ts` & `purchases.module.ts` — Controllers and module.
- `backend/src/purchases/purchases.service.spec.ts` — 30 sub-ledger test scenarios.

### Frontend Integration (`src/`)
- `src/services/api/purchasesApi.ts` — Typed client bridge for Purchases and AP.
- `components/Purchases.tsx` & `components/Vendors.tsx` — Migrated to live REST API.

### Documentation (`docs/`)
- `docs/purchases-ap.md` — Sub-ledger architecture guide.
- `docs/database.md` & `docs/api.md` — Updated database ERD and API reference.

---

## 6. Recommendations for Phase 5

In Phase 5, we recommend implementing the Cash, Bank & Settlement module:
1. **Cash & Bank Account Master & Journal Integration.**
2. **Unified Payment & Allocation Engine:** Generic payments settling both Sales Invoices (`DR Bank`, `CR AR`) and Vendor Bills (`DR AP`, `CR Bank`).
3. **Bank Statement Import & Reconciliation Engine.**

*Note: As per instruction, Phase 5 will not start automatically.*
