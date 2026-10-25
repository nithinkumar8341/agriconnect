# API Reference

All backend routes are under `/api/v1`. List endpoints are paginated (from Prompt 3 onwards).

## Conventions

### Error format

Every error, from any route or middleware, has this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid",
    "details": [{ "field": "body.quantity", "message": "Too small: expected number to be >0" }],
    "requestId": "9f637546-6043-4a19-8ffb-56f9ccdeb348"
  }
}
```

- `details` appears only on validation errors.
- `requestId` matches the `X-Request-Id` response header and the server log line, so a user's report can be traced.
- Stack traces are never sent. In production, unexpected errors return a generic message.

### Error codes

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Request params, query or body failed zod validation. `details` lists each field. |
| 400 | `INVALID_JSON` | Body is not valid JSON. |
| 400 | `INVALID_INPUT` | A value has the wrong format (for example a malformed id). |
| 404 | `NOT_FOUND` | No such route. |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds `JSON_BODY_LIMIT` (default 100 kb). |
| 429 | `RATE_LIMITED` | Too many requests from this IP (default 300 per 15 minutes). |
| 500 | `INTERNAL_ERROR` | Unexpected server error. |

### Headers

- `X-Request-Id`: sent on every response. A client or proxy may send its own (8–64 characters from `A-Z a-z 0-9 _ -`); anything else is replaced.
- `RateLimit-Policy` / `RateLimit`: remaining quota (IETF draft-8 format).
- Security headers from helmet (`X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, …).

### CORS

Only origins listed in `CORS_ORIGINS` receive CORS headers, with credentials allowed (needed for the refresh-token cookie in Prompt 2). Requests without an `Origin` header (curl, server-to-server) are not affected.

### Input sanitizing

Keys starting with `$` or containing `.` are removed from the body and query before any route runs, so operator injection like `{ "phone": { "$ne": null } }` cannot reach MongoDB.

## Backend endpoints

### `GET /api/v1/health`

Auth: none. Not rate-limited, because hosting monitors poll it.

| Status | Body |
| --- | --- |
| 200 | `{ "status": "ok", "db": "up", "uptimeSeconds": 42 }` |
| 503 | `{ "status": "degraded", "db": "down", "uptimeSeconds": 42 }` (MongoDB unreachable or ping took over 2 s) |

## Authentication (`/api/v1/auth`)

### How a client uses it

1. `POST /otp/request` → the user receives an SMS.
2. `POST /otp/verify` → one of two outcomes:
   - **Farmer, buyer, or new user:** you get an `accessToken` (keep it **in memory only**) and the server sets the `agc_rt` refresh cookie.
   - **Agent or admin:** you get `{ next, pinToken }`. Call `/pin/verify` or `/pin/setup` to get the session.
3. Send `Authorization: Bearer <accessToken>` on API calls.
4. When a call fails with `401 TOKEN_EXPIRED`, call `POST /token/refresh` and retry. **Send only one refresh at a time**: two parallel refreshes with the same cookie look like token theft and end the session.
5. If `user.role` is `null`, show the role picker and call `POST /role`.

**The refresh cookie** `agc_rt`:
- `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`.
- `Max-Age` is 30 days when `rememberDevice` is true. Without it, the cookie is a browser-session cookie and the server-side session lasts at most 1 day.
- It never appears in a response body.

The frontend must reach the API on its **own origin**: through the Vite proxy in dev and the Vercel rewrite in production. Otherwise the browser will not send a `SameSite=Strict` cookie.

### Endpoints

| Method | Path | Auth | Body | Success |
| --- | --- | --- | --- | --- |
| POST | `/otp/request` | none | `{ phone, language? }` | `202 { expiresInSeconds: 300, resendAfterSeconds: 30 }` |
| POST | `/otp/verify` | none | `{ phone, otp, language?, rememberDevice? = true }` | `200 { accessToken, user, isNewUser }` + cookie, or `200 { next: 'pin' \| 'pin_setup', pinToken }` |
| POST | `/pin/verify` | pinToken in body | `{ pinToken, pin }` | `200 { accessToken, user, isNewUser: false }` + cookie |
| POST | `/pin/setup` | pinToken in body | `{ pinToken, pin }` | same as `/pin/verify`; only if no PIN is set yet |
| POST | `/token/refresh` | `agc_rt` cookie | none | `200 { accessToken, user }` + rotated cookie |
| POST | `/logout` | `agc_rt` cookie (optional) | none | `204`, cookie cleared, session revoked |
| POST | `/logout-all` | Bearer | none | `204`; every session ended and every access token already issued rejected |
| GET | `/me` | Bearer | none | `200 { user }` |
| POST | `/role` | Bearer | `{ role: 'farmer' \| 'buyer' }` | `200 { accessToken, user }` (new token carries the role) |

