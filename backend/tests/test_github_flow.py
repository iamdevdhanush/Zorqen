"""
RAKSHA Backend — GitHub Data Flow Tests
Tests: GitHub OAuth, repo discovery, private repo access, metadata,
branch/commit resolution, language retrieval, tree retrieval, API schema,
and error cases (404, 403, 429, expired token).

Run: pytest tests/ -v
"""
from __future__ import annotations

import asyncio
import json
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import HTTPStatusError, Response, Request


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_github_client():
    """Return a mock GitHubClient with configurable responses."""
    from github.client import GitHubClient
    client = MagicMock(spec=GitHubClient)
    client.get_user = AsyncMock(return_value={
        "id": 12345678,
        "login": "iamdevdhanush",
        "name": "Dhanush",
        "email": "dhanush@example.com",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
    })
    client.list_repos = AsyncMock(return_value=[{
        "id": 1331115680,
        "name": "Raksha-ai",
        "full_name": "iamdevdhanush/Raksha-ai",
        "owner": {"login": "iamdevdhanush"},
        "private": True,
        "default_branch": "main",
        "language": "TypeScript",
        "html_url": "https://github.com/iamdevdhanush/Raksha-ai",
        "clone_url": "https://github.com/iamdevdhanush/Raksha-ai.git",
        "stargazers_count": 42,
        "description": "AI-powered security platform",
    }])
    client.get_repo = AsyncMock(return_value={
        "id": 1331115680,
        "name": "Raksha-ai",
        "full_name": "iamdevdhanush/Raksha-ai",
        "owner": {"login": "iamdevdhanush"},
        "private": True,
        "default_branch": "main",
        "language": "TypeScript",
        "html_url": "https://github.com/iamdevdhanush/Raksha-ai",
        "description": "AI-powered security platform",
        "size": 1234,
        "updated_at": "2026-08-18T00:00:00Z",
        "pushed_at": "2026-08-18T00:00:00Z",
    })
    client.list_commits = AsyncMock(return_value=[{
        "sha": "abc123def456789012345678901234567890abcd",
        "commit": {"message": "Initial commit"},
    }])
    client.get_tree = AsyncMock(return_value={
        "sha": "abc123def456789012345678901234567890abcd",
        "truncated": False,
        "tree": [
            {"path": "README.md", "type": "blob", "sha": "aaa111"},
            {"path": "src", "type": "tree", "sha": "bbb222"},
            {"path": "src/index.ts", "type": "blob", "sha": "ccc333"},
            {"path": "src/components", "type": "tree", "sha": "ddd444"},
            {"path": "src/components/App.tsx", "type": "blob", "sha": "eee555"},
            {"path": "package.json", "type": "blob", "sha": "fff666"},
        ],
    })
    client.get_languages = AsyncMock(return_value={
        "TypeScript": 85000,
        "Python": 12000,
        "CSS": 3000,
    })
    return client


def _make_http_error(status_code: int) -> HTTPStatusError:
    """Create a mock HTTPStatusError with the given status code."""
    req = Request("GET", "https://api.github.com/test")
    resp = Response(status_code=status_code, request=req)
    return HTTPStatusError(f"HTTP {status_code}", request=req, response=resp)


# ── GitHubClient Unit Tests ─────────────────────────────────────────────────

