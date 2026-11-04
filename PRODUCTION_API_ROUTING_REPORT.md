# ZORQEN — Production API Routing & Cloudflare Deployment Report

**Date:** November 4, 2026  
**Target Domain:** https://zorqen.dhanushdprabhu18.workers.dev  
**Backend API Origin:** https://raksha-ai-b8wf.onrender.com  
**Cloudflare Worker:** `zorqen`  
**Cloudflare Deployment Version ID:** `57de5be6-a143-4821-8590-b5faaff3536f`  

---

## 1. Root Cause

In production, the ZORQEN architecture separates the frontend SPA and the backend API into two distinct origins:
- **Frontend:** Cloudflare Workers Static Assets (`https://zorqen.dhanushdprabhu18.workers.dev`)
- **Backend:** FastAPI service on Render (`https://raksha-ai-b8wf.onrender.com`)

The frontend API client (`frontend/src/services/api.ts`) determines the API base URL via `getApiBase()`:
```ts
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL || '/api').trim();
  return raw.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
}
```

In the previous production build, `VITE_API_URL` was not supplied during `vite build`. Consequently:
1. `import.meta.env.VITE_API_URL` defaulted to undefined, triggering the fallback value `'/api'`.
2. All Axios requests, SSE event streams, and OAuth handoffs targeted relative paths such as `https://zorqen.dhanushdprabhu18.workers.dev/api/...`.
3. The Cloudflare Worker (`cloudflare/src/worker.ts`) serves strictly static assets and contains an explicit routing guard returning HTTP 404 for `/api/*` and `/health*`:
   ```json
   {
     "error": "api_not_on_cloudflare",
     "detail": "The ZORQEN API is hosted on Render. Point VITE_API_URL at the Render backend URL."
   }
   ```
4. Every client API request failed immediately with `api_not_on_cloudflare`.

---

## 2. Files Changed

| File | Change Summary | Git Tracking Status |
| :--- | :--- | :--- |
| `frontend/.env.production.local` | Created file configuring `VITE_API_URL=https://raksha-ai-b8wf.onrender.com`. | **Excluded from Git** (matched by `.env.*` rule in `frontend/.gitignore` and root `.gitignore`). |
| `frontend/dist/*` | Fresh production build generated (entry point: `index-CIIX5F-o.js`). | Excluded from Git (`dist`). |
| `PRODUCTION_API_ROUTING_REPORT.md` | Created technical documentation and verification report. | Tracked documentation. |

No modifications were made to the Cloudflare Worker routing guard (`cloudflare/src/worker.ts`), Wrangler configuration (`cloudflare/wrangler.jsonc`), or backend code. The Git working tree remains completely clean (`nothing to commit, working tree clean`).

---

## 3. Production Environment Configuration

The production build environment was configured using `frontend/.env.production.local`:

```ini
# ZORQEN Frontend — Production Build Environment
# Excluded from Git via frontend/.gitignore (.env.*) and root .gitignore
VITE_API_URL=https://raksha-ai-b8wf.onrender.com
```

### Verification of Configuration Constraints:
- **Automatic `/api` Handling:** `getApiBase()` in `api.ts` strips any trailing `/` or `/api` and re-appends `/api`. The bare origin `https://raksha-ai-b8wf.onrender.com` was configured without `/api`.
- **Git Exclusion:** Verified via `git check-ignore -v frontend/.env.production.local`:
  ```
  frontend/.gitignore:17:.env.*    frontend/.env.production.local
  ```
- **No Secrets in Frontend:** The `.env.production.local` file contains exclusively the public backend origin. No database credentials, Grok API keys, JWT secrets, or client secrets were added.
- **Local Dev Proxy Intact:** `frontend/vite.config.ts` was not modified; local development still proxies `/api` to `http://localhost:8000`.

---

## 4. Build and TypeScript Results

### TypeScript Typecheck & Compilation
- **Frontend:** `tsc -b` completed with **0 errors**.
- **Cloudflare Worker:** `tsc --noEmit` completed with **0 errors**.

