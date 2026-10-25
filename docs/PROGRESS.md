# Progress

## Done

- **Prompt 0: Repo bootstrap** (commit `fd92925`): monorepo layout; `frontend/` (Vite React + Tailwind v4, Vitest), `backend/` (Express 5, ES modules, Jest + supertest), `ai-service/` (FastAPI, pytest, ruff); lint configs; `.env.example` per service; `docker-compose.yml` with a single-node MongoDB replica set; GitHub Actions CI; docs skeleton.
- **Prompt 1: Backend foundation** (3 commits, 2026-10-25):
  - **Config:** zod env validation that fails fast and names bad variables without their values; `CORS_ORIGINS` is required in production.
  - **Logging:** pino logging that redacts auth headers, cookies, OTP/PIN/token/phone fields, and never logs query strings or bodies.
  - **Middleware:** request id, helmet, CORS allowlist with credentials, per-IP rate limiter (health exempt), JSON body limit, NoSQL-injection sanitizer compatible with Express 5, and `validate()` for zod schemas.
  - **Errors:** central error handler with the standard `{ error: { code, message, requestId } }` shape, generic messages in production, and never any stack traces; 404 handler.
  - **Database and lifecycle:** Mongoose connection; graceful shutdown on SIGTERM/SIGINT with a 10 s forced-exit timeout; `GET /api/v1/health` (200, or 503 when the DB is down).
  - **Tests:** Jest with a `MongoMemoryReplSet` (MongoDB 7.0.14) and a test proving transaction commit and rollback; the MongoDB binary is cached in CI.
  - **Verified:**
    - 38 backend tests pass on Linux (`node:22` container with `npm ci`, full repo, matching CI), including the SIGTERM graceful-shutdown test.
    - On Windows, 37 pass and the SIGTERM test is skipped, because Windows cannot deliver SIGTERM.
    - Lint is clean in backend and frontend; the frontend test passes.
    - Manual check against the Docker MongoDB:
      - `/health` returns 200 with db up.
      - An unknown route returns the standard 404.
      - Bad JSON returns 400 `INVALID_JSON`.
      - CORS headers are sent to the allowed origin and withheld from an unlisted one.
      - An invalid env exits with code 1 and names `PORT` and `MONGODB_URI`.
  - The `/api/v1/hello` bootstrap route was removed; the frontend placeholder now shows `/api/v1/health`.
