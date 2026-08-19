# RAKSHA GitHub OAuth Deployment

Production backend + frontend: `https://app.raksha.ai` (single Cloudflare origin —
Workers Static Assets + Cloudflare Containers). See [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)
for the full runbook.

> Previous production (Render + Vercel, `raksha-ai-b8wf.onrender.com` /
> `raksha-ai-pink.vercel.app`) was decommissioned with the Cloudflare migration;
> those URLs no longer resolve.

## Backend OAuth Login URL

Canonical (used by the frontend and by `GITHUB_REDIRECT_URI`):

```
https://app.raksha.ai/api/auth/github
```

Alias (also registered, returns the same 307 to GitHub — fixed 2026-08-15):

```
https://app.raksha.ai/auth/github
```

The auth router is registered twice in `backend/main.py`: once under the `/api` prefix (`app.include_router(auth_router, prefix="/api")`) and once without a prefix (`app.include_router(auth_router)`), with router prefix `/auth` (`backend/routers/auth.py`). The resulting routes are:

- `GET /api/auth/github` — starts the OAuth flow (307 redirect to GitHub) — **canonical**
- `GET /auth/github` — alias of the same flow (307 redirect to GitHub)
- `GET /api/auth/github/callback` — GitHub callback (code + state exchange) — **canonical**
- `GET /auth/github/callback` — alias of the same callback

Both aliases run the REAL OAuth flow; they add no security risk because the callback always uses the fixed `GITHUB_REDIRECT_URI`, never a user-supplied `redirect_uri`.

Note: the alias paths (`/auth/github`, `/auth/github/callback`) are NOT routed to the
container by the Cloudflare Worker config — only `/api/*` and `/health*` are. The
canonical `/api/auth/*` paths are the only ones reachable in production; the aliases
remain available on a direct container deployment.

## Backend OAuth Callback URL

The callback URL registered in the GitHub OAuth App — must match `GITHUB_REDIRECT_URI` exactly:

```
https://app.raksha.ai/api/auth/github/callback
```

## Frontend Login Configuration

The frontend builds the login URL as `/api/auth/github` (same origin — `VITE_API_URL`
may be left unset; `frontend/src/services/api.ts` falls back to the relative `/api` path).

- Frontend code: `frontend/src/store/WorkspaceContext.tsx` (`proceedGithubAuth`) and `frontend/src/services/api.ts`

## Cloudflare Environment Variables

Names only — never commit or print secrets. Non-secret values go in `vars` in
`cloudflare/wrangler.jsonc`; secrets are set with `wrangler secret put` (or the
dashboard).

| Variable | Location | Purpose |
|---|---|---|
| `APP_ENV` | vars | `production` |
| `FRONTEND_URL` | vars | `https://app.raksha.ai` (OAuth redirect + trusted hosts) |
| `BACKEND_URL` | vars | `https://app.raksha.ai` (trusted hosts) |
| `CORS_ORIGINS` | vars | `["https://app.raksha.ai"]` |
| `TRUSTED_HOSTS` | vars | `["app.raksha.ai", "*.workers.dev"]` (interim) |
| `GITHUB_CLIENT_ID` | vars | GitHub OAuth App client ID |
| `GITHUB_REDIRECT_URI` | vars | `https://app.raksha.ai/api/auth/github/callback` |
| `SECRET_KEY` | secret | Long random JWT signing key |
| `DATABASE_URL` | secret | PostgreSQL (Supabase) connection string |
| `ENCRYPTION_KEY` | secret | AES-256-GCM key for GitHub tokens at rest |
| `GITHUB_CLIENT_SECRET` | secret | GitHub OAuth App client secret |
| `GROQ_API_KEY` | secret | LLM provider key |

## GitHub OAuth App Configuration

Create/edit at https://github.com/settings/developers → OAuth Apps.

GitHub OAuth apps accept exactly ONE callback URL. For production:

- **Application name**: `RAKSHA`
- **Homepage URL**: `https://app.raksha.ai`
- **Authorization callback URL**: `https://app.raksha.ai/api/auth/github/callback`

The `GITHUB_REDIRECT_URI` env var must match this callback URL **exactly** (same scheme, host, port, path). If you also use localhost dev, create a separate OAuth App for local development (`http://localhost:8000/api/auth/github/callback`).

Requested scopes: `repo read:user user:email` (backend `github/oauth.py`).

## OAuth Flow

```
Frontend (CONNECT GITHUB)
        │ window.location = /api/auth/github   (same origin, https://app.raksha.ai)
        ▼
GET https://app.raksha.ai/api/auth/github
        │ Worker → container; 307 redirect, state token generated (CSRF)
        ▼
https://github.com/login/oauth/authorize?client_id=...&redirect_uri=https://app.raksha.ai/api/auth/github/callback&state=...
        │ user authorizes
        ▼
GitHub redirects → GET /api/auth/github/callback?code=...&state=...
        │ backend validates state, exchanges code for token,
        │ fetches /user, creates/updates DB user, mints JWT
        ▼
307 → https://app.raksha.ai/auth/callback?token=<JWT>
        │ frontend stores token in localStorage, loads profile
        ▼
Signed in
```

Security properties: OAuth `state` is generated per-request and validated on callback (`_oauth_states` in `backend/routers/auth.py`); invalid/missing state is rejected; the callback only accepts GitHub's redirects, never user-supplied `redirect_uri`. Client secrets live only in Cloudflare Worker Secrets — never in frontend code.

## Verification

```bash
# Health + GitHub config status (expect github_configured: true)
curl -s https://app.raksha.ai/api/health

# OpenAPI — expect the auth paths to appear
curl -s https://app.raksha.ai/api/openapi.json | python -m json.tool

# Login endpoint — expect 307 to github.com/login/oauth/authorize (canonical)
curl -s -o /dev/null -D - https://app.raksha.ai/api/auth/github

# Callback with no params — expect 307 to the frontend with error=missing_params
curl -s -o /dev/null -D - "https://app.raksha.ai/api/auth/github/callback"

# Browser test
# 1. Open https://app.raksha.ai
# 2. Sidebar → CONNECT GITHUB
# 3. Authorize on GitHub → redirected back signed-in
```

Verified: `2026-08-15` — the previous Render deployment returned 200 on `/api/health`
with `github_configured: true`, the auth paths present in `/api/openapi.json`,
`/api/auth/github` returned 307 to GitHub, the callback rejected missing params, and
CORS allowed only the Vercel origin. The `/auth/github` alias was added to
`backend/main.py` (dual router registration) and verified locally via the registered-route
list and TestClient (307 to GitHub). The Cloudflare deployment must be re-verified with
the checklist above after the first `wrangler deploy`.