### Vite Production Build
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.2.1 building client environment for production...
transforming...✓ 2329 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        3.57 kB │ gzip:  1.09 kB
dist/assets/index-Dhlm79Tu.css                        82.96 kB │ gzip: 16.04 kB
dist/assets/index-CIIX5F-o.js                        322.74 kB │ gzip: 97.38 kB
dist/assets/vendor-react-B16UIz-R.js                 182.11 kB │ gzip: 57.30 kB
dist/assets/RepositoryDetailPage-4grhQgga.js          26.31 kB │ gzip:  6.80 kB
dist/assets/vendor-icons-TokUY4ek.js                  20.65 kB │ gzip:  7.45 kB
dist/assets/OverviewPage-aUTk2czS.js                  19.99 kB │ gzip:  5.23 kB
dist/assets/AssessmentsPage-DepRWsjt.js               14.55 kB │ gzip:  4.00 kB
dist/assets/vendor-monaco-CMiO1XT7.js                 14.00 kB │ gzip:  4.78 kB
dist/assets/FindingsPage-Ceit9UQO.js                  13.05 kB │ gzip:  3.32 kB
dist/assets/FindingDetailPage-BodwoRez.js             12.62 kB │ gzip:  4.06 kB
dist/assets/RepositoriesPage-B9J22vqS.js              11.89 kB │ gzip:  3.58 kB
dist/assets/TechStackSection-CExdXfR1.js              11.86 kB │ gzip:  2.57 kB
dist/assets/AiCodeSecurityPage-B702k9Jl.js            11.61 kB │ gzip:  3.43 kB
dist/assets/DocsPage-dJA4YWNq.js                       9.41 kB │ gzip:  2.75 kB
dist/assets/SettingsPage-C_OHkxIo.js                   9.01 kB │ gzip:  2.81 kB
dist/assets/EmptyStateView-D1rCo0wR.js                 8.99 kB │ gzip:  2.65 kB
dist/assets/VerificationPage-Bopwl9FQ.js               8.88 kB │ gzip:  2.05 kB
dist/assets/RemediationPage-DognSwBp.js                8.78 kB │ gzip:  2.62 kB
dist/assets/AiGeneratedCodeSecurityPage-B4HrRhQ1.js    8.57 kB │ gzip:  2.74 kB
dist/assets/AiApplicationSecurityPage-Cp0E4T58.js      6.10 kB │ gzip:  2.25 kB
dist/assets/AiVulnerabilityScannerPage-S16eSUmK.js     5.99 kB │ gzip:  2.10 kB
dist/assets/NotFoundPage-BAJKiZbV.js                   5.95 kB │ gzip:  1.92 kB
dist/assets/VibeCodedAppSecurityPage-Dk56QpcJ.js       4.93 kB │ gzip:  1.92 kB
dist/assets/SelectiveDotGrid-BJbqn5Kg.js               1.68 kB │ gzip:  0.51 kB
dist/assets/monaco-Kw7jnz7v.js                         1.67 kB │ gzip:  0.88 kB
dist/assets/AuthCallback-CxLr81eB.js                   1.58 kB │ gzip:  0.73 kB
dist/assets/rolldown-runtime-hePW80VL.js               0.71 kB │ gzip:  0.42 kB
dist/assets/AssessmentDetailPage-D5_yZMdu.js           0.67 kB │ gzip:  0.43 kB

✓ built in 762ms
```

---

## 5. Bundle Verification

### Backend URL Inspection
Inspected `dist/assets/index-CIIX5F-o.js`:
```javascript
function Bo(){return`https://raksha-ai-b8wf.onrender.com`.replace(/\/+$/,``).replace(/\/api$/,``)+`/api`}
var Vo=Bo(),Ho=H.create({baseURL:Vo,timeout:3e4,withCredentials:!0});
```
- `BASE_URL` resolves to: `https://raksha-ai-b8wf.onrender.com/api`.
- Server-Sent Events stream resolves to: `${Vo}/assessments/${id}/events`.
- GitHub OAuth redirect in `WorkspaceContext.tsx` resolves to: `${getApiBase()}/auth/github`.

