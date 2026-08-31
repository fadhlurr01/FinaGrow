# Depreciation Engine & Month-End Batch Runners

## 1. Straight-Line Depreciation Formula & Rounding

### Calculation Rules
1. **Depreciable Amount**:
   $$\text{Depreciable Amount} = \text{Acquisition Cost} - \text{Residual Value}$$
2. **Monthly Depreciation**:
   $$\text{Monthly Depreciation} = \text{round}\left(\frac{\text{Depreciable Amount}}{\text{Useful Life Months}}, 2\right)$$
3. **Final Period Exact Reconciliation**:
   To prevent accumulated cents discrepancies from repeating decimal divisions (e.g. $10,000,000 / 3$ months):
   $$\text{Depreciation}_{\text{final}} = \text{Depreciable Amount} - \sum_{m=1}^{N-1} \text{Depreciation}_m$$
   Guarantees that total posted depreciation equals **exactly** $\text{Acquisition Cost} - \text{Residual Value}$.
4. **Residual Value Floor**:
   Normal depreciation never reduces an asset's carrying value below its configured `residualValue`.

---

## 2. Non-Depreciable Assets (Land)

Assets assigned `depreciationMethod = NONE` or `usefulLifeMonths = null` (e.g. Freehold Land) generate empty depreciation schedules and are excluded from monthly batch calculation runs.

---

## 3. Month-End Batch Posting & Idempotency

### Execution Flow
1. **Calculate Run (`POST /api/v1/assets/depreciation-runs/calculate`)**:
   Gathers all unposted `AssetDepreciationSchedule` lines where `status = SCHEDULED` for `(periodYear, periodMonth)`. Returns asset count and total depreciation preview.
2. **Post Run (`POST /api/v1/assets/depreciation-runs/post`)**:
   - Atomic database transaction.
   - Enforces unique constraint on `(entityId, periodYear, periodMonth)`.
   - Groups depreciation expense by Category debit and credit accounts.
   - Generates consolidated balanced General Ledger journal entry.
   - Marks schedules as `POSTED` and updates asset `accumulatedDepreciation` and `netBookValue`.
   - Automatically transitions assets to `FULLY_DEPRECIATED` once $\text{Accumulated Depreciation} = \text{Depreciable Amount}$.

---

## 4. Reversal & Historical Auditability

Depreciation runs can be safely reversed by administrators via `POST /api/v1/assets/depreciation-runs/:id/reverse`:
- The linked General Ledger journal entry is voided atomically.
- Schedule rows are restored to `SCHEDULED`.
- Asset `accumulatedDepreciation` and `netBookValue` are recalculated.
- Asset status is restored from `FULLY_DEPRECIATED` back to `ACTIVE` if applicable.
- Historical records are preserved for complete auditability.
