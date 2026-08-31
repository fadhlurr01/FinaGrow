# FINAGROW Database Architecture & Prisma Schema
**Document Version:** 5.0.0 (Phase 5 - Cash, Bank, Unified Payment Engine & Bank Reconciliation)  
**Database Engine:** PostgreSQL 15+  
**ORM:** Prisma ORM  

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ENTITIES : has
    ENTITIES ||--o{ ACCOUNTS : contains
    ENTITIES ||--o{ CASH_BANK_ACCOUNTS : maintains
    ACCOUNTS ||--o{ CASH_BANK_ACCOUNTS : maps_to
    ENTITIES ||--o{ CUSTOMERS : serves
    ENTITIES ||--o{ VENDORS : contracts
    CUSTOMERS ||--o{ SALES_INVOICES : bills
    VENDORS ||--o{ VENDOR_BILLS : issues
    ENTITIES ||--o{ PAYMENTS : executes
    CASH_BANK_ACCOUNTS ||--o{ PAYMENTS : routes
    PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : allocates
    SALES_INVOICES ||--o{ PAYMENT_ALLOCATIONS : settled_by
    VENDOR_BILLS ||--o{ PAYMENT_ALLOCATIONS : settled_by
    PAYMENTS ||--o| JOURNAL_ENTRIES : posts_to
    CASH_BANK_ACCOUNTS ||--o{ BANK_STATEMENT_IMPORTS : receives
    BANK_STATEMENT_IMPORTS ||--o{ BANK_STATEMENT_LINES : contains
    CASH_BANK_ACCOUNTS ||--o{ BANK_RECONCILIATIONS : reconciles
    BANK_STATEMENT_LINES ||--o{ BANK_RECONCILIATION_MATCHES : matched_in
    PAYMENTS ||--o{ BANK_RECONCILIATION_MATCHES : matched_to
    JOURNAL_ENTRIES ||--o{ BANK_RECONCILIATION_MATCHES : matched_to

    CASH_BANK_ACCOUNTS {
        uuid id PK
        uuid entity_id FK
        varchar code UK_per_entity
        varchar name
        enum type
        uuid coa_account_id FK
        varchar bank_name
        varchar bank_account_number
        decimal opening_balance
        boolean is_active
    }

    PAYMENTS {
        uuid id PK
        uuid entity_id FK
        varchar payment_number UK_per_entity
        enum type
        enum direction
        enum status
        date payment_date
        uuid customer_id FK_nullable
        uuid vendor_id FK_nullable
        uuid cash_bank_account_id FK
        uuid to_cash_bank_account_id FK_nullable
        decimal amount
        decimal allocated_amount
        decimal unallocated_amount
        uuid journal_entry_id FK_nullable
    }

    PAYMENT_ALLOCATIONS {
        uuid id PK
        uuid payment_id FK
        uuid sales_invoice_id FK_nullable
        uuid vendor_bill_id FK_nullable
        decimal allocated_amount
    }

    BANK_STATEMENT_IMPORTS {
        uuid id PK
        uuid cash_bank_account_id FK
        varchar source_filename
        date statement_start_date
        date statement_end_date
        decimal opening_balance
        decimal closing_balance
        enum status
    }

    BANK_STATEMENT_LINES {
        uuid id PK
        uuid bank_statement_import_id FK
        date transaction_date
        varchar description
        varchar reference
        decimal debit_amount
        decimal credit_amount
        decimal amount
        decimal balance
        varchar normalized_hash UK_candidate
        enum reconciliation_status
    }

    BANK_RECONCILIATIONS {
        uuid id PK
        uuid cash_bank_account_id FK
        date period_start
        date period_end
        decimal statement_opening_balance
        decimal statement_closing_balance
        decimal book_closing_balance
        decimal difference
        enum status
    }
```

---

## 2. Table Descriptions & Constraints (Phase 5 Additions)

### 1. `cash_bank_accounts`
Operational liquid accounts mapped to Chart of Accounts ASSET accounts.
- `code`: Unique composite on `(entity_id, code)`.
- `coa_account_id`: Foreign key to `accounts(id)` enforcing strict entity isolation.

### 2. `payments`
Unified settlement entity supporting customer receipts, vendor disbursements, and bank transfers.
- `payment_number`: Unique composite on `(entity_id, payment_number)`.
- `type`: Enum (`CUSTOMER_RECEIPT`, `VENDOR_PAYMENT`, `TRANSFER`, `OTHER_RECEIPT`, `OTHER_PAYMENT`).
- `status`: Enum (`DRAFT`, `POSTED`, `REVERSED`, `CANCELLED`).

### 3. `payment_allocations`
Sub-ledger settlement links between payments and sales invoices or vendor bills.

### 4. `bank_statement_imports` & `bank_statement_lines`
External bank statements with deterministic normalized hash deduplication and zero automatic GL impact.

### 5. `bank_reconciliations` & `bank_reconciliation_matches`
Reconciliation periods enforcing strict $\text{Difference} = 0$ rules for period closing.

---

## 3. Table Descriptions & Constraints (Phase 6 Additions)

### 1. `inventory_items`
Master items table with multi-tenant and entity isolation.
- `sku`: Unique composite on `(entity_id, sku)`.
- `valuation_method`: `FIFO` or `WEIGHTED_AVERAGE`.
- `inventory_account_id` / `cogs_account_id`: Optional per-item COA overrides.

### 2. `warehouses` & `stock_locations`
Physical storage facilities.
- `code`: Unique composite on `(entity_id, code)`.

### 3. `stock_movements`
Authoritative stock transaction log.
- `movement_number`: Unique composite on `(entity_id, movement_number)`.
- `movement_type`: `PURCHASE_RECEIPT`, `SALES_ISSUE`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN_IN`, `RETURN_OUT`.
- `status`: `DRAFT`, `POSTED`, `CANCELLED`.

### 4. `inventory_valuation_layers`
Granular FIFO cost buckets.
- Tracks `quantity_in`, `quantity_remaining`, `unit_cost`, `total_cost`, `layer_date`.

### 5. `goods_receipts` & `goods_receipt_lines`
Receiving sub-ledger documents posting $\text{DR Inventory} / \text{CR GRNI}$.

### 6. `deliveries` & `delivery_lines`
Outbound delivery documents posting $\text{DR COGS} / \text{CR Inventory}$.

### 7. `stock_transfers` & `stock_adjustments`
Warehouse movements and physical count adjustments.

---

## 4. Table Descriptions & Constraints (Phase 7 Additions)

### 1. `fixed_asset_categories`
Category definitions with Chart of Accounts mappings:
- `fixed_asset_account_id`: Asset cost control account (`AccountType.ASSET`, `FIXED_ASSET`).
- `accumulated_depreciation_account_id`: Contra-asset account (`AccountType.ASSET`, `ACCUMULATED_DEPRECIATION`).
- `depreciation_expense_account_id`: Expense account (`AccountType.EXPENSE`, `DEPRECIATION_EXPENSE`).
- `gain_on_disposal_account_id`: Revenue account (`AccountType.REVENUE`).
- `loss_on_disposal_account_id`: Expense account (`AccountType.EXPENSE`).

### 2. `fixed_assets`
Authoritative register items with multi-tenant and entity isolation:
- `asset_number`: Unique composite on `(entity_id, asset_number)`.
- `status`: `DRAFT`, `ACTIVE`, `FULLY_DEPRECIATED`, `DISPOSED`, `RETIRED`, `IMPAIRED`.
- `depreciation_method`: `STRAIGHT_LINE`, `DECLINING_BALANCE`, `NONE`.

### 3. `asset_depreciation_schedules`
Granular monthly scheduled rows tracking opening NBV, depreciation, and closing NBV.
- Unique on `(asset_id, period_year, period_month)`.

### 4. `depreciation_runs`
Month-end batch runs generating balanced double-entry General Ledger journals.
- Unique on `(entity_id, period_year, period_month)` and `(entity_id, run_number)`.

### 5. `asset_movements`
Physical relocation and custodian change log (zero GL impact).

### 6. `asset_disposals`
Disposal and derecognition records posting realized Gain or Loss on disposal.
