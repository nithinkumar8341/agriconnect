# Phase 06: Crop catalog API and farmer dashboard

## What exists now

- **`GET /crops`:** the public crop catalog. It's searchable in English, Telugu or Hindi, fast, and cached by the browser.
- **The farmer home:** "today at a glance" (orders today, waiting to deliver, running low), plus one large tile per task:
  - Sell (coming in Prompt 8);
  - My products;
  - My orders (with a "new" badge);
  - Market prices (coming in Prompt 18);
  - Ask assistant (coming in Prompt 20);
  - Call my agent (one-tap phone call).
- **My products:** the farmer's own listings with stock bars, prices, statuses and warnings, filterable. It's read-only until Prompt 8.
- **My profile:** see and edit farm and delivery details (same form as onboarding), change language, log out, or log out on all phones.

## Data flow

1. **Opening `/farmer`** sends `GET /farmer/dashboard`. In one round trip the server runs six queries in parallel:
   - three order counts;
   - listing counts grouped by status;
   - low-stock listings (with the crop joined);
   - the farmer's profile (with the agent joined).
2. **Tapping "Running low"** opens `/farmer/products?status=low`. The filter lives in the URL, so it can be linked to and survives a reload. That page calls `GET /products/mine?status=low&page=1&limit=20`, and "Show more" fetches the next page.
3. **Saving the profile** sends the same `PUT /profile/farmer` as onboarding, built by the same shared form code, and updates the session's profile.

## Key design decisions

| Decision | Why |
| --- | --- |
| Catalog searched in memory | About 60 rows; no database trip per keystroke; user text never becomes a regex. |
| `Cache-Control` + ETag on the catalog | Cheap revalidation (a `304` with no body) on mobile data. |
| "Today" from midnight IST | An order at 01:00 IST is "today" in India even though it's still yesterday in UTC. |
| Low stock as a % of what was listed (AppConfig) | "5 kg left" means very different things for 10 kg and 500 kg listings. |
| Status shown as text + colour | Readable for colour-blind people and in sunlight. |
| One shared form for onboarding and profile | The two screens can't drift; one set of rules. |
| Full-width summary rows | Telugu labels broke mid-word in three narrow columns at 360px. |

## Bugs and lessons from this phase

1. **"Transient" test failures had a real cause.** Whole test files sometimes failed with "Exceeded timeout of 5000 ms for a hook". Every file builds indexes on one shared in-memory MongoDB in `beforeAll`, and with 22 files running in parallel the hooks queued past Jest's 5-second default. The fix was a 30-second hook timeout, verified with 5 green runs in a row. Lesson: don't write off intermittent failures; find what is slow.
2. **I committed once without the tests passing.** My command didn't stop when the tests failed. The commit's own code was fine, but since then every commit command runs the tests first and refuses to commit on any failure.
3. **The real-browser check at 360px in Telugu** caught mid-word line breaks that unit tests can't see. That led to the stacked summary rows and shorter labels.

## Try it yourself

```bash
cd backend && npm run seed:demo && npm run dev
cd frontend && npm run dev
```

Log in as demo farmer Ramu (`9999900011`, OTP `123456`). The home shows 2 orders today, 1 new, and the "Call my agent" tile.

```bash
curl "localhost:4000/api/v1/crops?search=టమా"   # Telugu search
curl -i "localhost:4000/api/v1/crops" | grep -i -E "etag|cache-control"
```

## 5 likely interview questions

1. **How does your crop search work, and why not a database query?**
   The catalog is about 60 crops and rarely changes, so the backend caches the active list in memory for 10 minutes and filters it in JavaScript across the English, Telugu and Hindi names. Prefix matches rank first. That's faster than a database round trip per keystroke, and user text never becomes a MongoDB regex, so there's no regex injection or slow-regex risk. For a catalog of thousands of crops I'd move to a text index or Atlas Search.

2. **How did you compute "today's orders" correctly?**
   By the Indian calendar day: from midnight IST, which is 18:30 UTC the previous day. India has one time zone and no daylight saving, so a fixed +05:30 offset is correct. A test checks orders at 00:01 IST and 23:59 IST the previous day to pin the boundary.

3. **How is low stock defined, and why that way?**
   Available stock at or below a percentage (default 20%) of what was listed. The percentage is an admin setting, not hard-coded. It's evaluated inside MongoDB with `$expr`, so the dashboard and the filtered list always agree. A percentage works the same for small and large listings, where a fixed number of kilograms wouldn't.

4. **How do you keep the API efficient for the dashboard?**
   One endpoint returns everything the screen needs. Its six queries run in parallel with `Promise.all`, use indexes that start with `farmerId`, and the low-stock preview is limited to 5 rows. The client makes one request instead of five, which matters on 3G.

5. **What did you test, and what did testing find?**
   - **Backend:** API tests for search in three scripts, ranking, special characters, caching and `304`, the IST day boundary, low-stock thresholds, ownership and role checks.
   - **Frontend:** component tests for counts, the one-tap reachability of every task, filters in the URL, pagination, profile editing (rupees sent as paise), and logout-all confirmation, plus axe accessibility checks in all three languages.
   - **Real browser:** a run at 360px in each language found Telugu line-breaking problems the unit tests couldn't.
   - **The flaky suite:** it turned out to be a real hook-timeout problem, now fixed.
