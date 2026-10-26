# Deploying AgriConnect

Frontend on **Vercel**, backend and AI service on **Render** (Docker, from `render.yaml`), database on **MongoDB Atlas**, photos on **Cloudinary**. All have free tiers. About 30–45 minutes the first time.

The browser only talks to Vercel: `frontend/vercel.json` rewrites `/api/*` to the backend, so the refresh cookie stays same-origin (`SameSite=Strict`) and no CORS preflight is needed.

## 1. MongoDB Atlas

1. Create a free M0 cluster (region: Mumbai `ap-south-1`).
2. Database Access: add a user with a strong password.
3. Network Access: allow `0.0.0.0/0` (Render's free tier has no fixed outbound IP).
4. Connect > Drivers: copy the `mongodb+srv://...` string and add the database name, e.g. `.../agriconnect?retryWrites=true&w=majority`.

Atlas clusters are replica sets, so checkout transactions work as they do locally.

## 2. Cloudinary

Sign up and copy **Cloud name**, **API key** and **API secret** from the dashboard.

## 3. Render (backend + AI service)

1. Push the repo to GitHub.
2. Render > **New > Blueprint**, pick the repo. It reads `render.yaml` and creates `agriconnect-backend`, `agriconnect-ai` and the `agriconnect-shared` group (with a generated `AI_INTERNAL_KEY`).
3. Fill in the values it asks for:

| Service | Variable | Value |
| --- | --- | --- |
| backend | `MONGODB_URI` | Atlas string from step 1 |
| backend | `CORS_ORIGINS` | your Vercel URL, e.g. `https://agriconnect.vercel.app` |
| backend | `DEMO_OTP` | any 6 digits you will share with reviewers, e.g. `246810` |
| backend | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from step 2 |
| backend | `AI_SERVICE_URL` | the AI service URL, e.g. `https://agriconnect-ai.onrender.com` |
| ai | `ANTHROPIC_API_KEY` | optional; without it the chatbot and review insights use rule-based answers |

Set automatically by the blueprint: `NODE_ENV=production`, `JWT_ACCESS_SECRET` and `OTP_HMAC_SECRET` (generated, different), `TRUST_PROXY=2`, `SMS_PROVIDER=none`, `STORAGE_PROVIDER=cloudinary`, `LLM_MODEL=claude-opus-5-5`, `AI_INTERNAL_KEY`.

4. Wait for both services to go live, then check `https://<backend>.onrender.com/api/v1/health` returns `{"status":"ok","db":"up"}` and `https://<ai>.onrender.com/health` returns `{"status":"ok"}`.

Free Render services sleep after 15 minutes idle; the first request after that takes about a minute.

## 4. Seed the database (once, from your machine)

```bash
cd backend
# PowerShell: $env:MONGODB_URI="mongodb+srv://..."; $env:NODE_ENV="production"; $env:ALLOW_DEMO_SEED="true"
MONGODB_URI="mongodb+srv://..." NODE_ENV=production ALLOW_DEMO_SEED=true \
JWT_ACCESS_SECRET=x-local-only-seed-secret-32-chars-min OTP_HMAC_SECRET=y-local-only-seed-secret-32-chars-min \
CORS_ORIGINS=https://agriconnect.vercel.app SMS_PROVIDER=none STORAGE_PROVIDER=cloudinary \
CLOUDINARY_CLOUD_NAME=x CLOUDINARY_API_KEY=x CLOUDINARY_API_SECRET=x \
npm run seed:crops && npm run seed
```

The seed scripts load the same validated config as the server, hence the placeholder values; only `MONGODB_URI` is actually used.

## 5. Vercel (frontend)

1. In `frontend/vercel.json`, set the rewrite destination to your backend URL (`https://<backend>.onrender.com/api/:path*`) and commit.
2. Vercel > **Add New > Project**, import the repo, **Root Directory: `frontend`** (Vite is detected: build `npm run build`, output `dist`).
3. Optional env: `VITE_SUPPORT_PHONE`.
4. Deploy, then put the final Vercel URL in the backend's `CORS_ORIGINS` on Render if it differs.

## 6. Try it

Open the Vercel URL and sign in with a demo account and your `DEMO_OTP`:

- Farmers: `9999900011`–`9999900014`
- Buyers: `9999900021`–`9999900023`

Real phone numbers cannot sign in while `SMS_PROVIDER=none`; to open it up, set `SMS_PROVIDER=msg91` and `MSG91_AUTH_KEY` (needs a DLT-registered template in India).
