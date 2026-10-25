# Phase 03: Data models and seed data

## What exists now

Every collection the marketplace needs exists as a Mongoose model with validation and indexes:
- profiles, crops, products and orders;
- payments, the ledger, reviews, returns and complaints;
- notifications, the audit log, fraud flags, mandi prices and app settings.

There are no API routes for them yet; later prompts add those. Three seed scripts fill a database:
- a 59-crop catalog in three languages;
- the first admin;
- a labelled demo marketplace (4 farmers, 3 buyers, 1 agent, 13 products, 4 orders).

## How the pieces relate (plain English)

- **User and profiles.** A **User** is a phone number with a role. A farmer user has one **FarmerProfile**: where they farm and how they deliver (radius, pincodes, days, cutoff, minimum order, fee). A buyer user has one **BuyerProfile** with up to 5 addresses. An agent is linked to the farmers they help through `FarmerProfile.agentId`.
- **Crops and products.** A **Crop** is a catalog entry ("Tomato / టమాటా / टमाटर", sold by kg, keeps about 5 days). A **Product** is one farmer's listing of a crop: how much they listed (`quantity`), how much is left (`availableQuantity`), and the price per unit in paise.
- **Orders.** An **Order** is one buyer buying from one farmer. A cart with three farmers makes three orders sharing a `checkoutGroupId`. The order **copies** the price, crop name and address at checkout, so history never changes when a farmer edits a price.
- **Money.** **Payment** is the money coming in (one per checkout). **LedgerEntry** is every money movement afterwards: payout to the farmer, platform fee, refund. Ledger rows can't be edited, and each has a unique `idempotencyKey`, so the same payout can't be recorded twice.
- **After the sale.** **Review** (one per delivered order), **ReturnRequest** (problem reports with photos) and **Complaint** (everything else).
- **Oversight.** **AuditLog** records who changed what, before and after; it can't be edited. **FraudFlag** is what the rule engine (Prompt 13) produces. **AppConfig** holds admin-tunable thresholds; only overrides are stored, and defaults live in code.

## Key design decisions

| Decision | Why |
| --- | --- |
| Integer paise for money | Floats drift (`0.1 + 0.2 ≠ 0.3`). One pricing function rounds once per line. |
| Order snapshots | A later price edit must not change what a past order says was paid. |
| `[lng, lat]` checked against India's bounds | A swapped pair still looks "valid" worldwide (80.6 is a real latitude); India's bounds catch it. A failing test found this. |
| Location on FarmerProfile only | One place to update. Nearby search does `$geoNear` on farmers, then joins products. |
| Append-only ledger and audit log | Mistakes are fixed with new entries, so the history explains itself. |
| Unique keys enforce rules | One review per order, one ledger entry per event, one price row per market per day, one profile per user. The database refuses duplicates even if code has a bug. |
| `isDemo` on everything the demo seed creates | Demo data can be shown with a label and wiped without touching real users. |
| Seeds write only what changed | Re-running doesn't bump `updatedAt` on all 59 crops. A failing test found this too. |

## Try it yourself

```bash
cd backend
npm run seed:crops     # first run: inserted 59; second run: inserted 0, updated 0
npm run seed:demo      # 4 farmers, 3 buyers, 1 agent, 13 products, 4 orders, all isDemo
docker exec -it agriconnect-mongo mongosh agriconnect
> db.crops.findOne({ slug: 'gongura' })
> db.farmerprofiles.aggregate([{ $geoNear: { near: { type: 'Point', coordinates: [80.648, 16.5062] }, distanceField: 'meters', maxDistance: 50000 } }, { $project: { name: 1, meters: 1 } }])
```

The `$geoNear` query returns the demo farmers near Vijayawada, nearest first. Venkatesh has no location and is skipped; he is found by pincode instead.

Log in as a demo farmer: OTP request and verify for `9999900011` with code `123456`.

## 5 likely interview questions

1. **Why store money as integers?**
   Binary floating point can't represent most decimal fractions exactly, so sums drift by tiny amounts, and in a ledger a paisa off is a bug. I store paise as integers, round once per line in a single pricing function, and a property-style test checks that buyer total = farmer earnings + platform fee across 200 random orders.

2. **Why copy prices and names into the order instead of referencing the product?**
   The product is live data that the farmer can change; the order is a record of an agreement. If I only stored `productId`, editing the price tomorrow would change yesterday's receipt, refund amounts and reviews. Snapshots trade a little duplication for correct history, which is standard for transactional data.

3. **How do you make sure a webhook replay doesn't pay a farmer twice?**
   Each ledger entry has a unique `idempotencyKey` derived from the business event, for example `payout:<orderId>`. The second insert fails on the unique index, so even a buggy retry can't double-credit. The ledger is also append-only: corrections are new entries, never edits.

4. **What does a 2dsphere index do, and what is the classic mistake with it?**
   It indexes GeoJSON points on a sphere, so `$geoNear` can return documents sorted by real distance with a `maxDistance` cut-off. The classic mistake is coordinate order: GeoJSON is `[longitude, latitude]`, but people write `lat, lng`. I validate points against India's bounding box, because a swapped Indian coordinate is still a valid point somewhere on Earth.

5. **How are your seed scripts safe to run repeatedly?**
   - Crops are upserted by a stable slug, and only rows that actually changed are written. Ids stay stable and timestamps stay honest.
   - The admin seed is a no-op if the admin already exists, and it refuses to promote someone else without `--force`.
   - The demo seed deletes and recreates only records flagged `isDemo`. It refuses if a real account uses a demo number, and it refuses to run in production unless explicitly allowed.
   - Tests run each seed twice and compare counts.
