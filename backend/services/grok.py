"""RAKSHA — Grok (xAI) client for the ASK RAKSHA investigation copilot.

Server-side ONLY. The API key lives in the environment (GROK_API_KEY) and is
never exposed to the frontend. Uses the OpenAI-compatible chat completions
endpoint at https://api.x.ai/v1 via httpx (already a backend dependency) so no
extra SDK is required.

The model is configurable through GROK_MODEL (default: grok-4-latest).
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

import httpx
import structlog

from core.config import settings

log = structlog.get_logger()


class GrokConfigurationError(RuntimeError):
    """Raised when GROK_API_KEY is missing and the copilot cannot run."""

    code = "GROK_CONFIGURATION_ERROR"


class GrokAPIError(RuntimeError):
    """Raised when the xAI API rejects or fails to produce a usable answer.

    `code` is a safe, loggable category (never contains secrets or provider
    payloads): GROK_AUTH_ERROR | GROK_RATE_LIMIT | GROK_TIMEOUT | GROK_API_ERROR.
    """

    def __init__(
        self,
        message: str,
        *,
        status: Optional[int] = None,
        code: str = "GROK_API_ERROR",
    ):
        super().__init__(message)
        self.status = status
        self.code = code


class GrokService:
    """Thin async wrapper around the xAI chat completions API."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.grok_api_base,
                timeout=settings.grok_timeout_seconds,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int = 1200,
        temperature: float = 0.2,
        _retries: int = 1,
    ) -> str:
        """Call Grok and return the assistant text.

        Bounded retry: transient failures (timeout, transport, 5xx) are retried
        at most `_retries` times with a short backoff. Authentication (401/403),
        configuration, rate-limit (429), and model-unavailable (404) responses are
        NEVER retried — they raise immediately so the copilot never hammers the
        provider on a permanent condition.

        Raises GrokConfigurationError or GrokAPIError on failure. Never leaks
        the API key or raw provider details to callers or logs.
        """
        if not settings.grok_configured:
            raise GrokConfigurationError("GROK_API_KEY is not configured")

        payload: Dict[str, Any] = {
            "model": settings.grok_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        client = self._get_client()
        for attempt in range(_retries + 1):
            try:
                resp = await client.post("/chat/completions", json=payload)
            except httpx.TimeoutException:
                if attempt < _retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] request timed out", timeout=settings.grok_timeout_seconds)
                raise GrokAPIError("ASK RAKSHA timed out", code="GROK_TIMEOUT")
            except httpx.HTTPError as e:
                if attempt < _retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] transport error", error_type=type(e).__name__)
                raise GrokAPIError("ASK RAKSHA unavailable")

            if resp.status_code in (401, 403):
                log.warning("[GROK] authentication rejected", status=resp.status_code)
                raise GrokAPIError("Grok API authentication failed", status=resp.status_code, code="GROK_AUTH_ERROR")
            if resp.status_code == 404:
                log.warning("[GROK] model unavailable", model=settings.grok_model)
                raise GrokAPIError("Grok model unavailable", status=404, code="GROK_API_ERROR")
            if resp.status_code == 429:
                log.warning("[GROK] rate limited")
                raise GrokAPIError("Grok rate limit exceeded", status=429, code="GROK_RATE_LIMIT")
            if resp.status_code >= 500:
                if attempt < _retries:
                    await asyncio.sleep(1.0)
                    continue
                log.warning("[GROK] provider error", status=resp.status_code)
                raise GrokAPIError("Grok provider error", status=resp.status_code, code="GROK_API_ERROR")
            if resp.status_code != 200:
                log.warning("[GROK] unexpected status", status=resp.status_code)
                raise GrokAPIError("Grok API error", status=resp.status_code, code="GROK_API_ERROR")

            try:
                data = resp.json()
            except json.JSONDecodeError:
                log.warning("[GROK] malformed response body")
                raise GrokAPIError("Malformed Grok response")

            try:
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError):
                log.warning("[GROK] missing choices in response")
                raise GrokAPIError("Malformed Grok response")

            if not isinstance(content, str) or not content.strip():
                log.warning("[GROK] empty response")
                raise GrokAPIError("Empty Grok response")

            return content


# Singleton — reused across requests (httpx pool is safe for concurrent use)
grok = GrokService()
