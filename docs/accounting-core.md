# FINAGROW Core Accounting Engine Architecture (Phase 2)

## 1. Overview & Architectural Role

The FINAGROW Accounting Engine is the **single source of financial truth** for the enterprise platform. In FINAGROW's architecture, subsidiary operational modules (such as Invoices, Bills, Payroll, Inventory, Cash Management, and Fixed Assets) do not directly calculate financial truth or own financial balances. Instead, operational transactions trigger double-entry journal postings through the core `AccountingService`.

```
┌─────────────────────────────────────────────────────────────┐
│ Operational Sub-Ledgers (Future Sales, Bills, Payroll, etc.)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                      POST Journal Entry
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          FINAGROW Core Accounting Engine Service            │
│  - Multi-Tenant & Entity Ownership Guard                    │
│  - Double-Entry Equilibrium Validator: SUM(Dr) === SUM(Cr)  │
│  - Strict Immutability & Status Lifecycle Engine            │
│  - Deterministic Journal Numbering: JE-YYYY-XXXXXX          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       Atomic Transaction
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          PostgreSQL Database Storage (Prisma ORM)           │
│  - accounts (Hierarchical Chart of Accounts)                │
│  - journal_entries (Header & Posting Metadata)              │
│  - journal_lines (Exact Decimal(18, 4) Debit/Credit items)  │
│  - audit_logs (Append-Only Accounting Event Trail)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
           Dynamic Query Streaming & Math Aggregation
                               ▼
┌──────────────────────────────┴──────────────────────────────┐
│        General Ledger (GL) & Trial Balance (TB) Stream       │
│  - Progressive Running Balance per Account Normal Balance   │
│  - Multi-Entity Date Range Filtering                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Chart of Accounts (COA) Design

The Chart of Accounts represents the master classification hierarchy of all financial accounts belonging to an operating entity.

### A. Account Types & Normal Balances

| Type | Code Range | Normal Balance | Balance Increment Rule | Balance Decrement Rule | Financial Statement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ASSET`** | 1000 – 1999 | **Debit** | $\text{Debit } (+)$ | $\text{Credit } (-)$ | Balance Sheet (Neraca) |
| **`LIABILITY`** | 2000 – 2999 | **Credit** | $\text{Credit } (+)$ | $\text{Debit } (-)$ | Balance Sheet (Neraca) |
| **`EQUITY`** | 3000 – 3999 | **Credit** | $\text{Credit } (+)$ | $\text{Debit } (-)$ | Balance Sheet (Neraca) |
| **`REVENUE`** | 4000 – 4999 | **Credit** | $\text{Credit } (+)$ | $\text{Debit } (-)$ | Income Statement (Laba Rugi) |
| **`EXPENSE`** | 5000 – 6999 | **Debit** | $\text{Debit } (+)$ | $\text{Credit } (-)$ | Income Statement (Laba Rugi) |

### B. Hierarchy & Entity Isolation Rules
- **Parent-Child Nesting:** Accounts support parent relationships (`parentId`) for roll-up reporting. Circular parent references and cross-entity parentage are rejected server-side.
- **Entity-Level Code Uniqueness:** Account codes (e.g. `1001`) are unique per operating `entity_id` (`@@unique([entityId, code])`), allowing multi-subsidiary organizations to maintain tailored or synchronized code structures.
- **Deactivation vs Deletion:** If an account has historical postings in `journal_lines`, hard deletion is prevented; the account is instead soft-deactivated (`isActive = false`) to preserve accounting auditability. System accounts cannot be deleted.

---

## 3. Double-Entry Journal Engine & Invariants

All journal entry creations pass through strict validation rules before being persisted.

### Strict Line Invariants
1. **Positive Non-Zero Amounts:** Every line must have either $\text{debit} > 0$ or $\text{credit} > 0$.
2. **Mutual Exclusion:** A single line cannot specify both debit and credit amounts.
3. **Non-Negative:** Negative monetary amounts are strictly prohibited.
4. **Active Accounts:** All accounts referenced in a journal entry must belong to the exact target `entity_id`, match the active `organization_id`, and have `isActive === true`.

### Double-Entry Balancing Law
For every `POSTED` journal entry, the sum of debits must mathematically equal the sum of credits:
$$\sum_{i=1}^{n} \text{Debit}_i \equiv \sum_{i=1}^{n} \text{Credit}_i$$

The comparison is executed using high-precision Decimal arithmetic (`@prisma/client/runtime/library` / PostgreSQL `Decimal(18, 4)`) to eliminate JavaScript floating-point rounding errors.

---

## 4. Lifecycle & Immutability of Journal Entries

```
 ┌─────────┐     postJournalEntry()     ┌──────────┐
 │  DRAFT  ├───────────────────────────►│  POSTED  │
 └────┬────┘  (Atomic Balance Verified) └────┬─────┘
      │                                      │
      │ Delete                               │ voidJournalEntry()
      ▼                                      ▼
 [ Purged ]                             ┌──────────┐
                                        │  VOIDED  │ (Permanently Preserved in Audit)
                                        └──────────┘
```

- **`DRAFT`:** Editable transaction staged by an accountant.
- **`POSTED`:** Immutably locked and reflected in the General Ledger. Direct editing or deletion is blocked by the server.
- **`VOIDED`:** When a posted entry must be cancelled, the entry is marked `VOIDED` with an audit record.

---

## 5. General Ledger & Running Balance Calculation

The General Ledger stream reads directly from `journal_lines` joined with `journal_entries` where `status === POSTED`.

Running balances are computed progressively:
- **For `ASSET` and `EXPENSE` accounts:**
  $$\text{RunningBalance}_t = \text{RunningBalance}_{t-1} + \text{Debit}_t - \text{Credit}_t$$
- **For `LIABILITY`, `EQUITY`, and `REVENUE` accounts:**
  $$\text{RunningBalance}_t = \text{RunningBalance}_{t-1} + \text{Credit}_t - \text{Debit}_t$$

---

## 6. Trial Balance Verification

The Trial Balance endpoint aggregates all historical posted debits and credits grouped by account:
$$\text{Grand Total Debit Balances} \equiv \text{Grand Total Credit Balances}$$

The API response returns `isBalanced: true` and `difference: 0` when the general ledger is in perfect equilibrium.

---

## 7. Audit Event Records

All accounting actions trigger records in `audit_logs`:
- `ACCOUNT_CREATED`
- `ACCOUNT_UPDATED`
- `ACCOUNT_DEACTIVATED`
- `ACCOUNT_DELETED`
- `JOURNAL_CREATED`
- `JOURNAL_POSTED`
- `JOURNAL_VOIDED`
