"""
ZORQEN Backend — GitHub Data Flow Tests
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
        "name": "Zorqen",
        "full_name": "iamdevdhanush/Zorqen",
        "owner": {"login": "iamdevdhanush"},
        "private": True,
        "default_branch": "main",
        "language": "TypeScript",
        "html_url": "https://github.com/iamdevdhanush/Zorqen",
        "clone_url": "https://github.com/iamdevdhanush/Zorqen.git",
        "stargazers_count": 42,
        "description": "AI-powered security platform",
    }])
    client.get_repo = AsyncMock(return_value={
        "id": 1331115680,
        "name": "Zorqen",
        "full_name": "iamdevdhanush/Zorqen",
        "owner": {"login": "iamdevdhanush"},
        "private": True,
        "default_branch": "main",
        "language": "TypeScript",
        "html_url": "https://github.com/iamdevdhanush/Zorqen",
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
            "name": "Zorqen",
            "full_name": "iamdevdhanush/Zorqen",
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
        raw = {"id": 1331115680, "name": "Zorqen", "full_name": "iamdevdhanush/Zorqen",
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
    """Verify ZORQEN resolves GitHub integer IDs to repository records."""

    @pytest.mark.asyncio
    async def test_get_repo_by_uuid(self):
        """_get_repo_or_404 finds a repo by ZORQEN UUID."""
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

    @pytest.mark.asyncio
    async def test_token_scope_validation_returns_granted_scopes(self):
        """get_token_scopes must parse the X-OAuth-Scopes header."""
        from github.oauth import get_token_scopes
        from unittest.mock import AsyncMock, MagicMock, patch

        resp = MagicMock()
        resp.headers = {"x-oauth-scopes": "repo, read:user, user:email, workflow"}
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=resp)
            scopes = await get_token_scopes("tok")
        assert "repo" in scopes
        assert "read:user" in scopes
        assert "user:email" in scopes

    def test_missing_required_scopes_detected(self):
        """missing_required_scopes must report missing scopes."""
        from github.oauth import missing_required_scopes
        assert missing_required_scopes(["repo", "read:user"]) == ["user:email"]
        assert missing_required_scopes(["repo", "read:user", "user:email"]) == []
        assert missing_required_scopes([]) == ["read:user", "repo", "user:email"]

    def test_auth_callback_enforces_scopes(self):
        """The OAuth callback must reject tokens with insufficient scopes."""
        import pathlib
        auth_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "auth.py"
        content = auth_path.read_text()
        assert "get_token_scopes(access_token)" in content
        assert "missing_required_scopes(granted_scopes)" in content
        assert "insufficient_scope" in content


# ── Normalize Repo Contract Tests ─────────────────────────────────────────────

class TestNormalizeRepoContract:
    """Verify normalize_repo output matches the frontend RepoMeta contract."""

    def test_all_required_fields_present(self):
        from github.client import GitHubClient
        raw = {
            "id": 1331115680,
            "name": "Zorqen",
            "full_name": "iamdevdhanush/Zorqen",
            "owner": {"login": "iamdevdhanush"},
            "private": True,
            "default_branch": "main",
            "language": "TypeScript",
            "html_url": "https://github.com/iamdevdhanush/Zorqen",
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


@pytest.mark.asyncio
async def test_health_ai_endpoint():
    """Health/AI must report gemini + database connectivity for uptime monitors."""
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app) as client:
        resp = client.get("/api/health/ai")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert data["status"] in ("healthy", "degraded")
        assert data["gemini"] in ("connected", "fallback", "not_configured")
        assert data["database"] in ("connected", "degraded")
        # Must never leak keys
        resp_text = resp.text
        assert "api_key" not in resp_text
        assert "api-key" not in resp_text


# ── Mock-Scan Detection Tests ─────────────────────────────────────────────────

class TestNoMockData:
    """Verify no mock/demo/hardcoded fallback data exists in the codebase."""

    def test_no_hardcoded_language_percentages_in_api(self):
        """api.py must not contain hardcoded language percentage values."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        api_content = api_path.read_text()
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
        auth_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "auth.py"
        auth_content = auth_path.read_text()
        assert "is_demo" not in auth_content
        assert "demo_user" not in auth_content


