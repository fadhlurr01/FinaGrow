# FINAGROW Sales, Customers & Accounts Receivable (AR) Architecture

## 1. Sub-ledger Overview & Dual Architecture

In FINAGROW, the Sales and Accounts Receivable (AR) module operates as the **first operational sub-ledger** built on top of the Core Double-Entry Accounting Engine.

```
┌─────────────────────────────────────────────────────────────┐
│                 Sales & Accounts Receivable                 │
│  - Customers (B2B Profiles, Terms, Credit Limits)           │
│  - Sales Invoices (DRAFT -> OPEN -> PAID / CANCELLED)       │
│  - Authoritative Decimal Recalculation (Tax, Discount)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       POST Sales Invoice
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            AccountingService (Core Ledger Engine)           │
│  - Multi-Entity Account Settings Mapping                    │
│  - Double-Entry Balance Validator: SUM(Dr) === SUM(Cr)      │
│  - Automatic Posting: DR AR / CR Revenue(s) / CR Output Tax │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         General Ledger (GL) & AR Control Account            │
│  - Accounts Receivable Sub-ledger Reconciliation            │
│  - AR Aging Buckets (Current, 1-30, 31-60, 61-90, 90+ Days) │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Customer Management

Customers are scoped per operating entity (`entity_id`), allowing subsidiaries to maintain dedicated customer records with deterministic codes (`CUS-000001`).

### Fields & Rules
- **Customer Code (`customerCode`):** Entity-scoped deterministic identifier.
- **Credit Limit & Terms (`creditLimit`, `paymentTermsDays`):** Controls credit risk and calculates invoice `dueDate = invoiceDate + paymentTermsDays`.
- **Soft Deactivation:** Customers with historical sales invoices cannot be deleted; they are soft-deactivated (`isActive = false`) to preserve historical financial records.

---

## 3. Sales Invoice Lifecycle & Posting Invariants

### A. State Model

Operational Status:
- `DRAFT`: Editable draft invoice; **zero** General Ledger impact.
- `OPEN`: Validated and posted to GL; outstanding balance (`amountDue > 0`).
- `PARTIALLY_PAID`: Partially settled via payment allocation.
- `PAID`: Fully settled (`amountDue === 0`).
- `OVERDUE`: Derived state when `dueDate < today` and `amountDue > 0`.
- `CANCELLED`: Cancelled invoice with linked reversing journal in GL.

Posting Status:
- `UNPOSTED`: Not yet posted to the accounting engine.
- `POSTED`: Immutably linked to a `POSTED` journal entry in the General Ledger.
- `REVERSED`: An immutable reversing journal has reversed the financial impact.

---

## 4. Double-Entry Posting Rules

When a sales invoice is posted, the backend retrieves the operating entity's `AccountingSettings` and constructs an atomic balanced journal:

### Standard Credit Sale (with 11% PPN Output Tax):
$$\begin{aligned}
\text{DR } & \text{Accounts Receivable (Control Account)} & \text{Rp } 11,100,000 \\
\text{CR } & \text{Sales Revenue (Product / Service)} & \text{Rp } 10,000,000 \\
\text{CR } & \text{Output Tax Payable (PPN Keluaran 11\%)} & \text{Rp } 1,100,000
\end{aligned}$$

### Multi-Line Revenue Account Splitting:
Invoices support line-specific revenue accounts (e.g. Consulting vs Implementation vs Software License):
$$\begin{aligned}
\text{DR } & \text{Accounts Receivable} & \text{Rp } 16,650,000 \\
\text{CR } & \text{Product Sales Revenue (Account 4100)} & \text{Rp } 10,000,000 \\
\text{CR } & \text{Consulting Service Revenue (Account 4000)} & \text{Rp } 5,000,000 \\
\text{CR } & \text{Output Tax Payable (Account 2100)} & \text{Rp } 1,650,000
\end{aligned}$$

---

## 5. Cancellation & Accounting Reversal

Posted invoices cannot be physically deleted or directly mutated. Cancelling a posted invoice executes an immutable reversing journal:

$$\begin{aligned}
\text{DR } & \text{Sales Revenue} & \text{Rp } 10,000,000 \\
\text{DR } & \text{Output Tax Payable} & \text{Rp } 1,100,000 \\
\text{CR } & \text{Accounts Receivable} & \text{Rp } 11,100,000
\end{aligned}$$

The original invoice is marked `status = CANCELLED`, `postingStatus = REVERSED`, and complete audit logs are recorded.

---

## 6. Accounts Receivable Aging & Control Reconciliation

### A. AR Aging Buckets
Aging is calculated dynamically based on `dueDate` relative to `asOfDate`:
1. **Current:** `dueDate >= asOfDate`
2. **1 – 30 Days Overdue:** $1 \le \text{Days Overdue} \le 30$
3. **31 – 60 Days Overdue:** $31 \le \text{Days Overdue} \le 60$
4. **61 – 90 Days Overdue:** $61 \le \text{Days Overdue} \le 90$
5. **90+ Days Overdue:** $\text{Days Overdue} > 90$

### B. AR Sub-ledger to GL Reconciliation
The platform provides a real-time reconciliation verification:
$$\sum \text{Open Sales Invoice Amount Due} \equiv \text{GL Accounts Receivable Control Account Balance}$$
$$\text{Difference} = 0 \implies \text{isReconciled: true}$$
