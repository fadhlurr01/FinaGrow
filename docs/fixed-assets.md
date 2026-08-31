# Fixed Assets & Lifecycle Accounting Subsystem

## 1. Overview & Core Accounting Architecture

FINAGROW Phase 7 implements a comprehensive **Fixed Asset Register & Depreciation Sub-Ledger** tightly coupled with the Double-Entry Accounting Core (`AccountingService`).

### Key Accounting Principles
1. **Asset Register vs Expense**: Fixed Assets are capitalized economic resources with multi-period useful life, distinct from immediate operating expenses.
2. **Double-Entry Capitalization**:
   - Capitalization via Vendor Bill:
     $$\text{DR Fixed Asset Cost Control (1500/1520)} \quad / \quad \text{DR Input Tax (1150)} \quad / \quad \text{CR Accounts Payable (2000)}$$
   - Direct Capitalization:
     $$\text{DR Fixed Asset Cost Control (1500/1520)} \quad / \quad \text{CR Cash & Bank (1002) or Accounts Payable (2000)}$$
3. **Periodic Depreciation**:
   $$\text{DR Depreciation Expense (6500)} \quad / \quad \text{CR Accumulated Depreciation Contra-Asset (1510/1530)}$$
4. **Asset Disposal Derecognition**:
   - Sale with Gain:
     $$\text{DR Bank} \quad / \quad \text{DR Accumulated Depreciation} \quad / \quad \text{CR Fixed Asset Cost} \quad / \quad \text{CR Gain on Disposal (4910)}$$
   - Sale with Loss:
     $$\text{DR Bank} \quad / \quad \text{DR Accumulated Depreciation} \quad / \quad \text{DR Loss on Disposal (5910)} \quad / \quad \text{CR Fixed Asset Cost}$$
   - Scrap (Zero Proceeds):
     $$\text{DR Accumulated Depreciation} \quad / \quad \text{DR Loss on Disposal (5910)} \quad / \quad \text{CR Fixed Asset Cost}$$
5. **Zero-GL Inter-Location Transfers**: Updating asset physical location or custodian records historical movement with zero revenue/expense impact. Cross-entity transfer is strictly rejected.

---

## 2. Fixed Asset Models

- **`FixedAssetCategory`**: Category definition mapping specific Fixed Asset, Accumulated Depreciation, Depreciation Expense, Gain on Disposal, and Loss on Disposal accounts.
- **`FixedAsset`**: Authoritative asset register item (`assetNumber`, `categoryId`, `acquisitionCost`, `residualValue`, `usefulLifeMonths`, `depreciationMethod`, `accumulatedDepreciation`, `netBookValue`, `status`).
- **`AssetDepreciationSchedule`**: Granular monthly schedule lines tracking opening book value, scheduled depreciation, and closing book value.
- **`DepreciationRun`**: Controlled month-end batch execution generating consolidated GL journal entries.
- **`AssetMovement`**: Historical relocation and custodian transfer logs.
- **`AssetDisposal`**: Disposal record capturing proceeds, derecognized cost, cleared accumulated depreciation, and realized gain/loss.

---

## 3. Sub-Ledger to General Ledger Reconciliation

The Fixed Asset register reconciles against the General Ledger via `/api/v1/assets/reconciliation`:
$$\text{Asset Register Cost Total} = \text{GL Fixed Asset Control Account 1500/1520 Balance} \quad (\Delta = 0)$$
$$\text{Asset Register Accumulated Depreciation Total} = \text{GL Contra-Asset 1510/1530 Balance} \quad (\Delta = 0)$$