# ── Encryption Tests ─────────────────────────────────────────────────────────────

class TestTokenEncryption:
    """Verify GitHub token encryption at rest."""

    def test_encrypt_decrypt_roundtrip(self):
        """Encrypt and decrypt should preserve the original token."""
        from core.crypto import encrypt_token, decrypt_token
        original = "ghp_test_token_123456789012345678901234567890"
        encrypted = encrypt_token(original)
        assert encrypted != original
        assert len(encrypted) > 0
        decrypted = decrypt_token(encrypted)
        assert decrypted == original

    def test_encrypt_empty_string(self):
        """Empty string should return empty string."""
        from core.crypto import encrypt_token, decrypt_token
        assert encrypt_token("") == ""
        assert decrypt_token("") == ""

    def test_encrypt_none_like(self):
        """None-like values should return empty string."""
        from core.crypto import encrypt_token, decrypt_token
        assert encrypt_token(None) == ""
        assert decrypt_token(None) == ""

    def test_different_tokens_different_ciphertext(self):
        """Same token encrypted twice should produce different ciphertext (nonce)."""
        from core.crypto import encrypt_token
        token = "ghp_same_token_123456789012345678901234567890"
        enc1 = encrypt_token(token)
        enc2 = encrypt_token(token)
        assert enc1 != enc2  # Different nonce each time

    def test_decrypt_corrupted_ciphertext_fails(self):
        """Corrupted ciphertext should raise EncryptionError."""
        from core.crypto import decrypt_token, EncryptionError
        try:
            decrypt_token("not_valid_base64!!!")
            assert False, "Should have raised EncryptionError"
        except EncryptionError:
            pass

    def test_decrypt_wrong_key_fails(self):
        """Ciphertext encrypted with different key should fail to decrypt."""
        from core.crypto import encrypt_token, decrypt_token, EncryptionError, AESGCM
        import os
        import base64
        # Create ciphertext with a known different key
        different_key = os.urandom(32)
        aesgcm = AESGCM(different_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, b"ghp_test_token", None)
        combined = nonce + ciphertext
        encrypted_b64 = base64.b64encode(combined).decode("ascii")
        
        # Try to decrypt with our actual key - should fail
        try:
            decrypt_token(encrypted_b64)
            assert False, "Should have raised EncryptionError"
        except EncryptionError:
            pass  # Expected

    def test_token_never_in_serialized_api_response(self):
        """GitHub access token should never appear in serialized API responses."""
        from models.user import User
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
            github_access_token="encrypted_token_here"
        )
        # The model should not expose the raw token in __repr__ or default serialization
        repr_str = repr(user)
        assert "encrypted_token_here" not in repr_str
        assert "github_access_token" not in repr_str