**Field formats:**
- `phone`: a 10-digit Indian mobile starting 6–9, with an optional `+91`, `91` or `0` prefix; spaces and dashes are allowed. It is stored as `+91XXXXXXXXXX`.
- `otp`: 6 digits. `pin`: 4–6 digits. `language`: `te`, `en` or `hi`.

**Language:**
- For a new number, the OTP SMS uses the `language` from `/otp/request`, and the new account's language is the `language` from `/otp/verify` (default `te`). Send it on both calls.
- A known number always gets the SMS in its saved language.

**user object:** `{ id, phone, role, language, status, lastLoginAt, createdAt }`. `role` is `null` until chosen.

### Limits

| What | Limit |
| --- | --- |
| OTP validity | 5 minutes, single use; requesting a new code invalidates the old one |
| Wrong OTP guesses | 5 per code, then `OTP_LOCKED`; request a new code |
| Resend cooldown | 30 seconds per phone |
| Codes per phone | 5 per hour |
| Per IP (15 min) | 10 `/otp/request`, 30 `/otp/verify`, 30 `/pin/*` |
| Wrong PIN | 5, then locked for 15 minutes |
| Access token | 15 minutes |
| pinToken | 5 minutes, only accepted by `/pin/*` |

### Auth error codes

| HTTP | `code` | Meaning / what the client should do |
| --- | --- | --- |
| 400 | `OTP_INVALID` | Wrong code; `details.attemptsLeft` says how many tries remain. |
| 400 | `OTP_EXPIRED` | Older than 5 minutes; request a new one. |
| 400 | `OTP_NOT_FOUND` | No active code (never sent, already used, or replaced). |
| 429 | `OTP_LOCKED` | 5 wrong guesses; request a new code. |
| 429 | `OTP_COOLDOWN` | Asked again within 30 s; `details.retryAfterSeconds`. |
| 429 | `OTP_LIMIT_REACHED` | 5 codes in the last hour for this phone. |
| 503 | `SMS_FAILED` | SMS gateway failed; safe to retry immediately. |
| 400 | `PIN_INVALID` | Wrong PIN; `details.attemptsLeft`. |
| 429 | `PIN_LOCKED` | Locked for 15 minutes; `details.retryAfterSeconds` when known. |
| 409 | `PIN_NOT_SET` / `PIN_ALREADY_SET` | Use `/pin/setup` or `/pin/verify` instead. |
| 401 | `PIN_TOKEN_INVALID` | pinToken missing, expired or wrong; start again with a new OTP. |
| 401 | `AUTH_REQUIRED` | No bearer token. |
| 401 | `TOKEN_EXPIRED` | Access token expired; call `/token/refresh`. |
| 401 | `TOKEN_INVALID` | Bad signature, wrong token type, or the user no longer exists; log in again. |
| 401 | `TOKEN_REVOKED` | Issued before a logout-all; log in again. |
| 401 | `REFRESH_INVALID` | Refresh cookie missing, expired, revoked or reused; log in again. |
| 403 | `ACCOUNT_SUSPENDED` | Account suspended by an admin. |
| 403 | `ROLE_REQUIRED` | User has no role yet; show the role picker. |
| 403 | `FORBIDDEN` | Role not allowed on this route. |
| 404 | `NOT_FOUND` | Also returned for another user's record, so ids cannot be probed. |
| 409 | `ROLE_ALREADY_SET` | Role can be chosen only once. |

### Route guards (for later prompts)

- `requireAuth` validates the bearer token, then loads the user from MongoDB. It sets `req.user` and `req.auth.sessionFamilyId`.
- `requireRole('farmer', ...)` uses the role from the database, never from the token.
- `requireOwnership(loadResource, { ownerField = 'userId', bypassRoles = [] })` returns 404 unless `resource[ownerField]` is the current user. It sets `req.resource`.

## Profile and onboarding

Every route works on the **caller's own** records. The user id always comes from the access token. A `userId`, `verificationLevel` or `agentId` sent in a body is ignored.

