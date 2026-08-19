# RAKSHA — Cloudflare Deployment Guide

Current production target: **Cloudflare** (Workers Static Assets + Cloudflare Containers).

Supersedes the previous Render (backend) + Vercel (frontend) deployment. The FastAPI
backend, PostgreSQL (Supabase), Semgrep, GitHub OAuth, encrypted token storage and the
assessment orchestration are **unchanged** — this is a deployment-layer migration only.

- **Frontend** → Workers Static Assets (React / Vite SPA from `frontend/dist`)
- **Backend** → Cloudflare Containers (existing `backend/Dockerfile`, FastAPI / Uvicorn)
- **Database** → PostgreSQL via Supabase (unchanged; `DATABASE_URL`)

---

## 1. Architecture

```
                    https://app.raksha.ai
                          │
            ┌─────────────┴─────────────┐
            │   Worker "raksha"         │
            │   cloudflare/src/worker.ts│
            └──────┬───────────┬────────┘
                   │           │
   /api/*, /health*│           │ everything else
   (run_worker_first)          │
                   ▼           ▼
   ┌─────────────────────┐  Workers Static Assets (frontend/dist)
   │ RakshaContainer (DO)│  SPA fallback via
   │ Container "standard-1"│  not_found_handling
   │ FastAPI (uvicorn :8000)│
   └──────────┬──────────┘
              │ outbound HTTPS
              ▼
   Supabase PostgreSQL · GitHub API · Groq/xAI
```

Single origin: the browser only ever talks to `app.raksha.ai`. There is no
cross-origin traffic, same-origin `HttpOnly` cookies work, and `VITE_API_URL` can be
omitted (the frontend falls back to the relative `/api` path).

Routing is handled by the `assets.run_worker_first` setting in `cloudflare/wrangler.jsonc`:
only `/api/*` and `/health*` invoke the Worker (which forwards to the container);
all other paths are served directly from static assets — the Worker is not billed for
static traffic.

---

## 2. Exact files

| File | Purpose |
|---|---|
| `cloudflare/wrangler.jsonc` | Cloudflare project config (assets, containers, DO binding, secrets list) |
| `cloudflare/src/worker.ts` | Worker entrypoint: `RakshaContainer` class + fetch handler forwarding `/api/*` to the container |
| `cloudflare/package.json` | Worker project deps (`wrangler`, `@cloudflare/containers`, `typescript`) |
| `cloudflare/tsconfig.json` | TypeScript config for the Worker |
| `backend/Dockerfile` | Unchanged image, plus a non-root runtime user (`USER raksha`, `ENV HOME=/tmp`) |
| `frontend/src/services/api.ts` | API base falls back to same-origin `/api` when `VITE_API_URL` is unset |

The backend code itself is **not** modified by this migration.

---

## 3. Prerequisites

- Cloudflare account with **Workers Paid plan** (Cloudflare Containers requires it)
- **Docker running locally** — `wrangler deploy` builds the container image locally and
  pushes it to Cloudflare's registry (`image: "../backend/Dockerfile"` in the config;
  the build context is the Dockerfile's directory, `backend/`)
- Node.js >= 20, npm
- `wrangler` CLI (installed via `cloudflare/package.json`)

---

## 4. Cloudflare configuration reference

`cloudflare/wrangler.jsonc` highlights:

- `assets.directory: "../frontend/dist"` — must be built first (`npm run build` in `frontend/`).
- `assets.run_worker_first: ["/api/*", "/health*"]` — Worker only runs for backend traffic.
- `assets.not_found_handling: "single-page-application"` — SPA deep links (`/repos`, `/assessments/...`) work on refresh.
- `containers[0]`:
  - `class_name: "RakshaContainer"` — must match the exported class in `src/worker.ts` and the DO binding.
  - `image: "../backend/Dockerfile"` — built & pushed by `wrangler deploy` (local Docker).
  - `instance_type: "standard-1"` (1/2 vCPU, 4 GiB RAM, 8 GB disk). Upgrade to `standard-2` (1 vCPU, 6 GiB) if Semgrep runs out of memory on large repos.
  - `max_instances: 1` — one concurrent instance; the singleton Durable Object keeps all requests on the same container (required for the in-memory OAuth state store and in-process assessment workers).
  - `rollout_active_grace_period: 300` — image rollouts wait 5 minutes before replacing a container that recently started a request, protecting in-flight assessments during deploys.