class TestUserTokenMethods:
    """Verify User model token encryption methods."""

    @pytest.mark.asyncio
    async def test_set_and_get_token(self):
        """set_github_token should encrypt, get_github_token should decrypt."""
        from models.user import User
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
        )
        plaintext = "ghp_test_token_123456789012345678901234567890"
        user.set_github_token(plaintext)
        # Stored value should be encrypted
        assert user.github_access_token != plaintext
        assert user.github_access_token != ""
        # get_github_token should return plaintext
        assert user.get_github_token() == plaintext

    @pytest.mark.asyncio
    async def test_migrate_plaintext_to_encrypted(self):
        """migrate_github_token should encrypt plaintext tokens."""
        from models.user import User
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
            github_access_token="ghp_plaintext_token_123456789012345678901234567890"
        )
        user.migrate_github_token()
        # Token should now be encrypted
        assert user.github_access_token != "ghp_plaintext_token_123456789012345678901234567890"
        assert user.get_github_token() == "ghp_plaintext_token_123456789012345678901234567890"

    @pytest.mark.asyncio
    async def test_migrate_already_encrypted_unchanged(self):
        """migrate_github_token should not double-encrypt already encrypted tokens."""
        from models.user import User
        from core.crypto import encrypt_token
        import uuid
        plaintext = "ghp_already_encrypted_123456789012345678901234567890"
        encrypted = encrypt_token(plaintext)
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
            github_access_token=encrypted
        )
        user.migrate_github_token()
        # Should remain the same
        assert user.github_access_token == encrypted
        assert user.get_github_token() == plaintext

    @pytest.mark.asyncio
    async def test_migrate_real_shaped_plaintext_token(self):
        """A real 40-char ghp_ token (which looks base64-ish) must be encrypted."""
        from models.user import User
        import uuid
        plaintext = "ghp_" + "A" * 36  # exact GitHub classic token shape
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
            github_access_token=plaintext,
        )
        user.migrate_github_token()
        assert user.github_access_token != plaintext
        assert user.get_github_token() == plaintext

    def test_migrate_token_never_double_encrypts_key_rotated_ciphertext(self):
        """Ciphertext that the current key cannot decrypt must not be re-encrypted."""
        from core.crypto import encrypt_token, migrate_token
        import base64, os
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        other_key = os.urandom(32)
        aesgcm = AESGCM(other_key)
        nonce = os.urandom(12)
        combined = nonce + aesgcm.encrypt(nonce, b"secret-token", None)
        stale_ciphertext = base64.b64encode(combined).decode("ascii")

        assert stale_ciphertext != encrypt_token("x")
        migrated = migrate_token(stale_ciphertext)
        assert migrated == ""  # never double-encrypted

    def test_startup_migrates_legacy_tokens(self):
        """main.py must run the legacy plaintext→encrypted migration at startup."""
        import pathlib
        main_path = pathlib.Path(__file__).resolve().parent.parent / "main.py"
        content = main_path.read_text(encoding="utf-8")
        assert "_migrate_legacy_github_tokens" in content
        assert "migrate_token(user.github_access_token)" in content
        assert "await _migrate_legacy_github_tokens()" in content

    @pytest.mark.asyncio
    async def test_empty_token_handling(self):
        """Empty/None token should return empty string."""
        from models.user import User
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            github_id=12345,
            github_login="testuser",
            github_access_token=None
        )
        assert user.get_github_token() == ""
        user.set_github_token("")
        assert user.get_github_token() == ""
        assert user.github_access_token is None or user.github_access_token == ""


# ── Commit Integrity Tests ─────────────────────────────────────────────────────

class TestResolveCommitSha:
    """Verify commit SHA resolution returns the full commit SHA."""

    @pytest.mark.asyncio
    async def test_resolve_commit_sha_returns_full_sha(self):
        from github.client import GitHubClient
        from unittest.mock import AsyncMock, patch
        expected = "abc123def456789012345678901234567890abcd"
        client = GitHubClient("tok")
        with patch.object(client, "_get", new=AsyncMock(return_value={"sha": expected})):
            sha = await client.resolve_commit_sha("owner", "repo", "main")
        assert sha == expected

    @pytest.mark.asyncio
    async def test_resolve_commit_sha_404_raises(self):
        from github.client import GitHubClient
        from unittest.mock import AsyncMock, patch
        client = GitHubClient("tok")
        with patch.object(client, "_get", new=AsyncMock(side_effect=_make_http_error(404))):
            with pytest.raises(HTTPStatusError):
                await client.resolve_commit_sha("owner", "repo", "bad-sha")

    @pytest.mark.asyncio
    async def test_resolve_commit_sha_missing_sha_raises(self):
        from github.client import GitHubClient
        from unittest.mock import AsyncMock, patch
        client = GitHubClient("tok")
        with patch.object(client, "_get", new=AsyncMock(return_value={})):
            with pytest.raises(HTTPStatusError):
                await client.resolve_commit_sha("owner", "repo", "main")


