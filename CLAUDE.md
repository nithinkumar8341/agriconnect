# AgriConnect: Project Context (read this first, every session)

## 1. Mission

AgriConnect is a multilingual, farmer-friendly marketplace where small farmers in Andhra Pradesh and Telangana sell fresh vegetables and fruits directly to nearby households, reducing dependence on middlemen. Farmers deliver nearby. Low-literacy farmers are first-class users: they must be able to list a product using taps, icons and optional voice, with almost no typing. Village field agents can help them.

Two goals, in this order:

1. Real usefulness for farmers and buyers.
2. A deployed, well-documented portfolio project that the owner (a solo B.Tech CSE student) can fully explain in SDE and AI/ML interviews.

## 2. Roles

- **Farmer**: registers by phone OTP, lists products, sets delivery area/days, fulfils orders by delivering nearby.
- **Buyer** (households first): registers by phone OTP, finds nearby farmers, orders, pays by COD or UPI (test mode), can report problems.
- **Agent**: village helper. Registers farmers (with the farmer's OTP consent), creates listings on a farmer's behalf. Every action is audit-logged. Cannot change bank details, price or quantity without the farmer's approval.
- **Admin**: manages users, listings, orders, fraud flags, returns, complaints, app settings.

## 3. Tech stack (do not change without asking)

- `frontend/`: React (Vite), Tailwind CSS, React Router, i18next, vite-plugin-pwa, IndexedDB (idb) for offline drafts. JavaScript (ES modules).
- `backend/`: Node.js, Express, Mongoose, MongoDB (Atlas in prod), zod for validation, JWT, Jest + supertest.
- `ai-service/`: Python 3.11+, FastAPI, PyTorch (CPU inference), scikit-learn, pandas, pytest.
- Images: Cloudinary (local disk fallback in dev). Payments: Razorpay test mode (UPI) plus COD. SMS: provider interface (console provider in dev, real provider pluggable).
- Deploy: Vercel (frontend), Render (backend + ai-service via Docker), MongoDB Atlas. CI: GitHub Actions.

## 4. Repo structure

```
AgriConnect/
  CLAUDE.md  README.md  docs/  docker-compose.yml  .github/workflows/
  frontend/  backend/  ai-service/
  docs/: architecture.md, database.md, api.md, decisions/ (ADRs), learn/ (per-phase notes), PROGRESS.md, translation-review.md
```

## 5. Non-negotiable rules

- **Atomic inventory.** Stock is reduced with a single conditional atomic update (`availableQuantity >= requested`) so overselling is impossible. Stock is restored on cancel, reject or failed delivery. A concurrency test must prove it.
- **Never trust the client.** Re-compute prices, totals, fees and stock on the server. Authorization is checked server-side on every route (role AND ownership).
- **No secrets in code.** Use `.env` + `.env.example`. Never log OTPs, tokens or full phone numbers in production.
- **OTP security.** OTPs are hashed, expire in 5 minutes, limited attempts, resend cooldown, rate limits per phone and IP. A dev-only fixed OTP is allowed only when `NODE_ENV !== 'production'`.
- **Farmer-first UI.** Mobile-first, base font 18px or larger, touch targets at least 48px, high contrast, icon + label on every action, one primary action per screen, max 3 steps for any task, works on cheap phones and weak networks.
- **Languages.** Telugu and English fully translated from day one; Hindi keys present and filled as a later pass. All UI text comes from i18n files, never hard-coded. Machine-written Telugu/Hindi must be listed in `docs/translation-review.md` for a native speaker to verify.
- **Honest AI.** Never present AI output as certified fact. Crop quality = "visual check only (beta)". Prices always show source, date and location, and never invent live prices. Chatbot gives general guidance, avoids definitive pesticide/fertiliser doses, and says when it is unsure. Report real measured metrics only; never invent accuracy numbers.
- **Transparency.** Every order shows a price breakdown (farmer price, delivery fee, platform fee). Trust scores use a documented formula. New sellers are labelled "New", not penalised.
- **Privacy.** Collect the minimum data. Show buyers only approximate distance to a farmer until an order is confirmed. Provide an account delete/export endpoint. Do not store Aadhaar or bank details in plain text (bank/payout details are out of scope for MVP).
- **Everything auditable.** Agent actions, admin actions, order status changes, fraud flags and refunds write to an AuditLog.

## 6. Domain rules

- **Order status flow:** `placed -> accepted -> out_for_delivery -> delivered`. Terminal alternatives: `cancelled` (by buyer before accepted), `rejected` (by farmer), `failed` (delivery failed). Each change is logged and notifies the other party.
- **Multi-farmer cart:** one checkout creates one Order per farmer, linked by a `checkoutGroupId`. Delivery day and fee are shown per farmer.
- **Delivery (farmer delivers nearby):** farmer sets radius (km) and/or pincodes, delivery days, order cutoff time, minimum order value, delivery fee. Buyers only see farmers who can serve their location.
- **Delivery OTP:** 4-digit code shown to the buyer; the farmer enters it on handover to mark delivered. Stored hashed, limited attempts.
- **Payments:** `cod` or `upi`. COD is marked paid on delivery OTP confirmation. UPI via Razorpay test mode. Platform fee is configurable (default 0 for pilot) and recorded in a ledger.
- **COD abuse controls:** new buyers get a low COD cap, refused deliveries restrict COD, velocity and duplicate-address rules create FraudFlags. Thresholds live in AppConfig, not in code.
- **Returns (perishables):** no change-of-mind returns. Buyers can report damaged / rotten / wrong / underweight items within a configurable window (default 4 hours after delivery) with photos. Outcomes: partial refund, replacement, credit, or rejected. Evidence from listing photos and delivery OTP is attached.
- **Reviews:** verified-purchase only (order must be delivered). One review per order.
- **Units:** crops have a default unit (kg, dozen, bunch, piece); quantities are positive numbers with sensible step sizes.

## 7. Coding standards

- Small, single-purpose modules: routes -> controllers -> services -> models. Business logic lives in services.
- Validate every request body/query with zod. Central error handler with consistent JSON errors `{ error: { code, message } }`.
- ESLint + Prettier. No dead code, no commented-out blocks. Meaningful names. Comments explain why, not what.
- Every feature ships with tests: unit tests for services, API tests for routes, and at least one component/e2e test for the main UI flow.
- API is versioned under `/api/v1`. Pagination on every list endpoint.
- Accessibility: semantic HTML, labels, focus states, aria where needed.

## 8. Workflow rules for EVERY task

1. Read this file and `docs/PROGRESS.md` first.
2. Plan first: list files to create/change and risks. Wait for approval on big or risky changes.
3. Implement in small steps. Run lint and tests. Fix failures before moving on.
4. Update `docs/` (database.md, api.md, architecture.md) when models, routes or architecture change.
5. Write `docs/learn/phase-XX-name.md`: plain-English data flow, key design decisions, and 5 likely interview questions with short answers. The owner must be able to explain every feature.
6. Update `docs/PROGRESS.md` (done / in progress / next / known issues).
7. Commit with a clear message (`feat(orders): atomic stock reservation`). One logical change per commit.
8. If something is ambiguous, make the simplest reasonable choice, record it in `docs/decisions/`, and mention it in your summary.
9. Never mark a task done without running it. Say exactly what you ran and what passed.

## 9. Definition of done (per feature)

Works end to end in the browser; tests pass; lint passes; i18n keys added (te + en); mobile layout checked; errors and empty/loading states handled; docs and learn notes updated; committed.

## 10. Commands (keep this section updated)

- Install: `npm install` in `frontend/` and `backend/`; in `ai-service/`: `python -m venv .venv`, activate it, then `pip install -r requirements-dev.txt`
- Database: `docker compose up -d` (MongoDB 7, single-node replica set `rs0` on :27017)
- Env: backend reads `.env` (copy `backend/.env.example`); variables are validated by `backend/src/config/env.js` and the server refuses to start if any are invalid. `JWT_ACCESS_SECRET` and `OTP_HMAC_SECRET` are required (32+ chars, different). In production set `CORS_ORIGINS`, `SMS_PROVIDER=msg91`, no `DEV_FIXED_OTP`, and `TRUST_PROXY` (expected 2 behind Vercel rewrite + Render; confirm at deploy).
- Dev login: with `SMS_PROVIDER=console` and `DEV_FIXED_OTP=123456` (as in `.env.example`) every OTP is `123456` and the SMS text is printed in the backend terminal. Agents/admins also need a PIN (`/auth/pin/setup` on first login).
- Dev:
  - backend: `npm run dev` (port 4000, reloads on change, loads `.env` if present; needs MongoDB running). Health: `GET /api/v1/health`
  - frontend: `npm run dev` (port 5173, proxies `/api` to :4000). Component gallery: `/dev/ui` (dev only). Optional `VITE_SUPPORT_PHONE` in `frontend/.env.local` shows a support helpline on the OTP screen
  - frontend production check: `npm run build && npm run preview` (port 4173, also proxies `/api`); add `VITE_ENABLE_DEV_UI=true` to the build to include `/dev/ui`
  - PWA icons: `npm run generate-pwa-assets` (from `public/favicon.svg`)
- Photo storage: `STORAGE_PROVIDER=local` in development (files in `backend/uploads/`, served at `/uploads`, proxied by Vite); production needs `STORAGE_PROVIDER=cloudinary` plus `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`.
  - ai-service: `uvicorn app.main:app --reload --port 8000`
- Lint:
  - backend / frontend: `npm run lint` (ESLint + Prettier check); `npm run format` to fix formatting
  - ai-service: `ruff check .` and `ruff format --check .`
- Test:
  - backend: `npm test` (Jest + supertest, native ESM; starts an in-memory MongoDB 7.0.14 replica set, so the first run downloads ~100 MB)
  - frontend: `npm test` (Vitest + Testing Library + axe-core; i18n parity tests fail if a te/hi key or placeholder is missing); `npm run build` for a production build
  - ai-service: `pytest`
- Seed (in `backend/`, needs MongoDB running; every task syncs indexes first):
  - `npm run db:indexes`: sync all model indexes
  - `npm run seed:crops`: upsert the 59-crop catalog (idempotent)
  - `npm run seed:admin`: create the first admin from `SEED_ADMIN_PHONE` (add `-- --force` to promote an existing user); the admin sets a PIN on first login
  - `npm run seed:demo`: replace all `isDemo` data with the demo marketplace (refused in production unless `ALLOW_DEMO_SEED=true`). Demo logins: farmers `9999900011`–`14`, buyers `9999900021`–`23`, agent `9999900001`; OTP `123456` in dev

The full prompt sequence lives in `docs/prompt-pack.md`.
