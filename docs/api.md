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

## ai-service (internal, called only by the backend)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/hello` | Bootstrap greeting. |
| GET | `/docs` | FastAPI's auto-generated OpenAPI UI. |