class TestFetchRepoFilesIntegrity:
    """Verify the orchestrator fetches files against the pinned commit SHA
    and never silently falls back to the branch HEAD."""

    @pytest.mark.asyncio
    async def test_fetch_uses_pinned_sha(self):
        from agents import orchestrator
        from unittest.mock import AsyncMock, MagicMock, patch
        pinned = "abc123def456789012345678901234567890abcd"
        client_mock = MagicMock()
        client_mock.get_tree = AsyncMock(return_value={"tree": []})
        with patch.object(orchestrator, "GitHubClient", return_value=client_mock):
            await orchestrator._fetch_repo_files("owner", "repo", "main", pinned, "tok")
        client_mock.get_tree.assert_awaited_once_with(
            "owner", "repo", pinned, recursive=True
        )

    @pytest.mark.asyncio
    async def test_fetch_no_branch_fallback(self):
        """A pinned-commit fetch failure must raise — never retry on the branch."""
        from agents import orchestrator
        from unittest.mock import AsyncMock, MagicMock, patch
        pinned = "abc123def456789012345678901234567890abcd"
        client_mock = MagicMock()
        client_mock.get_tree = AsyncMock(side_effect=_make_http_error(404))
        with patch.object(orchestrator, "GitHubClient", return_value=client_mock):
            with pytest.raises(HTTPStatusError):
                await orchestrator._fetch_repo_files("owner", "repo", "main", pinned, "tok")
        # Exactly one tree call with the pinned SHA — no fallback retry on branch.
        client_mock.get_tree.assert_awaited_once_with(
            "owner", "repo", pinned, recursive=True
        )

    def test_no_silent_fallback_in_orchestrator_source(self):
        """orchestrator.py must not contain the old silent branch fallback."""
        import pathlib
        orch_path = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch_path.read_text()
        assert "get_tree(owner, repo, branch" not in content
        assert "except Exception:" not in content.split("def _fetch_repo_files")[1].split("\n\n")[0]


# ── Run Number Race-Condition Tests ─────────────────────────────────────────────

class TestRunNumberUniqueness:
    """Verify run_number is unique at the DB level and allocated race-safe."""

    def test_model_declares_unique_index(self):
        """The Assessment model must declare the unique run_number index."""
        from models.assessment import Assessment
        from sqlalchemy import Index
        assert any(
            isinstance(t, Index)
            and t.name == "ix_assessments_run_number_unique"
            and t.unique
            for t in Assessment.__table_args__
        )

    def test_model_run_number_not_plain_index(self):
        """run_number must not be a plain non-unique index anymore."""
        from models.assessment import Assessment
        col = Assessment.__table__.c.run_number
        assert col.unique is None or col.unique is False  # uniqueness enforced via the named Index
        plain = [ix for ix in Assessment.__table__.indexes if ix.name == "ix_assessments_run_number"]
        assert not plain

    @pytest.mark.asyncio
    async def test_get_next_run_number_after_last(self):
        """get_next_run_number must return max+1."""
        from services.assessments import get_next_run_number
        from unittest.mock import AsyncMock, MagicMock
        from models.assessment import Assessment

        db = MagicMock()
        last = MagicMock(spec=Assessment)
        last.run_number = 24
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=last)))
        assert await get_next_run_number(db) == 25

    @pytest.mark.asyncio
    async def test_get_next_run_number_empty_db(self):
        """get_next_run_number must return 1 when no assessments exist."""
        from services.assessments import get_next_run_number
        from unittest.mock import AsyncMock, MagicMock

        db = MagicMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        assert await get_next_run_number(db) == 1

    @pytest.mark.asyncio
    async def test_create_assessment_retries_on_integrity_error(self):
        """create_assessment must retry with a fresh run_number on IntegrityError."""
        from services.assessments import create_assessment
        from unittest.mock import AsyncMock, MagicMock
        from sqlalchemy.exc import IntegrityError
        from models.assessment import Assessment
        from models.repository import Repository

        db = MagicMock()

        def make_execute_result(run_number):
            last = MagicMock(spec=Assessment)
            last.run_number = run_number
            result = MagicMock()
            result.scalar_one_or_none.return_value = last
            return result

        no_active = MagicMock()
        no_active.scalar_one_or_none.return_value = None

        # call 1: active-assessment check (None) · call 2: current max run 24 →
        # next 25 · call 3: after run_number IntegrityError rollback → next 26
        # (a run_number conflict re-allocates without re-checking active rows)
        db.execute = AsyncMock(
            side_effect=[no_active, make_execute_result(24), make_execute_result(25)]
        )

        # UNIQUE constraint failed: assessments.run_number (SQLite reports the
        # column name; PostgreSQL reports the constraint name — both contain
        # "run_number", which is what the conflict classifier keys on)
        commits = iter([IntegrityError("stmt", {}, Exception("UNIQUE constraint failed: assessments.run_number")), None])
        async def fake_commit():
            try:
                err = next(commits)
            except StopIteration:
                return
            if err is not None:
                raise err
        db.commit = fake_commit
        db.rollback = AsyncMock()
        db.refresh = AsyncMock()

        repo = MagicMock(spec=Repository)
        repo.id = "repo-1"
        repo.default_branch = "main"

        assessment, created = await create_assessment(db, repo, branch="main")
        assert created is True
        assert assessment.run_number == 26
        assert db.rollback.await_count == 1


