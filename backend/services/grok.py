"""ZORQEN — Groq Copilot LLM Service.

Standardized exclusively on Groq API for:
  - ASK ZORQEN investigation copilot
  - Repository security assessments
  - AI-powered vulnerability analysis
  - Security recommendations and remediation

Server-side ONLY:
  GROQ_API_KEY lives in the server environment. Keys are never exposed to
  the frontend, never sent in request headers, and never written to logs.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import structlog

from core.config import settings

try:
    from groq import (
        APIError as GroqAPIErrorCls,
        APIConnectionError,
        APITimeoutError,
        AuthenticationError,
        PermissionDeniedError,
        RateLimitError,
    )
except ImportError:  # pragma: no cover — groq SDK is a declared dependency
    GroqAPIErrorCls = Exception
    APIConnectionError = Exception
    APITimeoutError = Exception
    AuthenticationError = Exception
    PermissionDeniedError = Exception
    RateLimitError = Exception

log = structlog.get_logger()


class GrokConfigurationError(RuntimeError):
    """Raised when no copilot LLM is configured (GROQ_API_KEY missing)."""

    code = "GROQ_CONFIGURATION_ERROR"


# Alias for explicit Groq naming
GroqConfigurationError = GrokConfigurationError


class GrokAPIError(RuntimeError):
    """Raised when the LLM provider rejects or fails to produce a usable answer.

    `code` is a safe, loggable category (never contains secrets or provider
    payloads): GROQ_AUTH_ERROR | GROQ_RATE_LIMIT | GROQ_TIMEOUT | GROQ_API_ERROR | GROQ_MODEL_ERROR.
    """

    def __init__(
        self,
        message: str,
        *,
        status: Optional[int] = None,
        code: str = "GROQ_API_ERROR",
    ):
        super().__init__(message)
        self.status = status
        self.code = code


# Alias for explicit Groq naming
GroqAPIError = GrokAPIError


class GrokService:
    """Async wrapper around Groq API for the ASK ZORQEN copilot."""

    def __init__(self) -> None:
        self.last_provider: str = "groq"

    async def aclose(self) -> None:
        """Cleanup handler (Groq client lifecycle is handled by llm_client)."""
        pass

    async def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int = 1200,
        temperature: float = 0.2,
        _retries: int = 1,
    ) -> str:
        """Return a grounded answer from the server-side Groq provider.

        Bounded retry: transient failures (timeout, transport, 5xx) are retried
        at most `_retries` times with a short backoff. Authentication (401/403),
        configuration, rate-limit (429), and model-unavailable (404) responses are
        NEVER retried.

        Raises GrokConfigurationError or GrokAPIError on failure. Never leaks
        API keys or raw provider details to callers or logs.
        """
        if not settings.groq_configured:
            raise GrokConfigurationError("GROQ_API_KEY is not configured on the server")

        from agents.llm_client import llm as groq_llm, ModelNotFoundError, sanitize_secret_str

        self.last_provider = "groq"

        for attempt in range(_retries + 1):
            try:
                text = await groq_llm.chat(
                    messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            except ModelNotFoundError as e:
                msg = f"Configured Groq model '{e.model}' is unavailable. Please check GROQ_MODEL in deployment settings."
                log.warning("[GROQ] model not found", provider="groq", model=e.model, status=404)
                raise GrokAPIError(msg, status=404, code="GROQ_MODEL_ERROR") from e
            except (APITimeoutError,):
                if attempt < _retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROQ] timeout", provider="groq", timeout=settings.groq_timeout_seconds)
                raise GrokAPIError("ASK ZORQEN request to Groq timed out. Please try again.", status=504, code="GROQ_TIMEOUT")
            except (APIConnectionError,):
                if attempt < _retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROQ] connection error", provider="groq")
                raise GrokAPIError("Unable to reach Groq API. Please check network connectivity.", status=502, code="GROQ_NETWORK_ERROR")
            except (AuthenticationError, PermissionDeniedError) as e:
                log.warning("[GROQ] authentication rejected", provider="groq", status=401)
                raise GrokAPIError("Groq API authentication failed. Verify GROQ_API_KEY in deployment settings.", status=401, code="GROQ_AUTH_ERROR") from e
            except RateLimitError as e:
                log.warning("[GROQ] rate limited", provider="groq", status=429)
                raise GrokAPIError("Groq rate limit or quota exceeded. Please wait a moment and try again.", status=429, code="GROQ_RATE_LIMIT") from e
            except GroqAPIErrorCls as e:
                status = getattr(e, "status_code", None)
                if status is not None and status >= 500 and attempt < _retries:
                    await asyncio.sleep(1.0)
                    continue
                err_msg = sanitize_secret_str(str(e))
                log.warning("[GROQ] api error", provider="groq", status=status, error=err_msg)
                if status == 400:
                    raise GrokAPIError(f"Groq API rejected request: {err_msg}", status=400, code="GROQ_REQUEST_ERROR") from e
                code = "GROQ_API_ERROR"
                raise GrokAPIError(f"Groq provider error (HTTP {status}): {err_msg}", status=status or 502, code=code) from e
            except Exception as e:
                err_msg = sanitize_secret_str(str(e))
                log.warning("[GROQ] unexpected error", provider="groq", error_type=type(e).__name__, error=err_msg)
                raise GrokAPIError(f"Groq LLM error: {err_msg}", status=503, code="GROQ_API_ERROR") from e

            if not isinstance(text, str) or not text.strip():
                log.warning("[GROQ] empty response", provider="groq")
                raise GrokAPIError("Groq returned an empty response. Please retry.", status=502, code="GROQ_API_ERROR")

            return text

    async def test_connection(self) -> dict:
        """Probe the server-side Groq API with a minimal request to verify configuration.

        Returns {"ok": True, "provider": "groq", "model": <model_name>} on success.
        Raises GrokConfigurationError if GROQ_API_KEY is not configured.
        Raises GrokAPIError on any failure.
        The API key is NEVER logged or included in error messages.
        """
        if not settings.groq_configured:
            raise GrokConfigurationError("GROQ_API_KEY is not configured on the server")

        probe_messages = [
            {"role": "user", "content": "Respond: connected"}
        ]
        # Minimal probe to verify authentication and model availability
        await self.chat(
            probe_messages,
            max_tokens=5,
            temperature=0.0,
            _retries=0,
        )
        return {"ok": True, "provider": "groq", "model": settings.groq_model}


# Aliases
GroqService = GrokService

# Singleton — reused across requests
grok = GrokService()
groq = grok