| Method | Path | Auth | Body | Success |
| --- | --- | --- | --- | --- |
| GET | `/profile` | Bearer | none | `200 { role, profile }`. `profile: null` means a farmer or buyer still needs onboarding; agents and admins always get `null`. |
| PUT | `/profile/farmer` | Bearer, role farmer | farmer profile (below) | `200 { profile }`: creates, or replaces the editable fields |
| PUT | `/profile/buyer` | Bearer, role buyer | `{ name, address }` | `200 { profile }`: sets the name and replaces the **default** address; other saved addresses are kept |
| PATCH | `/users/me` | Bearer | `{ language: 'te' \| 'en' \| 'hi' }` | `200 { user }`. The app calls this whenever the language changes, so SMS follow the screen language. |
| GET | `/locations/districts?state=` | none | none | `200 { states: [{ state, districts: [{ en, te, hi }] }] }`, `Cache-Control: max-age=86400` |

### Farmer profile body

```json
{
  "name": "Ramu",
  "state": "Andhra Pradesh",
  "district": "Krishna",
  "mandal": "Kankipadu",
  "village": "Kankipadu",
  "pincode": "521151",
  "location": { "latitude": 16.4384, "longitude": 80.7826 },
  "deliveryRadiusKm": 10,
  "servicePincodes": [],
  "deliveryDays": ["mon", "wed", "fri"],
  "cutoffTime": "18:00",
  "minOrderValue": 10000,
  "deliveryFee": 2000
}
```

**Rules:**
- `location` is optional (`null` = not shared, and removes any stored point).
- Locations are sent as **named** `latitude`/`longitude` fields and must fall inside India. The server stores GeoJSON `[lng, lat]`, so clients can never swap the order. The response returns the same named shape.
- `district` must be one of that state's districts (the English name from `/locations/districts`).
- `pincode` must belong to the state's postal circle: Telangana `50…`, Andhra Pradesh `51…`–`53…`.
- With no `location` and a radius above 0, at least one `servicePincodes` entry is required. Without a location, pincodes are the only way buyers can find the farmer.
- `deliveryDays` must not be empty or repeat a day. `cutoffTime` is `HH:mm`.
- Money is whole paise: `minOrderValue` ≤ ₹10,000 and `deliveryFee` ≤ ₹500.

### Buyer profile body

```json
{
  "name": "Padma",
  "address": {
    "label": "Home",
    "houseAndStreet": "",
    "landmark": "Near Benz Circle",
    "area": "",
    "pincode": "520010",
    "location": null
  }
}
```

`landmark` and `pincode` are required; everything else is optional.

## Crop catalog (public)

| Method | Path | Query | Success |
| --- | --- | --- | --- |
| GET | `/crops` | `search` (≤50 chars), `category` (`vegetable`\|`fruit`\|`leafy`\|`other`), `page` (≥1), `limit` (1–100, default 100) | `200 { items, page, limit, total }` |
| GET | `/crops/:slug` | none | `200 { crop }` or `404 NOT_FOUND` |

**Each crop:**
- `slug`, `names` (`en`, `te`, `hi`), `category`
- `defaultUnit`, `allowedUnits`, `quantityPresets`, `quantityStep`
- `shelfLifeDays`, `icon`

