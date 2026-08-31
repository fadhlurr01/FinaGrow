# Inventory Subsystem & Stock Movement Architecture

## 1. Overview & Core Accounting Principles

FINAGROW Phase 6 implements an enterprise perpetual inventory subsystem seamlessly integrated into the Double-Entry Accounting Core.

Unlike lightweight prototypes that store isolated `quantity * unitPrice`, FINAGROW calculates authoritative inventory positions, cost layers, and Cost of Goods Sold (COGS) through strict double-entry journal postings and immutable stock movements.

### Key Tenets
1. **Perpetual Valuation**: Every receipt, issue, transfer, and adjustment generates transactional records and valuation layers.
2. **Three-Way Matching**: Purchase Order $\leftrightarrow$ Goods Receipt $\leftrightarrow$ Vendor Bill.
3. **Double-Entry GRNI Clearing**:
   - Physical Goods Receipt:
     $$\text{DR Inventory Control (1140)} \quad / \quad \text{CR Goods Received Not Invoiced [GRNI] (2140)}$$
   - Vendor Bill Clearing:
     $$\text{DR GRNI (2140)} \quad / \quad \text{DR Input Tax (1150)} \quad / \quad \text{CR Accounts Payable (2000)}$$
     *(Inventory is never double-debited upon invoice receipt).*
4. **COGS Recognition on Delivery**:
   $$\text{DR Cost of Goods Sold [COGS] (5100)} \quad / \quad \text{CR Inventory Control (1140)}$$
5. **Zero-GL Inter-Warehouse Transfers**: Preserves exact historical valuation layers across warehouses within the same legal entity.

---

## 2. Data Models & Entity Relationships

- **`InventoryItem`**: Master catalog storing SKU, category, UOM, valuation method (`FIFO` or `WEIGHTED_AVERAGE`), pricing, reorder points, and COA overrides.
- **`Warehouse` & `StockLocation`**: Multi-warehouse storage locations isolated by legal entity.
- **`StockMovement`**: Transactional ledger (`PURCHASE_RECEIPT`, `SALES_ISSUE`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN_IN`, `RETURN_OUT`).
- **`InventoryValuationLayer`**: Granular cost buckets storing unexhausted receipt quantities and unit costs for FIFO allocation.
- **`GoodsReceipt` & `GoodsReceiptLine`**: Sub-ledger receiving documents linked to Purchase Orders.
- **`Delivery` & `DeliveryLine`**: Outbound fulfillment documents linked to Sales Invoices.
- **`StockTransfer`**: Inter-warehouse movement records.
- **`StockAdjustment`**: Physical count opname reconciliations.

---

## 3. Reconciliations

### 1. Inventory-to-GL Reconciliation
$$\text{Total Valuation Layer Value} = \text{GL Control Account 1140 Balance} \quad (\text{Difference} = 0)$$

### 2. GRNI Reconciliation
$$\sum (\text{Unbilled Received PO Line Quantities} \times \text{Unit Cost}) = \text{GL GRNI Account 2140 Balance} \quad (\text{Difference} = 0)$$
