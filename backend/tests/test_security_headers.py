"""
ZORQEN — Security Headers Middleware Regression Tests

Verifies:
1. Security headers are injected on successful responses.
2. Security headers are injected on error responses (404, 401).
3. The 'Server' header is completely removed from responses (fingerprint prevention).
4. X-Request-ID is echoed when present.
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from starlette.requests import Request

from core.security_headers import SecurityHeadersMiddleware
from main import app


def test_security_headers_on_success():
    """Verify all OWASP security headers on successful HTTP responses."""
    with TestClient(app) as client:
        resp = client.get("/api/health")
        assert resp.status_code in (200, 503)

        # Server header must be absent
        assert "server" not in resp.headers
        assert resp.headers.get("Server") is None

        # Standard OWASP headers
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"
        assert resp.headers.get("x-xss-protection") == "1; mode=block"
        assert resp.headers.get("referrer-policy") in ("strict-origin-when-cross-origin", "no-referrer")
        assert (
            resp.headers.get("permissions-policy")
            == "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )


def test_security_headers_on_404_error():
    """Verify security headers are still present on 404 Not Found error responses."""
    with TestClient(app) as client:
        resp = client.get("/api/nonexistent-route-for-testing")
        assert resp.status_code == 404

        assert "server" not in resp.headers
        assert resp.headers.get("Server") is None
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"
        assert resp.headers.get("x-xss-protection") == "1; mode=block"
        assert resp.headers.get("referrer-policy") in ("strict-origin-when-cross-origin", "no-referrer")


def test_security_headers_on_401_error():
    """Verify security headers are present on 401 Unauthorized responses."""
    with TestClient(app) as client:
        resp = client.get("/api/auth/token")
        assert resp.status_code == 401

        assert "server" not in resp.headers
        assert resp.headers.get("Server") is None
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"


def test_security_headers_removes_server_header_if_set_by_handler():
    """Verify that an explicit Server header set by a handler is stripped by middleware."""
    test_app = FastAPI()
    test_app.add_middleware(SecurityHeadersMiddleware)

    @test_app.get("/with-server")
    async def handler_with_server():
        response = JSONResponse({"status": "ok"})
        response.headers["Server"] = "uvicorn-fingerprint-leak"
        return response

    with TestClient(test_app) as client:
        resp = client.get("/with-server")
        assert resp.status_code == 200
        assert "server" not in resp.headers
        assert resp.headers.get("Server") is None
        assert resp.headers.get("x-content-type-options") == "nosniff"


def test_security_headers_echoes_request_id():
    """Verify X-Request-ID is attached when request.state.request_id is populated."""
    test_app = FastAPI()

    @test_app.middleware("http")
    async def fake_request_id_middleware(request: Request, call_next):
        request.state.request_id = "test-req-id-12345"
        return await call_next(request)

    test_app.add_middleware(SecurityHeadersMiddleware)

    @test_app.get("/req-id-test")
    async def req_id_handler():
        return {"status": "ok"}

    with TestClient(test_app) as client:
        resp = client.get("/req-id-test")
        assert resp.status_code == 200
        assert resp.headers.get("x-request-id") == "test-req-id-12345"
