# Phase 00: Repo bootstrap

## What exists now

Three services that each answer "hello", plus the tooling that keeps them healthy.

```
Browser ──> Vite dev server :5173 ──(/api proxy)──> Express :4000  GET /api/v1/hello
                                                     FastAPI :8000  GET /hello   (backend will call this later)
                                                     MongoDB :27017 (Docker, not used yet)
```

1. You open `http://localhost:5173`. Vite serves the React app.
2. `App.jsx` calls `fetch('/api/v1/hello')`. The URL is relative, so it goes to Vite, which forwards anything under `/api` to Express on port 4000.
3. Express returns JSON and React shows it.

The ai-service is not wired to the backend yet. That happens when the backend needs price suggestions (Prompt 18).

## Key design decisions

- **`createApp()` is separate from `server.js`.** Tests import the app and drive it with supertest without opening a real port. This is a standard Express testing pattern.
- **Dev proxy instead of CORS in development.** Same-origin requests mean the httpOnly refresh cookie (Prompt 2) works locally the same way it will in production.
- **MongoDB as a replica set, even locally.** MongoDB transactions only work on replica sets. Checkout (Prompt 10) needs transactions to roll back stock if any item in a multi-item order fails.
- **CI runs three parallel jobs.** A failure in one service doesn't hide results from the others, and each job caches its own dependencies.
- **Lockfiles are committed and CI uses `npm ci`.** CI installs exactly the versions tested locally.

## 5 likely interview questions

1. **Why a monorepo with three services instead of one?**
   The frontend, the Node API and the Python ML service use different runtimes and deploy to different hosts (Vercel, Render). One repo keeps them versioned together so a single commit can change an API and its caller, and it keeps CI and docs in one place.

2. **Why is the ML code in a separate Python service instead of in Node?**
   The ML ecosystem (PyTorch, scikit-learn, pandas) is in Python. Keeping it behind an internal HTTP API means the backend stays simple and the model can be scaled, redeployed or replaced on its own.

3. **Why does the frontend proxy `/api` in development?**
   It makes the browser see one origin, which avoids CORS preflights and makes `SameSite` cookies behave as they will in production.

4. **What does `npm ci` do differently from `npm install`?**
   It installs exactly what `package-lock.json` says, fails if the lockfile and `package.json` disagree, and never updates the lockfile. Builds are then reproducible.

5. **Why run MongoDB as a replica set locally?**
   Multi-document transactions need a replica set. Running one locally means transaction code behaves the same in dev, tests and Atlas.
