# Phase 08: Farmer product listing flow

## What exists now

A farmer taps **Sell** and in three screens puts produce on sale:

1. **Photos and crop:** take or choose photos; tap the crop (crops sold before come first, search works in Telugu, English or Hindi).
2. **Quantity, price and harvest:** tap a quick amount, step or type the price (pre-filled with their last price; a yellow note if the new one is very different), tap Today / Yesterday / Pick a date.
3. **Check and publish:** a summary card with the total value, **Read aloud**, and **Publish**.

Without internet the listing is saved and publishes itself when the signal returns. Closing the app keeps the half-made listing.

On **My products**, each card has **Manage**: edit price or quantity, pause, start selling again, mark out of stock, sell again (same crop, price and photos, harvested today) and delete (after confirming). Listings harvested longer ago than the crop keeps are paused automatically, and the card says how to relist.

## Data flow

```
SellPage (draft in localStorage, photos in IndexedDB)
  Publish -> online and photos uploaded? -- no --> publishWhenOnline=true -> effect waits -> Publish
          -> POST /products
Server: validate (zod) -> crop active? unit allowed? harvest date sane?
        transaction: claim my pending MediaAssets -> create Product with copied photos
                     -> updateMany assets to 'attached' (must match all, else roll back)
ManageListing -> PATCH /products/:id | POST /:id/status | POST /:id/duplicate | DELETE /:id
Hourly job: Product.updateMany({ harvestDate older than shelf life }) -> paused / expired
```

## Key design decisions

| Decision | Why |
| --- | --- |
| Six steps grouped into three screens | CLAUDE.md caps a task at three steps; chips mean most listings need no typing. |
| Auto-pause after shelf life (`pausedReason: expired`) | Buyers never order spoiled produce; the farmer sees why and how to relist. |
| Warning (never a block) at > 50 % from the last price | Catches ₹250-for-₹25 typos with the farmer's own history. |
| Quantity edits as one conditional pipeline update | Can't drop below what buyers already ordered, even with an order landing at the same moment. |
| Photos claimed inside a transaction | One photo can never end up on two listings. |
| Offline publish queued in app state, not background sync | Works on every browser, including iOS Safari. |

Full reasoning: [ADR 0009](../decisions/0009-listing-flow.md).

## How to test it

- **Automated:** `cd backend && npm test` (21 product tests: ownership, photo claims and races, quantity below sold, status transitions, expiry job). `cd frontend && npm test` (`sell.test.jsx`: the full flow, validation, price warning, offline publish, draft restore, Telugu crop search, and the Manage actions).
- **By hand:** start both servers, log in as demo farmer `9999900011` (OTP `123456` in development), tap **Sell**, add a photo, pick Tomato, tap a quick amount, enter a price, publish. Then try each **Manage** action on My products.
- **Offline:** in DevTools set the network to Offline on the review screen, tap Publish (the note says it will publish later), then go back online and watch it publish.
- **Expiry:** edit a listing's harvest date in the database to a week ago (Tomato keeps 7 days) and wait for the hourly job, or call `pauseExpiredListings()` in a test.

## Interview questions

1. **Why is the quantity edit a pipeline update with `$expr`, instead of reading the product, computing, and saving?**
   Read-compute-save has a gap: an order placed in between would be overwritten and its stock lost. A single conditional update is atomic on the document, and the `$expr` filter makes it fail cleanly when the new total is below what was sold.
2. **Two phones publish with the same photo at the same instant. What happens?**
   Both transactions try to move the same `pending` asset to `attached`. Only one `updateMany` can match it; the other modifies fewer documents than expected, throws, and its whole transaction (including the new product) rolls back. Exactly one listing exists.
3. **Why does "Mark out of stock" also change `quantity`?**
   So that `quantity − availableQuantity` still means "sold". Without it, restocking later would compute the wrong sold amount (we hit this as a failing test: 30 instead of 80).
4. **Why schedule the auto-publish with `setTimeout` inside the effect?**
   Calling it directly sets state synchronously inside an effect (a lint error, and cascading renders). Scheduling it with a cleanup also means React StrictMode's mount, unmount and remount in development cancels the first timer, so the listing can't be published twice.
5. **Why warn on the price but not block it?**
   Prices really do swing (rain, festivals). The farmer knows their market; the app only catches likely typos and lets them decide.

## Problems found and fixed

- **Photos vanishing:** a photo taken before saved drafts finished loading from IndexedDB was overwritten by the restore. The restore now merges.
- **Misleading price error:** a too-high price said "Please fill this in"; it now says the allowed range.
- **Telugu card layout:** the long status word squeezed the crop name to one letter per line at 360 px; the badge now sits under the price.
- **Toasts cover the bottom card for 5 s:** acceptable (they can be dismissed), but noted for the UI polish pass.
