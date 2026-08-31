# FINAGROW REST API Reference

**Base URL:** `http://localhost:4000/api/v1`  
**Standard Response Envelope:**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-08-30T17:00:00.000Z"
  }
}
```

---

## 1. Authentication Endpoints (`/auth/*`)
- `POST /auth/register` — Register user & tenant.
- `POST /auth/login` — Authenticate and issue HttpOnly session cookie.
- `POST /auth/logout` — Revoke active session.
- `GET /auth/me` — Authenticated identity profile.

---

## 2. Core Accounting Engine Endpoints (`/accounting/*`)
- `GET /accounting/accounts` & `POST /accounting/accounts`
- `GET /accounting/accounts/:id`, `PATCH /accounting/accounts/:id`, `DELETE /accounting/accounts/:id`
- `GET /accounting/journal-entries` & `POST /accounting/journal-entries`
- `POST /accounting/journal-entries/:id/post` & `POST /accounting/journal-entries/:id/void`
- `GET /accounting/ledger` & `GET /accounting/trial-balance`

---

## 3. Sales & Accounts Receivable Endpoints (`/sales/*`)
- `GET /sales/customers` & `POST /sales/customers`
- `GET /sales/invoices` & `POST /sales/invoices`
- `POST /sales/invoices/:id/post` & `POST /sales/invoices/:id/cancel`
- `GET /sales/ar/summary`, `GET /sales/ar/aging`, `GET /sales/ar/reconciliation`

---

## 4. Purchases & Accounts Payable Endpoints (`/purchases/*`)
- `GET /purchases/vendors` & `POST /purchases/vendors`
- `GET /purchases/orders` & `POST /purchases/orders`
- `POST /purchases/orders/:id/approve` & `POST /purchases/orders/:id/create-bill`
- `GET /purchases/bills` & `POST /purchases/bills`
- `POST /purchases/bills/:id/post` & `POST /purchases/bills/:id/cancel`
- `GET /purchases/ap/summary`, `GET /purchases/ap/aging`, `GET /purchases/ap/reconciliation`

---

## 5. Cash, Bank, Payments & Bank Reconciliation Endpoints (`/cash-bank/*` & `/payments/*`)

### A. Cash & Bank Accounts
- `GET /cash-bank/accounts` — List accounts with live General Ledger balances.
- `POST /cash-bank/accounts` — Create account mapped to an ASSET COA account.
- `GET /cash-bank/accounts/:id` — Retrieve account details.
- `PATCH /cash-bank/accounts/:id` — Update account profile.
- `POST /cash-bank/accounts/:id/deactivate` — Soft-deactivate account.
- `GET /cash-bank/accounts/:id/balance` — Authoritative GL balance endpoint.

### B. Unified Payments & Receipts
- `GET /payments` — List payments (filters: `type`, `status`, `customerId`, `vendorId`, `cashBankAccountId`, `dateFrom`, `dateTo`, `search`).
- `POST /payments` — Create DRAFT customer receipt or vendor payment with document allocations.
- `GET /payments/:id` — Full payment details with allocation links and journal entry.
- `POST /payments/:id/post` — Post payment to General Ledger and update invoice/bill settlement state.
- `POST /payments/:id/reverse` — Void journal entry, reverse payment, and restore invoice/bill balances.
- `POST /cash-bank/transfers` — Execute inter-account bank transfer (ZERO revenue/expense).

### C. Bank Statements (Zero GL Impact)
- `POST /cash-bank/statements/import` — Upload and parse CSV statement with SHA-256 deduplication.
- `GET /cash-bank/statements` — List imported statement batches.
- `GET /cash-bank/statements/:id` — Retrieve statement batch and lines.

### D. Bank Reconciliation
- `GET /cash-bank/reconciliation` — List reconciliation periods.
- `POST /cash-bank/reconciliation` — Create new reconciliation period with GL snapshot.
- `GET /cash-bank/reconciliation/:id` — Retrieve reconciliation details, book balance, and difference.
- `GET /cash-bank/reconciliation/:id/suggestions` — Auto-matching suggestions ($\pm 3$ days, exact amount).
- `POST /cash-bank/reconciliation/match` — Manually match statement line to payment or journal.
- `POST /cash-bank/reconciliation/unmatch` — Unmatch statement line.
- `POST /cash-bank/reconciliation/:id/complete` — Complete reconciliation (requires $\text{Difference} = 0$).
- `POST /cash-bank/reconciliation/:id/reopen` — Reopen completed reconciliation session.

---

## 6. Inventory & Perpetual Valuation Endpoints (`/api/v1/inventory/*`)

### A. Inventory Items Master
- `GET /api/v1/inventory/items` — List items with real-time on-hand stock and valuation.
- `POST /api/v1/inventory/items` — Register new item (SKU, valuation method, accounts).
- `GET /api/v1/inventory/items/:id` — Retrieve item details and stock balance.
- `PATCH /api/v1/inventory/items/:id` — Update item properties.
- `POST /api/v1/inventory/items/:id/deactivate` — Soft-deactivate item.

### B. Warehouses
- `GET /api/v1/inventory/warehouses` — List warehouses with active stock counts.
- `POST /api/v1/inventory/warehouses` — Create warehouse.

### C. Goods Receipts (GR)
- `GET /api/v1/inventory/receipts` — List Goods Receipts.
- `POST /api/v1/inventory/receipts` — Create DRAFT Goods Receipt with PO matching & over-receipt validation.
- `GET /api/v1/inventory/receipts/:id` — Retrieve receipt details and lines.
- `POST /api/v1/inventory/receipts/:id/post` — Post receipt ($\text{DR Inventory Control} / \text{CR GRNI}$).
- `POST /api/v1/inventory/receipts/:id/reverse` — Reverse receipt and void journal entry.

### D. Deliveries & COGS (DO)
- `GET /api/v1/inventory/deliveries` — List outbound deliveries.
- `POST /api/v1/inventory/deliveries` — Create DRAFT delivery.
- `GET /api/v1/inventory/deliveries/:id` — Retrieve delivery details and lines.
- `POST /api/v1/inventory/deliveries/:id/post` — Post delivery ($\text{DR COGS} / \text{CR Inventory Control}$) with FIFO layer consumption.
- `POST /api/v1/inventory/deliveries/:id/reverse` — Reverse delivery, void COGS journal, restore layers.

### E. Transfers & Adjustments
- `GET /api/v1/inventory/transfers` — List inter-warehouse transfers.
- `POST /api/v1/inventory/transfers` — Execute stock transfer (preserved unit cost, zero GL impact).
- `GET /api/v1/inventory/adjustments` — List stock adjustments.
- `POST /api/v1/inventory/adjustments` — Post physical opname adjustment with GL gain/loss.

### F. Reports & Reconciliations
- `GET /api/v1/inventory/stock-card` — Authoritative stock card with running balance and running value.
- `GET /api/v1/inventory/valuation` — Inventory valuation report.
- `GET /api/v1/inventory/reconciliation` — Inventory-to-GL reconciliation ($\text{Sub-ledger Layer Value} = \text{GL Control 1140 Balance}$).
- `GET /api/v1/inventory/grni/reconciliation` — GRNI reconciliation ($\text{Unbilled PO Receipts} = \text{GL GRNI 2140 Balance}$).

---

## 7. Fixed Assets & Depreciation Endpoints (`/api/v1/assets/*`)

### A. Asset Categories
- `GET /api/v1/assets/categories` — List asset categories with account mappings and asset counts.
- `POST /api/v1/assets/categories` — Create category (with COA accounts 1500, 1510, 6500, 4910, 5910).
- `GET /api/v1/assets/categories/:id` — Retrieve category details.
- `PATCH /api/v1/assets/categories/:id` — Update category properties.

### B. Fixed Asset Register
- `GET /api/v1/assets` — List assets with search & category/status filters.
- `POST /api/v1/assets` — Register asset in `DRAFT` status (zero GL impact).
- `GET /api/v1/assets/:id` — Retrieve full asset details with schedules, movements, and disposals.
- `PATCH /api/v1/assets/:id` — Update asset metadata.
- `POST /api/v1/assets/:id/capitalize` — Capitalize asset, generate straight-line schedule, and post acquisition journal.

### C. Asset Movements
- `POST /api/v1/assets/:id/move` — Relocate asset or transfer custodian (zero GL impact).
- `GET /api/v1/assets/movements/all` — List historical movement log.

### D. Depreciation Runs
- `GET /api/v1/assets/depreciation-runs/all` — List batch depreciation runs.
- `POST /api/v1/assets/depreciation-runs/calculate` — Preview calculated depreciation for period `(year, month)`.
- `POST /api/v1/assets/depreciation-runs/post` — Post monthly batch to General Ledger ($\text{DR 6500} / \text{CR 1510}$).
- `POST /api/v1/assets/depreciation-runs/:id/reverse` — Void journal entry and restore schedule status.

### E. Asset Disposals
- `GET /api/v1/assets/disposals/all` — List disposal records and journals.
- `POST /api/v1/assets/:id/dispose` — Post disposal (Sale with Gain/Loss, Scrap write-off).

### F. Reports & Reconciliation
- `GET /api/v1/assets/register` — Authoritative asset register report.
- `GET /api/v1/assets/reconciliation` — Asset-to-GL reconciliation ($\text{Sub-ledger Cost} = \text{GL 1500}, \text{Sub-ledger Acc Dep} = \text{GL 1510}, \Delta = 0$).

---

## 8. AI Proxy Endpoint (`/ai/query`)
- `POST /ai/query` — Server-side Gemini proxy query.
