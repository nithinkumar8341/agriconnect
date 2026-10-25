# ADR 0011: Cart and checkout

- Status: accepted
- Date: 2026-10-26

## 1. The cart lives on the phone; the server quotes it

The cart is stored in `localStorage`, one per account (`agc.cart.<userId>`), so it survives restarts and weak signal without a server round trip per tap. It holds what the buyer saw only for display. `POST /checkout/quote` re-reads everything and returns the truth plus a list of what changed, which the buyer accepts with one tap.

**Alternative rejected:** a server-side cart collection. More writes and endpoints for no extra safety, because checkout re-checks everything anyway.

## 2. Stock reservation: conditional updates inside one transaction

For each item: `availableQuantity >= qty` (and the same price, still `available`) in the filter, `$inc: -qty` in the update. MongoDB applies a single-document update atomically, so two buyers can never both take the last units. All items of all farmers are reserved in one transaction (the database is a replica set in every environment), so a miss on any item rolls back the others; no compensating updates are needed.

**Proof:** 50 buyers racing for 30 units sell exactly 30, with 20 clean `CART_CHANGED` answers and stock at 0 (`out_of_stock`). Run 4 times in a row, all green.

## 3. Idempotency key = checkoutGroupId

The app makes a UUID per attempt at a given cart and reuses it on retries. The server first looks for orders with that key; a unique index on `{ buyerId, checkoutGroupId, farmerId }` also covers two submissions arriving at the same moment (the loser gets a duplicate-key error and returns the winner's orders). No extra collection is needed.

## 4. Re-validate and say exactly what changed

Price, stock, availability and "does not deliver here" are reported per product. The stock update also requires the same `pricePerUnit`, so a price edit between quote and checkout cannot slip through.

## 5. COD controls now, from AppConfig

New buyers have a per-order COD cap (default ₹500); open COD orders are capped (default 2); COD is blocked after repeated failed deliveries. All thresholds are AppConfig values (CLAUDE.md). UPI (Razorpay test mode) comes in Prompt 12.

## 6. Delivery day

The buyer picks one of the farmer's next 4 delivery days (cutoff rule from ADR 0010). It is stored as the start of that day in India.

## 7. Cancel and reject restore stock in the same transaction as the status change

The status change is conditional on `placed`, so a cancel and a farmer's accept (Prompt 11) cannot both win. Restored stock never exceeds the listing's `quantity`, and a sold-out listing goes back on sale.
