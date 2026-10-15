"""
ZORQEN — Security Headers Middleware

Adds production-grade HTTP security headers to every response.
Never exposes server internals. Follows OWASP recommendations.
"""
from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers on every response.

    Headers added:
    - X-Content-Type-Options: Prevent MIME sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Legacy XSS filter hint (belt-and-suspenders)
    - Referrer-Policy: Limit referrer information leakage
    - Permissions-Policy: Restrict powerful browser features
    - X-Request-ID: Echo the request ID for client-side correlation

    CSP is intentionally not set here — it requires application-specific
    tuning and should be configured via the deployment layer (Nginx, CDN).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Prevent MIME-type confusion attacks
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent the page from being embedded in frames (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"

        # Legacy XSS protection header (still respected by some browsers/proxies)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Limit referrer information sent to third-party origins
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable powerful browser features not needed by this API
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )

        # Echo the request ID for client-server correlation
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            response.headers["X-Request-ID"] = str(request_id)

        # Remove the Server header to avoid fingerprinting
        if "server" in response.headers:
            del response.headers["server"]

        return response
