# Phase 10: Cart and checkout

## What exists now

On a product page the buyer picks an amount and taps **Add to cart**. The **Cart** tab groups items by farmer and shows, for each farmer:
- the items with steppers and remove buttons;
- the farmer's minimum order (and how much more is needed);
- a choice of the next delivery days;
- item total, delivery fee and the farmer's total.

Below that: the delivery address, payment (cash on delivery), and the price summary (produce, delivery, platform fee, what you pay). **Place order** creates one order per farmer. **My orders** lists them, and an order can be cancelled until the farmer accepts it.

If anything changed (price, stock, a listing paused), the cart says exactly what and updates with one tap.

## Data flow

```
Product page -> cart (localStorage, per account)
Cart page -> POST /checkout/quote (server re-reads products, farmers, coverage)
          <- groups per farmer, totals, changes[]
Place order -> POST /checkout { idempotencyKey, items with prices seen, deliveryDates, cod }
Server: existing orders for key? return them
        quote again -> changes? 409 CART_CHANGED (+ fresh quote)
        minimum order, delivery day, COD limits
        transaction: per item updateOne(available >= qty, same price) $inc -qty
                     any miss -> abort all; zero stock -> out_of_stock
                     Order per farmer + audit 'order.placed'
Cancel -> transaction: placed -> cancelled (conditional), $inc stock back, audit
```

## Key design decisions

| Decision | Why |
| --- | --- |
| Cart on the phone, quote on the server | Fast and offline-friendly; the server still trusts nothing. |
| Conditional `$inc` per item in one transaction | Overselling impossible; one miss rolls everything back. |
| Idempotency key as `checkoutGroupId` + unique index | Double taps and retries can never create a second order. |
| Price must match in the stock update too | A price edit between quote and checkout cannot slip through. |
| COD limits from AppConfig | Abuse controls without code changes (CLAUDE.md). |

Full reasoning: [ADR 0011](../decisions/0011-cart-and-checkout.md).

## How to test it

- **Automated:** `cd backend && npm test -- tests/checkout.test.js`. It covers the quote, every change kind, multi-farmer orders, rollback, idempotency (two simultaneous submissions), the minimum order, delivery day and COD cap, the 50-buyer race, and cancel/reject restoring stock. Frontend: `src/pages/buyer/cart.test.jsx`.
- **By hand:** log in as buyer `9999900022` (OTP `123456`), open a product, add 5, go to Cart, pick a day, place the order, then cancel it in My orders. Stock goes down and back up.

## Interview questions

1. **How do you prevent overselling?** Each item is reserved with `updateOne({ _id, availableQuantity: { $gte: qty } }, { $inc: { availableQuantity: -qty } })`. The filter and the update run atomically on one document, so when two buyers race for the last unit only one update matches. The test runs 50 buyers for 30 units and sells exactly 30.
2. **What if the second of three items fails?** All reservations run in one MongoDB transaction; throwing aborts it, so the first item's decrement is undone and no orders are created. The buyer gets `CART_CHANGED` with the fresh quote.
3. **How does idempotency work?** The app sends a UUID per checkout attempt and reuses it on retries. The server returns existing orders for that key; a unique index on buyer + key + farmer makes two simultaneous requests impossible to both succeed.
4. **Why re-validate prices on the server?** The client can be stale or tampered with. The server recomputes every line and total, and even the stock update requires the same price.
5. **How is stock restored on cancel?** In one transaction with the conditional `placed → cancelled` change, quantities are added back with a pipeline update (capped at the listing's quantity), and a sold-out listing goes back on sale.
