# AgriConnect: Claude Code Prompt Pack

## How to use this pack

- Paste one prompt at a time, in order. Use plan mode first, read the plan, then approve.
- After each prompt: run the app yourself, check the "Done when" list, then commit.
- If your usage limit runs out, resume later with: "Read CLAUDE.md and docs/PROGRESS.md, then continue from Prompt N."
- After every prompt, read the file Claude Code writes in `docs/learn/`.
- Do not skip to the AI prompts early. The marketplace must work end to end first (Prompts 0-16 are the core product).

Legend: Core = must have. AI = AI features. Polish = quality and launch. Stretch = only after everything else works.

## Prompt 0: Repo bootstrap (Core)

Read CLAUDE.md. Set up the monorepo for AgriConnect exactly as described in the repo structure.

- Create frontend/ (Vite React + Tailwind), backend/ (Express, ES modules), ai-service/ (FastAPI) with minimal "hello" endpoints.
- Add ESLint + Prettier configs, .gitignore, .editorconfig, .env.example for each service, root README.md stub, docker-compose.yml with a local MongoDB.
- Add GitHub Actions workflow that installs, lints and tests all three services.
- Create docs/PROGRESS.md, docs/architecture.md (with a Mermaid diagram of frontend, backend, MongoDB, ai-service, Cloudinary, SMS, Razorpay), docs/database.md, docs/api.md, docs/translation-review.md, docs/decisions/, docs/learn/.
- Fill the "Commands" section in CLAUDE.md.

Done when: all three services start locally, lint + tests pass in CI, docs skeleton exists.

## Prompt 1: Backend foundation (Core)

Build the Express app foundation in backend/.

- Folder layout: config/, routes/, controllers/, services/, models/, middleware/, utils/, validators/, jobs/.
- Config loader that validates env vars with zod and fails fast.
- Middleware: helmet, CORS allowlist from env, JSON body limit, request-id, structured logging (pino), NoSQL-injection sanitizer, global rate limiter, central error handler, 404 handler.
- Mongoose connection with graceful shutdown. /api/v1/health endpoint.
- Test setup: Jest + supertest + mongodb-memory-server (replica set enabled so transactions can be tested).

Done when: health endpoint test passes, errors return the standard JSON shape, no stack traces leak in production mode.

## Prompt 2: Authentication and sessions (Core)

Implement phone-OTP authentication for all roles.

- Models: User (phone unique, role, language, status, lastLoginAt), OtpRequest (hashed code, expiry TTL index, attempts, purpose), Session (hashed refresh token, device info, expiry, revokedAt).
- SmsProvider interface with a ConsoleSmsProvider (dev) and a stub for a real provider selected by env. Telugu/English OTP message templates.
- Endpoints: POST /auth/otp/request, POST /auth/otp/verify, POST /auth/token/refresh, POST /auth/logout, POST /auth/logout-all, GET /auth/me.
- Rules: OTP 6 digits, hashed, 5-minute expiry, max 5 attempts, 30-second resend cooldown, rate limits per phone and per IP. Dev-only fixed OTP when not in production.
- Tokens: short-lived access JWT (returned in body, kept in memory by the client) and rotating refresh token in an httpOnly, Secure, SameSite cookie. Reuse of an old refresh token revokes the whole session family.
- New users choose role farmer or buyer at first login. Roles agent and admin can only be set by an admin or the seed script.
- Agents and admins additionally verify a 4-6 digit PIN (bcrypt hashed) after OTP.
- Middleware: requireAuth, requireRole(...roles), requireOwnership.
- Tests for: expired OTP, wrong OTP lockout, rate limit, refresh rotation and reuse detection, role guard.

Done when: full login/refresh/logout flow works via tests and manual API calls; OTPs and tokens never appear in logs.

## Prompt 3: Core data models and seed data (Core)

Design all Mongoose models with indexes and document them in docs/database.md (include an ER diagram in Mermaid).

