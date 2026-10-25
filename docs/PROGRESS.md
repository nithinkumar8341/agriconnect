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

## In progress

- Nothing.

## Next

- Prompt 2: Authentication and sessions (phone OTP, JWT access token + rotating refresh cookie, PIN for agents/admins, role guards).

## Known issues

- ai-service tests print a `StarletteDeprecationWarning` saying the httpx-backed `TestClient` is deprecated in Starlette 1.x. Tests pass. The suggested replacement package was not installed because it could not be verified during setup; review it before switching.
- The CI results for Prompt 1 have not been seen yet: the 3 commits are local and not pushed. Confirm on the GitHub Actions tab after pushing.
- Graceful shutdown can't be checked by hand on Windows (no SIGTERM). Press Ctrl+C in a terminal running `npm run dev`; that sends SIGINT, which takes the same shutdown path.