**Order and search:**
- Only active crops are returned, sorted by English name.
- `search` matches any of the three names or the slug, ignoring case.
- Names that **start with** the search text come before names that only contain it.
- Search is plain-text matching in JavaScript over the cached catalog, so special characters such as `(`, `.*` or `\` are just characters.

**Caching:**
- The server keeps the active catalog in memory for 10 minutes.
- Responses carry `Cache-Control: public, max-age=3600` and an ETag. A request with a matching `If-None-Match` gets `304 Not Modified` with no body.

## Farmer (role farmer only)

| Method | Path | Query | Success |
| --- | --- | --- | --- |
| GET | `/farmer/dashboard` | none | `200` dashboard (below) |
| GET | `/products/mine` | `status` (`available`\|`out_of_stock`\|`paused`\|`low`), `page`, `limit` (1–50, default 20) | `200 { items, page, limit, total }` |
| GET | `/products/last-price` | `crop` (slug) | `200 { lastPrice: { pricePerUnit, unit, listedAt } \| null }`: the farmer's own most recent listing of that crop |

### Listing your produce

All of these are farmer-only and act **only on the caller's own listings**: another farmer's listing id answers `404 NOT_FOUND`, the same as an id that doesn't exist. Every success returns `{ product }` in the [My products item](#my-products-item) shape, except `DELETE`.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| POST | `/products` | `cropSlug`, `photoAssetIds` (1–5 distinct ids from `POST /uploads/photos`), `quantity` (> 0, ≤ 100,000), `unit`, `pricePerUnit` (paise, whole, ₹1–₹10,000), `harvestDate` (ISO) | `201` |
| GET | `/products/:id` | none | `200` |
| PATCH | `/products/:id` | any of `pricePerUnit`, `quantity`, `harvestDate` (at least one) | `200` |
| POST | `/products/:id/status` | `action`: `pause` \| `resume` \| `mark_out_of_stock` | `200` |
| POST | `/products/:id/duplicate` | `quantity` | `201`: a new listing, same crop, unit, price and photos, harvested now ("Sell again") |
| DELETE | `/products/:id` | none | `204`: soft delete (`status: removed`); past orders keep pointing at it |

**Publishing (`POST /products`):**
- The crop must be active and the unit one of the crop's `allowedUnits`.
- The harvest date may be at most 12 hours in the future (clock and time-zone slack) and no older than the crop's `shelfLifeDays`.
- In one transaction, the photos must be the caller's own `pending` uploads; they are copied onto the listing and marked `attached`. If any photo is missing, someone else's or already used, nothing is created (`PHOTOS_UNAVAILABLE`). Two simultaneous publishes with the same photo produce exactly one listing.

**Editing quantity:** the new `quantity` is the total listed. What buyers already ordered (`quantity − availableQuantity`) is kept, so `availableQuantity` becomes `new quantity − sold`. This is one atomic update; if it would go below what was sold the answer is `409 QUANTITY_BELOW_SOLD`, even when an order lands at the same moment.

**Status after an edit:** a listing paused for being too old (`pausedReason: expired`) sells again when given a fresh harvest date; no stock left → `out_of_stock`; stock added to an out-of-stock listing → `available`.

**Status changes:**

| `action` | From | To |
| --- | --- | --- |
| `pause` | `available`, `out_of_stock` | `paused` (`pausedReason: farmer`) |
| `resume` | `paused` | `available` (or `out_of_stock` if nothing is left). Refused with `409 LISTING_EXPIRED` past the crop's shelf life: edit the harvest date instead. |
| `mark_out_of_stock` | `available` | `out_of_stock`; unsold stock is withdrawn (`quantity` becomes what was sold, `availableQuantity` 0), so a later edit restocks from a clean number |

A change from any other status, or a listing that changed in between (an order arrived), answers `409 INVALID_STATUS_CHANGE`.

**Automatic expiry:** an hourly job pauses `available` and `out_of_stock` listings harvested longer ago than their crop's shelf life, with `pausedReason: expired`, so buyers never order produce that has likely spoiled.

**Errors:**

| Error | When |
| --- | --- |
| `400 UNKNOWN_CROP` | Unknown or inactive crop |
| `400 UNIT_NOT_ALLOWED` | Unit not used for this crop |
| `400 HARVEST_IN_FUTURE` / `400 HARVEST_TOO_OLD` | Harvest date outside the rules above |
| `400`/`409 PHOTOS_UNAVAILABLE` | A photo is missing, not yours, or already on a listing |
| `409 QUANTITY_BELOW_SOLD` | New quantity is less than what buyers already ordered |
| `409 INVALID_STATUS_CHANGE` | Action not allowed from the current status, or the listing just changed |
| `409 LISTING_EXPIRED` | Resume past shelf life |

### Dashboard

```json
{
  "farmerName": "Ramu",
  "orders": { "today": 2, "new": 1, "pendingDelivery": 0 },
  "listings": { "available": 4, "outOfStock": 0, "paused": 0 },
  "lowStockPercent": 20,
  "lowStock": [ { "id": "…", "crop": { "slug": "green-chilli", "names": { "en": "Green chilli", "te": "…", "hi": "…" }, "icon": "🌶️", "category": "vegetable" }, "availableQuantity": 3, "quantity": 20, "unit": "kg", "...": "same fields as /products/mine items" } ],
  "agent": { "phone": "+919999900001" }
}
```

**Order counts:**
- `orders.today`: orders placed since **midnight IST** (India's calendar day, not the server's UTC day).
- `orders.new`: orders with status `placed`.
- `orders.pendingDelivery`: orders with status `accepted` or `out_for_delivery`.

**Low stock:**
- `lowStock` lists up to 5 `available` listings where `availableQuantity ≤ quantity × lowStockPercent / 100`.
- `lowStockPercent` is an AppConfig setting, default 20.

**Agent:** `agent` is the farmer's own assigned agent, and only while that agent's account is active; otherwise `null`.

### My products item

**Fields:**
- `id`
- `crop` (`slug`, `names`, `icon`, `category`, `shelfLifeDays`, `quantityStep`, `allowedUnits`)
- `quantity`, `availableQuantity`, `unit`
- `pricePerUnit` (paise)
- `status`, `pausedReason` (`farmer` \| `expired` \| null), `harvestDate`, `updatedAt`
- `photos[]` (`url`, `thumbnailUrl`) and `photoUrl` (the first thumbnail, or null)
- `isLowStock`
- `isPastShelfLife` (harvested longer ago than the crop's `shelfLifeDays`)

**Rules:**
- Only the caller's own listings are returned; `removed` (soft-deleted) listings never are.
- Sorted by most recently changed.
- `status=low` is a view, not a stored status: available listings at or below the threshold.

## Buyer marketplace (role buyer only)

| Method | Path | Query | Success |
| --- | --- | --- | --- |
| GET | `/market/products` (also `/products/nearby`) | where: `lat`+`lng` and/or `pincode` (one is required); `q` (crop name in te/en/hi), `category`, `crop`, `minPrice`/`maxPrice` (paise), `day` (`mon`…`sun`), `inStock` (`true` default), `sort` (`distance` needs `lat`/`lng`; `price`; `freshness`), `page`, `limit` (1–50, default 20) | `200 { items, page, limit, total, sort }` |
| GET | `/market/products/:id` | optional `lat`/`lng`/`pincode` | `200 { product }`: card fields plus `photos[]`, `canDeliver`, `deliveryDays`, `cutoffTime`. `404` when paused, removed or the farmer is suspended. |
| GET | `/market/farmers/:id` | optional `lat`/`lng`/`pincode` | `200 { farmer }`: `firstName`, `village`, `mandal`, `district`, `verificationLevel`, `isNew` (joined < 30 days), delivery terms, `memberSince`, `distanceKm`, `canDeliver`, `nextDeliveryDate`, `products[]` (available, newest harvest first) |

**Who appears:** a farmer is shown only if they can deliver to the buyer: the buyer is within the farmer's own `deliveryRadiusKm` (`$geoNear` on `farmerprofiles`, 2dsphere index), or the buyer's pincode is in the farmer's `servicePincodes`. Suspended farmers, paused and removed listings never appear.

**Card item:** `id`, `crop` (`slug`, `names`, `icon`, `category`, `quantityStep`), `pricePerUnit`, `unit`, `availableQuantity`, `status`, `harvestDate`, `photoUrl`, `distanceKm`, `farmer` (`id`, `firstName`, `village`, `verificationLevel`), `nextDeliveryDate` (`YYYY-MM-DD`), `deliveryFee`, `minOrderValue`.

**Privacy:** `distanceKm` is whole kilometres (`0` means under 1 km) or `null` when either side has no location. Coordinates, full names and phone numbers are never returned.

**Next delivery day:** an order before the farmer's `cutoffTime` (IST) can go out from tomorrow, after it from the day after; the first of the farmer's `deliveryDays` from then on.

**Sorting:** `distance` (default with a location), `price`, `freshness` (default with a pincode only). Farmers without a known distance sort after those with one.

## Cart, checkout and orders

The cart lives on the buyer's phone. The server trusts none of it: every quote and checkout re-reads prices, stock, farmer status and delivery coverage.

| Method | Path | Who | Body / query | Success |
| --- | --- | --- | --- | --- |
| POST | `/checkout/quote` | buyer | `items[]` (`productId`, `quantity`, optional `pricePerUnit` the buyer saw), optional `addressId` (default address otherwise) | `200 { address, groups[], totals, changes[] }` |
| POST | `/checkout` | buyer | `idempotencyKey` (UUID), `items[]` (with `pricePerUnit`), `paymentMethod: 'cod'`, `deliveryDates` (`{ farmerId: 'YYYY-MM-DD' }`), optional `addressId` | `201 { checkoutGroupId, orders[], replayed: false }`; the same key again answers `200` with the same orders (`replayed: true`) |
| GET | `/orders/mine` | buyer | `page`, `limit` | `200 { items, page, limit, total }` newest first |
| GET | `/orders/:id` | buyer (own) | none | `200 { order }` |
| POST | `/orders/:id/cancel` | buyer (own) | optional `reason` | `200 { order }`: only while `placed`; stock is restored |
| POST | `/orders/:id/reject` | farmer (own) | optional `reason` | `200 { order: { id, status } }`: only while `placed`; stock is restored |

**Quote groups** (one per farmer): `farmer`, `items[]` (`productId`, `crop`, `unit`, `quantity`, `pricePerUnit`, `lineTotal`, `availableQuantity`, `quantityStep`), `priceBreakdown` (`itemsTotal`, `deliveryFee`, `platformFee`, `buyerTotal`, `farmerEarnings`), `minOrderValue`, `meetsMinimum`, `deliveryDates` (next 4 of the farmer's delivery days after the cutoff rule).

**`changes[]`:** `{ productId, kind }` with `kind` = `price` (`old`, `new`), `stock` (`requested`, `available`), `unavailable` (paused, removed, sold out or farmer suspended) or `not_delivered` (the farmer does not cover this address).

**Checkout rules, in order:**
1. A known `idempotencyKey` returns the existing orders (it is the `checkoutGroupId`; a unique index on buyer + key + farmer also stops two simultaneous submissions).
2. Any change → `409 CART_CHANGED` with `details.quote` (the fresh quote). Nothing is created.
3. `409 BELOW_MINIMUM` (`details.farmerIds`), `400 INVALID_DELIVERY_DATE` (`details.farmerId`).
4. COD limits from AppConfig: `403 COD_BLOCKED` (too many failed COD deliveries), `409 TOO_MANY_OPEN_ORDERS` (`details.max`, `details.open`), `409 COD_LIMIT` for buyers with fewer than `newBuyerDeliveredOrders` deliveries (`details.limit`, default ₹500 per order).
5. In one transaction: for each item, `updateOne({ _id, status: 'available', pricePerUnit, availableQuantity: { $gte: qty } }, { $inc: { availableQuantity: -qty } })`. Any miss aborts everything and answers `409 CART_CHANGED`. Listings at 0 become `out_of_stock`. One order per farmer is created with item snapshots, the delivery address and day, the breakdown, and an `order.placed` audit entry.

**Cancel / reject:** one transaction: a conditional `placed → cancelled/rejected` update (`409 INVALID_STATUS_CHANGE` otherwise), quantities added back (never above the listing's `quantity`), sold-out listings back to `available` (paused or removed ones stay as they are), and an audit entry.

## Photo uploads (farmer or agent)

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| POST | `/uploads/photos` | `multipart/form-data`: `photo` (file), optional `capturedAt` (ISO date, not in the future, at most 1 year old) | `201 { asset: { id, url, thumbnailUrl, width, height, bytes, capturedAt, status: 'pending' } }` |
| DELETE | `/uploads/photos/:id` | none | `204`. `404` if the photo isn't yours or doesn't exist; `409 PHOTO_IN_USE` once it's on a listing. |

**Processing:** the server decodes the file to confirm it really is JPEG, PNG or WebP, then:
1. rotates it upright using the EXIF orientation;
2. **removes all metadata (including GPS)**;
3. stores a JPEG up to 1280 px plus a 320 px WebP thumbnail.

**Errors and limits:**

| Error | When |
| --- | --- |
| `400 INVALID_IMAGE` | Not a usable image, including SVG, GIF, plain text, truncated files, and anything over 50 megapixels |
| `413 PAYLOAD_TOO_LARGE` | The file is over 8 MB |
| `400 PHOTO_REQUIRED` | No file was attached |
| `429 RATE_LIMITED` | More than 60 uploads per user per hour |

**Lifecycle:**
- Uploaded photos stay `pending` until `POST /products` attaches them. Pending photos are deleted after 24 hours.
- Near-identical photos from another farmer are recorded server-side for fraud review. The uploader never sees that.

**URLs:** in development they're served from `/uploads/...` (proxied by Vite); in production they're Cloudinary URLs.

## ai-service (internal, called only by the backend)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/hello` | Bootstrap greeting. |
| GET | `/docs` | FastAPI's auto-generated OpenAPI UI. |