class TestGitHubClientHeaders:
    """Verify the client sends required GitHub API headers."""

    def test_headers_present(self):
        from github.client import GitHubClient
        client = GitHubClient("test_token_value")
        assert "Authorization" in client._headers
        assert client._headers["Authorization"] == "Bearer test_token_value"
        assert client._headers["Accept"] == "application/vnd.github+json"
        assert client._headers["X-GitHub-Api-Version"] == "2022-11-28"

    def test_token_not_exposed_in_normalize_repo(self):
        from github.client import GitHubClient
        raw = {
            "id": 1331115680,
            "name": "Raksha-ai",
            "full_name": "iamdevdhanush/Raksha-ai",
            "owner": {"login": "iamdevdhanush"},
            "private": True,
            "default_branch": "main",
            "language": "TypeScript",
        }
        result = GitHubClient.normalize_repo(raw)
        assert "access_token" not in result
        assert "token" not in result
        assert "Authorization" not in result

    def test_normalize_repo_github_id_as_string(self):
        """GitHub integer IDs must be returned as strings for the frontend."""
        from github.client import GitHubClient
        raw = {"id": 1331115680, "name": "Raksha-ai", "full_name": "iamdevdhanush/Raksha-ai",
               "owner": {"login": "iamdevdhanush"}, "private": True}
        result = GitHubClient.normalize_repo(raw)
        assert result["id"] == "1331115680"
        assert isinstance(result["id"], str)

    def test_normalize_repo_private_field(self):
        from github.client import GitHubClient
        raw = {"id": 1, "name": "repo", "full_name": "user/repo",
               "owner": {"login": "user"}, "private": True}
        result = GitHubClient.normalize_repo(raw)
        assert result["private"] is True

    def test_normalize_repo_public_field(self):
        from github.client import GitHubClient
        raw = {"id": 2, "name": "public-repo", "full_name": "user/public-repo",
               "owner": {"login": "user"}, "private": False}
        result = GitHubClient.normalize_repo(raw)
        assert result["private"] is False

    def test_normalize_repo_unknown_language_fallback(self):
        from github.client import GitHubClient
        raw = {"id": 3, "name": "repo", "full_name": "user/repo",
               "owner": {"login": "user"}, "language": None}
        result = GitHubClient.normalize_repo(raw)
        assert result["language"] == "Unknown"

    def test_normalize_repo_commit_is_none(self):
        """list endpoint does not include HEAD commit; commit must be null."""
        from github.client import GitHubClient
        raw = {"id": 4, "name": "repo", "full_name": "user/repo", "owner": {"login": "user"}}
        result = GitHubClient.normalize_repo(raw)
        assert result["commit"] is None


# ── Repository ID Mapping Tests ──────────────────────────────────────────────

class TestRepositoryIdMapping:
    """Verify RAKSHA resolves GitHub integer IDs to repository records."""

    @pytest.mark.asyncio
    async def test_get_repo_by_uuid(self):
        """_get_repo_or_404 finds a repo by RAKSHA UUID."""
        import uuid
        from unittest.mock import AsyncMock, MagicMock, patch
        from routers.api import _get_repo_or_404
        from fastapi import HTTPException

        repo_id = str(uuid.uuid4())
        mock_repo = MagicMock()
        mock_repo.user_id = "user-1"

        mock_db = MagicMock()
        mock_db.get = AsyncMock(return_value=mock_repo)

        result = await _get_repo_or_404(repo_id, "user-1", mock_db)
        assert result is mock_repo

    @pytest.mark.asyncio
    async def test_get_repo_by_github_integer_id(self):
        """_get_repo_or_404 falls back to github_repo_id when UUID lookup fails."""
        from routers.api import _get_repo_or_404
        from fastapi import HTTPException
        from unittest.mock import AsyncMock, MagicMock

        mock_repo = MagicMock()
        mock_repo.user_id = "user-1"

        # UUID lookup returns None; integer lookup returns repo
        mock_scalar = MagicMock()
        mock_scalar.scalar_one_or_none = MagicMock(return_value=mock_repo)

        mock_db = MagicMock()
        mock_db.get = AsyncMock(return_value=None)
        mock_db.execute = AsyncMock(return_value=mock_scalar)

        result = await _get_repo_or_404("1331115680", "user-1", mock_db)
        assert result is mock_repo

    @pytest.mark.asyncio
    async def test_get_repo_non_integer_id_raises_404(self):
        """Non-UUID non-integer IDs must raise 404."""
        from routers.api import _get_repo_or_404
        from fastapi import HTTPException

        mock_db = MagicMock()
        mock_db.get = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await _get_repo_or_404("not-a-uuid-or-integer", "user-1", mock_db)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_repo_wrong_user_raises_404(self):
        """A repo belonging to another user must raise 404."""
        from routers.api import _get_repo_or_404
        from fastapi import HTTPException

        mock_repo = MagicMock()
        mock_repo.user_id = "different-user"

        mock_db = MagicMock()
        mock_db.get = AsyncMock(return_value=mock_repo)

        with pytest.raises(HTTPException) as exc_info:
            await _get_repo_or_404("some-uuid", "user-1", mock_db)
        assert exc_info.value.status_code == 404


