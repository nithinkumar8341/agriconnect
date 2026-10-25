# Progress

## Done

- **Prompt 0: Repo bootstrap**: monorepo layout; `frontend/` (Vite React + Tailwind v4, Vitest), `backend/` (Express 5, ES modules, Jest + supertest), `ai-service/` (FastAPI, pytest, ruff), each with a hello endpoint and one test; ESLint/Prettier/ruff configs; `.gitignore`, `.editorconfig`, `.env.example` per service; `docker-compose.yml` with a single-node MongoDB replica set; GitHub Actions CI; docs skeleton.

## In progress

- Nothing.

## Next

- Prompt 1: Backend foundation (config validation, middleware, Mongoose connection, health endpoint, test setup with mongodb-memory-server).

## Known issues

- ai-service tests print a `StarletteDeprecationWarning` saying the httpx-backed `TestClient` is deprecated in Starlette 1.x. Tests pass. The suggested replacement package was not installed because it could not be verified during setup; review it before switching.
- CI has not run yet because the repo has no GitHub remote. Push to GitHub to trigger it.
