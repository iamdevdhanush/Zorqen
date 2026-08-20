"""ZORQEN — Copilot LLM client for the ASK ZORQEN investigation copilot.

Provider-first strategy (server-side ONLY):
  1. GEMINI_API_KEY set     → Google Gemini (google.generativeai)
  2. GROK_API_KEY set       → xAI Grok via https://api.x.ai/v1 (OpenAI-compatible)
  3. GROQ_API_KEY set       → Groq via the shared agents.llm_client (settings.groq_model)
  4. none set               → GrokConfigurationError (GROK_CONFIGURATION_ERROR)

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

try:  # pragma: no cover — SDK availability varies by environment
    from google.api_core import exceptions as google_api_exceptions
    import google.generativeai as genai

    GEMINI_SDK_AVAILABLE = True
except ImportError:
    google_api_exceptions = None
    genai = None
    GEMINI_SDK_AVAILABLE = False

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
        self.last_provider: Optional[str] = None

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

        Priority: Google Gemini when GEMINI_API_KEY is set, otherwise xAI Grok
        when GROK_API_KEY is set, otherwise Groq when GROQ_API_KEY is set,
        otherwise GrokConfigurationError.

        Bounded retry: transient failures (timeout, transport, 5xx) are retried
        at most `_retries` times with a short backoff. Authentication (401/403),
        configuration, rate-limit (429), and model-unavailable (404) responses are
        NEVER retried — the copilot never hammers the provider on a permanent
        condition.

        Raises GrokConfigurationError or GrokAPIError on failure. Never leaks
        API keys or raw provider details to callers or logs.
        """
        if settings.gemini_configured:
            self.last_provider = "gemini"
            return await self._chat_gemini(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        if settings.grok_configured:
            self.last_provider = "grok"
            return await self._chat_xai(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                retries=_retries,
            )
        if settings.groq_configured:
            self.last_provider = "groq"
            log.info("[GROK] using groq fallback", model=settings.groq_model)
            return await self._chat_groq(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                retries=_retries,
            )
        raise GrokConfigurationError("Neither GEMINI_API_KEY, GROK_API_KEY nor GROQ_API_KEY is configured")

    async def _chat_gemini(
        self,
        messages: List[Dict[str, str]],
        *,
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Call Google Gemini (generativelanguage API) and return the assistant text."""
        if not GEMINI_SDK_AVAILABLE:
            log.warning("[GROK] gemini sdk missing", provider="gemini")
            raise GrokAPIError("Gemini SDK is not installed", code="GROK_API_ERROR")

        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        transcript = "\n\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages if m["role"] != "system"
        )

        def _call() -> str:
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(
                settings.gemini_model,
                system_instruction=system or None,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                ),
            )
            resp = model.generate_content(transcript or "Hello")
            return resp.text or ""

        try:
            text = await asyncio.to_thread(_call)
        except (google_api_exceptions.PermissionDenied, google_api_exceptions.Unauthenticated):
            log.warning("[GROK] gemini authentication rejected", provider="gemini")
            raise GrokAPIError("Gemini authentication failed", status=401, code="GROK_AUTH_ERROR")
        except google_api_exceptions.ResourceExhausted:
            log.warning("[GROK] gemini rate limited", provider="gemini")
            raise GrokAPIError("Gemini rate limit exceeded", status=429, code="GROK_RATE_LIMIT")
        except google_api_exceptions.NotFound:
            log.warning("[GROK] gemini model unavailable", provider="gemini", model=settings.gemini_model)
            raise GrokAPIError("Gemini model unavailable", status=404, code="GROK_API_ERROR")
        except (google_api_exceptions.ServiceUnavailable, google_api_exceptions.InternalServerError):
            log.warning("[GROK] gemini provider error", provider="gemini")
            raise GrokAPIError("Gemini provider error", status=503, code="GROK_API_ERROR")
        except (google_api_exceptions.DeadlineExceeded, google_api_exceptions.RetryError):
            log.warning("[GROK] gemini request timed out", provider="gemini", timeout=settings.gemini_timeout_seconds)
            raise GrokAPIError("ASK ZORQEN timed out", code="GROK_TIMEOUT")
        except Exception as e:  # noqa: BLE001
            log.warning("[GROK] gemini unexpected error", provider="gemini", error_type=type(e).__name__)
            raise GrokAPIError("Gemini API error")

        if not isinstance(text, str) or not text.strip():
            log.warning("[GROK] gemini empty response", provider="gemini")
            raise GrokAPIError("Empty Gemini response")

        return text

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
                raise GrokAPIError("ASK ZORQEN timed out", code="GROK_TIMEOUT")
            except httpx.HTTPError as e:
                if attempt < retries:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                log.warning("[GROK] transport error", provider="grok", error_type=type(e).__name__)
                raise GrokAPIError("ASK ZORQEN unavailable")

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
        """Fallback: call Groq with the same grounded messages."""
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
                raise GrokAPIError("ASK ZORQEN timed out", code="GROK_TIMEOUT")
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
