# ADR 0006: Login and onboarding choices

- Status: accepted
- Date: 2026-10-25

## 1. Districts from a list; mandal and village as text

**Context.** The prompt pack asks for dropdowns with search for village, mandal and district. A correct list exists for districts: 26 in Andhra Pradesh, 33 in Telangana. Mandals (about 1,300) and villages (about 28,000) need an authoritative source. Typing them from memory would put wrong names into farmers' profiles.

**Decision.**
- **District** is a searchable list served by `GET /locations/districts`, the single source of truth that the backend also validates against. It can be searched in English, Telugu or Hindi.
- **Mandal and village** are text fields for the pilot.

**Next step.** Import mandals and villages from the official Local Government Directory (lgdirectory.gov.in) and turn these fields into searchable lists too.

## 2. Pincode checked against the state's postal circle

Telangana pincodes start with 50; Andhra Pradesh pincodes start with 51–53. A pincode from the wrong state is almost always a typo, and a wrong pincode silently breaks delivery matching. The check runs in the form (instant feedback) and on the server (authority).

## 3. Locations travel as `{ latitude, longitude }`

The API never accepts a raw coordinate array. Named fields go in, and the server builds GeoJSON `[lng, lat]`. This removes the swapped-coordinates bug at the API boundary. ADR 0004's India bounding box still catches anything odd.

## 4. Location is optional and asked for only on a tap

The browser permission prompt appears only after the person reads why we want the location and taps "Use my location". Refusing is a normal path:
- **Farmers** continue with pincodes. Their own pincode is pre-filled as a delivery pincode, and the server requires at least one when there is no location.
- **Buyers** are matched by pincode (Prompt 9).

## 5. Profile loaded before the session is announced

After login (or on page load), the `AuthProvider` fetches `GET /profile` for farmers and buyers before it sets `authenticated`. Guards therefore send people straight to the right screen (role choice, onboarding, or home) without flashing the wrong one.

If the profile request fails (network), the profile is treated as **unknown**, not missing. Someone who has already onboarded is never pushed back into onboarding because of a dropped connection.

## 6. "Need help?" calls AgriConnect support, not "my agent"

The prompt pack says "Need help? Call my agent" on the OTP screen. At that point the person is not logged in, so we can't know who their agent is. The OTP screen instead shows a support helpline from `VITE_SUPPORT_PHONE`, and only when one is configured. The farmer-side "My agent" call button arrives with the agent module (Prompt 15).

## 7. OTP: autofill via `autocomplete="one-time-code"`, no WebOTP yet

`autocomplete="one-time-code"` lets iOS and Android keyboards offer the SMS code, and the form submits automatically at 6 digits. The WebOTP API (reading the SMS without a tap) would need the SMS to end with `@domain #code`. That format must be part of the DLT-registered template, so it waits for the real SMS provider.

## 8. Remember this device

The phone step has "Keep me logged in on this phone", on by default, with a hint to turn it off on a shared phone.
- **On:** a 30-day refresh cookie, so repeat visits skip the OTP entirely.
- **Off:** a browser-session cookie and a 1-day server session (ADR 0003).

We do not store the phone number on the device for prefill. It is personal data, and the 30-day session already removes most repeat logins.

## 9. Onboarding steps

- **Farmer:** three steps (details, location, delivery), matching CLAUDE.md's "max 3 steps". Delivery settings have defaults:
  - radius 10 km;
  - Monday, Wednesday and Friday;
  - 6 pm cutoff;
  - ₹100 minimum order;
  - ₹20 delivery fee.

  With these, most farmers type only their name, mandal, village and pincode.
- **Buyer:** one screen.

All answers stay in memory if saving fails (for example offline), and the error says so.
