"""ZORQEN — Repositories, Assessments, Findings, Remediation, Copilot routers
Console contract (frontend/src/lib/types.ts) via services.serializers.
"""
from __future__ import annotations

import asyncio
import httpx
import re
import structlog
import uuid
from datetime import datetime, timezone
from typing import Optional

from core.config import settings
from core.errors import structured_error
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession


from agents.orchestrator import run_assessment
from agents.llm_client import LLM_EXTERNAL_ERRORS
from agents.remediation_agent import generate_fix
from core.database import get_db
from github.client import GitHubClient
# Assessment and AssessmentStatus must both be imported — AssessmentStatus is used
# in _latest_assessment_scores() and was previously missing, causing NameError on
# every /repositories/github call.
from models.assessment import Assessment, AssessmentStatus
from models.finding import Finding, FindingStatus
from models.remediation import Remediation, RemediationStatus
from models.repository import Repository
from models.user import User
from routers.deps import get_current_user
from services.assessments import create_assessment, get_run, list_user_runs, resolve_assessment, _findings_for
from services.copilot import CopilotRequest, CopilotContextError, investigate
from services.findings import find_by_slug, search_findings
from services.grok import GrokAPIError, GrokConfigurationError
from services.serializers import finding_contract, remediation_contract, repo_meta, run_contract

# Rate limiter for this module — uses the same key function (remote address)
# as the app-level limiter in main.py, so limits apply consistently.
_limiter = Limiter(key_func=get_remote_address)

