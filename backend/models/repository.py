"""ZORQEN — Repository model"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)

    # GitHub metadata
    github_repo_id: Mapped[int] = mapped_column(Integer, nullable=True)
    full_name: Mapped[str] = mapped_column(String(512), index=True)  # owner/repo
    owner: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(100), nullable=True)
    default_branch: Mapped[str] = mapped_column(String(255), default="main")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    html_url: Mapped[str] = mapped_column(Text, nullable=True)
    clone_url: Mapped[str] = mapped_column(Text, nullable=True)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    topics: Mapped[list] = mapped_column(JSON, default=list)

    # Connection state
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)

    # Last scanned HEAD commit (short sha) for the console contract
    head_commit: Mapped[str] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="repositories")
    assessments: Mapped[list["Assessment"]] = relationship("Assessment", back_populates="repository", cascade="all, delete-orphan")
    snapshots: Mapped[list["RepositorySnapshot"]] = relationship("RepositorySnapshot", back_populates="repository", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Repository {self.full_name}>"
