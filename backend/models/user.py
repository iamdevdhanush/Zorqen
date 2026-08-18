"""RAKSHA — User model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base
from core.crypto import decrypt_token, encrypt_token, migrate_token, EncryptionError


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    github_id: Mapped[int] = mapped_column(unique=True, index=True)
    github_login: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    github_name: Mapped[str] = mapped_column(String(255), nullable=True)
    github_email: Mapped[str] = mapped_column(String(255), nullable=True)
    github_avatar_url: Mapped[str] = mapped_column(Text, nullable=True)
    github_access_token: Mapped[str] = mapped_column(Text, nullable=True)  # encrypted at rest
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    repositories: Mapped[list["Repository"]] = relationship("Repository", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def get_github_token(self) -> str:
        """Get decrypted GitHub access token.
        
        Returns empty string if no token or decryption fails.
        """
        token = self.github_access_token
        if not token:
            return ""
        try:
            return decrypt_token(token)
        except EncryptionError:
            # Log and return empty - token is corrupted or key mismatch
            return ""

    def set_github_token(self, plaintext: str) -> None:
        """Set GitHub access token (stored encrypted)."""
        if plaintext:
            self.github_access_token = encrypt_token(plaintext)
        else:
            self.github_access_token = None

    def migrate_github_token(self) -> None:
        """Migrate plaintext token to encrypted if needed."""
        if self.github_access_token:
            self.github_access_token = migrate_token(self.github_access_token)

    def __repr__(self) -> str:
        return f"<User {self.github_login}>"
