# Inventory Valuation Engine: FIFO & Moving Weighted Average

## 1. FIFO (First-In, First-Out) Layer Engine

The FIFO engine guarantees that older inventory layers are consumed first before newer layers are touched.

### Consumption Algorithm
1. Query unexhausted layers for `(itemId, warehouseId)` ordered by `layerDate ASC, createdAt ASC` where `quantityRemaining > 0`.
2. For each layer:
   - Determine allocation: $\Delta Q = \min(Q_{\text{remaining}}, Q_{\text{unfulfilled}})$.
   - Deduct layer: $Q_{\text{remaining}} \leftarrow Q_{\text{remaining}} - \Delta Q$.
   - Calculate line cost: $C_{\text{line}} = \Delta Q \times U_{\text{cost}}$.
   - Accumulate total COGS: $C_{\text{total}} \leftarrow C_{\text{total}} + C_{\text{line}}$.
   - Update unfulfilled requirement: $Q_{\text{unfulfilled}} \leftarrow Q_{\text{unfulfilled}} - \Delta Q$.
3. Compute effective unit cost:
   $$U_{\text{effective}} = \frac{C_{\text{total}}}{Q_{\text{total}}}$$

---

## 2. Moving Weighted Average (AVCO) Engine

For weighted-average items, unit cost is updated dynamically upon every stock receipt:

$$U_{\text{new}} = \frac{(Q_{\text{current}} \times U_{\text{current}}) + (Q_{\text{receipt}} \times U_{\text{receipt}})}{Q_{\text{current}} + Q_{\text{receipt}}}$$

When stock is issued:
$$C_{\text{COGS}} = Q_{\text{issue}} \times U_{\text{new}}$$

---

## 3. Strict Negative Inventory Rejection

FINAGROW strictly enforces `allow_negative_inventory = false`.
If an outbound delivery, transfer, or reduction adjustment exceeds available on-hand stock in the specified warehouse, the transaction is rejected atomically with HTTP 400 (`BadRequestException`) before any database mutations occur.

---

## 4. Reversal & Historical Cost Restoration

When a Delivery or Goods Receipt is reversed:
- The linked General Ledger journal entry is voided atomically.
- A compensating stock movement (`RETURN_IN` or `RETURN_OUT`) is generated.
- In FIFO valuation, layer quantities are restored using the exact historical unit costs originally consumed.
