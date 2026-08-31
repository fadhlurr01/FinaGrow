# FINAGROW Bank Statement Import & Reconciliation Engine

## 1. Overview & Architectural Principles

Bank statements represent external financial evidence from banking institutions. FINAGROW enforces two strict invariants:
1. **Zero Automatic GL Impact**: Importing bank statements produces **ZERO General Ledger journal entries**.
2. **Reconciliation Completion Rule**: A bank reconciliation period cannot be marked `RECONCILED` unless the difference between the bank statement closing balance and the General Ledger book closing balance is exactly **zero** ($\text{Difference} = 0$).

---

## 2. Bank Statement CSV Importer & Deduplication

### Normalized Hash Deduplication
Each statement line computes a deterministic SHA-256 fingerprint:
$$\text{Hash} = \text{SHA-256}(\text{account\_id} \parallel \text{date} \parallel \text{amount} \parallel \text{description} \parallel \text{reference})$$

If a duplicate line hash is detected across imports, the engine automatically skips or flags the duplicate row, preventing artificial inflation of unreconciled lines.

---

## 3. Auto-Matching Suggestion Engine

The auto-matching algorithm evaluates candidate internal transactions (Customer Receipts, Vendor Payments, Transfers, Manual Journals) against bank statement lines using multi-factor scoring:

| Match Criterion | Evaluation Rule | Confidence Score |
| :--- | :--- | :--- |
| **Exact Amount Match** | `abs(Statement Amount - Internal Payment Amount) < 0.01` | Base: 0.85 |
| **Date Proximity Window** | Date diff $\le 1$ day | Boost: +0.10 (0.95) |
| **Date Window Tolerance** | Date diff $\le 3$ days | Boost: +0.05 (0.90) |
| **Reference / Invoice Match** | Substring match on reference or invoice number | Boost: 0.99 |

---

## 4. Reconciliation Period & Closing Lifecycle

```
[ IN_PROGRESS ] ──> Match statement lines with internal transactions
       │
       ▼
 Difference === 0 ? ─── Yes ───> [ RECONCILED ] (Immutable audit snapshot)
       │
       No
       │
       ▼
 [ REJECT CLOSING ] (Expose discrepancy difference)
```

1. **`createReconciliation`**: Records opening/closing statement balances and snapshots live GL book balance.
2. **`matchStatementLine` / `unmatchStatementLine`**: Links statement lines to system records and updates line status to `MATCHED`.
3. **`completeReconciliation`**: Validates $\text{statementClosingBalance} - \text{bookClosingBalance} = 0$.
4. **`reopenReconciliation`**: Allows privileged roles (OWNER, ADMIN) to reopen a closed reconciliation with complete audit logging.
