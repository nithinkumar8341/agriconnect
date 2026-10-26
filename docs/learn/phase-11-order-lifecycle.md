# Phase 11: Order lifecycle and delivery code

## What exists now

**Farmer:** the Orders tab has New, To deliver and Finished. On an order they:
- tap **Accept** (or **Reject** with a reason);
- then **Out for delivery**;
- at the door, type the buyer's 4-digit code and tap **Delivered**.

If something goes wrong, **Could not deliver** takes a reason, and the stock goes back on sale.

**Buyer:** the order page shows a big status, the delivery code once accepted, a call button for the farmer, the price breakdown and a timeline. It updates itself every 15 seconds.

**Both:** a bell shows unread updates. The buyer also gets SMS (in their language) when the order is accepted, out for delivery and delivered.

## Data flow

```
POST /orders/:id/<action> -> rule = ORDER_ACTIONS[action] (role + from-statuses)
  deliver? check code (HMAC; 5 tries)
  transaction: findOneAndUpdate({ _id, status in from }) -> status, history
               restock if rejected/cancelled/failed; audit; notify other party
  after commit: SMS to buyer for accepted / out_for_delivery / delivered
GET /orders/:id -> role view (buyer: delivery code derived from salt; farmer: contact after accept)
```

## Key design decisions

See [ADR 0012](../decisions/0012-order-lifecycle.md): a state machine as data, a conditional update in one transaction, a derived delivery code (salt and hash stored, never the code), contact details only after acceptance, and polling.

## How to test it

`cd backend && npm test -- tests/orderLifecycle.test.js`. It covers:
- every allowed transition;
- the happy path with SMS in Telugu;
- wrong codes and the lock;
- stock restored on reject, cancel and failed delivery;
- invalid moves, the wrong role and strangers;
- a racing cancel against an accept;
- the inbox.

Frontend: `src/pages/farmer/orders.test.jsx`.

## Interview questions

1. **How do you stop invalid status changes?** The state machine lists the allowed source statuses per action, and the update filters on them, so even a race cannot jump steps.
2. **How can the buyer always see the code if it isn't stored?** It is derived with an HMAC from a server secret and a per-order salt. The database holds only the salt and a hash.
3. **What if the SMS gateway is down?** The SMS is sent after the transaction commits, and a failure is logged. The order change is never undone.
4. **Why polling instead of WebSockets?** It is simpler and cheap at pilot scale, and only runs while the page is visible.
5. **When is stock restored?** On rejected, cancelled and failed, inside the same transaction as the status change, capped at the listing's quantity.
