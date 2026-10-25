# Phase 09: Buyer discovery with location

## What exists now

A buyer opens the app and sees fresh produce **only from farmers who can deliver to them**, nearest first. Each card shows the photo, price, "3 km away" (or "Under 1 km"), the farmer's first name and village, and the next delivery date. They can search in Telugu, English or Hindi, pick a category, sort by nearest, lowest price or freshest, and filter by price, delivery day or stock. Tapping a card opens the product page; from there, the farmer's page shows their delivery terms, everything they sell, and a space for reviews.

If the buyer has no saved location, they tap "Use my location" or type a pincode.

## Data flow

```
BuyerHomePage: location = saved choice | default address | ask (LocationSheet)
  GET /market/products?lat&lng&pincode&q&category&sort&...&page&limit=20
Server: $geoNear(farmerprofiles, <=50 km) -> keep distance <= farmer.deliveryRadiusKm
        + farmers with buyer pincode in servicePincodes -> drop suspended users
        -> products.aggregate($match farmers/status/crop/price -> distance per farmer
           -> $sort -> $facet page + total) -> cards (km rounded, no coordinates)
Scroll near the end (IntersectionObserver) or "Show more" -> next page
```

## Key design decisions

| Decision | Why |
| --- | --- |
| Farmers first, then listings | Location lives in one place; no copies to sync. |
| The farmer's own radius decides | "Buyers only see farmers who can serve their location" (CLAUDE.md). |
| Whole km, never coordinates | Privacy until an order is accepted. |
| Pincode fallback sorted by freshness | No pincode coordinates, so no honest distance. |
| Auto-load plus a button | Fast for touch, still usable with keyboard and screen readers. |

Full reasoning: [ADR 0010](../decisions/0010-buyer-discovery.md).

## How to test it

- **Automated:** `cd backend && npm test` (`market.test.js`: radius edge at 9.9 vs 10.1 km, pincode-only farmers, suspended farmers, paused/removed listings, rounding, IST delivery day, filters, sorting, paging, roles). `cd frontend && npm test` (`buyer.test.jsx`).
- **By hand:** `npm run seed:demo`, log in as buyer `9999900021` (OTP `123456`): Ramu's produce at 16 km. Tap Change and enter `500032`: Venkatesh's produce (pincode-only, no distance).

## Interview questions

1. **Why `$geoNear` on farmers instead of products?** Delivery coverage is a farmer property (radius, pincodes). Querying farmers first keeps one copy of the location and lets each farmer's own radius decide.
2. **How do you sort products by a distance that lives on the farmer?** Pass the farmer ids and distances as two arrays into the aggregation and use `$indexOfArray` + `$arrayElemAt` to give each product its farmer's distance, then `$sort` and `$facet` for the page and the total in one round trip.
3. **What if the buyer denies location?** Pincode fallback: farmers who list that pincode, sorted by freshness, no distance shown.
4. **How do you protect the farmer's location?** The server rounds to whole km and never returns coordinates; tests assert the JSON has no coordinates or phone numbers.
5. **Why both infinite scroll and a button?** `IntersectionObserver` is great on touch, but keyboard and screen-reader users need a control they can reach, and it is a fallback when the observer is unavailable.
