# ZORQEN — Deployment Guide

Current production architecture:

- **Frontend** → Cloudflare (Workers Static Assets + Worker; React / Vite SPA from `frontend/dist`)
- **Backend** → Render (existing `backend/Dockerfile`, FastAPI / Uvicorn)
- **Database** → PostgreSQL via Supabase (`DATABASE_URL`)
- **GitHub** → OAuth + API (backed by the Render backend)
- **Assessment engine** → FastAPI + Semgrep + AI, all on Render

Supersedes the previous Cloudflare Containers deployment (backend in a Cloudflare
Container via a container-enabled Durable Object) and the older Render/Vercel/Koyeb
deployment. The FastAPI backend, PostgreSQL (Supabase), Semgrep, GitHub OAuth,
encrypted token storage and the assessment orchestration are **unchanged** — this is
a deployment-layer migration only.

```
                    ZORQEN
                       |
             ┌─────────┴─────────┐
             │                   │
        CLOUDFLARE             RENDER
        Frontend               FastAPI
        Static Assets             |
                                  |
                    ┌─────────────┼─────────────┐
                    │             │             │
                 GitHub        Semgrep         AI
                    │             │             │
                    └─────────────┴─────────────┘
                                  |
                              SUPABASE
```

The browser loads the SPA from Cloudflare and calls the Render backend **directly**
(`VITE_API_URL`, set at frontend build time). There is no Worker proxy and no
Cloudflare Container.

---

## 1. Cloudflare — frontend only

| File | Purpose |
|---|---|
| `cloudflare/wrangler.jsonc` | Cloudflare project config (static assets, SPA fallback, Worker) |
| `cloudflare/src/worker.ts` | Frontend Worker: serves static assets, adds security headers, returns an explicit 404 for `/api/*` / `/health*` |
| `cloudflare/package.json` | Worker project deps (`wrangler`, `typescript`) |
| `cloudflare/tsconfig.json` | TypeScript config for the Worker |

Highlights:

- `assets.directory: "../frontend/dist"` — must be built first (`npm run build` in `frontend/`).
- `assets.not_found_handling: "single-page-application"` — SPA deep links (`/repos`, `/assessments/...`) work on refresh.
- No `containers`, no `durable_objects`, no migrations, no backend secrets — the backend does not run on Cloudflare.
- `workers_dev: true` — the frontend is also reachable at `zorqen.<account>.workers.dev`, useful during cutover.

Deploy:

```bash
# 1. Build the frontend with the Render backend URL baked in. IMPORTANT: set
#    VITE_API_URL explicitly — the committed frontend/.env.example uses a
#    localhost dev value, and the API base is fixed at build time.
cd frontend && VITE_API_URL=https://zorqen-api.onrender.com npm run build && cd ..

# 2. Install the Cloudflare project deps (one time)
cd cloudflare && npm install

# 3. Deploy (uploads assets + Worker; no Docker required)
npx wrangler deploy
```

If you deploy from a CI pipeline instead, put `VITE_API_URL` in the build step's
environment and ensure step 3 runs from the `cloudflare/` directory.

Add the custom domain: if the `zorqen.ai` zone is already on Cloudflare, add a
**Custom Domain** via `npx wrangler domains add app.zorqen.ai` (or the dashboard).
Otherwise add a CNAME:

```
app.zorqen.ai  CNAME  zorqen.<account-subdomain>.workers.dev
```

## 2. Render — backend

The backend ships a production Dockerfile (`backend/Dockerfile`) that installs all
dependencies (including Semgrep) and runs Uvicorn on the environment-provided `PORT`
(`uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers`).

1. Push the repository to GitHub.
2. Render Dashboard → **New → Web Service** → connect the repo.
   - **Root Directory**: `backend`
   - **Runtime**: Docker (uses `backend/Dockerfile`)
3. Set the environment variables (section 3).
4. **Health Check Path**: `/health`
5. Deploy. Copy the public URL (e.g. `https://zorqen-api.onrender.com`), set
   `BACKEND_URL` and `GITHUB_REDIRECT_URI` to it, and redeploy.
6. Verify: `curl https://<your-render-domain>/api/health` → `{"status":"ok", ...}`.

A `render.yaml` Blueprint is provided for the same configuration.

Notes:

- Alembic migrations run automatically at startup (`alembic upgrade head` via `main.py`).
- `--workers 1` guarantees migrations never race between workers.
- Render injects `PORT` automatically; the Dockerfile binds `0.0.0.0:${PORT}`.
- `--proxy-headers` lets uvicorn honour `X-Forwarded-*` so rate-limit keying and
  trusted-host checks see the real client.

## 3. Environment variables & secrets

Never commit real values. Secrets are set in the Render dashboard (or via
`render.yaml` with `sync: false`); the frontend build only ever sees public values.

### Backend (Render)