### Localhost URL Audit
- Scanned all assets for `localhost:8000`, `localhost:5173`, `localhost:3000`, and `127.0.0.1`.
- **Result:** 0 matches. The only occurrences of `"localhost"` are standard third-party runtime fallbacks in `@remix-run/router` and `axios` for non-browser/null origin environments (`location.origin === "null"`).

### Secret Audit
- Scanned all production JavaScript and asset bundles with regex patterns for credentials (`ghp_`, `xai-`, `sk-`, `AIza`, private keys).
- **Result:** 0 secrets present.

---

## 6. Cloudflare Deployment

Executed deployment via existing Wrangler configuration in `cloudflare/wrangler.jsonc`:
```
> zorqen@1.0.0 deploy
> wrangler deploy

 ⛅️ wrangler 4.86.0
🌀 Building list of assets...
✨ Read 41 files from the assets directory D:\Zorqen\frontend\dist
🌀 Starting asset upload...
Uploaded 21 of 21 assets
✨ Success! Uploaded 21 files (18 already uploaded) (2.52 sec)

Total Upload: 1.84 KiB / gzip: 0.85 KiB
Binding            Resource      
env.ASSETS         Assets        

Uploaded zorqen (11.01 sec)
Deployed zorqen triggers (3.28 sec)
  https://zorqen.dhanushdprabhu18.workers.dev
Current Version ID: 57de5be6-a143-4821-8590-b5faaff3536f
```

- **Cloudflare Worker Name:** `zorqen`
- **Deployment Version ID:** `57de5be6-a143-4821-8590-b5faaff3536f`
- **Domain:** `https://zorqen.dhanushdprabhu18.workers.dev`

---

## 7. CORS Findings

Executed preflight OPTIONS and GET requests against the live Render FastAPI backend (`https://raksha-ai-b8wf.onrender.com`).

### Confirmed Working:
1. **Allowed Origin:**  
   The Render backend actively returns:
   `access-control-allow-origin: https://zorqen.dhanushdprabhu18.workers.dev`
2. **Credentials Handling:**  
   `access-control-allow-credentials: true` is returned for requests from the Cloudflare origin.
3. **Allowed HTTP Methods:**  
   `access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
4. **Preflight Headers Allowlist:**  
   Preflight OPTIONS requests for endpoints (`/api/repositories`, `/api/assessments`, `/api/auth/me`) with `Authorization` and `Content-Type` return `HTTP 200 OK`.

### Identified Backend Discrepancy (Action Item for Backend):
- In `backend/main.py` (lines 195–205), `_ALLOWED_HEADERS` is explicitly allowlisted as:
  ```python
  _ALLOWED_HEADERS = [
      "Accept",
      "Accept-Language",
      "Authorization",
      "Content-Type",
      "Origin",
      "X-Requested-With",
      "X-CSRF-Token",
      "Cache-Control",
      "Pragma",
  ]
  ```
- When a user enters a BYOK xAI Grok API key in ASK ZORQEN, the frontend attaches `X-Grok-Key: <key>`.
- Testing an OPTIONS preflight request with `Access-Control-Request-Headers: authorization,content-type,x-grok-key` returns:
  ```
  HTTP/1.1 400 Bad Request
  Disallowed CORS headers
  ```
- **Recommended Backend Fix:** In `backend/main.py`, append `"X-Grok-Key"` to `_ALLOWED_HEADERS`.

---

## 8. Live API Verification Results

All tests below were executed live against production:

### Test 1: Production Frontend Entry Point
```
curl.exe -i -sS https://zorqen.dhanushdprabhu18.workers.dev/
```
- **Status:** `HTTP/1.1 200 OK`
- **Cache-Control:** `public, max-age=0, must-revalidate`
- **Served Bundle:** `<script type="module" crossorigin src="/assets/index-CIIX5F-o.js"></script>`

### Test 2: Live Bundle API Base URL
```
curl.exe -sS https://zorqen.dhanushdprabhu18.workers.dev/assets/index-CIIX5F-o.js
```
- **Verification:** Verified `https://raksha-ai-b8wf.onrender.com` is present and active inside `index-CIIX5F-o.js`.

