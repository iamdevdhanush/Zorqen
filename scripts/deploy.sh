#!/usr/bin/env bash
# =============================================================================
# ZORQEN — Production deploy + Cloudflare cache purge
# =============================================================================
# Usage:
#   VITE_API_URL=https://zorqen-api.onrender.com ./scripts/deploy.sh
#
# Optional env vars:
#   CF_API_TOKEN   Cloudflare API token (Cache Purge permission on the zone)
#   CF_ZONE_ID     Cloudflare Zone ID (from the zone dashboard overview)
#   CF_WORKER_NAME Cloudflare Worker name (default: zorqen)
#
# The script:
#   1. Builds the frontend with the production API URL baked in.
#   2. Deploys the Cloudflare Worker + static assets with wrangler.
#   3. Purges the Cloudflare edge cache so every user immediately gets the
#      new index.html without waiting for TTL expiry.
#
# Cache strategy after deploy:
#   /assets/*   → Cache-Control: public, max-age=31536000, immutable
#   index.html  → Cache-Control: public, max-age=0, must-revalidate
#   other       → Cache-Control: public, max-age=300
# =============================================================================

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
CLOUDFLARE_DIR="${REPO_ROOT}/cloudflare"

CF_WORKER_NAME="${CF_WORKER_NAME:-zorqen}"

# ─── Validate ─────────────────────────────────────────────────────────────────

if [[ -z "${VITE_API_URL:-}" ]]; then
  echo "❌ VITE_API_URL is not set."
  echo "   Export it before running: VITE_API_URL=https://zorqen-api.onrender.com ./scripts/deploy.sh"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ZORQEN production deploy"
echo " API URL : ${VITE_API_URL}"
echo " Worker  : ${CF_WORKER_NAME}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Build the frontend ───────────────────────────────────────────────

echo "▶  Building frontend (VITE_API_URL=${VITE_API_URL})..."
cd "${FRONTEND_DIR}"
npm ci --prefer-offline
VITE_API_URL="${VITE_API_URL}" npm run build
echo "✓  Frontend build complete → ${FRONTEND_DIR}/dist"
echo ""

# ─── Step 2: Deploy to Cloudflare ─────────────────────────────────────────────

echo "▶  Deploying to Cloudflare (wrangler deploy)..."
cd "${CLOUDFLARE_DIR}"
npm ci --prefer-offline
npx wrangler deploy
echo "✓  Cloudflare deploy complete"
echo ""

# ─── Step 3: Purge Cloudflare edge cache ──────────────────────────────────────
#
# The Worker sets Cache-Control: public, max-age=0, must-revalidate on all HTML
# responses. This means the *browser* always revalidates before serving from its
# local cache. However, Cloudflare's *edge* can still cache a stale response if
# a Cache Rule or the zone's default settings have an Edge Cache TTL > 0.
#
# Running a cache purge after every deploy is the safest belt-and-suspenders
# guarantee that every Cloudflare edge PoP immediately serves the new index.html.

if [[ -n "${CF_API_TOKEN:-}" ]] && [[ -n "${CF_ZONE_ID:-}" ]]; then
  echo "▶  Purging Cloudflare edge cache..."

  # Purge Everything — invalidates all cached assets on the zone.
  # This is the safest option after a production deploy.
  PURGE_RESPONSE=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything": true}')

  if echo "${PURGE_RESPONSE}" | grep -q '"success":true'; then
    echo "✓  Cloudflare edge cache purged (purge_everything)"
  else
    echo "⚠  Cache purge may have failed. Response:"
    echo "${PURGE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${PURGE_RESPONSE}"
    echo ""
    echo "   Manually purge at: https://dash.cloudflare.com → Caching → Configuration → Purge Everything"
  fi
else
  echo "ℹ  Skipping Cloudflare cache purge (CF_API_TOKEN and/or CF_ZONE_ID not set)."
  echo ""
  echo "   To enable automatic purge, set:"
  echo "     CF_API_TOKEN=<token with Cache Purge permission>"
  echo "     CF_ZONE_ID=<zone ID from the Cloudflare dashboard>"
  echo ""
  echo "   Or purge manually:"
  echo "     Cloudflare Dashboard → your domain → Caching → Configuration → Purge Everything"
  echo ""
  echo "   Or purge specific URLs:"
  echo "     curl -X POST 'https://api.cloudflare.com/client/v4/zones/\$CF_ZONE_ID/purge_cache' \\"
  echo "       -H 'Authorization: Bearer \$CF_API_TOKEN' \\"
  echo "       -H 'Content-Type: application/json' \\"
  echo "       --data '{\"files\":[\"https://app.zorqen.ai/\",\"https://app.zorqen.ai/index.html\"]}'"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✅  Deploy complete"
echo ""
echo " Verify:"
echo "   curl -I https://app.zorqen.ai/ | grep -i cache-control"
echo "   # Expected: Cache-Control: public, max-age=0, must-revalidate"
echo ""
echo "   curl -I https://app.zorqen.ai/assets/<latest-chunk>.js | grep -i cache-control"
echo "   # Expected: Cache-Control: public, max-age=31536000, immutable"
echo "═══════════════════════════════════════════════════════════════"
echo ""