- FarmerProfile (userId, name, village, mandal, district, state, pincode, GeoJSON location, deliveryRadiusKm, servicePincodes, deliveryDays, cutoffTime, minOrderValue, deliveryFee, verification level, agentId?).
- BuyerProfile with saved addresses (each with GeoJSON location, pincode, landmark).
- Crop catalog: slug, names {en, te, hi}, category (vegetable/fruit/leafy/other), default unit, allowed units, quantity presets, shelfLifeDays, icon (emoji or asset path).
- Product (farmerId, cropId, photos[], quantity, availableQuantity, unit, pricePerUnit, harvestDate, status: available/out_of_stock/paused/removed, aiResultId?, createdByAgentId?).
- Order (checkoutGroupId, buyerId, farmerId, items[] with price snapshot, delivery {slotDate, address, fee}, priceBreakdown, paymentMethod, paymentStatus, status, statusHistory[], deliveryOtpHash, deliveryOtpAttempts), Payment, LedgerEntry.
- Review, ReturnRequest, Complaint, Notification, AuditLog, FraudFlag, PriceReference, AppConfig (key/value with defaults: COD cap for new buyers, return window hours, fee percent, velocity thresholds).
- Add a 2dsphere index on locations and compound indexes for common queries.
- Seed scripts: npm run seed:crops (40+ common vegetables and fruits of Andhra Pradesh/Telangana with en/te/hi names, units, shelf life, presets), seed:admin, seed:demo (demo farmers, buyers, products, orders, clearly marked as demo data).

Done when: seeds run idempotently, indexes are created, docs/database.md matches the code.

## Prompt 4: Frontend foundation and design system (Core)

Build the frontend foundation in frontend/.

- Tailwind theme for farmer-first design: base 18px font, large touch targets, high-contrast green/earth palette, clear focus states, light theme first.
- Reusable components: BigButton (icon + label), IconTile, PageHeader with back button and language switcher, QuantityStepper, PresetChips, Toast, Skeleton, EmptyState, ErrorState, BottomNav, ConfirmSheet.
- React Router with layouts for public, farmer, buyer, agent, admin; protected routes using role guards.
- i18next with te, en, hi namespaces; language persisted; a language picker component; all text from translation files.
- API client (fetch/axios) with automatic access-token refresh, request cancellation, and consistent error handling.
- Auth context holding the access token in memory only.
- PWA setup (manifest, icons, service worker via vite-plugin-pwa) with an offline fallback page.
- A docs/learn note on the design system and accessibility choices.

Done when: Storybook-style demo page (/dev/ui) shows all components in te/en; Lighthouse accessibility score is 90+ on that page.

## Prompt 5: Login, onboarding and profile setup UI (Core)

Build the first-run experience. This is the first screen farmers see, so make it polished.

- Screen 1: language picker with big buttons (తెలుగు / English / हिंदी).
- Screen 2: phone number entry with big keypad-friendly input and "Get OTP".
- Screen 3: OTP entry with auto-fill support where the browser allows it, resend timer, clear error messages, and a "Need help? Call my agent" link.
- Screen 4 (new users): "I am a farmer" / "I want to buy" with large icons.
- Farmer onboarding: name, village/mandal/district (dropdown lists with search), pincode, optional location permission with a clear explanation and a manual fallback when denied, delivery settings (radius, delivery days, cutoff, minimum order, fee) with sensible defaults and large steppers.
- Buyer onboarding: name, address with map-less pincode + landmark entry and optional "use my location".
- "Remember this device" so repeat logins are quick.
- Loading, error, and offline states on every step.

Done when: a new farmer and a new buyer can sign up on a phone-sized screen in under 2 minutes; component tests cover the OTP flow.

## Prompt 6: Crop catalog and farmer dashboard (Core)

- Backend: GET /crops (with search by en/te/hi name and category), cached.
- Farmer home screen with large icon tiles: Sell, My Products, My Orders, Market Prices, Ask Assistant (disabled placeholder until Prompt 20), Call My Agent.
- Farmer profile page: edit delivery settings, language, location.
- Dashboard summary: today's orders, pending deliveries, stock running low.

Done when: every farmer task is reachable in two taps from the home screen.

## Prompt 7: Image upload pipeline (Core)