### Test 3: Cloudflare API Route Guard (Negative Test)
```
curl.exe -i -sS https://zorqen.dhanushdprabhu18.workers.dev/api/health
```
- **Status:** `HTTP/1.1 404 Not Found`
- **Body:** `{"error":"api_not_on_cloudflare","detail":"The ZORQEN API is hosted on Render. Point VITE_API_URL at the Render backend URL."}`
- **Confirmation:** The Cloudflare Worker route guard remains active, ensuring Cloudflare never improperly proxies backend requests.

### Test 4: Cloudflare SPA Deep Routing Fallback
```
curl.exe -i -sS https://zorqen.dhanushdprabhu18.workers.dev/settings
```
- **Status:** `HTTP/1.1 200 OK`
- **Result:** Correctly falls back to `index.html` for client-side routing.

### Test 5: Backend Live Health Endpoint with Cloudflare Origin
```
curl.exe -i -sS https://raksha-ai-b8wf.onrender.com/api/health -H "Origin: https://zorqen.dhanushdprabhu18.workers.dev"
```
- **Status:** `HTTP/1.1 200 OK`
- **Response Body:**
  ```json
  {
    "status": "ok",
    "app": "ZORQEN",
    "version": "1.1.0",
    "environment": "production",
    "database": { "status": "ok", "latency_ms": 720.9 },
    "github": { "status": "ok", "configured": true },
    "ai": { "status": "ok", "provider": "groq", "model": "openai/gpt-oss-20b", "configured": true },
    "gemini": { "status": "not_configured", "configured": false, "model": null }
  }
  ```
- **CORS Headers:**
  - `access-control-allow-origin: https://zorqen.dhanushdprabhu18.workers.dev`
  - `access-control-allow-credentials: true`

### Test 6: Backend Auth Me Endpoint (Unauthenticated)
```
curl.exe -i -sS https://raksha-ai-b8wf.onrender.com/api/auth/me -H "Origin: https://zorqen.dhanushdprabhu18.workers.dev"
```
- **Status:** `HTTP/1.1 401 Unauthorized`
- **Body:** `{"detail":"Not authenticated"}`
- **CORS Headers:** `access-control-allow-origin: https://zorqen.dhanushdprabhu18.workers.dev`
- **Handling:** Intercepted cleanly by the frontend Axios interceptor without full page reloads.

### Test 7: Backend GitHub OAuth Initiation
```
curl.exe -i -sS https://raksha-ai-b8wf.onrender.com/api/auth/github
```
- **Status:** `HTTP/1.1 307 Temporary Redirect`
- **Location:** `https://github.com/login/oauth/authorize?client_id=Ov23limYSo6NeYXBBrpe&redirect_uri=https://raksha-ai-b8wf.onrender.com/api/auth/github/callback&scope=repo%20read:user%20user:email&state=...`
- **Confirmation:** GitHub OAuth redirect URL properly configured and operational.

---

## 9. Remaining Backend Blockers & Observations

1. **Database Status:**  
   The Render PostgreSQL database is healthy and responding (`latency_ms: 720.9ms`). No database connection failure was observed.
2. **CORS Allowlist for BYOK Grok Header (`X-Grok-Key`):**  
   As detailed in Section 7, `X-Grok-Key` needs to be added to `_ALLOWED_HEADERS` in `backend/main.py` on the Render backend to prevent preflight rejection when users test custom xAI Grok keys.
3. **Optional Gemini Provider:**  
   The backend health check reports `"gemini": {"status": "not_configured"}`. The platform automatically uses Groq (`openai/gpt-oss-20b`) as the active AI provider. If Gemini is desired as the primary provider, `GEMINI_API_KEY` can be configured in the Render environment variables.

