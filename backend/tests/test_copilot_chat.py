"""ZORQEN — Unit tests for ASK ZORQEN Copilot Chat and Groq provider integration.

Verifies:
  - Simple conversation without an assessment (e.g. "Hey Boi")
  - Conversation with repository & assessment context
  - Missing Groq configuration (GrokConfigurationError)
  - Groq authentication failure (HTTP 401, GROK_AUTH_ERROR)
  - Groq invalid model error (HTTP 404, GROK_MODEL_ERROR)
  - Groq rate limit / quota exceeded (HTTP 429, GROK_RATE_LIMIT)
  - Groq provider timeout (HTTP 504, GROK_TIMEOUT)
  - Groq network / connection failure (HTTP 502, GROK_NETWORK_ERROR)
  - Groq provider server error (HTTP 502/503, GROK_API_ERROR)
  - Empty or whitespace AI response (HTTP 502, GROK_API_ERROR)
  - Secret redaction (API keys / credentials never leaked in messages or logs)
  - Greeting intent detection
  - Router structured error status mapping
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException
import httpx

from agents.llm_client import ModelNotFoundError, sanitize_secret_str
from models.assessment import Assessment
from models.repository import Repository
from models.user import User
from services.copilot import (
    ChatContext,
    CopilotRequest,
    build_zorqen_context,
    detect_intent,
    investigate,
    sanitize_response,
)
from services.grok import (
    GrokAPIError,
    GrokConfigurationError,
    GrokService,
)

try:
    from groq import (
        APIError as GroqAPIErrorCls,
        APIConnectionError,
        APITimeoutError,
        AuthenticationError,
        PermissionDeniedError,
        RateLimitError,
        InternalServerError,
    )
except ImportError:
    GroqAPIErrorCls = Exception
    APIConnectionError = Exception
    APITimeoutError = Exception
    AuthenticationError = Exception
    PermissionDeniedError = Exception
    RateLimitError = Exception
    InternalServerError = Exception


def _make_user() -> User:
    u = MagicMock(spec=User)
    u.id = "user-uuid-1111"
    u.github_login = "testuser"
    return u


def _make_mock_settings(**kwargs):
    m = MagicMock()
    m.gemini_configured = False
    m.grok_configured = False
    m.groq_configured = True
    m.groq_model = "openai/gpt-oss-20b"
    m.groq_api_key = "gsk_test_mock_key_12345"
    m.grok_timeout_seconds = 15
    for k, v in kwargs.items():
        setattr(m, k, v)
    return m


# ── 1. Simple conversation without an assessment ──────────────────────────────

@pytest.mark.asyncio
async def test_simple_conversation_without_assessment():
    """Simple greeting like 'Hey Boi' succeeds without an assessment in context."""
    db = AsyncMock()
    user = _make_user()
    req = CopilotRequest(message="Hey Boi", context=ChatContext())

    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(return_value="Hey! I'm ASK ZORQEN, your security copilot. How can I assist you with your security investigations today?")

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        result = await investigate(db, user, req)

    assert result["success"] is True
    assert "ASK ZORQEN" in result["answer"]
    assert result["provider"] == "groq"
    assert result["context_loaded"] is False
    assert result["sources"] == []


# ── 2. Conversation with repository context ───────────────────────────────────

@pytest.mark.asyncio
async def test_conversation_with_repository_context():
    """Repository context is properly loaded and passed into the prompt."""
    user = _make_user()
    repo = Repository(
        id="repo-uuid-2222",
        user_id=user.id,
        name="ThemeFlow",
        owner="iamdevdhanush",
        full_name="iamdevdhanush/ThemeFlow",
        default_branch="main",
        head_commit="abcdef1",
    )

    db = AsyncMock()
    db.get = AsyncMock(return_value=repo)

    req = CopilotRequest(
        message="What is the architecture?",
        context=ChatContext(repository_id="repo-uuid-2222"),
    )

    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(return_value="ThemeFlow is currently loaded on branch main.")

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        result = await investigate(db, user, req)

    assert result["success"] is True
    assert result["context_loaded"] is True
    assert any(s["type"] == "repository" and s["name"] == "ThemeFlow" for s in result["sources"])


# ── 3. Missing or invalid Groq configuration ──────────────────────────────────

@pytest.mark.asyncio
async def test_missing_groq_configuration_raises_config_error():
    """When no LLM provider is configured, GrokConfigurationError is raised."""
    svc = GrokService()
    unconfigured_settings = _make_mock_settings(
        gemini_configured=False,
        grok_configured=False,
        groq_configured=False,
    )

    with patch("services.grok.settings", unconfigured_settings):
        with pytest.raises(GrokConfigurationError) as exc_info:
            await svc.chat([{"role": "user", "content": "hi"}])

    assert exc_info.value.code == "GROK_CONFIGURATION_ERROR"


# ── 4. Groq authentication failure ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_authentication_failure():
    """Groq 401 raises GrokAPIError with status 401 and code GROK_AUTH_ERROR."""
    svc = GrokService()
    mock_llm = MagicMock()
    auth_err = AuthenticationError("Invalid API key provided", response=httpx.Response(401, request=MagicMock()), body={})
    mock_llm.chat = AsyncMock(side_effect=auth_err)

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=1)

    assert exc_info.value.status == 401
    assert exc_info.value.code == "GROK_AUTH_ERROR"
    assert "GROQ_API_KEY" in str(exc_info.value)


# ── 5. Invalid model error ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_invalid_model_error():
    """Groq 404 / ModelNotFoundError raises GrokAPIError with status 404 and code GROK_MODEL_ERROR."""
    svc = GrokService()
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(
        side_effect=ModelNotFoundError("openai/gpt-oss-20b")
    )

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=1)

    assert exc_info.value.status == 404
    assert exc_info.value.code == "GROK_MODEL_ERROR"
    assert "openai/gpt-oss-20b" in str(exc_info.value)
    assert "GROQ_MODEL" in str(exc_info.value)


# ── 6. Rate limit / quota exceeded ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_rate_limit_exceeded():
    """Groq 429 raises GrokAPIError with status 429 and code GROK_RATE_LIMIT."""
    svc = GrokService()
    mock_llm = MagicMock()
    rate_err = RateLimitError("Rate limit exceeded", response=httpx.Response(429, request=MagicMock()), body={})
    mock_llm.chat = AsyncMock(side_effect=rate_err)

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=1)

    assert exc_info.value.status == 429
    assert exc_info.value.code == "GROK_RATE_LIMIT"


# ── 7. Provider timeout ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_provider_timeout():
    """Groq timeout raises GrokAPIError with status 504 and code GROK_TIMEOUT."""
    svc = GrokService()
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(
        side_effect=APITimeoutError(request=MagicMock())
    )

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=0)

    assert exc_info.value.status == 504
    assert exc_info.value.code == "GROK_TIMEOUT"


# ── 8. Provider connection failure ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_provider_connection_error():
    """Groq network error raises GrokAPIError with status 502 and code GROK_NETWORK_ERROR."""
    svc = GrokService()
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(
        side_effect=APIConnectionError(request=MagicMock())
    )

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=0)

    assert exc_info.value.status == 502
    assert exc_info.value.code == "GROK_NETWORK_ERROR"


# ── 9. Provider server error ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_provider_server_error():
    """Groq 500/503 raises GrokAPIError with code GROK_API_ERROR."""
    svc = GrokService()
    mock_llm = MagicMock()
    err = InternalServerError("Service unavailable", response=httpx.Response(503, request=MagicMock()), body={})
    mock_llm.chat = AsyncMock(side_effect=err)

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=0)

    assert exc_info.value.status == 503
    assert exc_info.value.code == "GROK_API_ERROR"


# ── 10. Empty or malformed AI response ────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_empty_response():
    """Empty response from Groq raises GrokAPIError with status 502."""
    svc = GrokService()
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(return_value="   ")

    with patch("services.grok.settings", _make_mock_settings()), \
         patch("agents.llm_client.llm", mock_llm):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc._chat_groq([{"role": "user", "content": "hi"}], max_tokens=100, temperature=0.2, retries=0)

    assert exc_info.value.status == 502
    assert exc_info.value.code == "GROK_API_ERROR"


# ── 11. Secret redaction in errors and logs ───────────────────────────────────

def test_secret_redaction_removes_keys():
    """Sensitive keys (gsk_*, xai-*, Bearer) are completely redacted."""
    raw = "Failed with gsk_abcdef1234567890 and xai-secretkey987654 and Bearer my_secret_token"
    sanitized = sanitize_secret_str(raw)
    assert "gsk_" not in sanitized
    assert "xai-" not in sanitized
    assert "my_secret_token" not in sanitized
    assert "[REDACTED_CREDENTIAL]" in sanitized


# ── 12. Greeting intent detection ─────────────────────────────────────────────

def test_greeting_intent_detection():
    """Common greetings are detected as 'greeting' intent."""
    assert detect_intent("Hey Boi") == "greeting"
    assert detect_intent("hey") == "greeting"
    assert detect_intent("Hello!") == "greeting"
    assert detect_intent("hi there") == "greeting"
    assert detect_intent("good morning") == "greeting"


# ── 13. Router structured error mapping ───────────────────────────────────────

@pytest.mark.asyncio
async def test_router_grok_error_mapping():
    """Router maps GrokAPIError status codes and preserves descriptive messages."""
    from starlette.requests import Request
    from routers.api import copilot_chat

    scope = {"type": "http", "method": "POST", "path": "/api/copilot/chat", "client": ("127.0.0.1", 12345), "headers": []}
    request = Request(scope)
    db = AsyncMock()
    user = _make_user()

    req = CopilotRequest(message="test", context=ChatContext())

    with patch("routers.api.investigate", AsyncMock(side_effect=GrokAPIError("Groq model unavailable", status=404, code="GROK_MODEL_ERROR"))):
        with pytest.raises(HTTPException) as exc_info:
            await copilot_chat(req, request, current_user=user, db=db)

    assert exc_info.value.status_code == 404
    detail = exc_info.value.detail
    assert detail["code"] == "GROK_MODEL_ERROR"
    assert detail["message"] == "Groq model unavailable"