- `durable_objects.bindings[0].name: "RAKSHA_CONTAINER"` + `migrations` with `new_sqlite_classes: ["RakshaContainer"]` — container-enabled DO classes use SQLite-backed DO storage.
- `secrets.required` — deploy fails fast if any listed secret is missing.
- `observability.enabled: true` — container logs in the dashboard (3-day retention on Free, 7-day on Paid).
- `vars` — non-secret runtime values (see section 5).
- `workers_dev: true` — the Worker is also reachable at `raksha.<account>.workers.dev`, useful during cutover.

`cloudflare/src/worker.ts` highlights:

- `defaultPort = 8000` — matches uvicorn (`${PORT:-8000}`).
- `sleepAfter = "1h"` — the container stays awake one hour after the last request.
- `envVars` — maps Worker `vars` and Worker Secrets into the container environment via
  `import { env } from "cloudflare:workers"` (the documented secrets pattern).

---

## 5. Environment variables & secrets

Never commit real values. Secrets are set with `wrangler secret put <NAME>` (or in the
dashboard) and are not stored in the repo. Deploy from the `cloudflare/` directory:

```bash
npx wrangler secret put SECRET_KEY
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put DATABASE_URL
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GROK_API_KEY
```

| Variable | Where | Required | Example / purpose |
|---|---|---|---|
| `APP_ENV` | `vars` | Yes | `production` |
| `FRONTEND_URL` | `vars` | Yes | `https://app.raksha.ai` — OAuth redirect + trusted hosts |
| `BACKEND_URL` | `vars` | Yes | `https://app.raksha.ai` — trusted hosts (same origin) |
| `CORS_ORIGINS` | `vars` | Yes | `["https://app.raksha.ai"]` — satisfies the backend's fail-fast validator; same-origin traffic needs no CORS |
| `TRUSTED_HOSTS` | `vars` | Yes | `["app.raksha.ai", "*.workers.dev"]` — the `*.workers.dev` entry keeps the interim workers.dev URL working until DNS cutover |
| `GITHUB_CLIENT_ID` | `vars` | Yes | GitHub OAuth App client ID (public) |
| `GITHUB_REDIRECT_URI` | `vars` | Yes | `https://app.raksha.ai/api/auth/github/callback` |
| `GROQ_MODEL` / `GROK_MODEL` | `vars` | No | `openai/gpt-oss-20b` / `grok-4-latest` |
| `SANDBOX_ENABLED` | `vars` | Yes | `false` — Docker sandbox is dormant; Semgrep runs directly in the container |
| `SECRET_KEY` | secret | Yes | JWT signing key (startup refuses to boot without a strong value) |
| `ENCRYPTION_KEY` | secret | Yes | AES-256-GCM key for GitHub tokens at rest |
| `DATABASE_URL` | secret | Yes | Supabase Postgres (`postgresql+asyncpg://…`; `postgres://` is normalized) |
| `GITHUB_CLIENT_SECRET` | secret | Yes | GitHub OAuth App secret |
| `GROQ_API_KEY` | secret | Yes | LLM provider for agents/copilot |
| `GROK_API_KEY` | secret | Yes | xAI copilot key |

---

## 6. GitHub OAuth changes

