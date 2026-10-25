# ADR 0004: Data model conventions

- Status: accepted
- Date: 2026-10-25

## 1. Money as integer paise

Floating-point rupees drift: `0.1 + 0.2 !== 0.3`, and totals of many lines can be off by a paisa, which breaks auditable breakdowns. Every amount is a whole number of paise, enforced by a schema validator.

All order maths runs through one function, `computeOrderPricing`, which rounds each line once (`Math.round(quantity × pricePerUnit)`). Quantities can be fractional (0.5 kg); prices cannot.

A randomised test checks that `buyerTotal === farmerEarnings + platformFee` on 200 random orders.

## 2. Platform fee is deducted from the farmer, not added for the buyer

**Context.** CLAUDE.md wants a configurable fee (default 0) and an earnings comparison against mandi commission. That comparison only makes sense if our fee is a commission on the produce, like the mandi's.

**Decision.**
- `farmerEarnings = itemsTotal + deliveryFee − platformFee`.
- `buyerTotal = itemsTotal + deliveryFee`.
- The delivery fee goes to the farmer, who does the delivery.

With the default of 0% both views give the same numbers. Prompt 12 may revisit this.

## 3. Snapshots in orders

An order copies the crop name in all three languages, the unit, the price per unit and the delivery address at checkout. If a farmer later changes the price or a crop is renamed, past orders, receipts, refunds and reviews still show what was actually agreed.

**Cost:** some duplication. This is the standard trade-off for transactional records.

## 4. Coordinates validated against India's bounding box

GeoJSON order is `[longitude, latitude]`. The common bug is swapping them. For Vijayawada the swapped pair is `[16.5, 80.6]`, and a world-range check accepts it because 80.6° is a valid latitude (in the Arctic). The service is India-only, so points must fall within longitude 68–98 and latitude 6–38. That rejects the swapped pair. A test was written first and caught this exact case.

## 5. Farmer location lives on FarmerProfile, not on Product

Nearby search (Prompt 9) runs `$geoNear` on `farmerprofiles` (2dsphere index) and then joins products. Copying the location onto each product would make the query one stage shorter, but every product would then need updating when a farmer moves. The decision is deferred to Prompt 9 with real query plans.

## 6. AppConfig stores overrides only

Defaults, descriptions and zod schemas live in code (`APP_CONFIG_DEFINITIONS`), so:
- a fresh database works with no setup;
- defaults are reviewed in pull requests;
- an admin can't save an invalid value, such as a 150% fee or a "changed mind" return reason.

Each override is audited with before and after values.

## 7. Append-only ledger and audit log

`LedgerEntry` and `AuditLog` throw on any update or delete through Mongoose (and on `save()` of an existing document). Mistakes are corrected with a new entry, so the history explains itself.

`LedgerEntry.idempotencyKey` is unique per business event, for example `payout:<orderId>`. A replayed webhook or retried job therefore fails on insert instead of paying twice.

**Limitation:** the protection is at the application layer. Someone with direct database access could still edit rows. Database-level roles are out of scope for the MVP.

## 8. Demo data is flagged, isolated and refused in production

Every record created by `seed:demo` has `isDemo: true`, and demo farmer names end with "(Demo)".

**What the seed guarantees:**
- **Repeatable:** a re-run deletes only `isDemo` records and recreates them.
- **No collisions:** it refuses to run if a real account already uses a demo phone number.
- **Not in production:** it refuses when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`.

The demo phone numbers are invented but may belong to real people, so they must never be used with a real SMS gateway.

## 9. Seeds are idempotent without fake "updates"

`seed:crops` compares each crop with the stored row and writes only new or changed ones.

**Why not upsert everything:** it would bump `updatedAt` on all 59 rows on every run, so "last changed" would lie. A test caught this.

**Stable ids:** upserting by `slug` keeps each crop's `_id` stable, so products keep pointing at the right crop.

## 10. The first admin is created without a PIN

`seed:admin` takes only a phone number (`SEED_ADMIN_PHONE`). The admin sets a PIN on first login through `/auth/pin/setup`, so a PIN never appears in shell history or CI logs.

**Risk:** whoever first receives that number's OTP sets the PIN. Run the seed only for a number you control, and log in immediately.