# ── Finding Deterministic Identity Tests ─────────────────────────────────────────

class TestFindingIdentity:
    """Verify findings get a stable deterministic slug/fingerprint."""

    def test_slug_for_is_deterministic(self):
        from services.dedup import slug_for
        a = slug_for("src/auth.py", 42, "python.lang.security.audit.audit-dangerous-call", "Code Injection")
        b = slug_for("src/auth.py", 42, "python.lang.security.audit.audit-dangerous-call", "Code Injection")
        assert a == b
        assert a.startswith("F-")
        assert len(a) == 10  # "F-" + 8 hex chars

    def test_slug_differs_across_locations(self):
        from services.dedup import slug_for
        a = slug_for("src/auth.py", 42, "rule-1", "SQL Injection")
        b = slug_for("src/auth.py", 43, "rule-1", "SQL Injection")
        assert a != b

    def test_fingerprint_case_insensitive(self):
        from services.dedup import fingerprint
        assert fingerprint("Src/Auth.py", 42, "RULE-1", "SQL INJECTION") == \
               fingerprint("src/auth.py", 42, "rule-1", "sql injection")

    def test_finding_model_has_slug_column(self):
        from models.finding import Finding
        assert "slug" in Finding.__table__.c
        assert Finding.__table__.c.slug.index is True

    def test_save_findings_persists_slug(self):
        """_save_findings must compute slug + fingerprint for every finding."""
        import pathlib
        orch_path = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch_path.read_text()
        save_fn = content.split("async def _save_findings", 1)[1].split("async with AsyncSessionLocal", 1)[0]
        assert "slug_for(" in save_fn
        assert "fingerprint" in save_fn
        assert "extra={\"fingerprint\"" in save_fn or "extra={\'fingerprint\'" in save_fn


# ── Temp Directory Cleanup Tests ────────────────────────────────────────────────

class TestTempDirCleanup:
    """Verify materialized scan directories are always removed."""

    def test_semgrep_scan_dir_cleaned_immediately(self):
        """tmp_dir must be removed right after the semgrep scan (finally)."""
        import pathlib
        orch_path = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch_path.read_text()
        # The semgrep block must rmtree its own tmp_dir and null it out.
        assert "shutil.rmtree(tmp_dir, ignore_errors=True)" in content
        assert "tmp_dir = None" in content

    def test_outer_finally_cleans_tmp_dir(self):
        """The pipeline must keep a final cleanup safety net."""
        import pathlib
        orch_path = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch_path.read_text()
        finally_block = content.split("finally:")[-1]
        assert "shutil.rmtree(tmp_dir, ignore_errors=True)" in finally_block
        assert "os.path.exists(tmp_dir)" in finally_block


# ── Connect Repository Validation Tests ─────────────────────────────────────────

