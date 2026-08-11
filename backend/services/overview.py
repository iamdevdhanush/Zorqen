"""RAKSHA — Overview service: cross-repo dashboard contract"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding
from models.repository import Repository
from models.snapshot import RepositorySnapshot
from models.user import User
from services.scoring import severity_counts, GLOBAL_AVERAGE
from services.serializers import finding_contract, repo_meta


async def overview(db: AsyncSession, user: User) -> dict:
    """Aggregate dashboard payload: health, snapshots, top issues, recent runs."""
    repos = (
        (await db.execute(select(Repository).where(Repository.user_id == user.id))).scalars().all()
    )
    total_repos = len(repos)

    top_snapshot = None
    if total_repos:
        best = await db.execute(
            select(RepositorySnapshot)
            .where(RepositorySnapshot.repository_id.in_([r.id for r in repos]))
            .order_by(RepositorySnapshot.score.desc())
            .limit(1)
        )
        top_snapshot = best.scalar_one_or_none()

    findings = (
        await db.execute(
            select(Finding)
            .options(
                selectinload(Finding.validation_result),
                selectinload(Finding.remediation),
            )
            .join(Assessment, Finding.assessment_id == Assessment.id)
            .join(Repository, Assessment.repository_id == Repository.id)
            .where(Repository.user_id == user.id)
        )
    ).scalars().all()
    counts = severity_counts([
        {"severity": f.severity, "confidence": f.confidence, "status": f.status}
        for f in findings
    ])
    active_findings = [
        f for f in findings
        if (f.status or "open").lower() not in {"dismissed", "false_positive"}
    ]
    open_count = len(active_findings)

    open_findings = sorted(
        active_findings,
        key=lambda f: (f.severity or "info", -(f.confidence_pct or 0)),
    )[:5]

    completed = (
        await db.execute(
            select(Assessment, Repository)
            .join(Repository, Assessment.repository_id == Repository.id)
            .where(
                Repository.user_id == user.id,
                Assessment.status == AssessmentStatus.COMPLETED,
            )
            .order_by(Assessment.created_at.desc())
            .limit(1)
        )
    ).first()

    top_meta = None
    if top_snapshot:
        top_meta = {
            "name": top_snapshot.repository.name if top_snapshot.repository else "N/A",
            "commit": (top_snapshot.repository.head_commit[:7] if top_snapshot.repository and top_snapshot.repository.head_commit else "N/A"),
            "score": int(top_snapshot.score),
            "trend": {"up": True, "delta": 0},
        }
    elif completed:
        assessment, repo = completed
        top_meta = {
            "name": repo.name,
            "commit": (repo.head_commit or assessment.commit_sha or "N/A")[:7],
            "score": int(assessment.security_score) if assessment.security_score is not None else GLOBAL_AVERAGE,
            "trend": {"up": True, "delta": 0},
        }
    else:
        top_meta = {"name": "N/A", "commit": "N/A", "score": GLOBAL_AVERAGE, "trend": {"up": True, "delta": 0}}

    current = (
        (await db.execute(
            select(Repository)
            .where(Repository.user_id == user.id)
            .order_by(Repository.updated_at.desc())
            .limit(1)
        )).scalar_one_or_none()
    )

    return {
        "repos": [repo_meta(r) for r in repos],
        "totalRepos": total_repos,
        "topScore": top_meta["score"],
        "topRepo": top_meta,
        "totalFindings": len(findings),
        "openCount": open_count,
        "closedCount": len(findings) - open_count,
        "avgReposFixed": min(100, round((open_count / max(1, len(findings))) * 100)),
        "scores": await _score_series(db, user),
        "topIssues": [finding_contract(f) for f in open_findings],
        "recentActivity": await _recent_activity(db, user),
        "current": repo_meta(current) if current else None,
        "reposFixed": open_count,
    }


async def _score_series(db: AsyncSession, user: User) -> list:
    rows = (
        await db.execute(
            select(RepositorySnapshot)
            .join(Repository, RepositorySnapshot.repository_id == Repository.id)
            .where(Repository.user_id == user.id)
            .order_by(RepositorySnapshot.created_at.desc())
            .limit(60)
        )
    ).scalars().all()
    points = list(reversed(rows))
    return [
        {"date": p.created_at.isoformat() if p.created_at else None, "score": p.score}
        for p in points
    ]


async def _recent_activity(db: AsyncSession, user: User) -> list:
    rows = (
        await db.execute(
            select(Assessment, Repository)
            .join(Repository, Assessment.repository_id == Repository.id)
            .where(Repository.user_id == user.id)
            .order_by(Assessment.created_at.desc())
            .limit(8)
        )
    ).all()
    activity = []
    for assessment, repo in rows:
        status = str(assessment.status or "pending")
        if status == AssessmentStatus.COMPLETED.value:
            tone, text = "ok", f"{repo.name} passed security assessment · {assessment.security_score or 74}/100"
        elif status == AssessmentStatus.RUNNING.value:
            tone, text = "info", f"{repo.name} assessment running"
        else:
            tone, text = "info", f"{repo.name} assessment {status}"
        activity.append({
            "time": assessment.created_at.isoformat() if assessment.created_at else None,
            "text": text,
            "tone": tone,
        })
    return activity
