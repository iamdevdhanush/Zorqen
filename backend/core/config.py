"""
ZORQEN Backend — Core Configuration
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse
from pydantic_settings import BaseSettings, SettingsConfigDict, EnvSettingsSource, DotEnvSettingsSource
from pydantic import field_validator, model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class _LenientEnvSource(EnvSettingsSource):
    """Env source that defers list/JSON decoding to field validators.

    pydantic-settings pre-decodes complex fields with json.loads and raises
    if the value is not JSON (e.g. CORS_ORIGINS=https://app.com). This source
    passes raw strings through so the field validators can accept both JSON
    and comma-separated formats.
    """

    def prepare_field_value(self, field_name, field, value, value_is_complex):
        is_complex, _ = self._field_is_complex(field)
        if is_complex or value_is_complex:
            if value is None:
                return self.explode_env_vars(field_name, field, self.env_vars) or None
            return value  # raw string → field validator parses JSON or comma list
        return value


class _LenientDotEnvSource(DotEnvSettingsSource):
    """Same lenient decoding for values loaded from the .env file."""

    def prepare_field_value(self, field_name, field, value, value_is_complex):
        is_complex, _ = self._field_is_complex(field)
        if is_complex or value_is_complex:
            if value is None:
                return self.explode_env_vars(field_name, field, self.env_vars) or None
            return value  # raw string → field validator parses JSON or comma list
        return value

# Documentation placeholders that must never be used as a real database in
# production. Render/Koyeb/Heroku URLs look like
#   postgres://postgres:xxxxx@dpg-xxxx-xxxx.region.postgres.render.com:5432/db
# The exact tokens below are the ones used in .env.example and deployment docs.
_PLACEHOLDER_HOSTS = {
    "host", "your-host", "your_host", "dbhost", "DBHOST",
    "postgres", "postgres-db", "example.com",
}
_PLACEHOLDER_DBS = {
    "dbname", "DBNAME", "database", "DATABASE",
    "your-database", "your_database", "db", "postgres-db",
}
_PLACEHOLDER_USERS = {
    "user", "USER", "username", "USERNAME",
    "your-user", "your_user", "your-username", "your_username",
}
_PLACEHOLDER_PASSWORDS = {
    "password", "PASSWORD", "your-password", "your_password", "secret",
}


def detect_database_placeholder(url: str) -> str | None:
    """Return a description of the placeholder token, if `url` is still the docs example."""
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    if parsed.scheme.startswith("sqlite"):
        return None
    host = parsed.hostname or ""
    database = (parsed.path or "").lstrip("/")
    if not host:
        return "missing hostname"
    if host in _PLACEHOLDER_HOSTS:
        return f"host placeholder {host!r}"
    if not database:
        return "missing database name"
    if database in _PLACEHOLDER_DBS:
        return f"database placeholder {database!r}"
    if (parsed.username or "") in _PLACEHOLDER_USERS:
        return f"user placeholder {parsed.username!r}"
    if (parsed.password or "") in _PLACEHOLDER_PASSWORDS:
        return "password placeholder"
    return None


def database_target(url: str) -> str:
    """Credential-free host:port/database description of `url` for diagnostics."""
    try:
        parsed = urlparse(url)
    except Exception:
        return "unknown"
    if parsed.scheme.startswith("sqlite"):
        return f"sqlite:{parsed.path or url}"
    host = parsed.hostname or "?"
    port = f":{parsed.port}" if parsed.port else ""
    database = (parsed.path or "").lstrip("/")
    return f"{host}{port}/{database}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (
            init_settings,
            _LenientEnvSource(settings_cls),
            _LenientDotEnvSource(settings_cls),
            file_secret_settings,
        )

    # Application
    app_name: str = "ZORQEN"
    app_env: str = "development"
    secret_key: str = "dev-secret-key-change-in-production"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Encryption key for sensitive data at rest (GitHub tokens, etc.)
    # Must be 32 bytes (256 bits) base64-encoded.
    # Generate with: python -c 'import base64, os; print(base64.b64encode(os.urandom(32)).decode())'
    encryption_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./zorqen.db"

    # Postgres connection pool (used when database_url is postgresql+asyncpg://)
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 3600

    @field_validator("database_url", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Normalize a sync Postgres URL to the async driver the app requires.

        `postgresql://...` and `postgres://...` are rewritten to
        `postgresql+asyncpg://...` preserving credentials, host, port and any
        query parameters. SQLite URLs are left untouched (local development).
        """
        url = (v or "").strip()
        lowered = url.lower()
        for prefix in ("postgresql://", "postgres://"):
            if lowered.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix):]
        return url

    @model_validator(mode="after")
    def validate_production_database_url(self):
        """Fail fast when production config is missing or uses a placeholder.

        SQLite is only supported for local development. In production the app
        MUST be pointed at a real PostgreSQL instance via DATABASE_URL.
        """
        if self.app_env == "development":
            return self
        url = (self.database_url or "").strip()
        if not url or url.startswith("sqlite"):
            raise ValueError(
                "DATABASE_URL is not configured. Set DATABASE_URL in the "
                "deployment environment to a PostgreSQL connection string "
                "(postgresql+asyncpg://USERNAME:PASSWORD@HOST:5432/DATABASE). "
                "Production must use PostgreSQL + asyncpg; SQLite is only "
                "supported for local development."
            )
        parsed = urlparse(url)
        if parsed.scheme != "postgresql+asyncpg":
            raise ValueError(
                "DATABASE_URL must use the asyncpg driver "
                "(postgresql+asyncpg://...). Render URLs that start with "
                "'postgresql://' or 'postgres://' are normalized automatically; "
                "other drivers are not supported."
            )
        placeholder = detect_database_placeholder(url)
        if placeholder:
            raise ValueError(
                "DATABASE_URL contains a documentation placeholder "
                f"({placeholder}). Set it to the real connection string from "
                "your database provider, e.g. "
                "postgresql+asyncpg://USERNAME:PASSWORD@HOST:5432/DATABASE."
            )
        if not parsed.hostname:
            raise ValueError("DATABASE_URL is missing a hostname (HOST).")
        if not (parsed.path or "").lstrip("/"):
            raise ValueError("DATABASE_URL is missing a database name.")
        return self

    @model_validator(mode="after")
    def validate_production_encryption_key(self):
        """Fail fast in production if encryption key is not configured."""
        if self.app_env != "development":
            if not self.encryption_key:
                raise ValueError(
                    "ENCRYPTION_KEY is not configured. Set ENCRYPTION_KEY in the "
                    "deployment environment to a base64-encoded 32-byte key. "
                    "Generate with: python -c 'import base64, os; print(base64.b64encode(os.urandom(32)).decode())'"
                )
        return self

    @model_validator(mode="after")
    def validate_production_cors(self):
        """Fail fast in production when CORS is not explicitly configured.

        The localhost dev origins must never ship to production — a
        misconfigured production CORS silently breaks every frontend request,
        so we refuse to boot instead of failing at runtime.
        """
        if self.app_env == "development":
            return self
        origins = self.cors_origins or []
        if not origins:
            raise ValueError(
                "CORS_ORIGINS is not configured. Set CORS_ORIGINS in the "
                "deployment environment to the frontend origin(s) as JSON or "
                "a comma-separated list, e.g. "
                '["https://zorqen.app"] or https://zorqen.app.'
            )
        if "*" in origins:
            raise ValueError(
                "CORS_ORIGINS must not contain '*' when credentials are "
                "enabled — browsers reject the combination. List the exact "
                "frontend origin(s) instead."
            )
        for origin in origins:
            try:
                parsed = urlparse(origin)
            except ValueError:
                parsed = None
            host = (parsed.hostname or "") if parsed else ""
            if host in ("localhost", "127.0.0.1"):
                raise ValueError(
                    "CORS_ORIGINS contains a localhost origin "
                    f"({origin!r}). Production must list the real public "
                    "frontend origin(s), e.g. https://zorqen.app."
                )
        return self

    # Snapshot retention for the overview score chart
    snapshot_retention_days: int = 90

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = ""
    github_api_base: str = "https://api.github.com"
    github_oauth_base: str = "https://github.com"

    # Groq LLM — used for architecture analysis, security reasoning, remediation
    groq_api_key: str = ""
    # Free, Groq-hosted OSS model. Overridable via GROQ_MODEL env var. The old
    # llama-3.3-70b-versatile deployment value is deprecated and no longer
    # served by the Groq API (model_not_found).
    groq_model: str = "openai/gpt-oss-20b"

    # Grok (xAI) — ASK ZORQEN investigation copilot (backend only, never exposed)
    grok_api_key: str = ""
    grok_model: str = "grok-4-latest"
    grok_api_base: str = "https://api.x.ai/v1"
    grok_timeout_seconds: int = 60

    # Gemini (Google AI Studio) — ASK ZORQEN primary copilot provider.
    # Takes priority over Grok/Groq when GEMINI_API_KEY is set.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: int = 60

    # AI provider abstraction — "groq" | "gemini" | "openai" | "anthropic" | "mock"
    ai_provider: str = "groq"
    ai_enabled: bool = True
    ai_temperature: float = 0.2
    ai_max_retries: int = 2

    # Optional alternative providers
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Docker Sandbox
    sandbox_enabled: bool = True
    sandbox_network: str = "none"
    sandbox_memory_limit: str = "512m"
    sandbox_cpu_limit: float = 0.5
    sandbox_timeout: int = 60

    # Rate limiting (slowapi)
    rate_limit_requests: int = 120
    rate_limit_window: str = "minute"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Trusted hosts for TrustedHostMiddleware.
    # In production, requests must arrive with a Host header that matches the
    # frontend (Vercel) and/or the backend's own public domain (Koyeb).
    # Koyeb domains are assigned dynamically, so set BACKEND_URL to the
    # Koyeb public domain (or add TRUSTED_HOSTS explicitly).
    trusted_hosts: List[str] = []

    @field_validator("trusted_hosts", mode="before")
    @classmethod
    def parse_trusted_hosts(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [host.strip() for host in v.split(",") if host.strip()]
        return v

    @property
    def trusted_hosts_list(self) -> List[str]:
        """Hostnames allowed to reach the API in production.

        Derived from explicit TRUSTED_HOSTS plus the hostnames of
        FRONTEND_URL and BACKEND_URL (scheme and port stripped).
        """
        hosts: List[str] = []
        for url in (self.frontend_url, self.backend_url):
            if not url:
                continue
            try:
                parsed = urlparse(url)
            except ValueError:
                continue
            if parsed.hostname:
                hosts.append(parsed.hostname)
        hosts.extend(self.trusted_hosts)
        return list(dict.fromkeys(hosts))

    # Logging
    log_level: str = "INFO"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgres")

    @property
    def github_configured(self) -> bool:
        return bool(self.github_client_id and self.github_client_secret)

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key)

    @property
    def grok_configured(self) -> bool:
        return bool(self.grok_api_key)

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def groq_model_deprecated(self) -> bool:
        """True when GROQ_MODEL points at a model Groq no longer serves.

        llama-3.3-70b-versatile was retired by the Groq API (HTTP 404
        model_not_found). Operators who still have it set in their deployment
        environment get a loud boot warning instead of silent AI degradation.
        """
        return self.groq_model.strip().lower() in {
            "llama-3.3-70b-versatile",
            "llama3-70b-8192",
            "llama3-8b-8192",
        }

    @property
    def ai_configured(self) -> bool:
        """True when the configured provider has a usable API key."""
        if not self.ai_enabled:
            return False
        if self.ai_provider == "mock":
            return True
        if self.ai_provider == "groq":
            return self.groq_configured
        if self.ai_provider == "gemini":
            return bool(self.gemini_api_key)
        if self.ai_provider == "openai":
            return bool(self.openai_api_key)
        if self.ai_provider == "anthropic":
            return bool(self.anthropic_api_key)
        return False


settings = Settings()