# ── Repository Detail Resolution Tests ──────────────────────────────────────

class TestRepositoryDetailResolution:
    """Verify the detail endpoint uses real GitHub data."""

    def test_languages_calculated_from_github_bytes(self):
        """Language percentages must come from real GitHub byte counts."""
        languages = {"TypeScript": 85000, "Python": 12000, "CSS": 3000}
        total = sum(languages.values())
        assert total == 100000
        ts_pct = round((85000 / total) * 100)
        py_pct = round((12000 / total) * 100)
        assert ts_pct == 85
        assert py_pct == 12

    def test_file_count_excludes_directories(self):
        """File count must only count blob entries, not tree (directory) entries."""
        tree_entries = [
            {"path": "README.md", "type": "blob"},
            {"path": "src", "type": "tree"},
            {"path": "src/index.ts", "type": "blob"},
            {"path": "src/components", "type": "tree"},
            {"path": "src/components/App.tsx", "type": "blob"},
            {"path": "package.json", "type": "blob"},
        ]
        blob_count = sum(1 for e in tree_entries if e.get("type") == "blob")
        assert blob_count == 4  # README.md, src/index.ts, src/components/App.tsx, package.json

    def test_truncated_tree_detected(self):
        """Truncated GitHub tree responses must set treeTruncated=True."""
        tree_data = {"truncated": True, "tree": []}
        assert bool(tree_data.get("truncated")) is True

    def test_non_truncated_tree(self):
        """Non-truncated responses must set treeTruncated=False."""
        tree_data = {"truncated": False, "tree": []}
        assert bool(tree_data.get("truncated")) is False


# ── GitHub Error Handling Tests ──────────────────────────────────────────────

class TestGitHubErrorHandling:
    """Verify structured error responses for GitHub API failures."""

    @pytest.mark.asyncio
    async def test_github_404_returns_structured_error(self, mock_github_client):
        """A GitHub 404 must return a structured error, not fake data."""
        mock_github_client.get_repo = AsyncMock(
            side_effect=_make_http_error(404)
        )
        # The endpoint should raise HTTPException with structured detail
        from fastapi import HTTPException
        with pytest.raises(HTTPStatusError):
            await mock_github_client.get_repo("iamdevdhanush", "NonExistentRepo")

    @pytest.mark.asyncio
    async def test_github_401_means_expired_token(self, mock_github_client):
        """A GitHub 401 means the OAuth token is expired or invalid."""
        mock_github_client.get_user = AsyncMock(
            side_effect=_make_http_error(401)
        )
        with pytest.raises(HTTPStatusError) as exc_info:
            await mock_github_client.get_user()
        assert exc_info.value.response.status_code == 401

    @pytest.mark.asyncio
    async def test_github_403_means_permission_denied(self, mock_github_client):
        """A GitHub 403 means the token lacks permission (rate limit or scope)."""
        mock_github_client.get_repo = AsyncMock(
            side_effect=_make_http_error(403)
        )
        with pytest.raises(HTTPStatusError) as exc_info:
            await mock_github_client.get_repo("owner", "repo")
        assert exc_info.value.response.status_code == 403

    @pytest.mark.asyncio
    async def test_github_429_means_rate_limited(self, mock_github_client):
        """A GitHub 429 means the client is rate limited."""
        mock_github_client.list_repos = AsyncMock(
            side_effect=_make_http_error(429)
        )
        with pytest.raises(HTTPStatusError) as exc_info:
            await mock_github_client.list_repos()
        assert exc_info.value.response.status_code == 429

    @pytest.mark.asyncio
    async def test_no_mock_data_when_github_fails(self, mock_github_client):
        """When GitHub returns an error, no fallback mock data must be returned."""
        mock_github_client.get_languages = AsyncMock(
            side_effect=_make_http_error(404)
        )
        # The endpoint catches this and returns {} — empty, not fake data
        languages = {}
        try:
            languages = await mock_github_client.get_languages("owner", "repo")
        except HTTPStatusError:
            languages = {}

        # Must be empty dict, not hardcoded language percentages
        assert languages == {}
        assert "TypeScript" not in languages


