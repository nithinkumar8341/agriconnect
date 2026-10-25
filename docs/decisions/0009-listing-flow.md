# ADR 0009: Product listing flow

- Status: accepted (owner approved the recommended option for all three choices)
- Date: 2026-10-25

## 1. Three screens, not six

The prompt pack lists six steps (photo → crop → quantity → price → harvest date → review). CLAUDE.md caps a task at three steps, so they are grouped:

1. **Photos and crop:** what is being sold.
2. **Quantity, price and harvest:** how much, for how much, how fresh.
3. **Check and publish:** a summary card, "Read aloud" and one Publish button.

Each screen fits one thumb scroll at 360 px. Quick-pick chips (from the crop's `quantityPresets`) and "Today / Yesterday / Pick a date" mean most listings need no typing at all; the price can be typed or stepped.

**Measured:** the browser script completes the full flow in about 1.5 s with 8 taps or clicks and one price typed. That is automation speed, not a human timing; the tap count is the useful number against the 60-second goal.

## 2. Listings pause themselves after the crop's shelf life

An hourly job runs one `updateMany` per crop and sets `status: paused` with `pausedReason: expired` on listings harvested longer ago than `shelfLifeDays`.

- Buyers never order produce that has likely spoiled, and no farmer has to remember to take it down.
- `resume` is refused for expired listings (`LISTING_EXPIRED`). The farmer edits the harvest date (or uses "Sell again"), which reopens the listing. The card explains this in plain words.
- `pausedReason` keeps a farmer's own pause apart from an automatic one, so the screen can say which happened.

**Alternative rejected:** hiding expired listings only at query time. It would leave the farmer's My Products showing "Selling" for produce no buyer can see.

## 3. Price warning against the farmer's own last price

When the new price differs by more than 50 % from the farmer's own last listing of that crop, a yellow note shows the old price and asks them to check. It never blocks publishing.

- It catches the common slip (₹250 typed for ₹25) using the farmer's own history, which exists from the second listing.
- The last price also pre-fills the price field, saving typing.
- Mandi reference prices (Prompt 19) can replace or add to this later.

## 4. Stock safety on edits and status changes

All stock changes are single conditional updates, so they stay correct when an order is placed at the same moment (Prompt 10 decrements `availableQuantity` the same way):

- **Edit quantity:** a pipeline update sets `availableQuantity = new quantity − sold`, filtered with `$expr` so it can never go below what buyers already ordered (`QUANTITY_BELOW_SOLD`).
- **Mark out of stock:** sets `quantity` to what was sold and `availableQuantity` to 0, filtered on the `availableQuantity` that was read; a concurrent order makes it fail with `INVALID_STATUS_CHANGE` instead of losing that order's stock.
- **Publish:** photos are claimed in a transaction, which must update every photo or roll back, so one photo can never end up on two listings.

## 5. Offline publishing waits on the phone

The half-made listing (step, crop, quantity, price, harvest choice) is saved in `localStorage`; photos are already in IndexedDB (ADR 0008).

- Publish while offline, or while photos are still uploading, sets `publishWhenOnline` and shows "saved, will publish automatically".
- When the phone is online and every photo has uploaded, the listing publishes by itself. The trigger is scheduled from an effect with a cleanup, so React's double-run in development can never publish twice.
- A server rejection (for example a harvest date that became too old) clears the flag and shows the reason, rather than retrying forever.

**Alternative rejected:** a service-worker background sync queue. It is not supported on iOS Safari, and the in-app approach covers the case that matters (the app open, signal returning).
