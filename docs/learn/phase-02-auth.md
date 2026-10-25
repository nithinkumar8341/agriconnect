# Phase 02: Authentication and sessions

## What exists now

Anyone can log in with their phone number and a 6-digit SMS code. New users then pick "farmer" or "buyer". Agents and admins also enter a PIN. The app stays logged in with two tokens: a short-lived access token and a long-lived, rotating refresh token.

## Data flow in plain English

**Logging in (farmer or buyer):**
1. The phone sends its number to `/otp/request`. The server checks the 30-second cooldown and the 5-per-hour cap, then makes a random 6-digit code.
2. The server stores only an **HMAC** of the code, computed with a secret key. It sends the code by SMS in the user's language.
3. The user types the code into `/otp/verify`.
4. The server adds 1 to the attempt counter *first*, atomically, then compares the HMACs in constant time.
5. On a match, it marks the code used, then creates the user (or finds the existing one).
6. The server creates a **session**: a random refresh token, stored only as a SHA-256 hash.
7. The phone receives:
   - an **access token** (a JWT valid for 15 minutes) in the JSON body, which the app keeps in memory;
   - the **refresh token** in an httpOnly cookie, which JavaScript cannot read.
8. A new user has `role: null`, so the app shows "I am a farmer / I want to buy" and calls `/role`.

**Agent or admin:** after step 4, instead of a session they get a 5-minute `pinToken`. They send it with their PIN to `/pin/verify` (or `/pin/setup` the first time), and only then does step 6 happen.

**Every API call:** the app sends `Authorization: Bearer <access token>`. `requireAuth` checks the signature and then loads the user from MongoDB. A suspended user, or a token issued before "log out everywhere", is rejected immediately.

**Every 15 minutes:** the access token expires (`TOKEN_EXPIRED`). The app calls `/token/refresh`, and the browser attaches the cookie automatically. The server swaps the old refresh token for a new one (**rotation**) and returns a new access token.

**If a refresh token is stolen:** sooner or later both the thief and the real user present it. After the first use it is marked "replaced". The second use proves there are two copies, so the server revokes the **whole family** of tokens from that login, and both have to log in again.

## Key design decisions

| Decision | Why |
| --- | --- |
| HMAC for OTPs, not bcrypt | 1 million possible codes can be brute-forced from any hash if the database leaks. A secret key the database doesn't hold is what protects them. |
| Count the attempt before comparing | Check-then-increment lets 100 parallel guesses all pass the "fewer than 5" check. An atomic `findOneAndUpdate` with `attempts < 5` makes that impossible. |
| Access token in memory, refresh token in an httpOnly cookie | XSS can't read the cookie. A stolen access token is only useful for 15 minutes. |
| Refresh cookie is `SameSite=Strict` and scoped to `/api/v1/auth` | Other sites can't make the browser send it (CSRF), and it isn't sent to the rest of the API. |
| Same-origin through a Vercel rewrite | Strict cookies are not sent cross-site. Proxying `/api` through the frontend's domain keeps everything same-origin, as the Vite proxy does in dev. |
| `requireAuth` reads the user from the DB | Suspension, role changes and logout-all apply immediately instead of when the token expires. |
| `issuedAtMs` claim | `iat` is in whole seconds, too coarse to separate "just before logout-all" from "just after". |
| 404 (not 403) for other people's records | 403 would confirm that the record exists. |

## Bugs found while building this (good interview stories)

1. **A race in reuse detection.** A flaky test showed that a new refresh token could survive a family revocation. Request A claimed the old token. Request B saw it as reused and revoked the family. *Then* A inserted its new token, which escaped. The fix re-checks the family after inserting. The revoke happened either before the insert (the re-check sees it) or after (it covers the new token). A deterministic test now forces that exact interleaving with a Jest spy, and it fails if the re-check is removed.
2. **Second-precision timestamps.** Using the JWT's `iat` for logout-all would either let tokens from the same second survive, or block a fresh login made in the same second. The fix was a millisecond claim.

## Try it yourself

```bash
docker compose up -d
cd backend && npm run dev            # .env has DEV_FIXED_OTP=123456 and SMS_PROVIDER=console
# In another terminal:
curl -X POST localhost:4000/api/v1/auth/otp/request -H "Content-Type: application/json" -d '{"phone":"9876543210"}'
#   -> the server terminal prints: [DEV SMS] to +919876543210: 123456 is your AgriConnect login code...
curl -i -X POST localhost:4000/api/v1/auth/otp/verify -H "Content-Type: application/json" -d '{"phone":"9876543210","otp":"123456"}'
#   -> look at the Set-Cookie header and the accessToken; paste the token into jwt.io to see its claims
```

## 5 likely interview questions

1. **Why two tokens instead of one long-lived JWT?**
   A JWT can't be revoked before it expires without a server-side check, so a long-lived one is dangerous if stolen. The access token lives 15 minutes and stays in memory. The refresh token lives 30 days, but it's an httpOnly cookie JavaScript can't read, it's stored hashed server-side, it rotates on every use, and it can be revoked.

2. **What is refresh token rotation with reuse detection?**
   Every refresh swaps the token for a new one and marks the old one "replaced". All tokens from one login share a family id. If a replaced token is used again, two parties have copies, and we can't tell which is the thief. So the server revokes the whole family and forces a fresh login. Stolen tokens then have a short useful life and theft is detected. A race condition also had to be handled: see "Bugs found".

3. **How do you stop someone brute-forcing a 6-digit OTP?**
   - 5 guesses per code, counted atomically before comparing so parallel requests can't exceed it.
   - Codes expire in 5 minutes and work once.
   - 30-second resend cooldown and 5 codes per phone per hour.
   - Per-IP rate limits.

   That's about 25 guesses an hour against a million codes. The stored code is an HMAC with a server secret, so a leaked database doesn't reveal codes either.

4. **Why `SameSite=Strict` cookies, and what did that require?**
   Strict means the browser never sends the cookie on a request started by another site, which blocks CSRF without CSRF tokens. But the frontend (Vercel) and API (Render) are different sites, so the cookie wouldn't be sent at all. I made the API same-origin by proxying `/api/*` through Vercel with a rewrite, the same way Vite proxies in development.

5. **How does logout-all invalidate access tokens that are stateless JWTs?**
   `requireAuth` already loads the user on each request, for suspension checks. Logout-all revokes every refresh session and stores `tokensValidAfter = now` on the user. Any access token whose `issuedAtMs` claim is earlier gets rejected. I used a millisecond claim because the standard `iat` is in seconds and can't separate "issued just before" from "logged in again just after".
