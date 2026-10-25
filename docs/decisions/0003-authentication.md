# ADR 0003: Authentication and sessions

- Status: accepted
- Date: 2026-10-25

## 1. Phone OTP for everyone, plus a PIN for agents and admins

Farmers and buyers have phones but often no email, and passwords are a burden for low-literacy users. An SMS code is the login. Agents and admins can see and change other people's data, so a stolen or shared SIM alone must not be enough: they also enter a 4–6 digit PIN.
- The OTP step for those roles returns a 5-minute `pinToken`.
- The pinToken has its own JWT audience, so it can never be used as an access token.

## 2. OTPs are hashed with HMAC-SHA256 and a server secret, not bcrypt

A 6-digit code has only 1,000,000 values. With a leaked database, any hash of it, even bcrypt, can be brute-forced quickly offline. What protects the code is a secret the database does not contain.
- `HMAC(OTP_HMAC_SECRET, phone:purpose:code)` cannot be reversed without the secret.
- It is fast, and it binds the code to one phone and one purpose.
- Online guessing is limited separately (point 3).

## 3. Brute-force limits, and counting before comparing

Limits:
- 5 guesses per code, single use.
- 30 s resend cooldown and 5 codes per phone per hour, counted in MongoDB so they survive restarts.
- Per IP (15 min): 10 code requests and 30 verifies.

The worst case is about 25 guesses per phone per hour, so an attacker's success chance is around 0.0025 % per hour.

**The attempt counter is incremented atomically before the comparison** (`findOneAndUpdate` with `attempts < 5`). If it were checked first and incremented after, 100 parallel requests could all pass the check before any increment landed. The PIN uses the same pattern, so at most 5 bcrypt comparisons run per lock window.

## 4. Short access JWT plus a rotating refresh token in an httpOnly cookie

**Access token (JWT, 15 minutes):**
- Returned in the response body and kept in JavaScript memory only, never in localStorage.
- An XSS bug could use it while the page is open, but could not steal a long-lived credential.

**Refresh token:**
- 256 random bits, sent only as an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `Path=/api/v1/auth`. JavaScript cannot read it, and it is only sent to auth routes.
- Stored as SHA-256. A slow hash isn't needed because the token can't be guessed, only stolen.

**Rotation with reuse detection:**
- Each refresh issues a new token and marks the old one `replacedAt`. All tokens from one login share a `familyId`.
- If a replaced token is presented again, two parties hold copies and we cannot tell which is legitimate, so **the whole family is revoked**.
- There is a race: the reuse check could run after a concurrent rotation has claimed the old token but before it inserted the new one. To close it, the rotation re-checks the family *after* inserting. A test forces this interleaving and fails without the re-check.

## 5. Same-origin via Vercel rewrite, so cookies can be `SameSite=Strict`

The frontend (Vercel) and backend (Render) are different sites, and browsers do not send `SameSite=Strict` or `Lax` cookies on cross-site fetches.

**Alternatives considered:**
- (a) `SameSite=None` plus CSRF tokens.
- (b) Proxy the API through the frontend's own domain.

**Chosen: (b).** A Vercel rewrite maps `/api/*` to Render, just as the Vite proxy does in development. CSRF is then blocked by the browser itself.

**Costs:**
- One extra network hop.
- `TRUST_PROXY` must count both proxies (expected 2; confirm at deploy).

`COOKIE_SAMESITE` stays configurable in case the rewrite is ever dropped.

## 6. `requireAuth` loads the user on every request

**Cost:** one indexed `findById` per authenticated request.

**Benefits:**
- Suspending a user blocks them immediately, not up to 15 minutes later.
- `requireRole` uses the role in the database, so a changed role applies at once.
- **logout-all** can invalidate access tokens already handed out. It sets `user.tokensValidAfter`, and tokens whose `issuedAtMs` claim is earlier are rejected. A millisecond claim is used because the standard `iat` has 1-second precision, which can't separate "issued just before logout-all" from "a fresh login just after it".

## 7. New users have `role: null` until they choose

`POST /auth/role` accepts only `farmer` or `buyer`, once. It's a conditional update on `role: null`, so two simultaneous calls cannot both succeed. `agent` and `admin` are never self-assigned; only an admin or the seed script (Prompt 3) grants them. Routes guarded by `requireRole` answer `403 ROLE_REQUIRED` until a role is chosen.

## 8. Known limitations

- **Parallel refreshes from one browser end the session.** They look exactly like token reuse. The frontend must send one refresh at a time and share the result (Prompt 4's API client). A short grace window was rejected because it would also give an attacker that window.
- **No real SMS yet.** Indian SMS needs DLT registration (sender ID and pre-approved templates) before any gateway will deliver. `Msg91SmsProvider` throws until that exists. Production config refuses the console provider, so a misconfigured deploy fails at startup instead of silently printing OTPs.
- **Two simultaneous OTP requests for one phone can both get past the cooldown** (check-then-insert). Both SMS are sent and only the later code works. This is harmless but noted.
- **The session rotation is not a multi-document transaction.** If inserting the new token fails after the old one is marked replaced, the user simply has to log in again.
- **Login events go to logs only.** AuditLog arrives in Prompt 3.
