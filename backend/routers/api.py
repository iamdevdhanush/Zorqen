"""RAKSHA — Repositories, Assessments, Findings, Remediation, Copilot routers
Console contract (frontend/src/lib/types.ts) via services.serializers.
"""
from __future__ import annotations

import httpx
import structlog
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from agents.orchestrator import run_assessment
from agents.remediation_agent import generate_fix
from core.database import get_db
from github.client import GitHubClient
from models.assessment import Assessment
from models.finding import Finding, FindingStatus
from models.remediation import Remediation, RemediationStatus
from models.repository import Repository
from models.user import User
from routers.deps import get_current_user
from services.assessments import create_assessment, get_run, list_user_runs, resolve_assessment
from services.copilot import CopilotRequest, investigate
from services.findings import find_by_slug, search_findings
from services.grok import GrokAPIError, GrokConfigurationError
from services.serializers import finding_contract, remediation_contract, repo_meta, run_contract

# ── Repositories ────────────────────────────────────────────────────────────

repos_router = APIRouter(prefix="/repositories", tags=["repositories"])

log = structlog.get_logger()


@repos_router.get("")
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
        .order_by(desc(Repository.updated_at))
    )
    return {"repositories": [repo_meta(r) for r in result.scalars().all()]}


@repos_router.get("/github")
async def list_github_repos(current_user: User = Depends(get_current_user)):
    """Fetch ALL GitHub repositories the authenticated user can access.

    Uses the authenticated GET /user/repos endpoint with full pagination. The
    response is normalized to the frontend RepoMeta contract — never truncated,
    never filtered by ownership, and never includes OAuth tokens.
    """
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="No GitHub access token")
    client = GitHubClient(current_user.github_access_token)
    try:
        gh_user = await client.get_user()
        log.info("[GITHUB] authenticated_user", username=gh_user.get("login"))

        repos = await client.list_repos()
        private_count = sum(1 for r in repos if r.get("private"))
        log.info(
            "[GITHUB] repositories summary",
            total_repositories=len(repos),
            private_repositories=private_count,
            public_repositories=len(repos) - private_count,
        )
        return {
            "repositories": [GitHubClient.normalize_repo(r) for r in repos],
            "total": len(repos),
            "authenticated_user": gh_user.get("login"),
        }
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning("[GITHUB] api_error", status=status)
        detail = {
            401: "GitHub authentication failed or expired — reconnect GitHub.",
            403: "GitHub API rate limit or permission denied.",
            404: "GitHub resource not found.",
        }.get(status, f"GitHub API error ({status}).")
        raise HTTPException(status_code=status, detail=detail)
    except Exception as e:
        log.warning("[GITHUB] unexpected_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"GitHub API error: {str(e)}")


class ConnectRepoRequest(BaseModel):
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    default_branch: str = "main"
    html_url: Optional[str] = None
    clone_url: Optional[str] = None
    github_repo_id: Optional[int] = None
    stars: int = 0


@repos_router.post("")
async def connect_repository(
    req: ConnectRepoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Repository).where(
            Repository.user_id == current_user.id,
            Repository.full_name == req.full_name,
        )
    )
    repo = existing.scalar_one_or_none()
    if repo:
        return repo_meta(repo)

    repo = Repository(
        user_id=current_user.id,
        full_name=req.full_name,
        owner=req.owner,
        name=req.name,
        description=req.description,
        language=req.language,
        default_branch=req.default_branch,
        html_url=req.html_url,
        clone_url=req.clone_url,
        github_repo_id=req.github_repo_id,
        stars=req.stars,
        head_commit=None,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    return repo_meta(repo)


@repos_router.get("/{repo_id}")
async def get_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    return repo_meta(repo)


@repos_router.get("/{repo_id}/branches")
async def get_branches(repo_id: str, current_user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    if not current_user.github_access_token:
        return {"branches": [{"name": repo.default_branch}]}
    client = GitHubClient(current_user.github_access_token)
    return {"branches": await client.list_branches(repo.owner, repo.name)}


@repos_router.get("/{repo_id}/commits")
async def get_commits(repo_id: str, branch: str = "main",
                      current_user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    if not current_user.github_access_token:
        return {"commits": []}
    client = GitHubClient(current_user.github_access_token)
    return {"commits": await client.list_commits(repo.owner, repo.name, branch)}


async def _get_repo_or_404(repo_id: str, user_id: str, db: AsyncSession) -> Repository:
    repo = await db.get(Repository, repo_id)
    if not repo or repo.user_id != user_id:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


# ── Assessments ─────────────────────────────────────────────────────────────

assessments_router = APIRouter(prefix="/assessments", tags=["assessments"])


class StartAssessmentRequest(BaseModel):
    repository_id: str
    branch: str = "main"
    commit_sha: Optional[str] = None


@assessments_router.post("")
async def start_assessment(
    req: StartAssessmentRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _get_repo_or_404(req.repository_id, current_user.id, db)
    assessment = await create_assessment(
        db,
        repo,
        branch=req.branch,
        commit_sha=req.commit_sha or repo.head_commit,
        user=current_user,
    )
    # Run the pipeline in the background (demo repos scan bundled fixtures).
    background_tasks.add_task(run_assessment, assessment.id, current_user.github_access_token)
    return await get_run(db, assessment, with_findings=False)


@assessments_router.get("/repository/{repo_id}")
async def list_repo_assessments(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_repo_or_404(repo_id, current_user.id, db)
    result = await db.execute(
        select(Assessment).where(Assessment.repository_id == repo_id)
        .order_by(desc(Assessment.created_at))
    )
    runs = []
    for assessment in result.scalars().all():
        runs.append(await get_run(db, assessment))
    return {"runs": runs}


@assessments_router.get("/{assessment_ref}")
async def get_assessment(
    assessment_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assessment = await _resolve_owned_assessment(db, current_user, assessment_ref)
    return await get_run(db, assessment)


@assessments_router.get("/{assessment_ref}/findings")
async def get_assessment_findings(
    assessment_ref: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assessment = await _resolve_owned_assessment(db, current_user, assessment_ref)
    result = await search_findings(
        db, current_user, assessment_id=assessment.id,
        severity=severity, status=status, page_size=200,
    )
    return {"findings": result["findings"], "total": result["total"]}


async def _resolve_owned_assessment(db: AsyncSession, user: User, ref: str) -> Assessment:
    assessment = await resolve_assessment(db, ref)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    repo = await db.get(Repository, assessment.repository_id)
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


# ── Findings ────────────────────────────────────────────────────────────────

findings_router = APIRouter(prefix="/findings", tags=["findings"])


@findings_router.get("")
async def search_endpoint(
    q: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    cwe: Optional[str] = None,
    source_tool: Optional[str] = None,
    sort: str = "severity",
    order: str = "desc",
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await search_findings(
        db, current_user, q=q, severity=severity, status=status, cwe=cwe,
        source_tool=source_tool, sort=sort, order=order, page=page, page_size=page_size,
    )


@findings_router.get("/{finding_ref}")
async def get_finding(
    finding_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    finding = await _resolve_finding(db, current_user, finding_ref)
    return finding_contract(finding)


@findings_router.post("/{finding_ref}/dismiss")
async def dismiss_finding(
    finding_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    finding = await _resolve_finding(db, current_user, finding_ref)
    finding.status = FindingStatus.DISMISSED
    await db.commit()
    return finding_contract(finding)


@findings_router.post("/{finding_ref}/generate-fix")
async def generate_finding_fix(
    finding_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    finding = await _resolve_finding(db, current_user, finding_ref)

    result = await db.execute(select(Remediation).where(Remediation.finding_id == finding.id))
    existing = result.scalar_one_or_none()
    if existing and existing.code_after:
        return remediation_contract(existing, finding)

    try:
        fix = await generate_fix(
            vulnerability_type=finding.vulnerability_type,
            file_path=finding.file_path or "",
            code_before=finding.code_snippet or "",
            root_cause=finding.root_cause or "",
            cwe_id=finding.cwe_id,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI fix generation unavailable: {str(e)}")

    if existing:
        existing.code_before = fix["code_before"]
        existing.code_after = fix["code_after"]
        existing.unified_diff = fix["unified_diff"]
        existing.explanation = fix["explanation"]
        existing.risks = fix["risks"]
        existing.status = RemediationStatus.GENERATED
        remediation = existing
    else:
        remediation = Remediation(
            finding_id=finding.id,
            file_path=finding.file_path,
            code_before=fix["code_before"],
            code_after=fix["code_after"],
            unified_diff=fix["unified_diff"],
            explanation=fix["explanation"],
            risks=fix["risks"],
            status=RemediationStatus.GENERATED,
        )
        db.add(remediation)

    finding.status = FindingStatus.FIXING
    await db.commit()
    await db.refresh(remediation)
    return remediation_contract(remediation, finding)


async def _resolve_finding(db: AsyncSession, user: User, ref: str) -> Finding:
    finding = await find_by_slug(db, user, ref)
    if finding is None:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Finding)
            .options(
                selectinload(Finding.validation_result),
                selectinload(Finding.remediation),
            )
            .where(Finding.id == ref)
        )
        finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


# ── ASK RAKSHA Investigation Copilot ────────────────────────────────────────

copilot_router = APIRouter(prefix="/copilot", tags=["copilot"])


@copilot_router.post("/chat")
async def copilot_chat(
    req: CopilotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evidence-grounded ASK RAKSHA: targeted retrieval → Grok → grounded answer + sources.

    Grok runs server-side only. The frontend sends page context (route,
    repository, assessment, finding) plus conversation history; the backend
    retrieves the relevant Raksha evidence, grounds the answer in it, and
    returns structured source references. Never exposes the API key or stacks.
    """
    try:
        return await investigate(db, current_user, req)
    except GrokAPIError as e:
        log.warning(
            "[COPILOT] grok_error",
            error_code=getattr(e, "code", "GROK_API_ERROR"),
            status=e.status,
        )
        raise HTTPException(
            status_code=429 if e.status == 429 else 503,
            detail="ASK RAKSHA is temporarily unavailable. Please try again.",
        )
    except GrokConfigurationError:
        log.warning("[COPILOT] grok_not_configured", error_code="GROK_CONFIGURATION_ERROR")
        raise HTTPException(
            status_code=503,
            detail="ASK RAKSHA is temporarily unavailable. Please try again.",
        )
    except Exception as e:
        log.warning("[COPILOT] unexpected_error", error_code="BACKEND_ERROR", error_type=type(e).__name__)
        raise HTTPException(
            status_code=503,
            detail="ASK RAKSHA is temporarily unavailable. Please try again.",
        )
