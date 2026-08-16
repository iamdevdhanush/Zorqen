"""
RAKSHA Backend — Database Setup (SQLAlchemy async; SQLite or PostgreSQL)
"""
from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from core.config import settings

log = structlog.get_logger()

if settings.is_postgres:
    engine = create_async_engine(
        settings.database_url,
        echo=settings.is_development,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
    )
else:
    engine = create_async_engine(
        settings.database_url,
        echo=settings.is_development,
        connect_args={"check_same_thread": False},
    )

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup and purge any legacy demo records.

    Demo mode was removed; any leftover seeded rows (is_demo users, their
    repositories, snapshots, assessments, findings) are deleted so the console
    never surfaces fabricated data. Models are imported here to avoid the
    circular import (models import Base from this module).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from models.user import User
        result = await db.execute(select(User).where(User.is_demo.is_(True)))
        demo_users = result.scalars().all()
        for u in demo_users:
            await db.delete(u)
        if demo_users:
            await db.commit()
            log.info("purged legacy demo records", users=len(demo_users))


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