- Backend: signed upload to Cloudinary (local disk fallback in dev), file type and size validation, strip EXIF location, store thumbnails.
- Frontend: in-app camera capture (with gallery fallback), client-side compression and resize before upload, upload progress, retry on failure.
- Record capture time on each photo and flag photos whose perceptual hash matches another farmer's photo (store the hash for the fraud rules in Prompt 14).
- Store drafts in IndexedDB when offline and sync when back online.

Done when: a 5 MB phone photo uploads as a compressed image under about 300 KB, and an offline upload completes after reconnecting.

## Prompt 8: Farmer product listing flow (Core)

Build the no-typing listing flow:

1. Take a photo. 2. Tap the crop icon (searchable by Telugu/English name). 3. Choose quantity with presets and +/- steppers. 4. See the reference price (placeholder until Prompt 18) and enter or accept a price using big steppers. 5. Choose harvest date (Today / Yesterday / Pick date). 6. Review screen that reads the details aloud (voice placeholder) and a big "Publish" button.

- My Products screen: edit price/quantity, pause, mark out of stock, delete (soft delete), duplicate a previous listing quickly.
- Server-side validation of quantity, price bounds (warn when far from reference), and ownership.
- Auto-expire or warn on listings older than the crop's shelf life.

Done when: a farmer publishes a listing in under 60 seconds with no keyboard use except the price, if they choose to type it.

## Prompt 9: Buyer discovery with location (Core)

- Backend: GET /products/nearby using MongoDB $geoNear from the buyer's location; only return products from farmers whose delivery radius or service pincodes cover the buyer. Filters: category, crop, price range, delivery day, in-stock only; sort by distance, price, freshness.
- Fall back to pincode-based search when the buyer denies location permission.
- Show approximate distance only (for example "3 km"). Hide the exact farm location until an order is accepted.
- Frontend: home with category icons, search (te/en/hi), product cards (photo, price, distance, farmer first name and village, next delivery day), product detail page, farmer profile page with reviews placeholder.
- Pagination and infinite scroll, skeleton loaders.

Done when: buyers see only farmers who can actually deliver to them, sorted by distance; tests cover geo queries and radius edge cases.

## Prompt 10: Cart and checkout (Core)

- Cart grouped by farmer. Show per-farmer minimum order check, delivery day selection based on that farmer's schedule and cutoff, delivery fee, and a clear price breakdown.
- Checkout creates one Order per farmer with a shared checkoutGroupId.
- Stock reservation is atomic: for each item run one conditional update that decrements availableQuantity only when enough stock exists; if any item fails, roll back the earlier ones (use a transaction when available, otherwise compensating updates). Set product status to out_of_stock at zero.
- Idempotency key on checkout to prevent double submission.
- Re-validate prices and stock on the server at checkout and tell the buyer exactly what changed.
- Concurrency test: 50 parallel purchase attempts for 30 units must produce exactly 30 units sold and never negative stock.

Done when: the concurrency test passes repeatedly and stock restores correctly on cancel/reject.

## Prompt 11: Order lifecycle and delivery OTP (Core)

- Implement the status flow in CLAUDE.md with a state machine (invalid transitions are rejected and tested).
- Farmer: accept or reject (with reason), mark out for delivery, enter the buyer's delivery OTP to mark delivered, mark failed delivery with a reason.
- Buyer: track order, see delivery OTP, cancel before acceptance.
- Restore stock automatically on cancelled/rejected/failed.
- Status history, audit log, and in-app notifications for every change; SMS notification through the SmsProvider for key events (accepted, out for delivery, delivered) in the user's language.
- Order list and detail screens for both roles with large status indicators and a timeline.

Done when: the full happy path and every failure path have tests, and both roles see live-updating status (polling is fine).

## Prompt 12: Payments, COD and ledger (Core)

- Payment methods: cod and upi (Razorpay test mode: create order, verify signature, handle webhook idempotently).
- COD: marked paid when the delivery OTP is confirmed. UPI: marked paid after verified payment; funds shown as "held" until delivery is confirmed, then a simulated payout LedgerEntry is created for the farmer (clearly labelled as simulated in the UI and docs).
- Platform fee from AppConfig (default 0), delivery fee, and farmer earnings computed server-side; the price breakdown screen shows "You pay / farmer receives / delivery / platform fee" on every order.
- Refund records for return outcomes.
- Farmer earnings page: totals, per-order breakdown, and a simple comparison note showing how much more they earn versus a typical mandi commission (use a configurable percentage and label it as an estimate).

