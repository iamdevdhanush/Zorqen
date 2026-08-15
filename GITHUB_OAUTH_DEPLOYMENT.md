# RAKSHA GitHub OAuth Deployment

Production backend: `https://raksha-ai-b8wf.onrender.com` (Render Web Service)
Production frontend: `https://raksha-ai-pink.vercel.app` (Vercel)

## Backend OAuth Login URL

Canonical (used by the frontend and by `GITHUB_REDIRECT_URI`):

```
https://raksha-ai-b8wf.onrender.com/api/auth/github
```

Alias (also registered, returns the same 307 to GitHub — fixed 2026-08-15):

```
https://raksha-ai-b8wf.onrender.com/auth/github
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
https://raksha-ai-b8wf.onrender.com/api/auth/github/callback
```

(The `/auth/github/callback` alias is also registered and functional, but the GitHub OAuth App must use the `/api` version above.)

## Frontend Login Configuration

The frontend builds the login URL from `VITE_API_URL` (must end in `/api`) plus `/auth/github`.

- Vercel env var: `VITE_API_URL=https://raksha-ai-b8wf.onrender.com/api`
- Frontend code: `frontend/src/store/WorkspaceContext.tsx` (`proceedGithubAuth`) and `frontend/src/services/api.ts`
- Vite bakes `VITE_*` values in at build time → redeploy on Vercel after changing.

## Render Environment Variables

Names only — never commit or print secrets:

| Variable | Purpose |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL (Supabase) connection string |
| `SECRET_KEY` | Long random JWT signing key |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_REDIRECT_URI` | `https://raksha-ai-b8wf.onrender.com/api/auth/github/callback` |
| `FRONTEND_URL` | `https://raksha-ai-pink.vercel.app` |
| `BACKEND_URL` | `https://raksha-ai-b8wf.onrender.com` |
| `CORS_ORIGINS` | `["https://raksha-ai-pink.vercel.app"]` |
| `TRUSTED_HOSTS` | `["raksha-ai-b8wf.onrender.com"]` |
| `GROQ_API_KEY` | LLM provider key |
| `DEMO_MODE_ENABLED` | `true` (demo login available) |

## GitHub OAuth App Configuration

Create/edit at https://github.com/settings/developers → OAuth Apps.

GitHub OAuth apps accept exactly ONE callback URL. For production:

- **Application name**: `RAKSHA`
- **Homepage URL**: `https://raksha-ai-pink.vercel.app`
- **Authorization callback URL**: `https://raksha-ai-b8wf.onrender.com/api/auth/github/callback`

The `GITHUB_REDIRECT_URI` env var must match this callback URL **exactly** (same scheme, host, port, path). If you also use localhost dev, create a separate OAuth App for local development (`http://localhost:8000/api/auth/github/callback`).

Requested scopes: `repo read:user user:email` (backend `github/oauth.py`).

## OAuth Flow

```
Frontend (CONNECT GITHUB)
        │ window.location = {VITE_API_URL}/auth/github   → https://raksha-ai-b8wf.onrender.com/api/auth/github
        ▼
GET https://raksha-ai-b8wf.onrender.com/api/auth/github   (alias: /auth/github — same flow)
        │ 307 redirect, state token generated (CSRF)
        ▼
https://github.com/login/oauth/authorize?client_id=...&redirect_uri=https://raksha-ai-b8wf.onrender.com/api/auth/github/callback&state=...
        │ user authorizes
        ▼
GitHub redirects → GET /api/auth/github/callback?code=...&state=...
        │ backend validates state, exchanges code for token,
        │ fetches /user, creates/updates DB user, mints JWT
        ▼
307 → https://raksha-ai-pink.vercel.app/auth/callback?token=<JWT>
        │ frontend stores token in localStorage, loads profile
        ▼
Signed in
```

Security properties: OAuth `state` is generated per-request and validated on callback (`_oauth_states` in `backend/routers/auth.py`); invalid/missing state is rejected; the callback only accepts GitHub's redirects, never user-supplied `redirect_uri`. Client secrets live only in Render env vars — never in frontend code.

## Verification

```bash
# Health + GitHub config status (expect github_configured: true)
curl -s https://raksha-ai-b8wf.onrender.com/api/health

# OpenAPI — expect the auth paths to appear
curl -s https://raksha-ai-b8wf.onrender.com/api/openapi.json | python -m json.tool

# Login endpoint — expect 307 to github.com/login/oauth/authorize (canonical + alias)
curl -s -o /dev/null -D - https://raksha-ai-b8wf.onrender.com/api/auth/github
curl -s -o /dev/null -D - https://raksha-ai-b8wf.onrender.com/auth/github

# Callback with no params — expect 307 to the frontend with error=missing_params
curl -s -o /dev/null -D - "https://raksha-ai-b8wf.onrender.com/api/auth/github/callback"

# Browser test
# 1. Open https://raksha-ai-pink.vercel.app
# 2. Sidebar → CONNECT GITHUB
# 3. Authorize on GitHub → redirected back signed-in
```

Verified: `2026-08-15` — deployed server returns 200 on `/api/health` with `github_configured: true`, the auth paths are present in `/api/openapi.json`, `/api/auth/github` returns 307 to GitHub, the callback rejects missing params, and CORS allows only the Vercel origin. The `/auth/github` alias was added to `backend/main.py` (dual router registration) and verified locally via the registered-route list and TestClient (307 to GitHub); it must be deployed to Render (commit + push triggers an auto-redeploy) for the production `/auth/github` URL to stop returning 404.
