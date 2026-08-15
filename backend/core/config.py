"""
RAKSHA Backend — Core Configuration
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "RAKSHA"
    app_env: str = "development"
    secret_key: str = "dev-secret-key-change-in-production"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Database
    database_url: str = "sqlite+aiosqlite:///./raksha.db"

    # Postgres connection pool (used when database_url is postgresql+asyncpg://)
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 3600

    # Snapshot retention for the overview score chart
    snapshot_retention_days: int = 90

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/auth/github/callback"
    github_api_base: str = "https://api.github.com"
    github_oauth_base: str = "https://github.com"

    # Groq LLM
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

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

    # Demo Mode
    demo_mode_enabled: bool = True
    demo_user_login: str = "demo-user"

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
                return [origin.strip() for origin in v.split(",")]
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
                return [host.strip() for host in v.split(",")]
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