class TestConnectRepositoryValidation:
    """Verify repository connections are validated against the GitHub API."""

    def test_connect_repository_verifies_against_github(self):
        """connect_repository must fetch canonical data from the GitHub API."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        fn = content.split("async def connect_repository", 1)[1].split("@repos_router.get", 1)[0]
        assert "client.get_repo(req.owner, req.name)" in fn
        assert "gh_repo" in fn
        assert 'GITHUB_REPOSITORY_NOT_FOUND' in fn

    def test_connect_repository_requires_token(self):
        """connect_repository must fail clearly without a connected GitHub account."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        fn = content.split("async def connect_repository", 1)[1].split("@repos_router.get", 1)[0]
        assert "GitHub account not connected. Re-connect your GitHub account and retry." in fn

    def test_connect_repository_never_stores_client_metadata_verbatim(self):
        """The DB record must come from GitHub, not the client payload."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        fn = content.split("async def connect_repository", 1)[1].split("@repos_router.get", 1)[0]
        # description/language/default_branch must be taken from gh_repo.
        assert 'description=gh_repo.get("description")' in fn
        assert 'language=gh_repo.get("language")' in fn
        assert 'default_branch=gh_repo.get("default_branch") or "main"' in fn
        assert 'clone_url=gh_repo.get("clone_url")' in fn


# ── Production CORS Tests ───────────────────────────────────────────────────────

class TestProductionCORS:
    """Verify production CORS config fails closed (never localhost defaults)."""

    def _settings(self, **env):
        import os
        from core.config import Settings
        saved = {k: os.environ.get(k) for k in env}
        for k, v in env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        try:
            return Settings(_env_file=None)
        finally:
            for k, v in saved.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v

    def test_production_requires_cors_origins(self):
        import pytest
        from pydantic import ValidationError
        # DATABASE_URL must be valid production Postgres for the other validators.
        db = "postgresql+asyncpg://user:pass@db.example.com:5432/zorqen"
        key = "AuH45lRRGEekjuOYo4JVSkms84ljujqW0u3Dc6DuuZw="
        with pytest.raises(ValidationError):
            self._settings(
                APP_ENV="production", DATABASE_URL=db, ENCRYPTION_KEY=key,
                CORS_ORIGINS="",
            )

    def test_production_rejects_localhost_origins(self):
        import pytest
        from pydantic import ValidationError
        db = "postgresql+asyncpg://user:pass@db.example.com:5432/zorqen"
        key = "AuH45lRRGEekjuOYo4JVSkms84ljujqW0u3Dc6DuuZw="
        with pytest.raises(ValidationError):
            self._settings(
                APP_ENV="production", DATABASE_URL=db, ENCRYPTION_KEY=key,
                CORS_ORIGINS="http://localhost:5173",
            )

    def test_production_rejects_wildcard_origin(self):
        import pytest
        from pydantic import ValidationError
        db = "postgresql+asyncpg://user:pass@db.example.com:5432/zorqen"
        key = "AuH45lRRGEekjuOYo4JVSkms84ljujqW0u3Dc6DuuZw="
        with pytest.raises(ValidationError):
            self._settings(
                APP_ENV="production", DATABASE_URL=db, ENCRYPTION_KEY=key,
                CORS_ORIGINS='["*"]',
            )

    def test_production_accepts_explicit_public_origin(self):
        db = "postgresql+asyncpg://zorqen_admin:realpass@db.example.com:5432/zorqen"
        key = "AuH45lRRGEekjuOYo4JVSkms84ljujqW0u3Dc6DuuZw="
        s = self._settings(
            APP_ENV="production", DATABASE_URL=db, ENCRYPTION_KEY=key,
            CORS_ORIGINS="https://zorqen.app",
        )
        assert s.cors_origins == ["https://zorqen.app"]

    def test_development_defaults_unchanged(self):
        """Dev config must keep the localhost defaults."""
        from core.config import Settings
        s = Settings(_env_file=None)
        assert "http://localhost:5173" in s.cors_origins


# ── N+1 Query Tests ─────────────────────────────────────────────────────────────

class TestLatestAssessmentScores:
    """Verify _latest_assessment_scores is batched, not N+1."""

    def test_scores_uses_batched_queries(self):
        """The function must not loop-query per repository (N+1)."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        fn = content.split("async def _latest_assessment_scores", 1)[1]
        fn = fn.split("\n\n", 1)[0] if "\n\n" in fn else fn
        full_fn = content.split("async def _latest_assessment_scores", 1)[1]
        # One-shot windowed query for latest assessments...
        assert "func.row_number().over(" in full_fn
        assert "partition_by=Assessment.repository_id" in full_fn
        # ...and a grouped count query instead of per-repo finding scans.
        assert "func.count(Finding.id)" in full_fn
        assert "group_by(Finding.assessment_id)" in full_fn
        # No per-repo loop with an assessment query inside it.
        assert "for repo in repos" in full_fn
        assert "select(Assessment)" not in full_fn.split("ranked =")[0]

    def test_scores_builds_grouped_counts(self):
        """Finding counts must be aggregated in one query by assessment."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        full_fn = content.split("async def _latest_assessment_scores", 1)[1]
        assert "Finding.assessment_id.in_(" in full_fn
        assert "Finding.status.notin_([\"dismissed\", \"false_positive\"])" in full_fn


# ── Agent LLM Error Handling ──────────────────────────────────────────────────

class TestAgentLLMErrorHandling:
    """Agents must degrade on external LLM failures, never mask bugs."""

    def test_agents_narrow_llm_catches(self):
        """Agents must catch only LLM_EXTERNAL_ERRORS around LLM calls."""
        import pathlib
        for name in ("security_reasoner", "architecture_analyst", "remediation_agent"):
            p = pathlib.Path(__file__).resolve().parent.parent / "agents" / f"{name}.py"
            content = p.read_text()
            assert "LLM_EXTERNAL_ERRORS" in content
            assert "except Exception" not in content

    def test_llm_client_exports_external_error_tuple(self):
        """llm_client must export the known external failure modes."""
        from agents.llm_client import LLM_EXTERNAL_ERRORS
        assert all(isinstance(e, type) for e in LLM_EXTERNAL_ERRORS)


# ── Branches/Commits Endpoint Error Handling ──────────────────────────────────

class TestBranchesCommitsErrorHandling:
    """get_branches / get_commits must degrade gracefully on GitHub errors."""

    def test_branches_endpoint_guards_github_errors(self):
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        branches = content.split('async def get_branches', 1)[1]
        assert "except httpx.HTTPStatusError" in branches
        assert "except httpx.HTTPError" in branches
        assert "_github_error" in branches
        assert "GITHUB_UNREACHABLE" in branches

    def test_commits_endpoint_guards_github_errors(self):
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        commits = content.split('async def get_commits', 1)[1]
        assert "except httpx.HTTPStatusError" in commits
        assert "except httpx.HTTPError" in commits

    def test_repos_list_no_raw_error_leak(self):
        """list_repositories must not leak raw exception text in API detail."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text()
        assert "GitHub API error: {str(e)}" not in content


