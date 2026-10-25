# ADR 0002: Backend foundation choices

- Status: accepted
- Date: 2026-10-25

## 1. Own NoSQL-injection sanitizer instead of express-mongo-sanitize

**Context.** `express-mongo-sanitize` reassigns `req.query`, which is a read-only getter in Express 5, so it throws on every request.

**Decision.** A ~25-line middleware ([sanitize.js](../../backend/src/middleware/sanitize.js)) recursively drops keys that start with `$` or contain `.` from the body and query.
- It redefines `req.query` with `Object.defineProperty`, because Express 5 doesn't allow plain assignment.
- Route params are not sanitized. Express builds them from URL path segments, so they are always plain strings and can't carry operator objects.

## 2. Mongoose `sanitizeFilter` is NOT enabled (change from the original plan)

**Context.** `sanitizeFilter: true` wraps every `$`-operator object in a query filter in `$eq`. That includes our own trusted filters, such as the atomic stock update `{ availableQuantity: { $gte: qty } }` that Prompt 10 relies on. Every legitimate query would then need `mongoose.trusted()`, and forgetting it would silently break that query: it would match nothing.

**Decision.** Defence comes from two layers at the edge instead:
1. The sanitizer strips operator keys from client input.
2. zod schemas on every route require fields like `phone` to be strings, so an object can't reach a filter even if the sanitizer is bypassed.

`strictQuery` is enabled so filters on unknown fields are dropped.

## 3. In-memory rate-limit store

**Context.** express-rate-limit keeps counters in process memory by default.

**Decision.** Accept it for now. Counters reset on restart and aren't shared between instances. That's fine for one Render instance during the pilot. If the backend is scaled horizontally, switch to a Redis store (`rate-limit-redis`). Auth-specific limits per phone number (Prompt 2) need to survive restarts, so they will be stored in MongoDB.

## 4. `TRUST_PROXY` is a number, default 0

**Context.** Behind Render's proxy, `req.ip` is the proxy's address unless Express trusts `X-Forwarded-For`. All users would then share one rate-limit bucket.

**Decision.** `TRUST_PROXY` is the number of proxy hops to trust: 0 locally, 1 on Render. A number is used rather than `true`, because `true` would let any client spoof its IP by sending its own `X-Forwarded-For` header.

## 5. Test database: one in-memory replica set per run, one database per test file

**Decision.**
- Jest `globalSetup` starts a single-node `MongoMemoryReplSet`, pinned to MongoDB 7.0.14 to match `mongo:7` in docker-compose.
- Each test file uses its own database name, so parallel Jest workers never share data.
- A replica set is needed because transactions only work on replica sets.
- In CI the binary is cached via `MONGOMS_DOWNLOAD_DIR`.

## 6. Error responses never include stacks

**Decision.**
- Stacks are logged (pino-http logs `res.err`) but never sent to the client, in any environment.
- Outside production, the message of an unexpected error is shown to help debugging. In production it becomes a generic message.
- Every error body includes `requestId` so a report can be matched to logs.

## 7. Logs never include query strings or bodies

**Decision.**
- The request serializer logs only id, method and path.
- pino `redact` also masks `authorization`, `cookie`, `set-cookie`, and any `otp`, `pin`, `token`, `accessToken`, `refreshToken` or `phone` field at the top level or one level deep.

This enforces the CLAUDE.md rule against logging OTPs, tokens and phone numbers.
