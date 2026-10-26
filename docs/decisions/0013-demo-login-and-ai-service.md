# 0013: Demo login without SMS, and a stateless AI service

Date: 2026-10-26. Status: accepted.

## Demo login

**Problem.** Production refuses the console SMS provider and the dev fixed OTP (they would log or reveal codes). A real SMS gateway in India (MSG91) needs a paid account and a DLT-registered template, so a public portfolio demo could not sign anyone in.

**Decision.** Two settings:

- `SMS_PROVIDER=none` sends nothing; OTP requests for real numbers fail with `SMS_FAILED`.
- `DEMO_OTP` (6 digits) is accepted only for users seeded with `isDemo: true`. For them no SMS is sent. Real accounts always get a random, hashed code, and the demo code never works for them (tested).

Nothing is logged, and all other OTP rules (hashing, expiry, attempts, cooldown, hourly cap) still apply.

## AI service is stateless

The FastAPI service has no database access and no users. The backend (which owns auth and MongoDB) collects what each feature needs (sale prices, listings, reviews), calls the service with a shared `X-Internal-Key`, and returns the answer. This keeps one place for authorization and keeps the Python side small and testable with plain JSON. If the AI service is down, the backend answers `503 AI_UNAVAILABLE` and the UI hides the feature.

LLM calls (chatbot, review insights) use Claude via the official `anthropic` SDK with server-side refusal fallbacks enabled. Without `ANTHROPIC_API_KEY`, the same endpoints answer from rules (best FAQ match, star statistics), so the demo works for free.
