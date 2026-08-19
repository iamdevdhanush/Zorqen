# ZORQEN GitHub OAuth Deployment

Production architecture: **Cloudflare** serves the frontend
(`https://app.zorqen.ai`), **Render** runs the FastAPI backend. The OAuth flow runs
entirely on the Render backend; Cloudflare only serves the SPA that redirects the
user to it. See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook.

> Previous production (Cloudflare Containers, single `app.zorqen.ai` origin) ran the
> callback on the frontend origin; the older Render + Vercel deployment
> (`raksha-ai-b8wf.onrender.com` / `raksha-ai-pink.vercel.app`) carried the previous
> RAKSHA brand and was decommissioned with the Cloudflare migration; those URLs no
> longer resolve. They are preserved here for history only.

## Backend OAuth Login URL

Canonical (used by the frontend and by `GITHUB_REDIRECT_URI`):

```
https://<RENDER_BACKEND_URL>/api/auth/github
```

Alias (also registered, returns the same 307 to GitHub — fixed 2026-08-15):

```
https://<RENDER_BACKEND_URL>/auth/github
```

The auth router is registered twice in `backend/main.py`: once under the `/api` prefix (`app.include_router(auth_router, prefix="/api")`) and once without a prefix (`app.include_router(auth_router)`), with router prefix `/auth` (`backend/routers/auth.py`). The resulting routes are:

- `GET /api/auth/github` — starts the OAuth flow (307 redirect to GitHub) — **canonical**
- `GET /auth/github` — alias of the same flow (307 redirect to GitHub)
- `GET /api/auth/github/callback` — GitHub callback (code + state exchange) — **canonical**
- `GET /auth/github/callback` — alias of the same callback

Both aliases run the REAL OAuth flow; they add no security risk because the callback always uses the fixed `GITHUB_REDIRECT_URI`, never a user-supplied `redirect_uri`.

## Backend OAuth Callback URL

The callback URL registered in the GitHub OAuth App — must match `GITHUB_REDIRECT_URI` exactly:

```
https://<RENDER_BACKEND_URL>/api/auth/github/callback
```

## Frontend Login Configuration

The frontend builds the login URL from its API base: `VITE_API_URL` (set to the
Render backend at build time) + `/auth/github`. See `frontend/src/store/WorkspaceContext.tsx`
(`proceedGithubAuth`) and `frontend/src/services/api.ts` (`getApiBase`).

## Render Environment Variables

Names only — never commit or print secrets. Set them in the Render dashboard (or via
`render.yaml` with `sync: false`). **None of these belong in the Cloudflare
configuration or the frontend build.**

| Variable | Purpose |
|---|---|
| `APP_ENV` | `production` |
| `FRONTEND_URL` | `https://app.zorqen.ai` (OAuth redirect + trusted hosts) |
| `BACKEND_URL` | `https://<RENDER_BACKEND_URL>` (trusted hosts) |
| `CORS_ORIGINS` | `["https://app.zorqen.ai"]` |
| `TRUSTED_HOSTS` | Optional; derived from `FRONTEND_URL` + `BACKEND_URL` (e.g. `["*.onrender.com"]` while the Render subdomain is provisional) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_REDIRECT_URI` | `https://<RENDER_BACKEND_URL>/api/auth/github/callback` |
| `SECRET_KEY` | Long random JWT signing key |
| `DATABASE_URL` | PostgreSQL (Supabase) connection string |
| `ENCRYPTION_KEY` | AES-256-GCM key for GitHub tokens at rest |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GROQ_API_KEY` | LLM provider key |

## GitHub OAuth App Configuration

Create/edit at https://github.com/settings/developers → OAuth Apps.

GitHub OAuth apps accept exactly ONE callback URL. For production:

- **Application name**: `ZORQEN` (rename the existing GitHub OAuth App in the
  GitHub dashboard; see "External Actions Required" in the rebrand report)
- **Homepage URL**: `https://app.zorqen.ai`
- **Authorization callback URL**: `https://<RENDER_BACKEND_URL>/api/auth/github/callback`

The `GITHUB_REDIRECT_URI` env var must match this callback URL **exactly** (same scheme, host, port, path). If you also use localhost dev, create a separate OAuth App for local development (`http://localhost:8000/api/auth/github/callback`).

Requested scopes: `repo read:user user:email` (backend `github/oauth.py`).

## OAuth Flow

```
Frontend (CONNECT GITHUB)
        │ window.location = VITE_API_URL + /auth/github  (Render origin)
        ▼
GET https://<RENDER_BACKEND_URL>/api/auth/github
        │ 307 redirect, state token generated (CSRF)
        ▼
https://github.com/login/oauth/authorize?client_id=...&redirect_uri=https://<RENDER_BACKEND_URL>/api/auth/github/callback&state=...
        │ user authorizes
        ▼
GitHub redirects → GET /api/auth/github/callback?code=...&state=...  (Render)
        │ backend validates state, exchanges code for token,
        │ fetches /user, creates/updates DB user, mints JWT,
        │ sets Secure SameSite=None HttpOnly cookie on the Render origin
        ▼
307 → https://app.zorqen.ai/auth/callback
        │ frontend calls GET /api/auth/token on Render (cross-site cookie,
        │ same-origin-free CORS), stores token in localStorage
        ▼
Signed in
```

Security properties: OAuth `state` is generated per-request and validated on callback (`_oauth_states` in `backend/routers/auth.py`); invalid/missing state is rejected; the callback only accepts GitHub's redirects, never user-supplied `redirect_uri`. Client secrets live only in Render env vars — never in frontend code. The cross-site HttpOnly cookie (`Secure`, `SameSite=None`) is the existing authentication hardening and is preserved unchanged; `CORS_ORIGINS=["https://app.zorqen.ai"]` plus `allow_credentials=True` makes the cookie-based token exchange work across the Cloudflare/Render origins.

## Verification

```bash
# Health + GitHub config status (expect github_configured: true)
curl -s https://<RENDER_BACKEND_URL>/api/health

# OpenAPI — expect the auth paths to appear
curl -s https://<RENDER_BACKEND_URL>/api/openapi.json | python -m json.tool

# Login endpoint — expect 307 to github.com/login/oauth/authorize (canonical)
curl -s -o /dev/null -D - https://<RENDER_BACKEND_URL>/api/auth/github

# Callback with no params — expect 307 to the frontend with error=missing_params
curl -s -o /dev/null -D - "https://<RENDER_BACKEND_URL>/api/auth/github/callback"

# Browser test
# 1. Open https://app.zorqen.ai
# 2. Sidebar → CONNECT GITHUB
# 3. Authorize on GitHub → redirected back signed-in
```

Verified: `2026-08-15` — the previous Render deployment returned 200 on `/api/health`
with `github_configured: true`, the auth paths present in `/api/openapi.json`,
`/api/auth/github` returned 307 to GitHub, the callback rejected missing params, and
CORS allowed only the frontend origin. The `/auth/github` alias was added to
`backend/main.py` (dual router registration) and verified locally via the registered-route
list and TestClient (307 to GitHub). The Render deployment must be re-verified with
the checklist above after the first deploy.