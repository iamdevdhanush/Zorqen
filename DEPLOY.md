# RAKSHA Deployment Guide

Production deployment for the RAKSHA security validation platform:

- **Frontend** → Vercel (React / Vite SPA)
- **Backend** → Koyeb (FastAPI / Uvicorn, Docker image)
- **Database** → PostgreSQL (recommended, via `DATABASE_URL`) or SQLite (local/dev only)

---

## 1. Architecture

```
┌──────────────────────────────┐
│           VERCEL             │
│       RAKSHA FRONTEND        │
│   React / Vite / TypeScript  │
└──────────────┬───────────────┘
               │ HTTPS (VITE_API_URL)
               ▼
┌──────────────────────────────┐
│           KOYEB              │
│       RAKSHA BACKEND         │
│   FastAPI / Uvicorn (Docker) │
└──────────────┬───────────────┘
               │
               ▼
      PostgreSQL (managed provider,
      or Railway/Neon/Supabase etc.)
```

The frontend is a client-side React SPA. The console workspace currently renders
**simulated demo data** in the browser (`frontend/src/store/WorkspaceContext.tsx`,
`frontend/src/lib/demo.ts`). The real backend API is consumed by:
- `AuthCallback` → `GET /api/auth/me` (GitHub OAuth token validation)
- Security Copilot → `POST /api/copilot/chat` (falls back to local replies on error)

All other console pages run on local simulation data. The backend API is fully
implemented (repositories, assessments, findings, overview, activity) and is
ready for production use.

---

## 2. Prerequisites

- Git (repo pushed to GitHub)
- Node.js >= 20.19 (local development / Vercel build)
- npm (frontend)
- Python 3.10+ (local backend development)
- Vercel account
- Koyeb account
- GitHub account
- Managed PostgreSQL provider (recommended for production)
- Groq API key (for AI features — `groq.com`)
- GitHub OAuth App (for GitHub sign-in)

---

## 3. Project Structure

```
raksha/
├── backend/                 # FastAPI backend (Koyeb)
│   ├── main.py              # App entry point, /health, /api/health
│   ├── Dockerfile           # Koyeb builds this image
│   ├── requirements.txt     # Python dependencies
│   ├── alembic/             # Migrations (applied automatically at startup)
│   └── ...
├── frontend/                # React/Vite frontend (Vercel)
│   ├── vite.config.ts
│   ├── vercel.json          # SPA rewrite so deep links work
│   └── src/
└── .env.example             # Backend env template (names only)
```

---

## 4. Environment Variables

### Frontend (configure in Vercel → Settings → Environment Variables)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | Yes | `https://your-koyeb-service.koyeb.app/api` | Base URL of the backend API (must end in `/api`) |

Do not commit real values. `frontend/.env.example` documents the name only.

### Backend (configure in Koyeb → Service → Environment Variables)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `APP_ENV` | Yes | `production` | Runtime mode (enables JSON logging, strict CORS/hosts) |
| `SECRET_KEY` | Yes | `a-long-random-string` | JWT signing key. **Startup refuses to boot in production if unset.** |
| `FRONTEND_URL` | Yes | `https://your-vercel-app.vercel.app` | Frontend origin; used for OAuth redirect + trusted hosts |
| `BACKEND_URL` | Yes | `https://your-koyeb-service.koyeb.app` | Backend public URL; used for trusted hosts |
| `CORS_ORIGINS` | Yes | `["https://your-vercel-app.vercel.app"]` | JSON list of browser origins allowed to call the API |
| `DATABASE_URL` | Yes* | `postgresql+asyncpg://user:pass@host:5432/db` | SQLAlchemy async URL. *Required for persistent data |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret |
| `GITHUB_REDIRECT_URI` | No | `https://your-koyeb-service.koyeb.app/api/auth/github/callback` | OAuth callback URL |
| `GROQ_API_KEY` | No | — | Groq LLM key (AI agents + copilot) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | LLM model |
| `DEMO_MODE_ENABLED` | No | `true` | Seed demo workspace at startup |
| `JWT_EXPIRE_HOURS` | No | `24` | Token lifetime |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity |
| `TRUSTED_HOSTS` | No | — | Extra Host headers allowed (normally derived from `FRONTEND_URL` + `BACKEND_URL`) |
| `PORT` | Auto | — | **Koyeb injects this automatically.** The Dockerfile binds `0.0.0.0:$PORT`. Do not set it manually. |

Never put real secrets in `.env.example` or this document.

---

## 5. Backend Deployment — Koyeb

The backend ships a production Dockerfile (`backend/Dockerfile`) that installs
all dependencies and runs Uvicorn on the environment-provided `PORT`
(`uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}`).

