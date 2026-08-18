"""RAKSHA — Groq LLM Client
Shared LLM interface for all agents.

Used by:
  - architecture_analyst  (architecture analysis)
  - security_reasoner     (AI reasoning about findings)
  - remediation_agent     (code fix generation)
  - services/grok.py      (ASK RAKSHA copilot fallback)

The model is configured via GROQ_MODEL env var (default: openai/gpt-oss-120b).
"""
from __future__ import annotations

import json
from typing import Any, Dict, Optional, Tuple, Type
import httpx
from groq import AsyncGroq
from core.config import settings
import structlog

log = structlog.get_logger()


class ModelNotFoundError(RuntimeError):
    """Raised when the configured Groq model is not available (HTTP 404)."""

    def __init__(self, model: str):
        super().__init__(f"Groq model '{model}' is not available. Check GROQ_MODEL at https://console.groq.com/docs/models")
        self.model = model


# The known failure modes of an external LLM call. Agents catch exactly these
# to degrade gracefully; programming errors (TypeError, KeyError, ...) are
# never masked as "AI unavailable".
LLM_EXTERNAL_ERRORS: Tuple[Type[Exception], ...] = (
    ModelNotFoundError,
    RuntimeError,  # GROQ_API_KEY not configured
    httpx.HTTPError,  # network / transport / timeout
    ValueError,  # JSON decoding of the model response
)


class LLMClient:
    def __init__(self):
        self._client: Optional[AsyncGroq] = None

    def _get_client(self) -> AsyncGroq:
        if not settings.groq_configured:
            raise RuntimeError("GROQ_API_KEY is not configured")
        if self._client is None:
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.1,
        json_mode: bool = False,
    ) -> str:
        """Call Groq and return the completion text.

        Raises ModelNotFoundError when the configured model is not available.
        """
        client = self._get_client()
        kwargs: Dict[str, Any] = {
            "model": settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            error_str = str(e).lower()
            status_code = getattr(e, "status_code", None)
            if status_code == 404 or "model_not_found" in error_str or "model" in error_str and "not found" in error_str:
                log.error("Groq model not found", model=settings.groq_model, error=str(e))
                raise ModelNotFoundError(settings.groq_model) from e
            log.error("LLM completion failed", error=str(e))
            raise

    async def complete_json(self, system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
        """Call Groq and parse the JSON response.

        Raises ModelNotFoundError when the configured model is not available.
        """
        text = await self.complete(system_prompt, user_prompt, max_tokens=max_tokens, json_mode=True)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from text
            import re
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"error": "Failed to parse JSON response", "raw": text}


# Singleton
llm = LLMClient()