1. Edit the GitHub OAuth App (https://github.com/settings/developers):
   - **Homepage URL** → `https://app.raksha.ai`
   - **Authorization callback URL** → `https://app.raksha.ai/api/auth/github/callback`
2. `GITHUB_REDIRECT_URI` in `vars` must match the callback URL **exactly**.
3. The frontend builds its login URL as `/api/auth/github` (same origin — no cross-domain
   redirect). After OAuth, the backend redirects to `{FRONTEND_URL}/auth/callback?token=…`.

---

## 7. DNS

If the `raksha.ai` zone is already on Cloudflare, add a **Custom Domain** (no DNS records
to create) via `npx wrangler domains add app.raksha.ai` (or the dashboard).

If the zone is elsewhere, add a CNAME:

```
app.raksha.ai  CNAME  raksha.<account-subdomain>.workers.dev
```

Until the cutover, the app also runs at `raksha.<account-subdomain>.workers.dev`
(`workers_dev: true`) with `*.workers.dev` in `TRUSTED_HOSTS`, so everything can be
verified before touching production DNS.

---

## 8. Deploy sequence

```bash
# 1. Build the frontend (assets directory must exist)
cd frontend && npm run build && cd ..

# 2. Install the Cloudflare project deps
cd cloudflare && npm install

# 3. Set secrets (section 5) — one time, and after any rotation

# 4. Deploy (builds backend/Dockerfile via local Docker, pushes image,
#    uploads assets + Worker)
npx wrangler deploy
```

Then:

5. Add the custom domain / DNS (section 7).
6. Update the GitHub OAuth App (section 6).
7. Verify (section 10).
8. Cut over production DNS; after a soak period, decommission the Render service and
   Vercel project (keep them running until then for rollback).

---

## 9. Cloudflare Container limitations (read before claiming production-ready)

Official-docs facts that constrain this deployment:

- **No fixed max runtime, but no guarantee either.** Cloudflare does not guarantee any
  container instance runs for any set period. Host server restarts happen on an irregular
  cadence; before stopping, the platform sends `SIGTERM`, waits up to 15 minutes, then
  `SIGKILL`. Assessment workers run **in-process** as FastAPI `BackgroundTasks` — a host
  restart can kill a running assessment.
  - Mitigations in this deployment: `sleepAfter = "1h"` + the console's existing polling
    (`GET /api/assessments/{id}`) keeps the container warm while the UI is open;
    `rollout_active_grace_period: 300` protects fresh assessments during deploys.
  - Residual risk: a very long assessment with no open console tab for over an hour can
    be interrupted. **Validate with a real end-to-end assessment on Cloudflare before
    relying on long unattended runs.** A durable job queue (Cloudflare Queues/Workflows)
    is the hardening path if that matters.
- **Idle sleep.** `sleepAfter` (default 10 min; here 1 h) stops the container after
  inactivity; the next request cold-starts it in ~1–3 s.
- **Ephemeral disk.** Everything outside the image is wiped on sleep/restart — fine here
  (Semgrep temp dirs under `/tmp` are disposable; state lives in PostgreSQL).
- **No root privileges.** The image runs as an unprivileged user (`USER raksha`).
- **No swap.** Memory exhaustion → OOM restart. `standard-1` gives 4 GiB; upgrade if
  Semgrep OOMs on large repositories.
- **Single instance.** `max_instances: 1` — no horizontal scaling. Acceptable for the
  current stateful design (in-memory OAuth state, in-process workers).
- **Workers Paid plan required.** Logs: 3-day retention (Free) / 7-day (Paid).
- **Docker must be running locally** for `wrangler deploy` (image build + push).

---

## 10. Verification checklist (post-deploy, on Cloudflare)

```bash
# API health (expect 200, database ok, github_configured true)
curl -s https://app.raksha.ai/api/health

# OpenAPI served by the container through the Worker
curl -s https://app.raksha.ai/api/openapi.json | head

# OAuth start (expect 307 → github.com/login/oauth/authorize)
curl -s -o /dev/null -D - https://app.raksha.ai/api/auth/github

# OAuth callback rejects missing params (expect 307 to frontend with error)
curl -s -o /dev/null -D - "https://app.raksha.ai/api/auth/github/callback"

# SPA deep links return index.html (200, not 404)
curl -s -o /dev/null -w "%{http_code}\n" https://app.raksha.ai/repos
curl -s -o /dev/null -w "%{http_code}\n" https://app.raksha.ai/assessments
```

- [ ] `GET /api/health` returns 200 with `database.ok` and `github.configured: true`
- [ ] Browser login via GitHub completes and returns signed-in
- [ ] A **real assessment** starts and completes (Semgrep + AI pipeline)
- [ ] SPA deep links work on refresh (`/repos`, `/assessments/:id`, `/findings/:id`)
- [ ] Settings page shows the API endpoint as `https://app.raksha.ai/api`
- [ ] No CORS errors in the browser console (same-origin)
- [ ] No `localhost` URLs in the production build
- [ ] No secrets in the repo (`git check-ignore .env` passes; greps for key names clean)
- [ ] Container logs visible under Observability in the dashboard

## 11. Rollback

- **Cloudflare**: `npx wrangler rollback` (previous Worker/image version) — or `git revert`
  of `cloudflare/` and redeploy.
- **Old platform**: Render + Vercel remain live until DNS cutover completes; repointing
  the DNS records reverts traffic instantly.

---

## 12. Local development (unchanged)

- Backend: `cd backend && uvicorn main:app --reload` (SQLite, `APP_ENV=development`).
- Frontend: `cd frontend && npm run dev` — Vite proxies `/api` → `http://localhost:8000`.
- Cloudflare local preview (optional, needs Docker): `cd cloudflare && npx wrangler dev`.