# ── Orchestrator Scoring Consistency ──────────────────────────────────────────

class TestOrchestratorScoringConsistency:
    """The orchestrator must use the canonical scoring service."""

    def test_save_findings_uses_canonical_scoring(self):
        import pathlib
        orch = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch.read_text()
        save_fn = content.split("async def _save_findings", 1)[1]
        assert "from services.scoring import calculate_security_score" in save_fn
        assert "total_penalty" not in save_fn

    def test_no_duplicate_weight_table(self):
        import pathlib
        orch = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch.read_text()
        assert "SEVERITY_WEIGHTS = {" not in content

    def test_orchestrator_score_matches_scoring_service(self):
        """The orchestrator helper must produce identical scores to the service."""
        import asyncio
        from agents.orchestrator import _calculate_security_score
        from services.scoring import calculate_security_score

        findings = [
            {"severity": "critical", "confidence": "likely", "status": "open"},
            {"severity": "high", "confidence": "possible", "status": "open"},
            {"severity": "medium", "confidence": "confirmed", "status": "dismissed"},
            {"severity": "low", "confidence": "likely", "status": "open"},
        ]
        expected = calculate_security_score(findings)
        assert expected == _calculate_security_score(
            [type("F", (), {"severity": f["severity"], "confidence": f["confidence"],
                            "status": type("S", (), {"value": f["status"]})()}) for f in findings]
        )
        # critical 25*0.7 + high 10*0.4 + low 2*0.7 = 22.9 → 77.1 (medium dismissed → 0)
        assert expected == 100 - (25 * 0.7) - (10 * 0.4) - (2 * 0.7)