# Safe identifier pattern: GitHub owner/repo names may only contain
# alphanumerics, hyphens, underscores, and dots.
_SAFE_IDENT = re.compile(r'^[a-zA-Z0-9_.-]{1,100}$')

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
@_limiter.limit("30/minute")
async def list_github_repos(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch ALL GitHub repositories the authenticated user can access.

    Uses the authenticated GET /user/repos endpoint with full pagination. The
    response is normalized to the frontend RepoMeta contract — never truncated,
    never filtered by ownership, and never includes OAuth tokens. Each repo is
    annotated with the latest completed assessment's score and open finding
    count (when one exists).
    """
    if not current_user.get_github_token():
        raise HTTPException(status_code=400, detail="No GitHub access token")
    client = GitHubClient(current_user.get_github_token())
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

        # Build a lookup from GitHub integer ID → ZORQEN UUID for all connected repos
        connected = await db.execute(
            select(Repository).where(Repository.user_id == current_user.id)
        )
        github_to_zorqen = {
            r.github_repo_id: r.id
            for r in connected.scalars().all()
            if r.github_repo_id
        }

        latest = await _latest_assessment_scores(db, current_user)
        contracts = []
        for r in repos:
            gh_id = r.get("id")
            zorqen_id = github_to_zorqen.get(gh_id)
            c = GitHubClient.normalize_repo(r, zorqen_id=zorqen_id)
            meta = latest.get(c["fullName"])
            if meta:
                c["latestScore"] = meta["score"]
                c["latestFindingsCount"] = meta["findings_count"]
            contracts.append(c)
        return {
            "repositories": contracts,
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
        raise HTTPException(
            status_code=502,
            detail="GitHub API unavailable. Check your connection and try again.",
        )


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

    @field_validator("owner", "name")
    @classmethod
    def validate_safe_identifier(cls, v: str) -> str:
        """Reject owner/name values that don't match GitHub's identifier rules.
        This prevents path traversal and injection via repository identifiers."""
        if not _SAFE_IDENT.match(v):
            raise ValueError(
                f"Invalid identifier '{v}'. Only alphanumerics, hyphens, underscores and dots are allowed."
            )
        return v

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: Optional[str]) -> Optional[str]:
        """Strip any HTML tags from description to prevent stored XSS."""
        if v is None:
            return v
        # Simple HTML tag stripping — sufficient for a metadata field
        import re as _re
        return _re.sub(r'<[^>]+>', '', v)[:500]


@repos_router.post("")
async def connect_repository(
    req: ConnectRepoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gh_token = current_user.get_github_token()
    if not gh_token:
        raise HTTPException(
            status_code=401,
            detail="GitHub account not connected. Re-connect your GitHub account and retry.",
        )

    # Verify the repository really exists on GitHub and is accessible with
    # this user's token.  Never create a record from unverified client
    # metadata — the canonical data comes from the GitHub API response.
    client = GitHubClient(gh_token)
    try:
        gh_repo = await client.get_repo(req.owner, req.name)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 404:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "stage": "repository_connect",
                    "code": "GITHUB_REPOSITORY_NOT_FOUND",
                    "message": f"Repository '{req.owner}/{req.name}' not found or not accessible on GitHub.",
                },
            )
        raise HTTPException(
            status_code=status,
            detail={
                "success": False,
                "stage": "repository_connect",
                "code": "GITHUB_API_ERROR",
                "message": f"GitHub API returned HTTP {status} while verifying the repository.",
            },
        )
    except httpx.HTTPError as e:
        raise _github_error(e, stage="repository_connect", context=f"{req.owner}/{req.name}")

    full_name = gh_repo.get("full_name") or f"{req.owner}/{req.name}"
    owner = (gh_repo.get("owner") or {}).get("login") or req.owner
    name = gh_repo.get("name") or req.name

    existing = await db.execute(
        select(Repository).where(
            Repository.user_id == current_user.id,
            Repository.full_name == full_name,
        )
    )
    repo = existing.scalar_one_or_none()
    if repo:
        # Refresh stored metadata from the canonical GitHub response.
        repo.owner = owner
        repo.name = name
        repo.description = gh_repo.get("description")
        repo.language = gh_repo.get("language")
        repo.default_branch = gh_repo.get("default_branch") or "main"
        repo.is_private = bool(gh_repo.get("private"))
        repo.html_url = gh_repo.get("html_url")
        repo.clone_url = gh_repo.get("clone_url")
        repo.github_repo_id = gh_repo.get("id") or req.github_repo_id
        repo.stars = gh_repo.get("stargazers_count") or 0
        await db.commit()
        await db.refresh(repo)
        return repo_meta(repo)

    repo = Repository(
        user_id=current_user.id,
        full_name=full_name,
        owner=owner,
        name=name,
        description=gh_repo.get("description"),
        language=gh_repo.get("language"),
        default_branch=gh_repo.get("default_branch") or "main",
        is_private=bool(gh_repo.get("private")),
        html_url=gh_repo.get("html_url"),
        clone_url=gh_repo.get("clone_url"),
        github_repo_id=gh_repo.get("id") or req.github_repo_id,
        stars=gh_repo.get("stargazers_count") or 0,
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


@repos_router.get("/github/{github_id}")
async def get_repo_by_github_id(
    github_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve a GitHub integer repository ID to the ZORQEN repository record.

    If the repository has not been connected yet, auto-connect it from GitHub
    using the authenticated user's token and return the created record.
    """
    if not current_user.get_github_token():
        raise HTTPException(status_code=400, detail="No GitHub access token — re-connect your GitHub account.")

    # Check if already connected in ZORQEN DB
    result = await db.execute(
        select(Repository).where(
            Repository.github_repo_id == github_id,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if repo:
        # Self-heal a stale identity: a renamed/transferred repository keeps its
        # GitHub integer ID, so this record can be found under its OLD owner/name.
        # get_repo follows the 301 redirect to the canonical resource; persist the
        # current owner/name/full_name so the frontend and all API calls use the
        # canonical name instead of re-hitting the redirect.
        client = GitHubClient(current_user.get_github_token())
        try:
            gh_repo = await client.get_repo(repo.owner, repo.name)
            new_full = gh_repo.get("full_name") or repo.full_name
            new_owner = (gh_repo.get("owner") or {}).get("login") or repo.owner
            new_name = gh_repo.get("name") or repo.name
            if (new_full, new_owner, new_name) != (repo.full_name, repo.owner, repo.name):
                previous = f"{repo.owner}/{repo.name}"
                repo.full_name = new_full
                repo.owner = new_owner
                repo.name = new_name
                await db.commit()
                log.info(
                    "[ZORQEN] repository_identity_refreshed",
                    github_id=github_id,
                    full_name=new_full,
                    previous=previous,
                )
        except (httpx.HTTPStatusError, httpx.HTTPError):
            pass  # fall through — return stored metadata; detail surfaces errors
        return repo_meta(repo)

    # Not connected — fetch from GitHub and auto-create
    client = GitHubClient(current_user.get_github_token())
    try:
        # Search through user's repos to find the one with this ID
        all_repos = await client.list_repos()
        gh_repo = next((r for r in all_repos if r.get("id") == github_id), None)
        if not gh_repo:
            raise HTTPException(
                status_code=404,
                detail=f"GitHub repository with ID {github_id} not found in your accessible repositories.",
            )
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning(
            "[GITHUB] auto_connect_list_failed",
            github_id=github_id,
            http_status=status,
        )
        raise HTTPException(status_code=status, detail="GitHub API error fetching repositories.")

    owner = (gh_repo.get("owner") or {}).get("login", "")
    name = gh_repo.get("name") or ""
    full_name = gh_repo.get("full_name") or f"{owner}/{name}"

    repo = Repository(
        user_id=current_user.id,
        full_name=full_name,
        owner=owner,
        name=name,
        description=gh_repo.get("description"),
        language=gh_repo.get("language"),
        default_branch=gh_repo.get("default_branch") or "main",
        is_private=bool(gh_repo.get("private")),
        html_url=gh_repo.get("html_url"),
        clone_url=gh_repo.get("clone_url"),
        github_repo_id=github_id,
        stars=gh_repo.get("stargazers_count") or 0,
        head_commit=None,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    log.info(
        "[ZORQEN] auto_connected_repository",
        github_id=github_id,
        full_name=full_name,
        zorqen_id=repo.id,
    )
    return repo_meta(repo)


@repos_router.get("/{repo_id}/detail")
async def get_repository_detail(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real GitHub-backed repo detail: default branch, HEAD commit, tree, languages.

    Resolution chain:
      1. Resolve repo_id → ZORQEN record (UUID or GitHub integer ID).
      2. If GitHub ID provided but not in DB, auto-connect from GitHub API.
      3. Fetch fresh repository metadata from GitHub (default_branch, etc.).
      4. Resolve HEAD commit SHA from the branch ref (never use a stale SHA).
      5. Fetch the recursive git tree using the real HEAD SHA.
      6. Fetch language bytes from GitHub languages API.

    Returns structured errors — never fabricates data.
    """
    if not current_user.get_github_token():
        raise HTTPException(
            status_code=400,
            detail="No GitHub access token — re-connect your GitHub account.",
        )
    client = GitHubClient(current_user.get_github_token())

    # --- Step 1: Resolve the repository record ---
    # Try UUID first; fall back to GitHub integer ID; auto-connect if missing.
    repo = await _resolve_repo_with_auto_connect(repo_id, current_user, db, client)

    log.info(
        "[ZORQEN] repository_detail_start",
        zorqen_id=repo.id,
        github_repo_id=repo.github_repo_id,
        owner=repo.owner,
        name=repo.name,
    )

    # --- Step 2: Fetch fresh repository metadata from GitHub ---
    try:
        gh_repo_data = await client.get_repo(repo.owner, repo.name)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning(
            "[GITHUB] get_repo_failed",
            owner=repo.owner,
            name=repo.name,
            http_status=status,
        )
        if status == 404:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "GITHUB_REPOSITORY_NOT_FOUND",
                    "message": (
                        "GitHub could not find this repository. It may have been deleted, "
                        "renamed, or the token may not have access to a private repository."
                    ),
                    "repository": f"{repo.owner}/{repo.name}",
                    "github_status": 404,
                },
            )
        raise HTTPException(
            status_code=status,
            detail={
                "error": "GITHUB_API_ERROR",
                "message": f"GitHub API returned HTTP {status}.",
                "repository": f"{repo.owner}/{repo.name}",
                "github_status": status,
            },
        )

    # Sync fresh metadata from GitHub into the ZORQEN record. This includes the
    # canonical owner/name/full_name: a renamed or transferred repo makes GitHub
    # answer 301 Moved Permanently and `get_repo` follows the redirect to the
    # canonical resource, so the stored identity is corrected here instead of
    # re-hitting the redirect on every subsequent request.
    fresh_owner = (gh_repo_data.get("owner") or {}).get("login") or repo.owner
    fresh_name = gh_repo_data.get("name") or repo.name
    fresh_full_name = gh_repo_data.get("full_name") or repo.full_name
    fresh_default_branch = gh_repo_data.get("default_branch") or repo.default_branch or "main"
    fresh_language = gh_repo_data.get("language") or repo.language
    fresh_private = bool(gh_repo_data.get("private"))
    if (
        repo.owner != fresh_owner
        or repo.name != fresh_name
        or repo.full_name != fresh_full_name
        or repo.default_branch != fresh_default_branch
        or repo.language != fresh_language
        or repo.is_private != fresh_private
    ):
        repo.owner = fresh_owner
        repo.name = fresh_name
        repo.full_name = fresh_full_name
        repo.default_branch = fresh_default_branch
        repo.language = fresh_language
        repo.is_private = fresh_private
        await db.commit()
        log.info(
            "[ZORQEN] repository_metadata_synced",
            owner=repo.owner,
            name=repo.name,
            default_branch=fresh_default_branch,
        )

    default_branch = fresh_default_branch

    # --- Step 3: Resolve HEAD commit SHA from branch ref ---
    # Never use a stale stored SHA as the tree ref — always resolve fresh.
    head_sha: Optional[str] = None
    try:
        commits = await client.list_commits(repo.owner, repo.name, default_branch, per_page=1)
        if commits:
            head_sha = commits[0].get("sha")
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        log.warning(
            "[GITHUB] list_commits_failed",
            owner=repo.owner,
            name=repo.name,
            branch=default_branch,
            http_status=status_code,
        )
        # Non-fatal: we'll try with branch name as ref

    if head_sha and head_sha != repo.head_commit:
        repo.head_commit = head_sha
        await db.commit()
        log.info(
            "[ZORQEN] head_commit_updated",
            owner=repo.owner,
            name=repo.name,
            head_sha=head_sha[:7] if head_sha else None,
        )

    # Use the resolved SHA as tree ref; fall back to branch name (GitHub accepts both)
    tree_ref = head_sha or default_branch

    # --- Step 4: Fetch recursive git tree ---
    try:
        tree_data = await client.get_tree(repo.owner, repo.name, tree_ref, recursive=True)
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        log.warning(
            "[GITHUB] get_tree_failed",
            owner=repo.owner,
            name=repo.name,
            tree_ref=tree_ref[:7] if len(tree_ref) > 10 else tree_ref,
            http_status=status_code,
        )
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": "GITHUB_TREE_FETCH_FAILED",
                "message": f"GitHub returned HTTP {status_code} fetching the repository tree.",
                "repository": f"{repo.owner}/{repo.name}",
                "github_status": status_code,
            },
        )

    entries = tree_data.get("tree") or []
    # Count only blob (file) entries — exclude trees (directories)
    blob_paths = [
        item["path"]
        for item in entries
        if item.get("type") == "blob" and item.get("path")
    ]
    total_file_count = len(blob_paths)
    truncated = bool(tree_data.get("truncated"))
    MAX_TREE_PATHS = 500
    tree_paths = blob_paths[:MAX_TREE_PATHS]

    if truncated:
        log.warning(
            "[GITHUB] tree_truncated",
            owner=repo.owner,
            name=repo.name,
            shown=len(tree_paths),
            total_known=total_file_count,
        )

    # --- Step 5: Fetch language byte breakdown ---
    try:
        languages = await client.get_languages(repo.owner, repo.name)
        log.info(
            "[GITHUB] languages_fetched",
            owner=repo.owner,
            name=repo.name,
            language_count=len(languages),
        )
    except httpx.HTTPStatusError as e:
        log.warning(
            "[GITHUB] get_languages_failed",
            owner=repo.owner,
            name=repo.name,
            http_status=e.response.status_code,
        )
        languages = {}

    log.info(
        "[ZORQEN] repository_detail_complete",
        owner=repo.owner,
        name=repo.name,
        default_branch=default_branch,
        head_commit=head_sha[:7] if head_sha else None,
        file_count=total_file_count,
        tree_truncated=truncated,
        language_count=len(languages),
    )

    return {
        "repoId": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "fullName": repo.full_name,
        "defaultBranch": default_branch,
        "headCommit": head_sha or repo.head_commit,
        "fileCount": total_file_count,
        "treeTruncated": truncated,
        "treePaths": tree_paths,
        "languages": languages,
    }


@repos_router.get("/{repo_id}/branches")
async def get_branches(repo_id: str, current_user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    if not current_user.get_github_token():
        return {"branches": [{"name": repo.default_branch}]}
    client = GitHubClient(current_user.get_github_token())
    try:
        branches = await client.list_branches(repo.owner, repo.name)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning("[GITHUB] list_branches_failed", repo_id=repo_id, http_status=status)
        raise _github_error(e, stage="branches", context=f"{repo.owner}/{repo.name}")
    except httpx.HTTPError as e:
        raise _github_error(e, stage="branches", context=f"{repo.owner}/{repo.name}")
    return {"branches": branches}


@repos_router.get("/{repo_id}/commits")
async def get_commits(repo_id: str, branch: str = "main",
                      current_user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    if not current_user.get_github_token():
        return {"commits": []}
    client = GitHubClient(current_user.get_github_token())
    try:
        commits = await client.list_commits(repo.owner, repo.name, branch)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning("[GITHUB] list_commits_failed", repo_id=repo_id, branch=branch, http_status=status)
        raise _github_error(e, stage="commits", context=f"{repo.owner}/{repo.name}@{branch}")
    except httpx.HTTPError as e:
        raise _github_error(e, stage="commits", context=f"{repo.owner}/{repo.name}@{branch}")
    return {"commits": commits}


async def _get_repo_or_404(repo_id: str, user_id: str, db: AsyncSession) -> Repository:
    """Resolve a repository by ZORQEN UUID OR GitHub integer database ID.

    The frontend URL /repos/{id} contains the GitHub integer ID returned by
    normalize_repo().  The ZORQEN DB uses UUID primary keys.  When a UUID
    lookup misses, fall back to a github_repo_id integer lookup so that either
    form of the ID works transparently.
    """
    # 1. Try UUID primary key lookup (fast path — ZORQEN-internal navigation)
    repo = await db.get(Repository, repo_id)
    if repo and repo.user_id == user_id:
        return repo
    if repo and repo.user_id != user_id:
        raise HTTPException(status_code=404, detail="Repository not found")

    # 2. Try GitHub integer ID lookup (GitHub ID passed from list endpoint)
    try:
        github_id_int = int(repo_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Repository not found")

    result = await db.execute(
        select(Repository).where(
            Repository.github_repo_id == github_id_int,
            Repository.user_id == user_id,
        )
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Repository with GitHub ID {github_id_int} not found. "
                "Click 'Assess Repository' from the Repositories page to connect it first."
            ),
        )
    return repo


async def _resolve_repo_with_auto_connect(
    repo_id: str,
    current_user: User,
    db: AsyncSession,
    client: "GitHubClient",
) -> Repository:
    """Resolve a repository for the detail endpoint, auto-connecting if needed.

    Resolution order:
      1. ZORQEN UUID primary key lookup.
      2. GitHub integer ID lookup (finds already-connected repos by GitHub ID).
      3. Auto-connect: fetch the GitHub repo via the integer ID, create ZORQEN record.

    Never creates a record for a repo the user's token can't actually access.
    """
    # 1. Try UUID primary key
    repo = await db.get(Repository, repo_id)
    if repo and repo.user_id == current_user.id:
        return repo
    if repo and repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    # 2. Try GitHub integer ID lookup
    try:
        github_id_int = int(repo_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Repository not found")

    result = await db.execute(
        select(Repository).where(
            Repository.github_repo_id == github_id_int,
            Repository.user_id == current_user.id,
        )
    )
    repo = result.scalar_one_or_none()
    if repo:
        return repo

    # 3. Auto-connect: look up in user's GitHub repos list and create ZORQEN record
    log.info(
        "[ZORQEN] auto_connect_attempt",
        github_id=github_id_int,
        user_id=current_user.id,
    )
    try:
        all_repos = await client.list_repos()
        gh_repo = next((r for r in all_repos if r.get("id") == github_id_int), None)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        log.warning(
            "[GITHUB] auto_connect_list_repos_failed",
            github_id=github_id_int,
            http_status=status,
        )
        raise HTTPException(
            status_code=status,
            detail={
                "error": "GITHUB_API_ERROR",
                "message": f"Could not list GitHub repositories (HTTP {status}).",
                "github_status": status,
            },
        )

    if not gh_repo:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "GITHUB_REPOSITORY_NOT_ACCESSIBLE",
                "message": (
                    f"GitHub repository ID {github_id_int} was not found in the "
                    "repositories accessible to your account. If this is a private "
                    "repository, ensure your OAuth token has 'repo' scope."
                ),
                "github_id": github_id_int,
            },
        )

    owner = (gh_repo.get("owner") or {}).get("login", "")
    name = gh_repo.get("name") or ""
    full_name = gh_repo.get("full_name") or f"{owner}/{name}"

    repo = Repository(
        user_id=current_user.id,
        full_name=full_name,
        owner=owner,
        name=name,
        description=gh_repo.get("description"),
        language=gh_repo.get("language"),
        default_branch=gh_repo.get("default_branch") or "main",
        is_private=bool(gh_repo.get("private")),
        html_url=gh_repo.get("html_url"),
        clone_url=gh_repo.get("clone_url"),
        github_repo_id=github_id_int,
        stars=gh_repo.get("stargazers_count") or 0,
        head_commit=None,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    log.info(
        "[ZORQEN] auto_connected_repository",
        github_id=github_id_int,
        full_name=full_name,
        zorqen_id=repo.id,
    )
    return repo


# ── Development-Only Debug Endpoint ────────────────────────────────────────


debug_router = APIRouter(prefix="/debug", tags=["debug"])


@debug_router.get("/github/repository/{repo_id}")
async def debug_github_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sanitized diagnostic endpoint for debugging repository data flow.

    DEVELOPMENT ONLY — returns diagnostic information to trace the
    GitHub API resolution chain. Never returns tokens or secrets.
    Disabled in production.
    """
    if not settings.is_development:
        raise HTTPException(status_code=404, detail="Not found")

    result: dict = {
        "repo_id_received": repo_id,
        "zorqen_repository_id": None,
        "github_repository_id": None,
        "owner": None,
        "name": None,
        "full_name": None,
        "authenticated_user": None,
        "default_branch": None,
        "head_commit": None,
        "github_repo_status": None,
        "tree_status": None,
        "languages_status": None,
        "errors": [],
    }

    if not current_user.get_github_token():
        result["errors"].append("NO_GITHUB_ACCESS_TOKEN")
        return result

    client = GitHubClient(current_user.get_github_token())

    # Authenticated user
    try:
        gh_user = await client.get_user()
        result["authenticated_user"] = gh_user.get("login")
    except Exception as exc:
        result["errors"].append(f"GET_USER_FAILED: {type(exc).__name__}")

    # Resolve repo record
    repo = await db.get(Repository, repo_id)
    if not repo:
        try:
            github_id_int = int(repo_id)
            db_result = await db.execute(
                select(Repository).where(
                    Repository.github_repo_id == github_id_int,
                    Repository.user_id == current_user.id,
                )
            )
            repo = db_result.scalar_one_or_none()
        except (ValueError, TypeError):
            pass

    if repo:
        result["zorqen_repository_id"] = repo.id
        result["github_repository_id"] = repo.github_repo_id
        result["owner"] = repo.owner
        result["name"] = repo.name
        result["full_name"] = repo.full_name
        result["default_branch"] = repo.default_branch
        result["head_commit"] = repo.head_commit[:7] if repo.head_commit else None

        # Test GitHub repo access
        try:
            gh_repo_data = await client.get_repo(repo.owner, repo.name)
            result["github_repo_status"] = "ok"
            result["default_branch"] = gh_repo_data.get("default_branch")
        except httpx.HTTPStatusError as e:
            result["github_repo_status"] = f"HTTP_{e.response.status_code}"
            result["errors"].append(f"GET_REPO_FAILED: HTTP {e.response.status_code}")

        # Test tree access
        if repo.head_commit or result.get("default_branch"):
            try:
                ref = repo.head_commit or result.get("default_branch") or "main"
                tree_data = await client.get_tree(repo.owner, repo.name, ref, recursive=False)
                entry_count = len(tree_data.get("tree") or [])
                result["tree_status"] = f"ok ({entry_count} top-level entries)"
            except httpx.HTTPStatusError as e:
                result["tree_status"] = f"HTTP_{e.response.status_code}"
                result["errors"].append(f"GET_TREE_FAILED: HTTP {e.response.status_code}")

        # Test languages access
        try:
            languages = await client.get_languages(repo.owner, repo.name)
            result["languages_status"] = f"ok ({len(languages)} languages)"
        except httpx.HTTPStatusError as e:
            result["languages_status"] = f"HTTP_{e.response.status_code}"
            result["errors"].append(f"GET_LANGUAGES_FAILED: HTTP {e.response.status_code}")
    else:
        result["errors"].append(f"REPO_NOT_IN_ZORQEN_DB: id={repo_id}")

    return result


async def _latest_assessment_scores(db: AsyncSession, user: User) -> dict:
    """Map full_name -> {score, findings_count} from the latest completed
    assessment of each of the user's connected repositories.

    Batched (3 queries total) — one per repository + one per assessment
    would be N+1 against the database.
    """
    result = await db.execute(
        select(Repository).where(Repository.user_id == user.id)
    )
    repos = result.scalars().all()
    if not repos:
        return {}
    repo_ids = [r.id for r in repos]

    # One query: latest completed assessment per repository (window function).
    ranked = (
        select(
            Assessment.id,
            func.row_number().over(
                partition_by=Assessment.repository_id,
                order_by=desc(Assessment.created_at),
            ).label("rn"),
        )
        .where(
            Assessment.repository_id.in_(repo_ids),
            Assessment.status == AssessmentStatus.COMPLETED,
        )
        .subquery()
    )
    latest = await db.execute(
        select(
            Assessment.id,
            Assessment.repository_id,
            Assessment.security_score,
        ).join(ranked, ranked.c.id == Assessment.id)
        .where(ranked.c.rn == 1)
    )
    latest_by_repo = {
        row.repository_id: row
        for row in latest.all()
    }

    # One query: finding counts for all of those assessments.
    if latest_by_repo:
        count_rows = await db.execute(
            select(Finding.assessment_id, func.count(Finding.id))
            .where(
                Finding.assessment_id.in_([row.id for row in latest_by_repo.values()]),
                Finding.status.notin_(["dismissed", "false_positive"]),
            )
            .group_by(Finding.assessment_id)
        )
        counts = dict(count_rows.all())
    else:
        counts = {}

    by_full_name: dict = {}
    for repo in repos:
        if not repo.full_name:
            continue
        latest_row = latest_by_repo.get(repo.id)
        if latest_row is None:
            continue
        by_full_name[repo.full_name] = {
            "score": latest_row.security_score,
            "findings_count": counts.get(latest_row.id, 0),
        }
    return by_full_name


# ── Assessments ─────────────────────────────────────────────────────────────

assessments_router = APIRouter(prefix="/assessments", tags=["assessments"])


class StartAssessmentRequest(BaseModel):
    repository_id: str
    branch: str = "main"
    commit_sha: Optional[str] = None


def _github_error(exc: httpx.HTTPError, *, stage: str, context: str) -> HTTPException:
    """Map a GitHub API failure to a structured, stage-scoped error.

    Never a generic 503: 401 (auth), 403 (rate limit / permission), 404
    (missing resource), 5xx (GitHub outage) and transport failures each get
    a distinct code so the console can tell the operator exactly what
    happened and how to recover.
    """
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code if exc.response is not None else 0
        if status == 401:
            return structured_error(
                status_code=401,
                stage=stage,
                code="GITHUB_AUTH_EXPIRED",
                message="GitHub authentication failed or expired — reconnect your GitHub account.",
                github_status=status,
                context=context,
            )
        if status == 403:
            remaining = None
            if exc.response is not None:
                remaining = exc.response.headers.get("x-ratelimit-remaining")
            if remaining == "0":
                return structured_error(
                    status_code=429,
                    stage=stage,
                    code="GITHUB_RATE_LIMIT",
                    message="GitHub API rate limit exceeded. Wait for the rate window to reset and retry.",
                    github_status=status,
                    context=context,
                )
            return structured_error(
                status_code=403,
                stage=stage,
                code="GITHUB_PERMISSION_DENIED",
                message="GitHub denied the request — the token may lack access to this repository.",
                github_status=status,
                context=context,
            )
        if status == 404:
            return structured_error(
                status_code=404,
                stage=stage,
                code="GITHUB_NOT_FOUND",
                message="GitHub resource not found — the repository or ref may have been removed.",
                github_status=status,
                context=context,
            )
        return structured_error(
            status_code=502,
            stage=stage,
            code="GITHUB_API_ERROR",
            message=f"GitHub API returned HTTP {status}.",
            github_status=status,
            context=context,
        )
    return structured_error(
        status_code=502,
        stage=stage,
        code="GITHUB_UNREACHABLE",
        message="GitHub is unreachable. Check your connection and retry.",
        context=context,
    )


@assessments_router.post("")
@_limiter.limit("2/minute")
async def start_assessment(
    req: StartAssessmentRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _get_repo_or_404(req.repository_id, current_user.id, db)
    gh_token = current_user.get_github_token()
    if not gh_token:
        raise HTTPException(
            status_code=401,
            detail="GitHub account not connected. Re-connect your GitHub account and retry.",
        )

    # Strict commit resolution: pin the exact commit SHA this assessment
    # scans.  Never fall back to a branch HEAD at fetch time — the recorded
    # commit_sha must always match the data actually scanned.
    try:
        client = GitHubClient(gh_token)
        resolved_sha = await client.resolve_commit_sha(
            repo.owner, repo.name, req.commit_sha or req.branch
        )
    except httpx.HTTPStatusError as e:
        if e.response is not None and e.response.status_code == 404:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "stage": "commit_resolution",
                    "code": "GITHUB_REF_NOT_FOUND",
                    "message": (
                        f"Commit or branch '{req.commit_sha or req.branch}' not found "
                        f"in {repo.owner}/{repo.name}."
                    ),
                },
            )
        raise _github_error(e, stage="commit_resolution", context=f"{repo.owner}/{repo.name}")
    except httpx.HTTPError as e:
        raise _github_error(e, stage="commit_resolution", context=f"{repo.owner}/{repo.name}")

    assessment, created = await create_assessment(
        db,
        repo,
        branch=req.branch,
        commit_sha=resolved_sha,
        user=current_user,
    )
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")

    # Launch the background pipeline ONLY when this request actually created the
    # assessment row. When create_assessment returns an existing active
    # assessment (PENDING or RUNNING), its worker is already running — adding
    # another would spawn a duplicate Semgrep process and corrupt the timeline.
    if created:
        worker_id = str(uuid.uuid4())
        log.info(
            "Starting assessment",
            assessment_id=assessment.id,
            run_number=assessment.run_number,
            repository_id=repo.id,
            request_id=request_id,
            worker_id=worker_id,
            existing=False,
            worker_started=True,
        )
        background_tasks.add_task(
            run_assessment,
            assessment.id,
            gh_token,
            request_id=request_id,
            worker_id=worker_id,
        )
    else:
        log.info(
            "Assessment already active — no worker launched",
            assessment_id=assessment.id,
            run_number=assessment.run_number,
            repository_id=repo.id,
            request_id=request_id,
            existing=True,
            worker_started=False,
        )
    return await get_run(db, assessment, with_findings=False)


@assessments_router.get("/repository/{repo_id}")
async def list_repo_assessments(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = await _get_repo_or_404(repo_id, current_user.id, db)
    log.info(
        "[ASSESSMENTS] list_repo_assessments",
        github_repo_id=repo.github_repo_id,
        zorqen_repository_id=repo.id,
        owner=repo.owner,
        name=repo.name,
    )
    result = await db.execute(
        select(Assessment).where(Assessment.repository_id == repo.id)
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


@assessments_router.get("/{assessment_ref}/events")
async def assessment_events(
    assessment_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events stream of live pipeline progress.

    Every event mirrors backend state that was already committed to the
    database. Event shape:

        {"type": "progress", "stage": "Dependencies Scanned",
         "progress": 45, "status": "running", "file": "...",
         "filesScanned": 12, "totalFiles": 40, "etaSeconds": 18}

    The stream also emits a terminal snapshot when the run finishes, so a
    client that connects late still receives the final state.
    """
    import json as _json

    from sse_starlette.sse import EventSourceResponse
    from services.events import event_bus

    assessment = await _resolve_owned_assessment(db, current_user, assessment_ref)
    queue = event_bus.subscribe(assessment.id)

    async def _stream():
        try:
            # Initial snapshot: replay current persisted state for late joiners.
            yield {
                "event": "snapshot",
                "data": _json.dumps({
                    "type": "snapshot",
                    "stage": STAGE_LABEL_FROM_STEP.get(assessment.current_step, assessment.current_step or ""),
                    "progress": assessment.progress_pct or 0,
                    "status": assessment.status,
                }),
            }
            if assessment.status in {"completed", "failed"}:
                return
            while True:
                event = await queue.get()
                yield {"event": "progress", "data": _json.dumps(event)}
                if event.get("status") in {"completed", "failed"}:
                    break
        finally:
            event_bus.unsubscribe(assessment.id, queue)

    return EventSourceResponse(_stream(), ping=15)


STAGE_LABEL_FROM_STEP = {
    "index": "Queued",
    "repository_indexed": "Repository Indexed",
    "architecture_generated": "Architecture Analyzed",
    "dependencies": "Dependencies Scanned",
    "secrets": "Secrets Scan",
    "security_scan": "Static Analysis",
    "ai_reasoning": "AI Correlation",
    "report_generated": "Report Generated",
    "completed": "Report Generated",
    "failed": "Assessment Failed",
}


@assessments_router.get("/{assessment_ref}/report")
async def download_assessment_report(
    assessment_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download the enterprise Security Validation Report PDF."""
    from fastapi.responses import Response
    from services.report import build_report_pdf

    assessment = await _resolve_owned_assessment(db, current_user, assessment_ref)
    repo = await db.get(Repository, assessment.repository_id)
    findings = await _findings_for(db, assessment.id)
    pdf_bytes = await asyncio.to_thread(build_report_pdf, assessment, findings, repo)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="Security Validation Report.pdf"',
        },
    )


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
    except LLM_EXTERNAL_ERRORS:
        log.warning("[ZORQEN] fix_generation_unavailable", finding_ref=finding_ref)
        raise structured_error(
            status_code=503,
            stage="remediation_generation",
            code="AI_FIX_UNAVAILABLE",
            message="AI fix generation is temporarily unavailable. Please try again.",
        )

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


# ── ASK ZORQEN Investigation Copilot ────────────────────────────────────────

copilot_router = APIRouter(prefix="/copilot", tags=["copilot"])


class GrokTestRequest(BaseModel):
    """BYOK connection-test body.  The key arrives in the JSON body so it
    never touches URLs, query strings, or server access logs."""

    api_key: str

    @field_validator("api_key")
    @classmethod
    def _no_empty_key(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("api_key must not be empty")
        return v.strip()


@copilot_router.post("/grok-test")
@_limiter.limit("5/minute")
async def test_grok_connection(
    body: GrokTestRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Test a BYOK xAI Grok key with a real minimal API request.

    The key is accepted in the JSON body (never in a URL or query param),
    used for a single small probe, and discarded immediately.  The key is
    never stored, never logged, and never included in any response or error.

    Returns: {"ok": true, "model": "<model>"}
    Errors:  {"detail": {"code": "...", "message": "..."}} with appropriate status.
    """
    from services.grok import grok, GrokAPIError as _GrokAPIError, GrokConfigurationError as _GrokCfgError

    # Strip and immediately dereference — we hold only the stripped value
    byok_key = body.api_key  # already stripped by the validator
    try:
        result = await grok.test_connection(byok_key=byok_key)
        log.info("[COPILOT] byok_test_ok", provider="grok_byok", model=result.get("model"))
        return result
    except _GrokAPIError as e:
        code = getattr(e, "code", "GROK_API_ERROR")
        status_http = 401 if e.status in (401, 403) else (429 if e.status == 429 else 503)
        log.warning("[COPILOT] byok_test_failed", provider="grok_byok", error_code=code, status=e.status)
        raise structured_error(
            status_code=status_http,
            stage="copilot",
            code=code,
            message=str(e),
        )
    except _GrokCfgError as e:
        log.warning("[COPILOT] byok_test_config_error", provider="grok_byok")
        raise structured_error(
            status_code=400,
            stage="copilot",
            code="GROK_CONFIGURATION_ERROR",
            message=str(e),
        )
    finally:
        # Ensure the key reference is released even if an exception is raised
        del byok_key


@copilot_router.post("/chat")
@_limiter.limit("10/minute")
async def copilot_chat(
    req: CopilotRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evidence-grounded ASK ZORQEN: targeted retrieval → Grok → grounded answer + sources.

    When the X-Grok-Key header is present, the copilot uses the caller-supplied
    xAI key (BYOK) for this request only. The key is stripped from the header
    immediately after reading and is never stored, logged or returned.

    Without X-Grok-Key the server-side provider chain (Gemini → Grok → Groq)
    is used as normal.  The frontend must NOT supply X-Grok-Key unless the user
    has explicitly configured a BYOK key in Settings.
    """
    import time
    from services.grok import grok as _grok, GrokAPIError as _GrokAPIError, GrokConfigurationError as _GrokCfgError

    t0 = time.perf_counter()
    endpoint = "POST /api/copilot/chat"

    # Read and immediately clear the BYOK header — never re-read request.headers
    raw_key_header = request.headers.get("X-Grok-Key", "").strip()
    byok_key: Optional[str] = raw_key_header if raw_key_header else None
    del raw_key_header  # dereference early

    try:
        if byok_key:
            # BYOK path: use the user-supplied key for this request only.
            # We need to assemble the grounded messages the same way as `investigate()`
            # but route the final LLM call through chat_with_byok().
            from services.copilot import CopilotContextError as _CtxError, investigate as _investigate
            # Build grounded context (same as normal path)
            result = await _investigate(db, current_user, req, byok_key=byok_key)
        else:
            from services.copilot import CopilotContextError as _CtxError, investigate as _investigate
            result = await _investigate(db, current_user, req)

        latency_ms = round((time.perf_counter() - t0) * 1000)
        result["latency_ms"] = latency_ms
        log.info(
            "[COPILOT] chat_ok",
            endpoint=endpoint,
            latency_ms=latency_ms,
            status=200,
            provider=result.get("provider"),
        )
        return result
    except GrokAPIError as e:
        latency_ms = round((time.perf_counter() - t0) * 1000)
        log.warning(
            "[COPILOT] grok_error",
            endpoint=endpoint,
            latency_ms=latency_ms,
            status=e.status,
            error_code=getattr(e, "code", "GROK_API_ERROR"),
        )
        raise structured_error(
            status_code=429 if e.status == 429 else 503,
            stage="copilot",
            code="GROK_RATE_LIMIT" if e.status == 429 else getattr(e, "code", "GROK_API_ERROR"),
            message="ASK ZORQEN is temporarily unavailable. Please try again.",
        )
    except GrokConfigurationError:
        latency_ms = round((time.perf_counter() - t0) * 1000)
        log.warning(
            "[COPILOT] grok_not_configured",
            endpoint=endpoint,
            latency_ms=latency_ms,
            status=503,
            error_code="GROK_CONFIGURATION_ERROR",
        )
        raise structured_error(
            status_code=503,
            stage="copilot",
            code="GROK_CONFIGURATION_ERROR",
            message="ASK ZORQEN is not configured. Set GEMINI_API_KEY, GROK_API_KEY, or GROQ_API_KEY to enable it.",
        )
    except CopilotContextError:
        latency_ms = round((time.perf_counter() - t0) * 1000)
        log.warning(
            "[COPILOT] context_error",
            endpoint=endpoint,
            latency_ms=latency_ms,
            status=400,
            error_code="ASSESSMENT_CONTEXT_ERROR",
        )
        raise structured_error(
            status_code=400,
            stage="copilot",
            code="ASSESSMENT_CONTEXT_ERROR",
            message="The referenced assessment context is missing or stale.",
        )
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000)
        log.warning(
            "[COPILOT] unexpected_error",
            endpoint=endpoint,
            latency_ms=latency_ms,
            status=500,
            error_code="BACKEND_ERROR",
            error_type=type(e).__name__,
        )
        raise structured_error(
            status_code=500,
            stage="copilot",
            code="BACKEND_ERROR",
            message="ASK ZORQEN encountered an internal error. Please try again.",
        )
    finally:
        byok_key = None  # always clear the key reference
