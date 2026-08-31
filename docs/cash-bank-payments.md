# FINAGROW Cash, Bank & Unified Payment Engine Architecture

## 1. Sub-ledger Overview & Settlement Architecture

In FINAGROW, Cash & Bank operations and Payment Settlements are unified across both **Accounts Receivable (AR)** and **Accounts Payable (AP)**, while preserving double-entry integrity via the Core Accounting Engine.

```
┌─────────────────────────────────────────────────────────────┐
│                 Cash, Bank & Payments Engine                │
│  - CashBankAccount (Mapped to COA ASSET account)            │
│  - Customer Receipts (Inbound Settlement)                   │
│  - Vendor Payments (Outbound Disbursement)                  │
│  - Inter-Account Transfers (Internal Fund Routing)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                          POST Payment
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            AccountingService (Core Ledger Engine)           │
│  - Multi-Entity Account Settings Mapping                    │
│  - Double-Entry Balance Invariant: SUM(Dr) === SUM(Cr)      │
│  - Dynamic GL Posting & Void Reversal Handling              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Authoritative General Ledger                │
│  - Live GL Balance Calculation for Cash/Bank Accounts       │
│  - AR Sub-ledger Settlement & Reconciliation                │
│  - AP Sub-ledger Settlement & Reconciliation                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Fundamental Architectural Invariants

1. **Authoritative GL Balance**: Cash/Bank operational accounts never store independent mutable balance counters. The displayed balance is strictly derived from the General Ledger:
   $$\text{Cash/Bank Account Balance} = \sum_{\text{POSTED Lines}} \text{Debit} - \sum_{\text{POSTED Lines}} \text{Credit}$$
2. **Double-Entry Settlement**:
   - **Customer Receipt**:
     $$\begin{aligned}
     \text{DR } & \text{Cash/Bank COA Account} & \text{Full Receipt Amount} \\
     \text{CR } & \text{Accounts Receivable Control} & \text{Allocated Amount} \\
     \text{CR } & \text{Customer Advances Liability} & \text{Unallocated Amount (if any)}
     \end{aligned}$$
   - **Vendor Payment**:
     $$\begin{aligned}
     \text{DR } & \text{Accounts Payable Control} & \text{Allocated Amount} \\
     \text{DR } & \text{Vendor Advances Asset} & \text{Unallocated Amount (if any)} \\
     \text{CR } & \text{Cash/Bank COA Account} & \text{Full Payment Amount}
     \end{aligned}$$
   - **Inter-Bank Transfer**:
     $$\begin{aligned}
     \text{DR } & \text{Destination Cash/Bank COA Account} & \text{Transfer Amount} \\
     \text{CR } & \text{Source Cash/Bank COA Account} & \text{Transfer Amount}
     \end{aligned}$$
     *(Enforces same operating entity; ZERO Revenue or Expense impact)*.
3. **Derived Operational Settlements**: Invoices and Vendor Bills calculate `amountPaid` and `amountDue` strictly from posted `PaymentAllocation` records.
4. **Immutable Reversals**: Cancelling or reversing a posted payment produces an immutable reversing journal in the general ledger and restores outstanding invoice/bill balances without deleting history.
