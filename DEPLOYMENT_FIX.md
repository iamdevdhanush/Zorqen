# ZORQEN Production Deployment Fix

## Root Cause

The Docker image built successfully and FastAPI started, but the app crashed at
startup with `Exited with status 3` and almost no error output.

1. **The Render `DATABASE_URL` environment variable contained the documentation
   placeholder** — `postgresql+asyncpg://USER:PASSWORD@host:5432/DBNAME`. The
   hostname literally was the word `host`, so the database connection failed
   with `socket.gaierror: [Errno -5] No address associated with hostname`
   (the name `host` does not resolve).
2. **The old code attempted to connect before validating.** It only detected the
   placeholder *after* the failed connection attempt.
3. **Uvicorn suppressed the real error.** When the FastAPI lifespan fails,
   uvicorn exits with code `3` (`STARTUP_FAILURE`) and, depending on logging
   config, hides the actual exception — leaving only `Exited with status 3` in
   the deploy log.
4. There was **no `postgres://` → `postgresql+asyncpg://` normalization** and
   no guard against accidentally running production against SQLite.

## Changes Made

| File | Change | Why |
|---|---|---|
| `backend/core/config.py` | Added `normalize_database_url` validator + `validate_production_database_url` model validator + `detect_database_placeholder()` / `database_target()` helpers | Single source of truth for DATABASE_URL validation. Normalizes `postgres://`/`postgresql://` → `postgresql+asyncpg://`. Fails fast when `APP_ENV=production` and DATABASE_URL is missing, SQLite, a placeholder, or an unsupported driver. Never attempts to connect to a placeholder host. |
| `backend/main.py` | Use config helpers; log DB `target` at startup; startup failure logs `event=database_startup_failed` with `target`, `placeholder`, `hint`, and full traceback before re-raising | The real error is now always visible in Render logs. Migrations run exactly once per startup via `asyncio.to_thread(run_migrations)`; no recursion, no loop. |
| `backend/alembic/env.py` | *(unchanged — verified)* reads the URL from `core.config.settings.database_url` | Alembic and the app share the **same** `DATABASE_URL`; no second URL system. |
| `backend/alembic.ini` | *(unchanged)* `sqlalchemy.url` left empty, resolved at runtime | Same source of truth. |
| `backend/Dockerfile` | Added `--proxy-headers` to the start command | uvicorn honours `X-Forwarded-*` from the Render proxy so rate limiting/trusted-host checks see the real client IP. |
| `render.yaml` | New optional Render Blueprint (web service, Docker, `/health`, env vars incl. `DATABASE_URL` with `sync: false`) | Documents the recommended production configuration. |
| `docker-compose.yml` | `APP_ENV=production` → `APP_ENV=development` | The compose stack is a local dev/demo environment using SQLite; production + SQLite now (correctly) refuses to start. |
| `.env.example` | Clarified the required production `DATABASE_URL` format and the auto-normalization; no real credentials | Prevents copying a placeholder into a real deployment. |
| `DEPLOY.md` | Env table + Database section updated with fail-fast behavior and format-only examples | Documents the fix so it isn't re-broken. |
| `DEPLOYMENT_FIX.md` | This file | Deployment report + verification. |

## Environment Variables

Required in production (set in Render, **no secrets committed**):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Real PostgreSQL connection string. Render's Internal Database URL works as-is — `postgres://` is auto-normalized to `postgresql+asyncpg://`. |
| `APP_ENV` | Yes | `production` |
| `SECRET_KEY` | Yes | Long random string (Render: *Generate* or set manually). |
| `PORT` | Auto | Render injects this; do not set manually. |
| `DEMO_MODE_ENABLED` | No | `true` to seed the demo workspace. |
| `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS`, `GITHUB_CLIENT_ID/SECRET`, `GROQ_API_KEY`, `LOG_LEVEL` | Optional | See `.env.example` / `DEPLOY.md`. |

The app now **fails fast** with a clear message instead of a silent crash:

- `DATABASE_URL is not configured. Set DATABASE_URL in the deployment environment ...`
  — when unset/SQLite in production.
- `DATABASE_URL contains a documentation placeholder (...)` — when a placeholder
  like `host` / `DBNAME` / `USERNAME` / `PASSWORD` is still present.

## Render Configuration

1. **Create the web service**: Render Dashboard → **New → Web Service** → connect
   the `iamdevdhanush/Zorqen` repo.
2. Root Directory: **`backend`**
3. Runtime: **Docker** (uses `backend/Dockerfile`). Builds automatically.
4. **Environment variables** (see table above). Render generates `PORT`.
5. Health Check Path: **`/health`**
6. Deploy. (A `render.yaml` Blueprint is also provided as documentation.)

## Database Setup

1. Render Dashboard → **New → PostgreSQL** (free tier works).
2. Wait for it to be ready, then open its details.
3. Copy the **Internal Database URL** (e.g.
   `postgres://zorqen_user:xxxx@dpg-abc123.region.postgres.render.com:5432/zorqen`).
4. Set that value as the web service's `DATABASE_URL`. The app normalizes
   `postgres://` → `postgresql+asyncpg://` automatically — paste it as-is.
5. (External URLs also work if your service runs outside Render's private network.)

## Migration Setup

- Alembic migrations run **automatically once** on startup
  (`main.py` → `lifespan()` → `run_migrations()` → `alembic upgrade head`),
  using the exact same `DATABASE_URL` as the app (`core/config.py` is the single
  source of truth; `alembic/env.py` reads it at runtime).
- Manual run inside the container/backend dir:
  `cd backend && alembic upgrade head` (requires a reachable `DATABASE_URL`).
- `--workers 1` in the start command guarantees no migration race.

## Start Command

Used by the Dockerfile (`backend/Dockerfile`):

```sh
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers
```

- `PORT` is injected by Render (fallback `8000` for local Docker).
- `--proxy-headers` lets uvicorn trust `X-Forwarded-*` from Render's proxy.

## Health Check

- **`GET /health`** (also `/api/health`) — no authentication, returns HTTP 200
  when the process is healthy:
  ```json
  {"status":"healthy","app":"ZORQEN","version":"1.1.0","database":"postgres"}
  ```
- No expensive DB work is performed by the health endpoint.

## Verification Checklist

- [x] Docker build passes (verified on Render — image builds successfully)
- [x] Dependencies install (`pip install -r requirements.txt`, exit 0)
- [x] `import alembic` resolves to the installed package, not the local dir
- [x] `alembic upgrade head` succeeds against SQLite (dev)
- [x] `DATABASE_URL` validated: prod + missing → clear error, no connect attempt
- [x] `DATABASE_URL` validated: prod + placeholder (`host`/`DBNAME`) → clear error, no connect attempt
- [x] `postgres://` → `postgresql+asyncpg://` normalization verified
- [x] Prod + real-looking but unreachable URL → connects, surfaces `database_startup_failed` with full traceback
- [x] FastAPI starts (dev boot verified, `/health` → 200)
- [x] No placeholder `DATABASE_URL` remains in app code (docs/demo fixtures only, clearly marked)
- [x] No secrets committed (`.env` is gitignored; `.env.example`/`render.yaml` contain no credentials)
