# ADR 0005: Frontend foundation choices

- Status: accepted
- Date: 2026-10-25

## 1. Access token in memory; session restored by refresh on load

**Decision.** The access token lives in a closure inside `createApiClient()`, never in Web Storage. On start, `AuthProvider` calls `/auth/token/refresh`, which uses the httpOnly cookie.

**Cost.** One extra request per page load, and a short loading state.

**Benefit.** An XSS bug can't read a stored credential.

## 2. Single-flight refresh in the API client

Concurrent refreshes share one promise. Without this, two requests that expire together, or StrictMode's double effects in development, would present the same refresh cookie twice. The backend treats that as token reuse and revokes the session (ADR 0003).

## 3. System fonts instead of web fonts

**Decision.** The stack is `Noto Sans`, `Noto Sans Telugu`, `Noto Sans Devanagari`, then `system-ui`. Android, the target platform, ships these.

**Benefit.** Nothing to download, which matters on 2G/3G and data packs.

**Risk.** Older iPhones or desktop Windows may render Telugu in a different system font. That's acceptable for the pilot.

## 4. The precached app shell is the offline fallback (no separate offline.html)

The prompt pack mentions an offline fallback page. With a precached shell and `navigateFallback: /index.html`, every route opens offline into the real app, which shows an offline banner and per-screen error states with retry. A separate static offline page would be a dead end the person has to leave.

API requests are excluded from the fallback and are never cached, so stale stock or prices can't appear as current.

## 5. React Router data router; guards as layout routes

`createBrowserRouter(routes)` in the app and `createMemoryRouter(routes)` in tests share one route table. `RequireRole` is a layout route that renders `<Outlet/>` or a `<Navigate/>`. Guards are for the user experience only; the API enforces access.

## 6. `/dev/ui` gallery only in development

The route exists when `import.meta.env.DEV` is true, or when `VITE_ENABLE_DEV_UI=true` at build time, which is used for Lighthouse runs. It is lazy-loaded, so it adds nothing to the production bundle.

## 7. `useApiRequest(load, key)` takes a string key instead of a dependency array

The React Compiler lint rules forbid spreading a dependency array into hooks. A single `key` that describes the request (`orders:${status}`) is simpler to reason about anyway.

`loading` is derived (the stored result belongs to another key), not set inside the effect. Results of a cancelled request are dropped even if they arrive late. A test found the bug where they weren't.

## 8. Hindi filled now, reviewed later

CLAUDE.md requires Hindi keys to be present. Filling them with machine translations costs little, and with the English fallback no screen ever shows a raw key. Every te/hi string is listed in `translation-review.md`.