- **Prompt 2: Authentication and sessions** (3 commits, 2026-10-25), backend only:
  - **Models:** User, OtpRequest and Session, with TTL indexes. Phone numbers are normalised to `+91XXXXXXXXXX`.
  - **SMS:** a `SmsProvider` interface with a console provider (dev only) and an msg91 stub that fails loudly; OTP templates in te/en/hi.
  - **Phone OTP:**
    - HMAC-hashed, 5-minute expiry, single use, latest code only.
    - 5 attempts, counted atomically before comparing.
    - 30 s resend cooldown and 5 codes per phone per hour, stored in MongoDB.
    - Per-IP limits; a failed SMS does not start the cooldown.
    - The dev fixed OTP and the console SMS provider are rejected in production config.
  - **PIN step** for agents and admins: 5-minute pinToken with its own audience, bcrypt PIN, one-time setup, and a lock after 5 wrong tries for 15 minutes (counted atomically).
  - **Tokens:**
    - 15-minute HS256 access JWT, kept in memory by clients.
    - Rotating refresh token in an `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie, stored as SHA-256.
    - `rememberDevice: false` gives a browser-session cookie and a 1-day session.
    - Reuse of a rotated token revokes the whole family, including a token created mid-rotation (race found and fixed).
  - **Endpoints:** `/otp/request`, `/otp/verify`, `/pin/verify`, `/pin/setup`, `/token/refresh`, `/logout`, `/logout-all` (also invalidates access tokens already issued, via `tokensValidAfter` + `issuedAtMs`), `/me`, `/role` (farmer/buyer only, once).
  - **Guards:**
    - `requireAuth` loads the user each request, so suspension and role changes apply at once.
    - `requireRole(...)` returns `ROLE_REQUIRED` for users without a role.
    - `requireOwnership(...)` returns 404 for other people's records.
  - **Production same-origin:** [frontend/vercel.json](../frontend/vercel.json) rewrites `/api/*` to Render. The Render URL is a placeholder until Prompt 24.
  - **Verified:**
    - 146 backend tests pass on Linux (`node:22` container, `npm ci`, full repo), including the SIGTERM test. On Windows 145 pass and 1 is skipped (SIGTERM); the full suite was run 3+ times in a row with no flakes after the race fix.
    - Mutation checks:
      - Removing the mid-rotation re-check makes its regression test fail.
      - Planting an OTP debug log makes the log-safety test fail.
    - Manual curl walkthrough against the Docker MongoDB: OTP request, cooldown, wrong code, login with cookie attributes, `/me`, role choice (admin refused), refresh rotation, reuse detection killing the new token too, and admin PIN setup followed by logout-all (old token gives `TOKEN_REVOKED`). The server log had no full phone numbers outside the dev SMS line, and no JWTs.
  - **Not done in this prompt (by plan):** no frontend login screens (Prompt 5) and no AuditLog (Prompt 3; login events only go to logs).
- **Prompt 3: Core data models and seed data** (3 commits, 2026-10-25), backend only:
  - **New models** with validation and indexes:
    - FarmerProfile (2dsphere location), BuyerProfile, Crop, Product
    - Order (snapshots, price breakdown, status history, hidden delivery OTP), Payment
    - LedgerEntry (append-only, unique idempotency key), Review (one per order), ReturnRequest, Complaint
    - Notification (90-day TTL), AuditLog (append-only), FraudFlag, PriceReference (unique per source/commodity/market/date), AppConfig
    - `User.isDemo` was added.
  - **Conventions:**
    - Money is integer paise.
    - GeoJSON `[lng, lat]` must fall inside India's bounding box (this catches swapped coordinates).
    - The platform fee is deducted from farmer earnings (ADR 0004).
  - **Services:**
    - `computeOrderPricing`.
    - `recordAudit` / `SYSTEM_ACTOR`.
    - AppConfig `get`/`getAll`/`set` with code defaults, zod validation per key, and an audited change.
  - **Seeds:**
    - `seed:crops`: 59 crops (32 vegetables, 10 leafy, 17 fruits) with en/te/hi names, units, presets, step, shelf life and icon. Writes only new or changed rows.
    - `seed:admin`: from `SEED_ADMIN_PHONE`; refuses to promote without `--force`; audited.
    - `seed:demo`: 4 farmers (one agent-assisted, one pincode-only), 3 buyers (one pincode-only), 1 agent, 13 products and 4 orders across `placed`, `accepted`, `delivered` and `cancelled`, all `isDemo`. Stock is consistent with active orders. Production is refused.
    - `db:indexes`.
  - **Docs:**
    - `database.md` rewritten: ER diagram, every collection, indexes, AppConfig defaults, and a who-may-read-and-write matrix.
    - ADR 0004 and the phase 03 learn note.
    - 59 crop names added to `translation-review.md`.
  - **Verified:**
    - 193 backend tests pass on Windows (1 SIGTERM test skipped), run twice. The 145 auth/foundation tests are unchanged and passing.
    - Against the Docker MongoDB:
      - `db:indexes` succeeds.
      - `seed:crops` run twice: 59 inserted, then 0/0.
      - `seed:demo` run twice: same counts.
      - `seed:admin` with no phone exits 1 with a clear message.
      - The 2dsphere index is present on `farmerprofiles`.
    - A demo farmer logs in with OTP `123456` (role farmer), and the demo agent is sent to `pin_setup`.
  - **Not done in this prompt (by plan):** no API routes for the new collections. Those come in Prompts 6–16, which implement the permission matrix in `database.md`.

## In progress

- Nothing.

## Next

- Prompt 4: Frontend foundation and design system (Tailwind theme, components, router with role guards, i18n te/en/hi, API client with single-flight refresh, PWA).

## Known issues

- ai-service tests print a `StarletteDeprecationWarning` saying the httpx-backed `TestClient` is deprecated in Starlette 1.x. Tests pass. The suggested replacement package was not installed because it could not be verified during setup; review it before switching.
- CI has not run on Prompts 1–3: the commits are local and not pushed. Confirm on the GitHub Actions tab after pushing.
- The 59 crop names in te/hi are machine-written and await native-speaker review.
- Demo phone numbers (`+9199999000xx`) are invented but could belong to real people: never seed demo data where a real SMS gateway is active.
- AuditLog and LedgerEntry immutability is enforced in Mongoose only; direct database access could still change rows.
- **Real SMS is not implemented.** India requires DLT registration (sender ID and approved templates) first, so start that early if the pilot needs real SMS. Until then production cannot send OTPs.
- **Two parallel refreshes from one browser end the session** (they look like token reuse). Prompt 4's API client must run one refresh at a time.
- `TRUST_PROXY` for production (Vercel rewrite + Render) is expected to be 2 but is unverified until deploy.
- The te/hi OTP SMS texts are machine-written and await native-speaker review ([translation-review.md](translation-review.md)).
- Graceful shutdown can't be checked by hand on Windows (no SIGTERM). Press Ctrl+C in a terminal running `npm run dev`; that sends SIGINT, which takes the same shutdown path.