Done when: every order shows a correct, auditable breakdown; webhook replays do not double-credit.

## Prompt 13: Fake order and fake listing detection (Core, rule-based)

Build a rules engine, not a black-box model.

- Rules (thresholds in AppConfig): COD cap for new buyers; limit on active COD orders; restrict COD after refused/failed deliveries; order velocity per phone/device/IP; many accounts on one address or device; order outside farmer's radius; unusual quantity for the crop; very new account with a large order.
- Listing rules: perceptual-hash match with other farmers' photos, price far outside the reference range, repeated rejected listings.
- Produce FraudFlag records with rule id, severity, evidence; actions: allow, require extra confirmation (call/OTP), restrict COD, block, send to admin review.
- Admin review queue UI hook (built fully in Prompt 16) and audit logging.
- Design the feature store so a simple ML model (logistic regression or isolation forest) can be trained later on real orders; document that no ML claims are made yet.

Done when: each rule has unit tests with positive and negative cases, and flagged orders show a clear reason to the admin.

## Prompt 14: Returns, complaints and disputes (Core)

- Return window and allowed reasons from AppConfig (default 4 hours after delivery; reasons: damaged, rotten, wrong item, underweight).
- Buyer flow: pick the order and item, choose a reason, upload up to 3 photos, submit. Farmer flow: view the claim with evidence, accept or counter with photos. Admin flow: resolve with partial refund, replacement, credit, or reject.
- Attach evidence automatically: listing photos, delivery OTP time, AI visual check result if any.
- Limits and flags for repeated false claims; effect on farmer trust metrics only after resolution.
- General complaints form for non-order issues.

Done when: a claim can go through all outcomes with correct ledger and stock effects; tests cover the window cut-off.

## Prompt 15: Field agent module (Core)

- Agent dashboard: assisted farmers list, "Register a farmer", "Create a listing for a farmer", "Help with an order", activity history.
- Register a farmer: agent enters the farmer's phone; the farmer receives an OTP and must share it as consent; agent completes the profile with the farmer present.
- Agent-created listings are pending_farmer_approval for price and quantity until the farmer confirms by OTP or in the app (configurable for the pilot).
- Agents cannot edit payout details or change phone numbers. Every agent action writes to AuditLog with before/after values.
- Admin can see agent performance and suspend agents.
- Farmer-side "My agent" card with a one-tap call button on every screen.

Done when: the consent flow is enforced by tests and the audit log shows every agent action.

## Prompt 16: Reviews, trust badges and admin panel (Core)

- Verified-purchase reviews with ratings for quality, freshness, packaging and delivery, plus a short comment, only for delivered orders.
- Trust score with a documented formula (document it in docs/trust-score.md): Bayesian-smoothed rating, completion rate, on-time delivery, complaint rate. Show "New seller" instead of a score under 5 reviews. Farmers can respond to reviews and appeal unfair ones.
- Verification levels and badges: phone verified, agent verified (visited), trusted seller (milestones).
- Admin panel: dashboards and tables for users, farmers, agents, products, orders, fraud flags, returns, complaints, and an AppConfig editor. Filters, search, pagination, and action buttons with confirmation. Every admin action is audit-logged.
- Analytics: orders per day, GMV, active farmers/buyers, top crops, average delivery time, return rate.

Done when: an admin can resolve a flagged order and a return from the UI; the trust score matches the documented formula in tests.

## Prompt 17: Notifications and low-network resilience (Core)

- Unified notification service: in-app (with unread count), SMS (provider interface) and optional web push; templates in te/en/hi.
- Notify farmers about new orders and price alerts; notify buyers about status changes.
- Offline-first behaviour: cached crop catalog, offline listing drafts with a visible "waiting to upload" badge, automatic retry with backoff, and clear offline banners.
- Reduce data usage: image lazy-loading, responsive image sizes, gzip/brotli, API response trimming.

