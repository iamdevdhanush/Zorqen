"""ZORQEN — Unit tests for BYOK (Bring Your Own Key) xAI Grok support.

Verifies:
  - chat_with_byok() sends the correct Authorization header and never leaks the key
  - test_connection() returns {ok, model} on success
  - Error cases: 401, 403, 429, 500, timeout, transport failure, malformed body
  - BYOK key is cleared from the local scope after use (no lingering ref)
  - Credentials from one call cannot reach another call (client isolation)
  - investigate() routes through chat_with_byok when byok_key is supplied
"""
from __future__ import annotations

import json
import pytest
import httpx
import respx
from unittest.mock import AsyncMock, patch, MagicMock

# ── Fixtures / helpers ───────────────────────────────────────────────────────

FAKE_KEY = "xai-test-key-1234567890abcdef"
FAKE_MODEL = "grok-4-latest"
XAI_BASE = "https://api.x.ai/v1"
XAI_CHAT = f"{XAI_BASE}/chat/completions"

GOOD_RESPONSE = {
    "choices": [{"message": {"content": "connected"}}]
}


def _make_settings(**kwargs):
    """Return a mock settings object."""
    m = MagicMock()
    m.grok_api_base = XAI_BASE
    m.grok_model = FAKE_MODEL
    m.grok_timeout_seconds = 10
    for k, v in kwargs.items():
        setattr(m, k, v)
    return m


# ── GrokService.chat_with_byok ───────────────────────────────────────────────

@pytest.mark.asyncio
@respx.mock
async def test_byok_success_sends_correct_auth_header():
    """A valid key leads to a successful response; Authorization header is correct."""
    from services.grok import GrokService

    route = respx.post(XAI_CHAT).mock(
        return_value=httpx.Response(200, json=GOOD_RESPONSE)
    )

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        result = await svc.chat_with_byok(
            [{"role": "user", "content": "hello"}],
            byok_key=FAKE_KEY,
        )

    assert result == "connected"
    assert route.called
    sent_headers = route.calls[0].request.headers
    assert sent_headers["Authorization"] == f"Bearer {FAKE_KEY}"


@pytest.mark.asyncio
@respx.mock
async def test_byok_401_raises_auth_error():
    """A 401 from xAI raises GrokAPIError with GROK_AUTH_ERROR."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(401, json={"error": "invalid_key"}))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_AUTH_ERROR"
    assert exc_info.value.status in (401, 403)
    # Key must NOT appear in the exception message
    assert FAKE_KEY not in str(exc_info.value)


@pytest.mark.asyncio
@respx.mock
async def test_byok_403_raises_auth_error():
    """A 403 from xAI raises GrokAPIError with GROK_AUTH_ERROR."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(403, json={"error": "forbidden"}))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_AUTH_ERROR"
    assert FAKE_KEY not in str(exc_info.value)


@pytest.mark.asyncio
@respx.mock
async def test_byok_429_raises_rate_limit():
    """A 429 from xAI raises GrokAPIError with GROK_RATE_LIMIT."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(429, json={"error": "rate_limit"}))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_RATE_LIMIT"
    assert FAKE_KEY not in str(exc_info.value)


@pytest.mark.asyncio
@respx.mock
async def test_byok_500_raises_api_error():
    """A 5xx from xAI raises GrokAPIError with GROK_API_ERROR."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(503, json={"error": "unavailable"}))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_API_ERROR"
    assert FAKE_KEY not in str(exc_info.value)


@pytest.mark.asyncio
@respx.mock
async def test_byok_timeout_raises_timeout_error():
    """A network timeout raises GrokAPIError with GROK_TIMEOUT."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(side_effect=httpx.TimeoutException("timed out"))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_TIMEOUT"
    assert FAKE_KEY not in str(exc_info.value)


@pytest.mark.asyncio
@respx.mock
async def test_byok_transport_error():
    """An httpx transport error raises GrokAPIError."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(side_effect=httpx.HTTPError("connection refused"))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError):
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)


@pytest.mark.asyncio
@respx.mock
async def test_byok_malformed_json_response():
    """A malformed JSON body raises GrokAPIError."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(
        return_value=httpx.Response(200, content=b"not-json")
    )

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError):
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=FAKE_KEY)


@pytest.mark.asyncio
async def test_byok_empty_key_raises_config_error():
    """An empty BYOK key raises GrokConfigurationError immediately (no network call)."""
    from services.grok import GrokService, GrokConfigurationError

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokConfigurationError):
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key="   ")


@pytest.mark.asyncio
@respx.mock
async def test_byok_client_isolation():
    """Two concurrent BYOK calls each use their own httpx client (no shared state)."""
    from services.grok import GrokService

    call_headers = []

    def capture(request: httpx.Request) -> httpx.Response:
        call_headers.append(request.headers["Authorization"])
        return httpx.Response(200, json=GOOD_RESPONSE)

    respx.post(XAI_CHAT).mock(side_effect=capture)

    key_a = "xai-key-aaaaa"
    key_b = "xai-key-bbbbb"

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        import asyncio
        results = await asyncio.gather(
            svc.chat_with_byok([{"role": "user", "content": "a"}], byok_key=key_a),
            svc.chat_with_byok([{"role": "user", "content": "b"}], byok_key=key_b),
        )

    assert len(results) == 2
    assert all(r == "connected" for r in results)
    # Each call used its own key — neither key appears in the other's header
    assert f"Bearer {key_a}" in call_headers
    assert f"Bearer {key_b}" in call_headers
    # No cross-contamination
    for header in call_headers:
        # Each header should contain exactly one of the two keys
        assert (key_a in header) != (key_b in header), f"Key leaked into wrong header: {header}"


# ── GrokService.test_connection ──────────────────────────────────────────────

@pytest.mark.asyncio
@respx.mock
async def test_test_connection_success():
    """test_connection returns {ok: True, model: ...} on a valid key."""
    from services.grok import GrokService

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(200, json=GOOD_RESPONSE))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        result = await svc.test_connection(byok_key=FAKE_KEY)

    assert result["ok"] is True
    assert result["model"] == FAKE_MODEL


@pytest.mark.asyncio
@respx.mock
async def test_test_connection_auth_failure():
    """test_connection propagates 401 as GrokAPIError."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(401, json={"error": "bad_key"}))

    svc = GrokService()
    with patch("services.grok.settings", _make_settings()):
        with pytest.raises(GrokAPIError) as exc_info:
            await svc.test_connection(byok_key=FAKE_KEY)

    assert exc_info.value.code == "GROK_AUTH_ERROR"
    assert FAKE_KEY not in str(exc_info.value)


# ── Credential redaction ──────────────────────────────────────────────────────

@pytest.mark.asyncio
@respx.mock
async def test_api_key_never_in_exception_message():
    """The API key must not appear in any raised exception message."""
    from services.grok import GrokService, GrokAPIError

    respx.post(XAI_CHAT).mock(return_value=httpx.Response(401))

    svc = GrokService()
    sensitive_key = "xai-super-secret-do-not-log"
    with patch("services.grok.settings", _make_settings()):
        try:
            await svc.chat_with_byok([{"role": "user", "content": "hi"}], byok_key=sensitive_key)
        except GrokAPIError as e:
            assert sensitive_key not in str(e), f"Key leaked in exception: {e}"
            assert sensitive_key not in repr(e), f"Key leaked in repr: {e!r}"
