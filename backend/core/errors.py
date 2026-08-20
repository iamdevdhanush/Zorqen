"""
ZORQEN Backend — Consistent error handling & response envelope
"""
from __future__ import annotations

import time
from typing import Any, Dict, Optional

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

log = structlog.get_logger()


def structured_error(
    *,
    stage: str,
    code: str,
    message: str,
    status_code: int = 400,
    **extra: Any,
) -> HTTPException:
    """Build a structured error response for the pipeline API.

    Every stage failure returns the same machine-readable contract instead
    of a generic 503:

        {
          "success": false,
          "stage": "repository_clone",
          "code": "GITHUB_RATE_LIMIT",
          "message": "GitHub API rate limit exceeded.",
          ...
        }

    `detail` carries the whole envelope so clients can read either
    `detail.code` / `detail.message` (structured) or fall back to the
    default `detail` string.
    """
    payload: Dict[str, Any] = {
        "success": False,
        "stage": stage,
        "code": code,
        "message": message,
    }
    payload.update(extra)
    return HTTPException(status_code=status_code, detail=payload)


class AppError(Exception):
    """Base application error with an HTTP status and optional error code."""

    def __init__(self, message: str, status_code: int = 400, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code or "app_error"


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", code: str = "not_found"):
        super().__init__(message, status_code=404, code=code)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists", code: str = "conflict"):
        super().__init__(message, status_code=409, code=code)


class RateLimitError(AppError):
    def __init__(self, message: str = "Too many requests", code: str = "rate_limited"):
        super().__init__(message, status_code=429, code=code)


def register_error_handlers(app: FastAPI) -> None:
    """Register JSON error handlers that wrap errors in a stable envelope.

    Envelope: {"ok": false, "error": {"code": ..., "message": ...}, "request_id": ...}
    """

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        request_id = getattr(request.state, "request_id", None)
        log.warning(
            "app_error",
            request_id=request_id,
            path=request.url.path,
            error=exc.message,
            code=exc.code,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "ok": False,
                "request_id": request_id,
                "error": {"code": exc.code, "message": exc.message},
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)
        log.exception(
            "unhandled_error",
            request_id=request_id,
            path=request.url.path,
            error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "request_id": request_id,
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred.",
                },
            },
        )


def now_ms() -> int:
    return int(time.time() * 1000)
