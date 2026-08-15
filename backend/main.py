"""
RAKSHA — FastAPI Application Entry Point
"""
from __future__ import annotations

import asyncio
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core.config import settings, database_target, detect_database_placeholder
from core.database import init_db
from core.errors import register_error_handlers
from core.logging import configure_logging
from core.middleware import RequestContextMiddleware
from routers.auth import router as auth_router
from routers.demo import router as demo_router
from routers.api import (
    repos_router,
    assessments_router,
    findings_router,
    copilot_router,
)
from routers.overview import router as overview_router
from routers.activity import router as activity_router

configure_logging()
log = structlog.get_logger()

limiter = Limiter(key_func=get_remote_address)


def run_migrations() -> None:
    """Apply Alembic migrations at startup."""
    from pathlib import Path
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parent
    cfg = Config(str(backend_root / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_root / "alembic"))
    cfg.set_main_option("prepend_sys_path", str(backend_root))
    command.upgrade(cfg, "head")


_INSECURE_SECRETS = {
    "dev-secret-key-change-in-production",
    "change-this-to-a-long-random-secret-key-in-production",
}


def _assert_production_safety() -> None:
    """Refuse to boot production with development defaults."""
    if settings.app_env != "development" and settings.secret_key in _INSECURE_SECRETS:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong random value when APP_ENV=production"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    _assert_production_safety()
    log.info(
        "RAKSHA starting up",
        version="1.1.0",
        env=settings.app_env,
        database="postgres" if settings.is_postgres else "sqlite",
        target=database_target(settings.database_url),
    )
    try:
        # Alembic's env.py uses asyncio.run(); run it in a worker thread so it
        # gets its own event loop instead of clashing with the app's running loop.
        await asyncio.to_thread(run_migrations)
        log.info("Database migrations applied")
        await init_db()
        log.info("Database initialized")
    except Exception:
        # Uvicorn exits with status 3 (STARTUP_FAILURE) and suppresses the real
        # error, so surface the cause here before re-raising.
        placeholder = detect_database_placeholder(settings.database_url)
        if placeholder:
            hint = (
                "DATABASE_URL still contains the documentation placeholder "
                f"({placeholder}). Replace it with a real connection string from "
                "your database provider (Render: New -> PostgreSQL, then copy the "
                "Internal Database URL and change the scheme to "
                "'postgresql+asyncpg://')."
            )
        else:
            hint = (
                "Check that DATABASE_URL is set and reachable, that the database "
                "exists, and that this host is allowed to connect. Render Postgres "
                "URLs are typically 'postgresql+asyncpg://...' (async driver required)."
            )
        log.exception(
            "database_startup_failed",
            database="postgres" if settings.is_postgres else "sqlite",
            target=database_target(settings.database_url),
            placeholder=placeholder,
            hint=hint,
        )
        raise
    from demo.seed import ensure_demo_data
    from core.database import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as seed_db:
            await ensure_demo_data(seed_db)
    except Exception:
        log.exception("demo_seed_failed")
        raise
    log.info("Demo workspace ready" if settings.demo_mode_enabled else "Demo mode disabled")
    yield
    log.info("RAKSHA shutting down")


app = FastAPI(
    title="RAKSHA API",
    description="AI-Powered Autonomous Security Validation & Vulnerability Remediation Platform",
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={
            "ok": False,
            "request_id": getattr(request.state, "request_id", None),
            "error": {"code": "rate_limited", "message": "Too many requests — slow down."},
        },
    )


# ── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"] if settings.is_development else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.is_development else settings.trusted_hosts_list,
)
app.add_middleware(RequestContextMiddleware)

register_error_handlers(app)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router, prefix="/api")

# GitHub OAuth is also reachable WITHOUT the /api prefix so that both
# /auth/github and /api/auth/github work (users and health-checkers commonly
# hit /auth/github directly). Both run the REAL OAuth flow against the same
# code. The /api/auth/* paths remain the canonical routes — the frontend API
# client builds its login URL from VITE_API_URL (which ends in /api) and
# GITHUB_REDIRECT_URI / the GitHub OAuth App callback point at
# /api/auth/github/callback. The prefix-less aliases add no security risk
# because the callback always uses the fixed GITHUB_REDIRECT_URI, never a
# user-supplied redirect_uri.
app.include_router(auth_router)

app.include_router(demo_router, prefix="/api")
app.include_router(repos_router, prefix="/api")
app.include_router(assessments_router, prefix="/api")
app.include_router(findings_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(overview_router, prefix="/api")
app.include_router(activity_router, prefix="/api")


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.1.0",
        "github_configured": settings.github_configured,
        "ai_provider": settings.ai_provider,
        "ai_configured": settings.ai_configured,
        "demo_mode": settings.demo_mode_enabled,
        "database": "postgres" if settings.is_postgres else "sqlite",
    }


@app.get("/")
async def root():
    return {
        "message": "RAKSHA — Find it. Fix it. Prove it.",
        "docs": "/api/docs",
        "health": "/api/health",
    }
