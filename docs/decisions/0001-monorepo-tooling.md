# ADR 0001: Monorepo tooling choices

- Status: accepted
- Date: 2026-10-25

## Context

CLAUDE.md fixes the stack (React/Vite, Express, FastAPI) but leaves the test runner for the frontend, the Python linter, and the Tailwind setup open.

## Decision

- **Three independent packages, no workspace tool.** Each service has its own `package.json` or `requirements*.txt` and lockfile. They deploy to different hosts, so a shared workspace would add tooling without benefit.
- **Frontend tests use Vitest + Testing Library.** It reuses the Vite config, so no separate Babel/Jest transform is needed. The backend keeps Jest as CLAUDE.md specifies.
- **Backend Jest runs with native ES modules** (`--experimental-vm-modules`) rather than transpiling, so the code under test is the code that ships.
- **Tailwind v4 via `@tailwindcss/vite`.** It needs no `tailwind.config.js` or PostCSS config. Theme tokens go in CSS (`@theme`) in Prompt 4.
- **Python lint/format with ruff.** One fast tool replaces flake8 + isort + black.
- **Backend loads `.env` with Node's `--env-file-if-exists`** for now. Prompt 1 adds zod validation on top.
- **One root Prettier config** shared by frontend and backend.

## Consequences

- CI runs three parallel jobs, one per service.
- Node 22.9+ is required for `--env-file-if-exists`.