| Variable | Required | Example / purpose |
|---|---|---|
| `APP_ENV` | Yes | `production` |
| `FRONTEND_URL` | Yes | `https://app.zorqen.ai` — OAuth redirect + trusted hosts |
| `BACKEND_URL` | Yes | `https://zorqen-api.onrender.com` — trusted hosts |
| `CORS_ORIGINS` | Yes | `["https://app.zorqen.ai"]` — satisfies the backend's fail-fast validator |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID (public) |
| `GITHUB_REDIRECT_URI` | Yes | `https://zorqen-api.onrender.com/api/auth/github/callback` |
| `SECRET_KEY` | Yes | JWT signing key (startup refuses to boot without a strong value) |
| `ENCRYPTION_KEY` | Yes | AES-256-GCM key for GitHub tokens at rest (base64, 32 bytes) |
| `DATABASE_URL` | Yes | Supabase Postgres (`postgresql+asyncpg://…`; `postgres://` is normalized) |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App secret |
| `GROQ_API_KEY` | No | LLM provider for agents/copilot |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` |
| `GROK_API_KEY` | No | xAI copilot key |
| `GROK_MODEL` | No | `grok-4-latest` |
| `SANDBOX_ENABLED` | No | `false` — Docker sandbox is dormant; Semgrep runs directly in the container |
| `PORT` | Auto | Injected by Render; do not set manually |

### Frontend (Cloudflare, build-time only)

| Variable | Required | Example / purpose |
|---|---|---|
| `VITE_API_URL` | Yes | `https://zorqen-api.onrender.com` (with or without `/api` suffix) — the browser calls the Render backend directly |

Only frontend-safe values are baked into the public bundle. **Never** set
`GROQ_API_KEY`, `GROK_API_KEY`, `GITHUB_CLIENT_SECRET`, `SECRET_KEY`,
`ENCRYPTION_KEY` or `DATABASE_URL` in the frontend build.

## 4. GitHub OAuth

1. Edit the GitHub OAuth App (https://github.com/settings/developers):
   - **Homepage URL** → `https://app.zorqen.ai`
   - **Authorization callback URL** → `https://<RENDER_BACKEND_URL>/api/auth/github/callback`
2. `GITHUB_REDIRECT_URI` on Render must match the callback URL **exactly**.
3. The frontend builds its login URL as `VITE_API_URL + /auth/github` (points at
   Render). After OAuth, the backend sets a Secure, `SameSite=None` HttpOnly cookie
   on the Render origin and redirects to `{FRONTEND_URL}/auth/callback`, where the
   SPA retrieves the token from `GET /api/auth/token` (cross-site cookie flow —
   already supported by the backend). See `GITHUB_OAUTH_DEPLOYMENT.md`.

## 5. CORS & trusted hosts

Production CORS explicitly allows `https://app.zorqen.ai` (JSON or comma-separated
`CORS_ORIGINS`). The backend refuses to boot with `*`, `localhost` or `127.0.0.1`
origins in production. Trusted hosts are derived from `FRONTEND_URL` + `BACKEND_URL`
(optionally extended via `TRUSTED_HOSTS`, e.g. `["*.onrender.com"]` while the Render
subdomain is provisional).

## 6. Verification checklist (post-deploy)

```bash
# API health (expect 200, database ok, github_configured true)
curl -s https://<your-render-domain>/api/health

# OpenAPI served by the backend
curl -s https://<your-render-domain>/api/openapi.json | head

# OAuth start (expect 307 → github.com/login/oauth/authorize)
curl -s -o /dev/null -D - https://<your-render-domain>/api/auth/github

# Frontend SPA deep links return index.html (200, not 404)
curl -s -o /dev/null -w "%{http_code}\n" https://app.zorqen.ai/repos
curl -s -o /dev/null -w "%{http_code}\n" https://app.zorqen.ai/assessments
```

- [ ] `GET /api/health` returns 200 with `database.ok` and `github.configured: true`
- [ ] Browser login via GitHub completes and returns signed-in
- [ ] A **real assessment** starts and completes (Semgrep + AI pipeline)
- [ ] SPA deep links work on refresh (`/repos`, `/assessments/:id`, `/findings/:id`)
- [ ] Settings page shows the API endpoint as the Render URL
- [ ] No CORS errors in the browser console
- [ ] No `localhost` URLs in the production build
- [ ] No secrets in the repo (`git check-ignore .env` passes; greps for key names clean)

## 7. Rollback

- **Cloudflare**: `npx wrangler rollback` (previous Worker/asset version) — or `git revert` of `cloudflare/` and redeploy.
- **Render**: open the service → **Events/Deploys** → select the previous healthy deploy → **Deploy**. Environment variables are inherited from the service settings.
- The previous Cloudflare Containers configuration is recoverable from git history.

## 8. Local development (unchanged)

- Backend: `cd backend && uvicorn main:app --reload` (SQLite, `APP_ENV=development`).
- Frontend: `cd frontend && npm run dev` — Vite proxies `/api` → `http://localhost:8000`.
- Cloudflare local preview: `cd cloudflare && npx wrangler dev` (serves `frontend/dist`).