# Phase 04: Frontend foundation and design system

## What exists now

The skeleton every screen will be built on:
- a farmer-first design system with 11 reusable components;
- Telugu, English and Hindi translations;
- an API client that keeps the login alive safely;
- an auth context;
- routing with a protected area per role;
- an installable PWA that opens offline.

There are no real feature screens yet. Login arrives in Prompt 5 and the farmer dashboard in Prompt 6. Role homes and menu items show "Coming soon" placeholders, so navigation already works end to end.

Open **`/dev/ui`** (in `npm run dev`) to see every component, and switch languages there.

## Data flow when the app opens

1. `main.jsx` loads i18n first. The language is the one saved in localStorage (`agc.language`), or Telugu by default, and `<html lang>` is set.
2. `AuthProvider` starts in `loading` and calls `POST /auth/token/refresh`.
   - The browser attaches the httpOnly refresh cookie automatically. JavaScript never sees it.
   - Success: the access token goes into a **variable inside the API client** (memory, not storage), the user object goes into React state, and the status becomes `authenticated`.
   - 401: the status becomes `anonymous`.
3. The router renders. `RequireRole` decides what to show:
   - still loading: a spinner;
   - anonymous: `/login`;
   - no role yet: `/onboarding/role`;
   - wrong role: the user's own home.
4. When a request fails with `TOKEN_EXPIRED`, the client refreshes **once** (shared by every request that failed at that moment) and retries.

## Design system choices (and why)

| Choice | Why |
| --- | --- |
| `html { font-size: 18px }` | 1rem is 18px, so every Tailwind size is already farmer-sized. CLAUDE.md asks for 18px+. |
| `line-height: 1.6` | Telugu and Devanagari vowel signs sit above and below the line and get clipped at tighter heights. |
| Buttons `min-h-14` (56px), tiles 144px tall, chips and nav 48–64px | Touch targets at least 48px, as CLAUDE.md requires. Big targets help people with work-worn hands and cheap touchscreens. |
| Leaf green `#1f6a2a` on white is 6.7:1; muted text `#4a4540` on cream is about 8.7:1; danger `#b42318` on white is 6.6:1 | WCAG AA needs 4.5:1, and outdoor sunlight washes colours out, so we aim higher. |
| Focus ring: dark 3px outline plus a 6px yellow halo | The dark ring shows on cream and white, the yellow halo shows on green buttons. Keyboard and switch users always see where they are. |
| Icon **and** label on every action | Icons help slow readers; labels remove guessing. The only icon-only controls are −/+ and ✕, and they have spoken labels. |
| Language buttons in their own script (తెలుగు / English / हिंदी) | A Telugu reader finds their language even when the screen is in English. |
| Language switcher in every header | Changing language must never need a trip to settings. |
| System fonts, no web fonts | Android ships Noto Telugu and Devanagari, so there is nothing to download on a weak network. |
| `prefers-reduced-motion` respected | Skeleton pulses and transitions stop for people who turned motion off. |
| ConfirmSheet focuses **Cancel** first | Pressing Enter straight away can never delete something. This is what WAI-ARIA recommends for destructive confirmations. |
| Toasts: success = `status` (polite), error = `alert` | Screen readers wait to announce good news and interrupt for problems. |

## Accessibility results (measured)

- **axe-core** runs on `/dev/ui` in English and Telugu inside the unit tests: 0 violations. Colour contrast is excluded there because jsdom can't compute colours.
- **Lighthouse 12, mobile emulation (412 px), production build:**

  | Page | Accessibility | Performance | Best practices |
  | --- | --- | --- | --- |
  | `/dev/ui` | 100 | 98 | 96 |
  | `/` | 100 | 98 | 96 |

  The best-practices deduction is a console error from the login check, which fails when nobody is signed in (see known issues in PROGRESS.md).
- **Two accessibility bugs found by tests and fixed:**
  - A tile badge read as "Orders3new". Its spoken name is now built explicitly: "Orders, 3 new".
  - A loading hook could show stale data after cancelling.

## Security choices in the client

- **The access token is never written to localStorage or sessionStorage**, so an injected script can't read a long-lived credential from storage. A reload costs one refresh request.
- **Single-flight refresh.** Two simultaneous refreshes would send the same cookie twice, which the backend treats as theft and answers by ending the session. React StrictMode runs effects twice in development, and a test proves only one refresh is sent.
- **Route guards are UX only.** The server checks role and ownership on every request.

## Try it yourself

```bash
cd frontend
npm run dev                         # http://localhost:5173/dev/ui
npm test                            # 58 tests incl. axe and i18n parity
npm run build && npm run preview    # http://localhost:4173 (gallery hidden in production builds)
VITE_ENABLE_DEV_UI=true npm run build && npm run preview   # gallery included for Lighthouse
```

With the backend running and a demo farmer logged in (Prompt 5 builds the login screen; for now use curl from phase 02), the farmer area shows the bottom menu.

## 5 likely interview questions

1. **Where do you keep the JWT in the browser, and why?**
   In a JavaScript variable inside the API client module: memory only. localStorage is readable by any script on the page, so an XSS bug would leak a token that keeps working. The long-lived credential is the refresh token, in an httpOnly cookie JavaScript can't read at all. On reload, the app calls `/auth/token/refresh` to get a new access token.

2. **What is a single-flight refresh, and what bug does it prevent?**
   If several requests fail with "token expired" at once, they all wait on one shared refresh promise instead of each sending its own refresh. My backend rotates refresh tokens and treats a reused token as theft. Two parallel refreshes would present the same cookie twice and log the user out. React StrictMode's double effects in development trigger exactly this, and a test covers it.

3. **How did you make the UI usable for low-literacy farmers?**
   - 18px base text and touch targets of at least 48px.
   - An icon plus a label on every action.
   - Language buttons in each language's own script, with a language switcher on every screen.
   - Steppers and preset chips instead of typing.
   - One primary action per screen, and high-contrast colours chosen for sunlight.

   Translations are all in i18n files, and a test fails if Telugu or Hindi is missing a key or a `{{placeholder}}`.

4. **How do you test accessibility?**
   axe-core runs in the unit tests against the component gallery in English and Telugu. Component tests check the behaviour screen-reader and keyboard users rely on: focus trap and Escape in dialogs, focus returning to the opener, radio-group arrow keys, `aria-current` in the menu. Lighthouse on the production build scored 100 for accessibility. The tests caught a badge that would have been read as "Orders3new".

5. **What makes this a PWA, and what happens offline?**
   It has a web manifest (name, icons, theme colours, standalone display) and a Workbox service worker that precaches the app shell. Offline, the app still opens from cache, every route falls back to `index.html`, and a banner says the person is offline. API calls are never served from the cache, so stale prices or stock can't be shown as current. Offline listing drafts come in Prompts 7 and 17.
