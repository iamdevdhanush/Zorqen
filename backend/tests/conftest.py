"""
RAKSHA Backend — Automated Test Suite
Tests: health, database, GitHub OAuth flow, repository discovery, assessments.
Run: pytest tests/ -v
"""
from __future__ import annotations

import os
import sys
import asyncio
import pytest
import pytest_asyncio

# Ensure the backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment before importing app
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_raksha.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-only")
os.environ.setdefault("GITHUB_CLIENT_ID", "test_client_id")
os.environ.setdefault("GITHUB_CLIENT_SECRET", "test_client_secret")
os.environ.setdefault("GITHUB_REDIRECT_URI", "http://localhost:8000/api/auth/github/callback")
os.environ.setdefault("GROQ_API_KEY", "")  # no LLM in tests
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:5173"]')
os.environ.setdefault("ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS1tdXN0LWJlLTMyLWJ5dGVzLQ==")  # base64("test-encryption-key-must-be-32-bytes-")


@pytest.fixture(scope="session")
def event_loop():
    """Session-scoped event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