Done when: the app is usable on throttled "slow 3G" in browser dev tools and drafts sync after going offline and back online.

## Prompt 18: Market prices and price suggestion (AI)

- Create a PriceReference ingestion job that pulls daily mandi prices from the government open data source (Agmarknet via data.gov.in). Read the current official documentation for the resource and API key requirements before implementing; keep the API key in env. If the live source is unavailable, fall back to a clearly labelled sample dataset.
- Store crop, market, district, state, min/modal/max price, date, source.
- FastAPI endpoint POST /price/suggest that returns reference price, suggested price, trend and confidence given crop + district. Start with a transparent baseline (median of recent modal prices with district-to-state fallback and a simple trend adjustment). Then, if enough data exists, train a scikit-learn regression model and only use it if it beats the baseline on a held-out time split; report MAE for both in docs/ai/price.md.
- UI: the listing flow and Market Prices screen show reference price, suggested price, source, date, market location, and a warning when data is older than a configurable number of days. Never show a made-up price; show "no reference available" instead.

Done when: every price shown has a visible source and date; tests cover fallbacks and stale-data warnings.

## Prompt 19: AI crop visual quality check (AI)

- In ai-service/, build POST /quality/check: input image, output category (for example fresh / average / poor), confidence, simple visible-issue labels, and a model version. Use CPU-friendly transfer learning (MobileNetV3 or EfficientNet-B0) fine-tuned on a publicly available, properly licensed fresh-vs-rotten produce dataset. Record dataset name, license and link in docs/ai/quality.md.
- Training pipeline in ai-service/training/ with augmentation, train/validation/test split, and a reproducible config. Report accuracy, precision, recall, F1 and a confusion matrix on the held-out test set.
- Collect and evaluate on at least 50 real phone photos taken in realistic farm/market lighting, and report these separately. If real-photo performance is much worse, say so in the docs and keep the feature labelled "beta: visual check only".
- Reject low-quality inputs (blurry, dark, not produce) with helpful guidance; below a confidence threshold return "unable to assess".
- Backend integration: store AIResult linked to the product; show the result and a disclaimer to the farmer; allow the farmer to dispute; never block a listing solely because of the AI result.
- Export the model to ONNX or TorchScript to keep inference fast and the Docker image small.

Done when: the endpoint works end to end from the listing flow, and docs contain real measured metrics (not invented ones).

## Prompt 20: AI assistant (chatbot) with tools and RAG (AI)

- Backend POST /chat with streaming, per-user rate limits and token/cost limits. Provider abstraction (Anthropic/Gemini/OpenAI selected by env) so the model can be swapped.
- System prompt is role-aware (farmer vs buyer vs admin) and language-aware (te/hi/en). Never trust a user id from the model; tools run with the authenticated user's permissions only.
- Tools: search_products, get_my_orders, get_order_status, get_price_reference, explain_quality_result, how_to (app help). Action tools (such as creating a listing draft) return a draft that the user must confirm in the UI.
- RAG: build a small curated knowledge base in backend/knowledge/ (app how-to guides, return policy, delivery rules, and general crop-handling tips from reliable public sources with citations). Use embeddings and a vector store (start with a simple local store such as FAISS or a MongoDB Atlas vector index). Answers cite the source document.
- Safety: no definitive pesticide or fertiliser doses; recommend consulting local agriculture officers for specifics; say "I'm not sure" when retrieval returns nothing relevant; refuse to reveal other users' data.
- Frontend: floating assistant button, chat window with big text, suggested quick questions per role, voice input button (wired in Prompt 21), and a "talk to my agent" escape hatch.
- Save chat history per user with a delete option.
- Evaluate with a small test set of 30+ questions (te/en) and record results in docs/ai/chatbot.md.

Done when: a farmer can ask "how do I add my tomatoes?" and a buyer can ask "show vegetables near me", and tool calls respect permissions in tests.

## Prompt 21: Voice assistance (AI)

