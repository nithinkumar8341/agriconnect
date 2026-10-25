# ADR 0007: Crop catalog API and farmer dashboard

- Status: accepted
- Date: 2026-10-25

## 1. Catalog search runs in memory, not as a database regex

The active catalog is about 60 rows and changes only when `seed:crops` runs.

**Decision.** The backend loads it once, keeps it for 10 minutes, and filters and ranks in JavaScript: names starting with the search text first, then names containing it.

**Benefits:**
- No database round trip per keystroke.
- User text is never turned into a MongoDB regex, so there's nothing to escape and no regex-based denial of service.

**Cost.** A crop edit appears within 10 minutes, not instantly; `clearCropCache()` exists for tests and in-process tools. If the catalog grows to thousands of rows, switch to a MongoDB text index or Atlas Search.

## 2. HTTP caching for the catalog

The responses use `Cache-Control: public, max-age=3600` plus Express's automatic ETag. Browsers reuse the catalog for an hour and then revalidate cheaply (a `304` with no body), which matters on metered mobile data. Offline caching of the catalog by the service worker comes in Prompt 17.

## 3. "Today" means the Indian calendar day

`orders.today` counts from midnight IST. Since India has a single time zone and no daylight saving, that's a fixed offset of +05:30.

Counting by the server's UTC day would put an order at 01:00 IST into "yesterday". A test pins both sides of the boundary: 00:01 IST counts and 23:59 IST the previous day doesn't.

## 4. Low stock is a percentage, admin-tunable

**Decision.** A listing is low when `availableQuantity ≤ quantity × lowStockPercent / 100`, with a default of 20%. The rule is evaluated inside MongoDB (`$expr`), so the dashboard and the `status=low` filter agree.

**Why a percentage:** a fixed amount ("5 kg left") means different things for a 10 kg listing and a 500 kg one.

## 5. My Products is read-only until Prompt 8

Edit, pause, mark out of stock, delete and duplicate depend on the listing form and photo pipeline (Prompts 7–8). Building them twice would waste work, and real farmers can't create listings until Prompt 8 anyway. Approved by the owner (decision 1, option A).

## 6. Sell tile visible now

The Sell tile opens a "Coming soon" screen until Prompt 8, so the dashboard layout is final now (decision 2, option A). Market prices behaves the same until Prompt 18, and the assistant tile is shown disabled with "Coming soon".

## 7. Layout chosen for Telugu at 360px

A real-browser check at 360px showed two problems:
- Three summary cards side by side broke Telugu labels mid-word.
- A bottom-menu label ("నా ఉత్పత్తులు") broke the same way.

**Decisions:**
- **Summary cards are full-width rows** (icon, label, number).
- **Shorter Telugu labels where natural:** "నా పంటలు" ("my crops") for My Products, and "సహాయం అడగండి" ("ask for help") for the assistant tile.

Both labels are still listed for native review.

## 8. Shared farmer profile form

Onboarding and the profile page use the same field components (`FarmerDetailsFields`, `DeliverySettingsFields`) and the same rules (`lib/farmerProfileForm.js`: defaults, validation, rupees→paise). The two screens can't drift apart. The Prompt 5 onboarding tests pass unchanged, which shows the refactor preserved behaviour.

## 9. Backend test hook timeout raised to 30 s

Whole test files failed intermittently with "Exceeded timeout of 5000 ms for a hook". Every file builds indexes in `beforeAll` on one shared in-memory MongoDB, and with 22+ files running in parallel those hooks queue up.

This was the real cause of the "transient" failure seen in Prompt 5. The fix is `testTimeout: 30_000` in `jest.config.js`, verified with 5 consecutive green runs.
