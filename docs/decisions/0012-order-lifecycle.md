# ADR 0012: Order lifecycle and delivery code

- Status: accepted
- Date: 2026-10-26

## 1. State machine as data

`services/orderStateMachine.js` lists each action with its role, allowed source statuses and target: accept, reject and cancel from `placed`; dispatch from `accepted`; deliver from `out_for_delivery`; fail (with a reason) from `accepted` or `out_for_delivery`. Routes, the service and the app's buttons all read it, and a test enumerates every status × action pair.

## 2. Every change is one conditional update in a transaction

The update filters on the allowed source statuses, so a buyer's cancel and a farmer's accept racing each other cannot both win (tested). The same transaction restores stock for rejected, cancelled and failed orders, writes the status history and audit entry, and creates the other party's in-app notification. The SMS goes after the commit; if it fails, the change stays and the failure is logged.

## 3. Delivery code: derived, not stored

The buyer must see the 4-digit code at any time, but CLAUDE.md requires it not to be stored in plain text. At acceptance a random salt is stored. The code is `HMAC(server secret, orderId + salt)` reduced to 4 digits, and a hash of the code is stored for checking. A database leak alone reveals no codes. Five wrong tries lock the code; the farmer can then only mark the delivery failed. COD becomes `paid` on a correct code.

## 4. Privacy

Before acceptance the farmer sees only the buyer's first name, area and pincode. After acceptance both sides see each other's phone number, and the farmer sees the full address and map pin.

## 5. Live updates by polling

Open order pages refresh every 15 seconds, the farmer order list every 30 seconds and the bell every minute. Polling only runs while the page is visible. This is enough for a pilot and needs no socket infrastructure on Render's free tier.
