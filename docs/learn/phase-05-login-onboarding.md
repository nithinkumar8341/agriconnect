# Phase 05: Login and onboarding

## What exists now

A brand-new farmer or buyer can open the app, pick a language, log in with an SMS code, say whether they farm or buy, fill in a short profile, and land on their home screen. Agents and admins log in with an SMS code plus a PIN. Everything works in Telugu, English and Hindi, and has been checked on a real phone-sized browser against the real backend.

## The flow, screen by screen

```
Welcome (pick language) ─► Phone ─► OTP ─┬─► (agent/admin) PIN ─► agent/admin home
                                          ├─► (new user) "I am a farmer / I want to buy"
                                          │        ├─► Farmer: 1 details ─► 2 location ─► 3 delivery ─► /farmer
                                          │        └─► Buyer: name + address ───────────────────────► /buyer
                                          └─► (returning, profile done) home
```

## Data flow in plain English

1. **Phone.** The person types (or pastes) their number. The app keeps only the 10 digits and checks the first digit is 6–9 before sending anything. `POST /auth/otp/request` sends the SMS in the language on screen.
2. **OTP.** The code box uses `autocomplete="one-time-code"`, so the phone keyboard offers the code from the SMS, and the form submits as soon as 6 digits are in.
   - The server checks the code.
   - A wrong code shows "4 tries left".
   - A countdown (from the server's 30-second cooldown) controls when "Send a new code" appears.
3. **Session.** On success the access token goes into memory, and the `AuthProvider` asks `GET /profile` **before** declaring the person logged in. That decides where they go: role choice, onboarding, or home.
4. **Role.** `POST /auth/role` (once only; the server enforces it).
5. **Profile.**
   - Farmers answer three short steps. Location is optional and explained first; refusing it pre-fills their pincode as a delivery area.
   - Buyers answer one screen.
   - `PUT /profile/farmer` or `/profile/buyer` saves it. The server re-validates everything and takes the user id from the token.
6. **Home.** `setProfile()` updates the auth state, and the guard moves them to their home.

## Key design decisions

| Decision | Why |
| --- | --- |
| District from a list (searchable in te/en/hi); mandal and village typed | A correct district list exists. Mandal/village lists must come from the official LGD dataset, not from memory (ADR 0006). |
| Pincode must match the state (TS 50…, AP 51–53…) | A wrong pincode silently breaks delivery matching. It's checked in the form and on the server. |
| Location sent as `{latitude, longitude}` | The server builds `[lng, lat]`, so no client can swap the order. |
| Location asked for only on tap, after explaining | People say yes more often when they know why, and "no" is a normal path with pincodes. |
| Profile loaded before "logged in" | No flash of the wrong screen. A failed profile request counts as "unknown", so nobody is pushed back into onboarding by a network blip. |
| Language change saved to the account | The OTP and order SMS follow the language the person actually uses. |
| Defaults for every delivery setting | Most farmers only type their name, mandal, village and pincode. |

## Bugs found by testing in a real browser (and why that step matters)

Unit tests run in jsdom, which has no real layout. A Puppeteer script drove headless Edge at 390×844 and 360×760 against the real backend and MongoDB. It found three layout bugs:

1. **The pincode editor was wider than the screen** (515px on a 390px phone), so the whole page scrolled sideways. The input and the "Add pincode" button were side by side; they are now stacked.
2. **A long Telugu word** ("కొనాలనుకుంటున్నాను") pushed the role card to 447px on a 360px phone. Fixed with a global `overflow-wrap: anywhere` and `min-w-0` on the flex text column; the label was also shortened to "నేను కొనాలి".
3. **Header titles were cut off** ("How will you use …"). They now wrap to two lines.

The script also checks every screen for sideways overflow automatically.

## Try it yourself

```bash
docker compose up -d
cd backend && npm run dev                 # DEV_FIXED_OTP=123456 in .env
cd frontend && npm run dev                # http://localhost:5173
```

Pick a language, enter any new number such as `9000012345`, use OTP `123456`, choose "I am a farmer", and complete the 3 steps. Then check the database:

```bash
docker exec -it agriconnect-mongo mongosh agriconnect --eval 'db.farmerprofiles.find().sort({_id:-1}).limit(1)'
```

The stored location is `[longitude, latitude]` and the money is in paise.

## 5 likely interview questions

1. **Walk me through your login flow.**
   The phone number goes to `/otp/request`, which rate-limits and sends a hashed, 5-minute, 6-digit code. The person enters it and `/otp/verify` returns a 15-minute access token, kept in memory, plus a rotating refresh cookie that JavaScript can't read. Agents and admins get a short-lived PIN token instead and finish with their PIN. The app then loads the profile and routes to role choice, onboarding or home.

2. **How do you make sure a user can only edit their own profile?**
   The profile endpoints never read a user id from the request. They use the id from the verified access token. The zod schema strips unknown fields, so `userId`, `verificationLevel` or `agentId` in the body are ignored, and a test proves it. `requireRole('farmer')` stops a buyer from creating a farmer profile.

3. **How did you design onboarding for low-literacy farmers?**
   - Three short steps with a progress bar and sensible defaults.
   - Big steppers and chips instead of typing for numbers and days.
   - The district can be searched in Telugu script.
   - Location is explained before the browser asks, and refusing has a clear fallback.
   - Errors say what to fix in the person's language, and nothing is lost if saving fails offline.

4. **Why validate on both client and server?**
   Client checks give instant feedback without a network round trip, which matters on slow connections. The server checks are the real protection, because any client can be bypassed. Both use the same rules (pincode prefixes, required fields), and the server returns field-level errors if something slips through.

5. **What did testing in a real browser catch that unit tests missed?**
   Layout. jsdom doesn't lay out pages, so it couldn't see that the pincode row was wider than a 390px phone, or that a long Telugu word stretched a card to 447px. A Puppeteer script now completes real sign-ups at phone sizes and fails if any screen scrolls sideways. That's why Prompt 23 adds Playwright e2e tests to CI.