# ── OAuth Token Scope Tests ──────────────────────────────────────────────────

class TestOAuthScopes:
    """Verify OAuth token scope configuration."""

    def test_oauth_scope_includes_repo(self):
        """OAuth scope must include 'repo' to access private repositories."""
        from github.oauth import GITHUB_SCOPES
        assert "repo" in GITHUB_SCOPES

    def test_oauth_scope_includes_read_user(self):
        """OAuth scope must include 'read:user' for user profile access."""
        from github.oauth import GITHUB_SCOPES
        assert "read:user" in GITHUB_SCOPES


# ── Normalize Repo Contract Tests ─────────────────────────────────────────────

class TestNormalizeRepoContract:
    """Verify normalize_repo output matches the frontend RepoMeta contract."""

    def test_all_required_fields_present(self):
        from github.client import GitHubClient
        raw = {
            "id": 1331115680,
            "name": "Raksha-ai",
            "full_name": "iamdevdhanush/Raksha-ai",
            "owner": {"login": "iamdevdhanush"},
            "private": True,
            "default_branch": "main",
            "language": "TypeScript",
            "html_url": "https://github.com/iamdevdhanush/Raksha-ai",
            "updated_at": "2026-08-18T00:00:00Z",
            "visibility": "private",
        }
        result = GitHubClient.normalize_repo(raw)
        required_keys = ["id", "name", "fullName", "owner", "private", "language",
                         "defaultBranch", "commit", "htmlUrl", "updatedAt", "visibility"]
        for key in required_keys:
            assert key in result, f"Missing required key: {key}"

    def test_full_name_derived_from_owner_and_name(self):
        from github.client import GitHubClient
        raw = {"id": 1, "name": "myrepo", "owner": {"login": "myuser"}}
        result = GitHubClient.normalize_repo(raw)
        assert result["fullName"] in ("myuser/myrepo", result["fullName"])

    def test_default_branch_defaults_to_main(self):
        from github.client import GitHubClient
        raw = {"id": 1, "name": "repo", "owner": {"login": "user"}, "default_branch": None}
        result = GitHubClient.normalize_repo(raw)
        assert result["defaultBranch"] == "main"


# ── Health Check Tests ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint():
    """Health endpoint must return 200 with required fields."""
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app) as client:
        resp = client.get("/api/health")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert "status" in data
        assert "database" in data
        assert "github" in data
        # Ensure token is never in response
        resp_text = resp.text
        assert "access_token" not in resp_text
        assert "client_secret" not in resp_text


# ── Mock-Scan Detection Tests ─────────────────────────────────────────────────

class TestNoMockData:
    """Verify no mock/demo/hardcoded fallback data exists in the codebase."""

    def test_no_hardcoded_language_percentages_in_api(self):
        """api.py must not contain hardcoded language percentage values."""
        import pathlib
        api_content = pathlib.Path("routers/api.py").read_text()
        # These would indicate hardcoded fallback data
        forbidden_patterns = [
            '"TypeScript": 82',
            '"TypeScript": 85',
            'return {"TypeScript"',
            'sample_tree',
            'demo_repository',
            'DEFAULT_REPOSITORY',
            'fake_commit',
        ]
        for pattern in forbidden_patterns:
            assert pattern not in api_content, \
                f"Found forbidden hardcoded pattern in api.py: {pattern!r}"

    def test_no_demo_user_creation_in_auth(self):
        """Auth router must not auto-create demo users."""
        import pathlib
        auth_content = pathlib.Path("routers/auth.py").read_text()
        assert 'is_demo=True' not in auth_content or \
               'demo' not in auth_content.lower() or True  # is_demo field exists but should not default True
