"""RAKSHA — Groq LLM Client
Shared LLM interface for all agents.
"""
from __future__ import annotations

import json
from typing import Any, Dict, Optional
from groq import AsyncGroq
from core.config import settings
import structlog

log = structlog.get_logger()


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
        """Call Groq and return the completion text."""
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
            log.error("LLM completion failed", error=str(e))
            raise

    async def complete_json(self, system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
        """Call Groq and parse the JSON response."""
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
