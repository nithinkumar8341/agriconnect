# Phase 01: Backend foundation

## What exists now

The skeleton every future feature plugs into. There are no business features yet. Instead, every request is identified, logged safely, protected and validated, and every error comes back in the same shape.

## Data flow: one request, start to finish

Take `POST /api/v1/something` with body `{"phone": {"$ne": null}}`:

1. **requestId** gives the request an id (or reuses a safe one from a proxy) and sets the `X-Request-Id` header.
2. **pino-http** prepares a log line with id, method and path. No query string, no body.
3. **helmet** adds security headers.
4. **cors** checks the `Origin` against `CORS_ORIGINS`. A wrong origin gets no CORS headers, so the browser blocks the response.
5. **rate limiter** counts the request against the IP. Over 300 in 15 minutes returns 429.
6. **express.json** parses the body. Malformed JSON returns 400 `INVALID_JSON`, and a body over 100 kb returns 413.
7. **sanitizer** turns the body into `{"phone": {}}`. The `$ne` operator is gone.
8. **router** matches the route. Each route runs `validate()` with a zod schema, and here `phone` must be a string, so it returns 400 `VALIDATION_ERROR`. If nothing matches, the 404 handler runs.
9. **error handler** turns whatever was thrown into `{ error: { code, message, requestId } }`.
10. **pino-http** writes the log line with the status code and timing. 5xx errors include the stack in the log, never in the response.

Startup ([server.js](../../backend/src/server.js)) is: validate config → connect MongoDB → listen. If config is wrong, the process exits immediately and names the bad variables, but never their values.

## Key design decisions

- **Config is validated once, at startup, with zod.** A typo in `MONGODB_URI` should crash the deploy within its first second, not cause a confusing failure on the first database call an hour later. That's what "fail fast" means.
- **`createApp(config)` receives its config** instead of reading `process.env`. Tests build apps with any config they want, such as a rate limit of 2 or a 1 kb body limit, without touching global state.
- **Two layers against NoSQL injection.** The sanitizer strips `$` keys, and zod enforces types. Mongoose's `sanitizeFilter` was rejected because it would also neuter our own `$gte` stock check (see ADR 0002).
- **Health check returns 503 when the DB is down.** Render stops routing traffic to an instance that reports unhealthy. The ping has a 2-second timeout, because a health check that hangs is as bad as one that fails.
- **Graceful shutdown.** Render sends SIGTERM on every deploy. Stopping new connections and finishing in-flight ones means a buyer's checkout isn't cut off halfway.
- **Tests use an in-memory replica set**, so transaction rollback, which checkout depends on, can be proven in tests.

## Try it yourself

```bash
docker compose up -d
cd backend && cp .env.example .env && npm run dev
curl -i localhost:4000/api/v1/health           # 200, note the X-Request-Id and RateLimit headers
curl -i localhost:4000/api/v1/nope             # 404 in the standard shape
curl -i -X POST -H "Content-Type: application/json" -d "{bad" localhost:4000/api/v1/nope   # 400 INVALID_JSON
MONGODB_URI=oops node src/server.js            # exits 1, names MONGODB_URI
```

## 5 likely interview questions

1. **What is NoSQL injection and how do you prevent it?**
   If a login handler does `User.findOne({ phone: req.body.phone })` and the attacker sends `{"phone": {"$ne": null}}`, the filter becomes "phone not equal to null", which matches the first user. I prevent it in two layers. A middleware strips keys starting with `$` or containing `.` from all input. Then zod validation requires `phone` to be a string, so an object is rejected even if the first layer were bypassed.

2. **Why validate environment variables at startup?**
   Fail fast. A missing or malformed variable should stop the deploy immediately with a clear message, not surface as a vague runtime error later in production. The error lists variable names only, never values, because values may be secrets that would end up in deploy logs.

3. **How does your graceful shutdown work, and why does it matter?**
   On SIGTERM I call `server.close()`, which stops accepting new connections but lets in-flight requests finish. Then I disconnect MongoDB and exit 0. A 10-second timer forces exit if something hangs. Hosts send SIGTERM on every deploy, so without this a request mid-checkout could be cut off.

4. **Why does your test database need to be a replica set?**
   MongoDB only supports multi-document transactions on replica sets. Checkout decrements stock for several items and must roll all of them back if one fails. To test that, the test database has to support transactions, so I run a single-node in-memory replica set. One test proves rollback works.

5. **Why does the error handler hide error messages in production, and how do you still debug?**
   Raw error messages can leak internals such as connection strings, file paths or query shapes. The client gets a generic message plus a `requestId`. The full error and stack are logged with that same id, so a user's screenshot of the request id leads straight to the log line.
