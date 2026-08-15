"""RAKSHA — Copilot LLM client for the ASK RAKSHA investigation copilot.

Provider-first strategy (server-side ONLY):
  1. GROK_API_KEY set       → xAI Grok via https://api.x.ai/v1 (OpenAI-compatible)
  2. GROQ_API_KEY set       → Groq via the shared agents.llm_client (llama-3.3-70b-versatile)
  3. neither set            → GrokConfigurationError (GROK_CONFIGURATION_ERROR)

API keys live only in the environment and are never exposed to the frontend or
logs. Every failure maps to a safe, loggable category; transient failures use
bounded retry (never infinite), authentication/configuration errors are never
retried.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

import httpx
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
    """Raised when no copilot LLM is configured (no GROK_API_KEY / GROQ_API_KEY)."""

    code = "GROK_CONFIGURATION_ERROR"


class GrokAPIError(RuntimeError):
    """Raised when the LLM provider rejects or fails to produce a usable answer.

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
    """Thin async wrapper around the copilot LLM providers (xAI Grok → Groq)."""

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
        """Return a grounded answer from the best configured copilot provider.

        Priority: xAI Grok when GROK_API_KEY is set, otherwise Groq when
        GROQ_API_KEY is set, otherwise GrokConfigurationError.

        Bounded retry: transient failures (timeout, transport, 5xx) are retried
        at most `_retries` times with a short backoff. Authentication (401/403),
        configuration, rate-limit (429), and model-unavailable (404) responses are
        NEVER retried — the copilot never hammers the provider on a permanent
        condition.

        Raises GrokConfigurationError or GrokAPIError on failure. Never leaks
        API keys or raw provider details to callers or logs.
        """
        if settings.grok_configured:
            return await self._chat_xai(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                retries=_retries,
            )
        if settings.groq_configured:
            log.info("[GROK] using groq fallback", model=settings.groq_model)
            return await self._chat_groq(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                retries=_retries,
            )
        raise GrokConfigurationError("Neither GROK_API_KEY nor GROQ_API_KEY is configured")

    async def _chat_xai(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int,
        temperature: float,
        retries: int,
    ) -> str:
        """Call xAI Grok (official endpoint) and return the assistant text."""
        payload: Dict[str, Any] = {
            "model": settings.grok_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        client = self._get_client()
        for attempt in range(retries + 1):
            try:
                resp = await client.post("/chat/completions", json=payload)
            except httpx.TimeoutException:
                if attempt < retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] request timed out", provider="grok", timeout=settings.grok_timeout_seconds)
                raise GrokAPIError("ASK RAKSHA timed out", code="GROK_TIMEOUT")
            except httpx.HTTPError as e:
                if attempt < retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] transport error", provider="grok", error_type=type(e).__name__)
                raise GrokAPIError("ASK RAKSHA unavailable")

            if resp.status_code in (401, 403):
                log.warning("[GROK] authentication rejected", provider="grok", status=resp.status_code)
                raise GrokAPIError("Grok API authentication failed", status=resp.status_code, code="GROK_AUTH_ERROR")
            if resp.status_code == 404:
                log.warning("[GROK] model unavailable", provider="grok", model=settings.grok_model)
                raise GrokAPIError("Grok model unavailable", status=404, code="GROK_API_ERROR")
            if resp.status_code == 429:
                log.warning("[GROK] rate limited", provider="grok")
                raise GrokAPIError("Grok rate limit exceeded", status=429, code="GROK_RATE_LIMIT")
            if resp.status_code >= 500:
                if attempt < retries:
                    await asyncio.sleep(1.0)
                    continue
                log.warning("[GROK] provider error", provider="grok", status=resp.status_code)
                raise GrokAPIError("Grok provider error", status=resp.status_code, code="GROK_API_ERROR")
            if resp.status_code != 200:
                log.warning("[GROK] unexpected status", provider="grok", status=resp.status_code)
                raise GrokAPIError("Grok API error", status=resp.status_code, code="GROK_API_ERROR")

            try:
                data = resp.json()
            except json.JSONDecodeError:
                log.warning("[GROK] malformed response body", provider="grok")
                raise GrokAPIError("Malformed Grok response")

            try:
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError):
                log.warning("[GROK] missing choices in response", provider="grok")
                raise GrokAPIError("Malformed Grok response")

            if not isinstance(content, str) or not content.strip():
                log.warning("[GROK] empty response", provider="grok")
                raise GrokAPIError("Empty Grok response")

            return content

    async def _chat_groq(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int,
        temperature: float,
        retries: int,
    ) -> str:
        """Fallback: call Groq (llama) with the same grounded messages."""
        from agents.llm_client import llm as groq_llm

        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages if m["role"] != "system"
        )

        for attempt in range(retries + 1):
            try:
                text = await groq_llm.complete(
                    system,
                    transcript,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            except (APITimeoutError, APIConnectionError):
                if attempt < retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] groq timeout", provider="groq")
                raise GrokAPIError("ASK RAKSHA timed out", code="GROK_TIMEOUT")
            except (AuthenticationError, PermissionDeniedError):
                log.warning("[GROK] groq authentication rejected", provider="groq")
                raise GrokAPIError("Copilot LLM authentication failed", status=401, code="GROK_AUTH_ERROR")
            except RateLimitError:
                log.warning("[GROK] groq rate limited", provider="groq")
                raise GrokAPIError("Copilot LLM rate limit exceeded", status=429, code="GROK_RATE_LIMIT")
            except GroqAPIErrorCls as e:
                status = getattr(e, "status_code", None)
                if status is not None and status >= 500 and attempt < retries:
                    await asyncio.sleep(1.0)
                    continue
                log.warning("[GROK] groq api error", provider="groq", status=status)
                raise GrokAPIError("Copilot LLM error", status=status, code="GROK_API_ERROR")
            except Exception as e:  # noqa: BLE001
                log.warning("[GROK] groq unexpected error", provider="groq", error_type=type(e).__name__)
                raise GrokAPIError("Copilot LLM error")

            if not isinstance(text, str) or not text.strip():
                log.warning("[GROK] groq empty response", provider="groq")
                raise GrokAPIError("Empty Copilot LLM response")

            return text


# Singleton — reused across requests (httpx pool is safe for concurrent use)
grok = GrokService()