1. Push the repository to GitHub.
2. Open [app.koyeb.com](https://app.koyeb.com) → **Create Service**.
3. Select **GitHub** as deployment source and pick the repository.
4. In the service builder:
   - **Working directory**: set to `/backend` (monorepo root is `raksha/`).
   - **Build**: Koyeb auto-detects the `Dockerfile` in `/backend`. Use the Docker build (no build command needed).
   - **Instance type**: any (2GB RAM recommended — semgrep + AI runs during assessments).
5. **Environment variables**: add all variables from section 4 (Backend).
6. **Health check**: enable HTTP check with path `/health`, port `8000` is the
   container default — Koyeb routes to the service port; the app listens on the
   injected `PORT`.
7. Deploy. Koyeb builds the image and starts the service.
8. Copy the public domain from the service page (e.g. `https://raksha-backend-foo.koyeb.app`).
9. Test: `curl https://<your-koyeb-domain>/health` → `{"status":"healthy",...}`.
10. Set `BACKEND_URL` and `GITHUB_REDIRECT_URI` to the Koyeb domain and redeploy.

Notes:
- Alembic migrations run automatically at startup (`alembic upgrade head` via `main.py`).
- If no `DATABASE_URL` is set, the app uses a local SQLite file — **Koyeb's filesystem is ephemeral and wiped on every redeploy**. Use PostgreSQL for production.
- The Docker image is built without local artifacts (`backend/.dockerignore`).

---

## 6. Frontend Deployment — Vercel

1. Push the repository to GitHub.
2. Open [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. In **Root Directory**: select `frontend`.
4. Framework preset: **Vite** (auto-detected).
5. Build command: `npm run build` (default; runs `tsc -b && vite build`).
6. Output directory: `dist` (default).
7. **Environment variables**: add `VITE_API_URL=https://<your-koyeb-domain>/api`.
8. Deploy.
9. Open the production URL and verify the console loads (overview, repos, findings, settings routes).
10. Verify `https://<your-vercel-domain>/repos` works on refresh (SPA rewrites are configured in `frontend/vercel.json`).
11. Verify the API link: Settings page shows the API endpoint, and GitHub sign-in redirects to the Koyeb backend.

---

## 7. CORS Configuration

The backend restricts browser origins via `CORS_ORIGINS` (JSON list) and validates
`Host` headers via `TRUSTED_HOSTS` (derived from `FRONTEND_URL` + `BACKEND_URL`).

**Production:**
```
CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
FRONTEND_URL=https://your-vercel-app.vercel.app
BACKEND_URL=https://your-koyeb-service.koyeb.app
```

- Requests from the Vercel domain get `Access-Control-Allow-Origin: https://your-vercel-app.vercel.app`.
- Other origins receive no CORS headers and are blocked by the browser.
- If you add a custom domain on Vercel, add it to `CORS_ORIGINS` too.

**Local development (defaults already set in `core/config.py`):**
```
APP_ENV=development
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
FRONTEND_URL=http://localhost:5173
```
In development CORS and host checks are permissive; production is strict.

---

## 8. GitHub OAuth / Integration

Status: **REAL** — full OAuth flow implemented (`backend/github/oauth.py`,
`backend/routers/auth.py`), token exchange with GitHub, profile fetch, repository
listing with `repo read:user user:email` scopes.

Setup:

1. Create an OAuth App at https://github.com/settings/applications/new.
   - **Homepage URL**: `https://your-vercel-app.vercel.app`
   - **Authorization callback URL**: `https://your-koyeb-service.koyeb.app/api/auth/github/callback`
2. Set in Koyeb:
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
   - `GITHUB_REDIRECT_URI=https://your-koyeb-service.koyeb.app/api/auth/github/callback`
3. Redeploy the backend.
4. The sign-in button redirects to `/api/auth/github`, GitHub authorizes, and the
   callback redirects to `/auth/callback?token=<jwt>` on Vercel.

Notes:
- The OAuth state store is in-memory (single instance OK; multi-instance scaling would need Redis).
- Demo mode works without GitHub (`POST /api/auth/demo-login`).

---

## 9. Database

- **Provider**: SQLite (default, local/dev) or **PostgreSQL** (production) via SQLAlchemy async.
- **Connection variable**: `DATABASE_URL`.
  - SQLite: `sqlite+aiosqlite:///./raksha.db` (default)
  - PostgreSQL: `postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME`
- **Migrations**: Alembic. Applied automatically at startup (`main.py` → `run_migrations()`). Manual run: `cd backend && alembic upgrade head`.
- **Seed**: demo workspace is seeded at startup when `DEMO_MODE_ENABLED=true` (`demo/seed.py`). No separate seed command.
- **Production considerations**: use a managed PostgreSQL (any provider — the connection string is all that matters). SQLite on Koyeb is ephemeral and unsuitable for production.
- Connection pooling is configured in `backend/core/database.py` (pool size / overflow / recycle).

---

## 10. Health Check

- `GET /health` → `200` with `{"status":"healthy",...}` (used by Koyeb health checks).
- `GET /api/health` → same payload (used by the frontend).
- No authentication required, no secrets exposed.

---

## 11. Deployment Verification Checklist

[ ] Koyeb service deployed
[ ] `curl https://<your-koyeb-domain>/health` returns 200
[ ] Koyeb logs show clean startup (migrations applied)
[ ] PostgreSQL reachable (`DATABASE_URL`)
[ ] Vercel project deployed
[ ] Frontend loads at `https://<your-vercel-domain>/`
[ ] Deep routes work: `/repos`, `/assessments`, `/findings/:id` (no 404 on refresh)
[ ] `VITE_API_URL` set and frontend can reach Koyeb (Settings page shows the URL)
[ ] CORS works from the Vercel origin (no CORS errors in the browser console)
[ ] Demo login works
[ ] GitHub OAuth works (callback redirects back to Vercel with a token)
[ ] AI/copilot responds (or gracefully falls back)
[ ] No `localhost` URLs used by the production build
[ ] No Railway references remain
[ ] No secrets committed (`git check-ignore .env` returns the file)
[ ] HTTPS works on both domains

---

## 12. Troubleshooting

**CORS error in browser console**
- SYMPTOM: `Access to fetch ... has been blocked by CORS policy`
- CAUSE: `CORS_ORIGINS` on Koyeb does not include the exact Vercel origin (scheme + host, no trailing slash).
- FIX: Set `CORS_ORIGINS=["https://your-vercel-app.vercel.app"]` in Koyeb and redeploy.

**`400 Invalid host header` on the API**
- SYMPTOM: API returns 400 with `Invalid host header`.
- CAUSE: `BACKEND_URL` (or `TRUSTED_HOSTS`) does not include the Koyeb domain; production host checks reject unknown Host headers.
- FIX: Set `BACKEND_URL=https://<your-koyeb-domain>` and redeploy.

**404 on frontend route after refresh**
- SYMPTOM: Refreshing `/repos` shows 404 or blank page.
- CAUSE: SPA without rewrites.
- FIX: Already handled by `frontend/vercel.json`; if removed, restore the rewrite to `/index.html`.

**Backend fails to start — "SECRET_KEY must be set"**
- SYMPTOM: Startup exits with `RuntimeError`.
- CAUSE: Production started with the development default secret.
- FIX: Set a strong `SECRET_KEY` in Koyeb.

**Health check failing on Koyeb**
- SYMPTOM: Service marked unhealthy.
- CAUSE: Health path/port mismatch, or backend not bound to the injected `PORT`.
- FIX: Health check path `/health`; the Dockerfile already binds `0.0.0.0:${PORT}`. Do not hardcode a port override.

**Database connection failure**
- SYMPTOM: Backend logs `connection refused` / timeout at startup.
- CAUSE: `DATABASE_URL` missing, wrong host/port, or missing `+asyncpg` driver in the URL.
- FIX: Use `postgresql+asyncpg://...` and whitelist Koyeb's egress IPs on the database.

**GitHub sign-in fails**
- SYMPTOM: Redirect to GitHub shows an error, or callback returns `error=...`.
- CAUSE: Callback URL mismatch (GitHub OAuth App vs `GITHUB_REDIRECT_URI`), or missing client credentials.
- FIX: Make both exactly `https://<your-koyeb-domain>/api/auth/github/callback`, and set `FRONTEND_URL=https://<your-vercel-domain>` so the callback redirects correctly.

**Frontend still calling localhost**
- SYMPTOM: Network tab shows requests to `localhost:8000`.
- CAUSE: `VITE_API_URL` not set on Vercel (or stale build).
- FIX: Set `VITE_API_URL=https://<your-koyeb-domain>/api` in Vercel and redeploy. Vite bakes the value in at build time.

**Copilot replies from local fallback**
- SYMPTOM: Copilot answers look canned.
- CAUSE: `GROQ_API_KEY` missing or the chat endpoint failed.
- FIX: Set `GROQ_API_KEY` on Koyeb; check backend logs. The frontend intentionally falls back to local replies on error.

---

## 13. Rollback

- **Koyeb**: open the service → **Versions/Revisions** tab → select the previous healthy revision → **Deploy**. Environment variables are inherited from the service settings.
- **Vercel**: open the project → **Deployments** → select the previous production deployment → **More** → **Promote to Production** (or `vercel rollback` via CLI).

---

## 14. Production URLs

Frontend:
https://YOUR-VERCEL-DOMAIN

Backend:
https://YOUR-KOYEB-SERVICE.koyeb.app

Health:
https://YOUR-KOYEB-SERVICE.koyeb.app/health

(Replace the placeholders with the real domains assigned by Vercel and Koyeb.)
