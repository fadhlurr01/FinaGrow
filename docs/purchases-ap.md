# FINAGROW Purchases, Vendors & Accounts Payable (AP) Architecture

## 1. Sub-ledger Overview & Dual Architecture

In FINAGROW, the Purchasing and Accounts Payable (AP) module operates as the **second operational sub-ledger** built on top of the Core Double-Entry Accounting Engine.

```
┌─────────────────────────────────────────────────────────────┐
│               Purchases & Accounts Payable                  │
│  - Vendors (B2B Profiles, Terms, Credit Limits)             │
│  - Purchase Orders (Commercial commitment, ZERO GL impact)  │
│  - Vendor Bills (DRAFT -> OPEN -> PAID / CANCELLED)         │
│  - Authoritative Decimal Recalculation (Tax, Discount)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        POST Vendor Bill
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            AccountingService (Core Ledger Engine)           │
│  - Multi-Entity Account Settings Mapping                    │
│  - Double-Entry Balance Validator: SUM(Dr) === SUM(Cr)      │
│  - Automatic Posting: DR Expense(s) / DR Input Tax / CR AP  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         General Ledger (GL) & AP Control Account            │
│  - Accounts Payable Sub-ledger Reconciliation               │
│  - AP Aging Buckets (Current, 1-30, 31-60, 61-90, 90+ Days) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Fundamental Accounting Distinction: Purchase Order vs Vendor Bill

FINAGROW enforces a strict architectural distinction:

- **Purchase Order (PO):** A commercial agreement and commitment.
  - Creation, approval, or modification of a Purchase Order produces **ZERO General Ledger journal entries**.
  - Trial Balance and General Ledger remain completely unchanged upon PO creation.
- **Vendor Bill:** An operational financial obligation recognized upon receipt/verification of goods or services.
  - Posting a Vendor Bill produces atomic double-entry accounting records via `AccountingService`.

---

## 3. Vendor Management

Vendors are scoped per operating entity (`entity_id`), allowing subsidiaries to maintain dedicated vendor records with deterministic codes (`VEN-000001`).

### Fields & Rules
- **Vendor Code (`vendorCode`):** Entity-scoped deterministic identifier.
- **Credit Limit & Terms (`creditLimit`, `paymentTermsDays`):** Controls credit risk and calculates bill `dueDate = billDate + paymentTermsDays`.
- **Soft Deactivation:** Vendors with historical bills or accounting activity cannot be deleted; they are soft-deactivated (`isActive = false`) to preserve audit traceability. Inactive vendors cannot receive new POs or Bills.

---

## 4. Double-Entry Posting Rules

When a vendor bill is posted, the backend retrieves the operating entity's `AccountingSettings` (`apAccountId`, `inputTaxAccountId`, `defaultExpenseAccountId`) and constructs an atomic balanced journal:

### Standard Expense Bill (with 11% PPN Input Tax):
$$\begin{aligned}
\text{DR } & \text{Operating Expense Account} & \text{Rp } 10,000,000 \\
\text{DR } & \text{Input Tax Receivable (PPN Masukan 11\%)} & \text{Rp } 1,100,000 \\
\text{CR } & \text{Accounts Payable (Control Account)} & \text{Rp } 11,100,000
\end{aligned}$$

### Multi-Expense Account Splitting:
Bills support line-specific expense accounts (e.g. Rent Expense, Utilities Expense, Advertising Expense):
$$\begin{aligned}
\text{DR } & \text{Office Rent Expense (Account 6100)} & \text{Rp } 5,000,000 \\
\text{DR } & \text{Utilities Expense (Account 6110)} & \text{Rp } 2,000,000 \\
\text{DR } & \text{Marketing & Advertising (Account 6200)} & \text{Rp } 3,000,000 \\
\text{DR } & \text{Input Tax Receivable (Account 1150)} & \text{Rp } 1,100,000 \\
\text{CR } & \text{Accounts Payable Control (Account 2000)} & \text{Rp } 11,100,000
\end{aligned}$$

---

## 5. Cancellation & Accounting Reversal

Posted vendor bills cannot be physically deleted or directly mutated. Cancelling a posted bill executes an immutable reversing journal in the general ledger:

$$\begin{aligned}
\text{DR } & \text{Accounts Payable Control} & \text{Rp } 11,100,000 \\
\text{CR } & \text{Operating Expense Account(s)} & \text{Rp } 10,000,000 \\
\text{CR } & \text{Input Tax Receivable} & \text{Rp } 1,100,000
\end{aligned}$$

The original bill is marked `status = CANCELLED`, `postingStatus = REVERSED`, and complete audit logs are recorded.

---

## 6. Accounts Payable Aging & Control Reconciliation

### A. AP Aging Buckets
Aging is calculated dynamically based on `dueDate` relative to `asOfDate`:
1. **Current:** `dueDate >= asOfDate`
2. **1 – 30 Days Overdue:** $1 \le \text{Days Overdue} \le 30$
3. **31 – 60 Days Overdue:** $31 \le \text{Days Overdue} \le 60$
4. **61 – 90 Days Overdue:** $61 \le \text{Days Overdue} \le 90$
5. **90+ Days Overdue:** $\text{Days Overdue} > 90$

### B. AP Sub-ledger to GL Reconciliation
The platform provides a real-time reconciliation verification:
$$\sum \text{Open Vendor Bill Amount Due} \equiv \text{GL Accounts Payable Control Account Balance}$$
$$\text{Difference} = 0 \implies \text{isReconciled: true}$$