- Speech-to-text with the browser Web Speech API (te-IN, hi-IN, en-IN) with feature detection and a graceful fallback to buttons and typing.
- Rule-based intent parser for a small command set in te/hi/en (open My Orders, Sell a product, Market Prices, Call Agent, set quantity/price by voice during listing). Show what was heard and ask for confirmation before acting.
- Spoken guidance: prefer pre-recorded audio files for key screens (frontend/public/audio/{lang}/ with a manifest and a script file listing the lines to record); fall back to the browser's text-to-speech when a recording is missing. Add a "Read this aloud" button on important screens.
- Voice input in the chatbot.
- Document browser/language support limits in docs/ai/voice.md and never make voice the only way to do anything.

Done when: voice commands work in supported browsers, fail gracefully elsewhere, and all flows still work without voice.

## Prompt 22: AI review analysis and farmer insights (AI)

- Analyse review text (te/en/hi) for sentiment and topics (freshness, packaging, delivery, price, quality). Use an LLM call or a multilingual model, with batch processing and caching.
- Farmer insights screen: plain-language summary ("Customers like freshness; delivery was often late"), trends, and suggestions. Always show the underlying reviews.
- Rules: AI summaries never change trust scores or visibility on their own; they are advisory. Farmers can flag a wrong summary.
- Evaluate on a small labelled set and report results in docs/ai/reviews.md.

Done when: insights render for farmers with at least 5 reviews and are hidden otherwise.

## Prompt 23: Quality hardening (Polish)

- Security pass against the OWASP Top 10: auth, access control, injection, SSRF in image/URL handling, file upload abuse, rate limits, CORS, security headers, dependency audit. Fix issues and document in docs/security.md.
- Accessibility pass: keyboard navigation, screen reader labels, colour contrast, text scaling to 200%.
- Performance: Lighthouse 90+ on mobile for the home and listing pages, code splitting, image optimisation, database query review and indexes (explain() for the main queries).
- Add Playwright e2e tests for: farmer signup and listing, buyer signup and checkout, delivery OTP completion, return flow, agent flow.
- Add a load test (k6 or autocannon) for browsing and checkout; record the numbers in docs/performance.md.

Done when: CI runs unit, API and e2e tests and all pass; docs contain real measured numbers.

## Prompt 24: Deployment and documentation (Polish)

- Dockerfiles for backend and ai-service; production configs; health checks; environment documentation.
- Deploy: frontend to Vercel, backend and ai-service to Render, database on MongoDB Atlas, images on Cloudinary. Handle free-tier cold starts (warm-up ping, friendly loading state).
- CI/CD with GitHub Actions: test on pull requests, deploy on main.
- README.md: problem statement, screenshots/GIFs, feature list, architecture diagram, tech stack, how to run locally, demo accounts and test OTP instructions for the demo environment, known limitations, roadmap.
- docs/ finalisation: ADRs, API reference, database schema, AI evaluation reports, security notes, and a demo script (a 5-minute walkthrough).
- Create docs/interview-prep.md: architecture explanation, 30 likely questions with answers about this project (inventory concurrency, JWT refresh rotation, geo queries, fraud rules, RAG, trade-offs), and resume bullets written with placeholders for real measured numbers.

Done when: a live URL works end to end on a phone, and a new developer can run the project from the README alone.

## Stretch prompts (only after everything above works)

- S1: Weekly basket subscription: households subscribe to a weekly vegetable basket; farmers see predictable demand; delivery cost per order drops.
- S2: Buyer demand board: buyers post needs; farmers accept; helps farmers plan what to grow and sell.
- S3: Group selling: several small farmers pool produce to fill a bulk order; earnings split by contributed quantity.
- S4: Neighbourhood group orders: one delivery point per apartment block or street to share delivery trips.
- S5: QR traceability: QR on packaging linking to the farmer's page and harvest date.
- S6: IVR / missed-call listing for farmers without smartphones (needs a telephony provider).
- S7: ML fraud model trained on real order history, evaluated against the rule engine.
- S8: Farmer sales ledger export (PDF/CSV) to support farmers who need income records.

## Pilot checklist (run in parallel from week 1, no code needed)

- Interview at least 10 farmers and 10 households. Write what they said in docs/user-research.md.
- Run a manual 2-week pilot with a WhatsApp group and a spreadsheet to test demand, prices and delivery routes.
- Record what you learn and change the product (for example delivery days, minimum order) based on it.