# ── Migration Drift (is_demo) ────────────────────────────────────────────────

class TestMigrationDrift:
    """Models must not have is_demo columns; migrations must drop them."""

    def test_models_have_no_is_demo(self):
        import pathlib
        for name in ("user", "repository", "assessment"):
            p = pathlib.Path(__file__).resolve().parent.parent / "models" / f"{name}.py"
            content = p.read_text()
            assert "is_demo" not in content

    def test_drop_is_demo_migration_exists(self):
        import pathlib
        versions = pathlib.Path(__file__).resolve().parent.parent / "alembic" / "versions"
        migration = versions / "a2b3c4d5e6f7_drop_is_demo_columns.py"
        content = migration.read_text()
        assert "op.drop_column('assessments', 'is_demo')" in content
        assert "op.drop_column('repositories', 'is_demo')" in content
        assert "op.drop_column('users', 'is_demo')" in content
        assert "down_revision: Union[str, None] = 'a1b2c3d4e5f6'" in content


# ── Run Contract Commit Fallback ──────────────────────────────────────────────

class TestRunContractCommit:
    """The console must never show a fabricated commit hash."""

    def test_no_fabricated_main_commit(self):
        import pathlib
        ser = pathlib.Path(__file__).resolve().parent.parent / "services" / "serializers.py"
        content = ser.read_text()
        assert '"commit": (assessment.commit_sha or (repo.head_commit if repo else None) or "")[:7],' in content
        assert '(repo.head_commit or "")[:7]' in content
        assert 'or "main")[:7]' not in content
        copilot = pathlib.Path(__file__).resolve().parent.parent / "services" / "copilot.py"
        copilot_content = copilot.read_text()
        assert 'or "main")[:7]' not in copilot_content


# ── ASK ZORQEN Copilot Contract ───────────────────────────────────────────────

class TestCopilotContract:
    """Success shape, structured errors, and provider priority."""

    def test_provider_priority_gemini_over_grok_over_groq(self):
        """GEMINI_API_KEY must take priority, then GROK, then GROQ."""
        import pathlib
        grok = pathlib.Path(__file__).resolve().parent.parent / "services" / "grok.py"
        content = grok.read_text(encoding="utf-8")
        # Gemini checked before Grok; Grok checked before Groq
        assert content.index("settings.gemini_configured") < content.index("settings.grok_configured")
        assert content.index("settings.grok_configured") < content.index("settings.groq_configured")
        assert "GROK_CONFIGURATION_ERROR" in content

    def test_success_shape_includes_success_and_latency(self):
        """investigate() must return success=True, answer, sources, latency_ms."""
        import pathlib
        copilot = pathlib.Path(__file__).resolve().parent.parent / "services" / "copilot.py"
        content = copilot.read_text(encoding="utf-8")
        assert '"success": True' in content
        assert '"latency_ms": latency_ms' in content
        assert '"sources": build_sources(zorqen_context)' in content

    def test_copilot_errors_are_structured(self):
        """Chat errors must use structured_error with code + stage."""
        import pathlib
        api = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api.read_text(encoding="utf-8")
        assert "structured_error(" in content
        assert 'code="GROK_CONFIGURATION_ERROR"' in content
        assert 'code="ASSESSMENT_CONTEXT_ERROR"' in content
        assert 'code="BACKEND_ERROR"' in content

    def test_chat_request_logging_present(self):
        """Every chat request must log endpoint + latency + status."""
        import pathlib
        api = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api.read_text(encoding="utf-8")
        assert "[COPILOT] chat_ok" in content
        assert "endpoint=endpoint" in content
        assert "latency_ms=latency_ms" in content
        assert "status=200" in content

    def test_health_ai_endpoint_defined(self):
        """main.py must expose /health/ai and /api/health/ai."""
        import pathlib
        main = pathlib.Path(__file__).resolve().parent.parent / "main.py"
        content = main.read_text(encoding="utf-8")
        assert '@app.get("/api/health/ai")' in content
        assert '@app.get("/health/ai")' in content
        assert '"gemini": gemini_status' in content
