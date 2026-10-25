# ADR 0010: Buyer discovery with location

- Status: accepted (owner chose option A for all four questions)
- Date: 2026-10-25

## 1. Search farmers first, then their listings

`$geoNear` runs on `farmerprofiles` (2dsphere index, up to 50 km, the largest radius a farmer can set), keeping farmers whose own `deliveryRadiusKm` covers the buyer. Farmers listing the buyer's pincode are added (they may have no location at all). One aggregation on `products` then filters, attaches each farmer's distance (`$indexOfArray` into the farmer list), sorts and pages with `$facet`.

- One source of truth for location; nothing to keep in sync when a farmer moves or changes radius.
- **Cost:** the farmer list is held in memory per request. Fine for the pilot (hundreds of farmers within 50 km). If that grows, copy the location onto products (option B) or cap candidates.

## 2. Distance in whole kilometres

`distanceKm` is rounded to whole km and `0` is shown as "Under 1 km". Coordinates, full names and phones never leave the server; the farmer page shows first name, village, mandal and district only (CLAUDE.md privacy rule).

## 3. Pincode fallback

Without a location, buyers see farmers whose `servicePincodes` include their pincode, sorted by freshness, with no distance (we have no pincode coordinates). With both, both rules apply.

## 4. 20 per page, automatic loading plus "Show more"

An `IntersectionObserver` loads the next page 400 px before the end; the "Show more" button stays for keyboards, screen readers and browsers where the observer does not fire. Page numbers (not cursors) are enough at pilot scale.

## Also decided

- **Where the buyer is:** the default saved address (location and pincode) until they choose "Use my location" (asked only on tap) or type a pincode. The choice is kept in `localStorage` on the phone.
- **Next delivery day:** before the farmer's cutoff (IST) the earliest day is tomorrow, after it the day after; then the first of the farmer's delivery days. Same-day delivery is not offered.
- **Demo data:** farmer Ramu's radius went from 15 to 20 km so the demo buyer in Vijayawada (16 km away) sees produce.
