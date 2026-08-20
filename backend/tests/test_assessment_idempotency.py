"""
ZORQEN Backend — Assessment Lifecycle Idempotency & Worker Dedup Tests

Regression coverage:
 1. One POST creates one assessment row.
 2. Duplicate POST returns the existing assessment.
 3. Duplicate POST does NOT launch a worker.
 4. Concurrent POSTs launch exactly one worker.
 5. Polling endpoints are GET-only (never create assessments).
 6. One assessment launches one Semgrep process.
 7. Semgrep timeout creates a real FAILED state (never silent success).
 8. GROQ_MODEL is configurable; deprecated llama model is not referenced.
 9. AI failure never fabricates findings/confidence.
10. Assessment progress/steps are written exactly once.

Run: pytest tests/test_assessment_idempotency.py -v
"""
from __future__ import annotations

import asyncio
import os
import tempfile
import uuid

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Helpers ────────────────────────────────────────────────────────────────


def _seed_user_repo(db) -> tuple:
    """Create a unique user + repository pair in `db` (not committed)."""
    from models.user import User
    from models.repository import Repository

    user = User(
        id=str(uuid.uuid4()),
        github_id=int(uuid.uuid4().int % 2_000_000_000) + 1,
        github_login=f"idem-{uuid.uuid4().hex[:8]}",
    )
    user.set_github_token("ghp_idempotency_test_token")
    repo = Repository(
        id=str(uuid.uuid4()),
        user_id=user.id,
        github_repo_id=int(uuid.uuid4().int % 2_000_000_000) + 1,
        full_name=f"idem/{uuid.uuid4().hex[:6]}",
        owner="idem",
        name="target-repo",
        default_branch="main",
        clone_url="https://github.com/idem/target-repo.git",
    )
    db.add(user)
    db.add(repo)
    return user, repo


async def _count_assessments(session_factory, repository_id: str) -> int:
    from models.assessment import Assessment
    async with session_factory() as db:
        rows = (
            await db.execute(
                select(Assessment).where(Assessment.repository_id == repository_id)
            )
        ).scalars().all()
        return len(rows)


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def concurrency_db():
    """Isolated SQLite database (WAL + busy timeout) for create/concurrency tests.

    Owns a private file DB so concurrent-write tests never collide with the
    shared test database used by other suites.
    """
    from core.database import Base
    import models.assessment  # noqa: F401  (register tables)
    import models.repository  # noqa: F401
    import models.user  # noqa: F401
    import models.finding  # noqa: F401
    import models.remediation  # noqa: F401
    import models.ai_analysis  # noqa: F401
    import models.snapshot  # noqa: F401
    import models.validation_result  # noqa: F401
    import models.audit_log  # noqa: F401

    fd, path = tempfile.mkstemp(suffix="_zorqen_idem.db")
    os.close(fd)
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{path}",
        connect_args={"timeout": 15},
    )
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
    try:
        yield engine, session_factory
    finally:
        await engine.dispose()
        try:
            os.unlink(path)
        except OSError:
            pass


@pytest_asyncio.fixture(scope="module", autouse=True)
async def _ensure_shared_schema():
    """Ensure the shared test DB (used by the orchestrator, which reads the
    global AsyncSessionLocal) has the full schema, including the
    one-active-per-repository partial unique index.

    create_all() does not stamp alembic_version, so later TestClient lifespans
    would re-run `alembic upgrade head` against already-created tables and
    crash with "table already exists". Stamp head so the health tests' app
    startup is a no-op.
    """
    from core.database import init_db

    await init_db()

    from pathlib import Path
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_root / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_root / "alembic"))
    cfg.set_main_option("prepend_sys_path", str(backend_root))
    try:
        # env.py uses asyncio.run(); run in a worker thread so it gets its own
        # event loop instead of clashing with the test's running loop.
        await asyncio.to_thread(command.stamp, cfg, "head")
    except Exception:
        pass  # stamping is best-effort; tables already exist via create_all
    yield


# ── 1/2/4. create_assessment idempotency ───────────────────────────────────

class TestCreateAssessmentIdempotency:
    """One POST → one assessment; duplicates and races return the existing row."""

    @pytest.mark.asyncio
    async def test_one_post_creates_one_assessment(self, concurrency_db):
        from services.assessments import create_assessment
        from models.assessment import Assessment, AssessmentStatus

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        async with session_factory() as db:
            assessment, created = await create_assessment(db, repo, branch="main")
            assert created is True
            assert assessment.status == AssessmentStatus.PENDING

        assert await _count_assessments(session_factory, repo.id) == 1

    @pytest.mark.asyncio
    async def test_duplicate_returns_existing_assessment(self, concurrency_db):
        from services.assessments import create_assessment

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        async with session_factory() as db:
            first, created1 = await create_assessment(db, repo, branch="main")
        assert created1 is True

        async with session_factory() as db:
            second, created2 = await create_assessment(db, repo, branch="main")
        assert created2 is False
        assert second.id == first.id
        assert await _count_assessments(session_factory, repo.id) == 1

    @pytest.mark.asyncio
    async def test_completed_assessment_allows_new_run(self, concurrency_db):
        from services.assessments import create_assessment
        from models.assessment import Assessment, AssessmentStatus

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        async with session_factory() as db:
            first, created1 = await create_assessment(db, repo, branch="main")
            assert created1 is True
            first.status = AssessmentStatus.COMPLETED
            await db.commit()

        async with session_factory() as db:
            second, created2 = await create_assessment(db, repo, branch="main")
        assert created2 is True
        assert second.id != first.id
        assert await _count_assessments(session_factory, repo.id) == 2

    @pytest.mark.asyncio
    async def test_concurrent_creates_yield_one_assessment_one_worker(self, concurrency_db):
        """Two simultaneous create requests for the same repository must produce
        exactly ONE assessment row and exactly ONE created=True result (the
        router launches the worker only when created=True)."""
        from services.assessments import create_assessment

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        async def _create():
            async with session_factory() as db:
                assessment, created = await create_assessment(db, repo, branch="main")
                return assessment, created

        results = await asyncio.gather(_create(), _create())

        ids = {r[0].id for r in results}
        created_flags = [r[1] for r in results]
        assert len(ids) == 1, f"expected one assessment, got {len(ids)}"
        assert sum(created_flags) == 1, (
            f"expected exactly one worker-worthy create, got {sum(created_flags)}"
        )
        assert await _count_assessments(session_factory, repo.id) == 1

    @pytest.mark.asyncio
    async def test_db_rejects_second_active_row(self, concurrency_db):
        """The partial unique index must reject a second PENDING/RUNNING row at
        the database level — the application never even sees a duplicate."""
        from models.assessment import Assessment, AssessmentStatus

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        async with session_factory() as db:
            a = Assessment(
                repository_id=repo.id,
                branch="main",
                status=AssessmentStatus.PENDING,
                run_number=1,
            )
            db.add(a)
            await db.commit()
            b = Assessment(
                repository_id=repo.id,
                branch="main",
                status=AssessmentStatus.PENDING,
                run_number=2,
            )
            db.add(b)
            with pytest.raises(Exception) as exc_info:
                await db.commit()
            assert "UNIQUE" in str(exc_info.value).upper() or "INTEGRITY" in str(exc_info.value).upper()


# ── 3/5. Router boundary: worker launch + read-only polling ─────────────────

class TestStartAssessmentRouter:
    """POST /assessments launches a worker exactly when a row is created."""

    @pytest.mark.asyncio
    async def test_duplicate_post_does_not_launch_worker(self, concurrency_db):
        from routers.api import start_assessment, StartAssessmentRequest
        from starlette.background import BackgroundTasks

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        req = StartAssessmentRequest(repository_id=repo.id, branch="main")
        fake_request = MagicMock()
        fake_request.state.request_id = "req-1"
        fake_request.headers = {"X-Request-ID": "req-1"}

        tasks = BackgroundTasks()

        async with session_factory() as db:
            with patch("routers.api.GitHubClient") as gh:
                gh.return_value.resolve_commit_sha = AsyncMock(return_value="a" * 40)
                first = await start_assessment(
                    req, tasks, fake_request, current_user=user, db=db
                )
        assert len(tasks.tasks) == 1, "first POST must launch exactly one worker"

        async with session_factory() as db:
            with patch("routers.api.GitHubClient") as gh:
                gh.return_value.resolve_commit_sha = AsyncMock(return_value="a" * 40)
                second = await start_assessment(
                    req, tasks, fake_request, current_user=user, db=db
                )
        # The duplicate POST returned the existing run and scheduled NO worker.
        assert len(tasks.tasks) == 1, "duplicate POST must NOT launch a worker"
        assert second["id"] == first["id"]

    @pytest.mark.asyncio
    async def test_sequential_posts_schedule_exactly_one_worker(self, concurrency_db):
        from routers.api import start_assessment, StartAssessmentRequest
        from starlette.background import BackgroundTasks

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()

        req = StartAssessmentRequest(repository_id=repo.id, branch="main")
        fake_request = MagicMock()
        fake_request.state.request_id = "req-2"
        fake_request.headers = {"X-Request-ID": "req-2"}
        tasks = BackgroundTasks()

        for _ in range(3):
            async with session_factory() as db:
                with patch("routers.api.GitHubClient") as gh:
                    gh.return_value.resolve_commit_sha = AsyncMock(return_value="a" * 40)
                    await start_assessment(req, tasks, fake_request, current_user=user, db=db)

        assert len(tasks.tasks) == 1
        assert await _count_assessments(session_factory, repo.id) == 1

    @pytest.mark.asyncio
    async def test_polling_endpoints_never_create_assessments(self, concurrency_db):
        """GET list/get endpoints are strictly read-only — they must not create rows."""
        from routers.api import list_repo_assessments, get_assessment
        from models.assessment import Assessment, AssessmentStatus

        _, session_factory = concurrency_db
        async with session_factory() as db:
            user, repo = _seed_user_repo(db)
            await db.commit()
            a = Assessment(
                repository_id=repo.id,
                branch="main",
                status=AssessmentStatus.COMPLETED,
                run_number=1,
            )
            db.add(a)
            await db.commit()

        before = await _count_assessments(session_factory, repo.id)

        async with session_factory() as db:
            runs = await list_repo_assessments(repo.id, current_user=user, db=db)
            assert len(runs["runs"]) == 1
            await get_assessment(runs["runs"][0]["id"].replace("#", ""), current_user=user, db=db)

        after = await _count_assessments(session_factory, repo.id)
        assert before == after == 1


# ── 6/7. Orchestrator: one Semgrep process, real failure states ────────────

class _FakeIntel:
    def to_dict(self):
        return {"file_count": 1, "routes": [], "input_sources": [], "sinks": [],
                "languages": {"python": 1}, "primary_language": "python",
                "frameworks": [], "dependencies": []}

    @property
    def primary_language(self):
        return "python"

    @property
    def dependencies(self):
        return []


async def _seed_active_assessment():
    """Seed user+repo+PENDING assessment into the SHARED test DB (the
    orchestrator commits via the global AsyncSessionLocal)."""
    from core.database import AsyncSessionLocal
    from models.assessment import Assessment, AssessmentStatus

    async with AsyncSessionLocal() as db:
        user, repo = _seed_user_repo(db)
        assessment = Assessment(
            repository_id=repo.id,
            branch="main",
            commit_sha="a" * 40,
            status=AssessmentStatus.PENDING,
            run_number=int(uuid.uuid4().int % 100_000) + 1,
        )
        db.add(assessment)
        await db.commit()
        return assessment.id, repo.id


class TestOrchestratorWorkerSemantics:
    @pytest.mark.asyncio
    async def test_one_assessment_launches_one_semgrep_process(self):
        from agents import orchestrator
        from core.database import AsyncSessionLocal
        from models.assessment import Assessment, AssessmentStatus

        assessment_id, repo_id = await _seed_active_assessment()

        with patch.object(orchestrator, "_fetch_repo_files",
                          new=AsyncMock(return_value=(["app.py"], {"app.py": "x = 1"}))), \
             patch.object(orchestrator, "run_semgrep", new=AsyncMock(return_value=[])) as semgrep_mock, \
             patch.object(orchestrator, "analyze_architecture",
                          new=AsyncMock(return_value={
                              "primary_language": "python",
                              "technologies": ["Python"],
                              "features": {},
                              "layers": {},
                          })), \
             patch.object(orchestrator, "analyze_repository",
                          new=MagicMock(return_value=_FakeIntel())):
            await orchestrator.run_assessment(assessment_id, "ghp_test_token")

        semgrep_mock.assert_awaited_once()

        async with AsyncSessionLocal() as db:
            a = await db.get(Assessment, assessment_id)
            assert a.status == AssessmentStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_semgrep_timeout_creates_real_failure_state(self):
        from agents import orchestrator
        from security.semgrep_runner import SemgrepError
        from core.database import AsyncSessionLocal
        from models.assessment import Assessment, AssessmentStatus

        assessment_id, repo_id = await _seed_active_assessment()

        with patch.object(orchestrator, "_fetch_repo_files",
                          new=AsyncMock(return_value=(["app.py"], {"app.py": "x = 1"}))), \
             patch.object(orchestrator, "run_semgrep",
                          new=AsyncMock(side_effect=SemgrepError(
                              "Semgrep exceeded the 120s execution budget for this repository "
                              "and was terminated. The scan did not complete.",
                              kind="timeout"))):
            await orchestrator.run_assessment(assessment_id, "ghp_test_token")

        async with AsyncSessionLocal() as db:
            a = await db.get(Assessment, assessment_id)
            assert a.status == AssessmentStatus.FAILED
            assert "Semgrep" in (a.error_message or "")

    @pytest.mark.asyncio
    async def test_duplicate_worker_invocation_is_suppressed(self):
        """A second run_assessment call against an already-RUNNING row must
        exit immediately without touching the pipeline."""
        from agents import orchestrator
        from core.database import AsyncSessionLocal
        from models.assessment import Assessment, AssessmentStatus

        assessment_id, repo_id = await _seed_active_assessment()
        async with AsyncSessionLocal() as db:
            a = await db.get(Assessment, assessment_id)
            a.status = AssessmentStatus.RUNNING
            a.current_step = "security_scan"
            a.progress_pct = 40
            await db.commit()

        with patch.object(orchestrator, "_update_assessment",
                          new=AsyncMock()) as update_mock, \
             patch.object(orchestrator, "_fetch_repo_files",
                          new=AsyncMock()) as fetch_mock:
            await orchestrator.run_assessment(assessment_id, "ghp_test_token")

        update_mock.assert_not_awaited()
        fetch_mock.assert_not_awaited()


# ── 8. GROQ_MODEL configuration ────────────────────────────────────────────

class TestGroqModelConfig:
    def test_default_is_free_oss_model(self):
        from core.config import Settings
        s = Settings(_env_file=None)
        assert s.groq_model == "openai/gpt-oss-20b"

    def test_groq_model_configurable_via_env(self, monkeypatch):
        from core.config import Settings
        monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")
        s = Settings(_env_file=None)
        assert s.groq_model == "openai/gpt-oss-120b"

    def test_deprecated_llama_model_detected(self, monkeypatch):
        from core.config import Settings
        monkeypatch.setenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        s = Settings(_env_file=None)
        assert s.groq_model_deprecated is True

    def test_current_default_is_not_deprecated(self):
        from core.config import Settings
        s = Settings(_env_file=None)
        assert s.groq_model_deprecated is False

    def test_no_stale_llama_reference_in_deploy_config(self):
        """No deployment config may *set* the retired llama model as GROQ_MODEL.
        Deprecation warnings that merely explain why it must not be used are OK."""
        import pathlib
        root = pathlib.Path(__file__).resolve().parents[2]
        for name in (".env.example", "DEPLOY.md"):
            content = (root / name).read_text(encoding="utf-8", errors="replace")
            assert "GROQ_MODEL=llama-3.3-70b-versatile" not in content, (
                f"{name} still sets GROQ_MODEL=llama-3.3-70b-versatile"
            )
        render = (root / "render.yaml").read_text(encoding="utf-8", errors="replace")
        assert "GROQ_MODEL: llama-3.3-70b-versatile" not in render, (
            "render.yaml still sets GROQ_MODEL: llama-3.3-70b-versatile"
        )

    def test_no_stale_llama_reference_in_frontend(self):
        """Frontend source must never reference the retired llama model."""
        import pathlib
        frontend = pathlib.Path(__file__).resolve().parents[2] / "frontend"
        targets = [frontend / "index.html"]
        src = frontend / "src"
        for p in src.rglob("*"):
            if p.is_file() and p.suffix in {".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".md"}:
                targets.append(p)
        for p in targets:
            content = p.read_text(encoding="utf-8", errors="replace")
            assert "llama-3.3-70b-versatile" not in content, f"{p} references llama-3.3-70b-versatile"


# ── 9. AI failure never fabricates ─────────────────────────────────────────

class TestAIFailureNoFabrication:
    @pytest.mark.asyncio
    async def test_model_not_found_preserves_scanner_confidence(self):
        from agents.security_reasoner import reason_batch
        from agents.llm_client import ModelNotFoundError

        findings = [{
            "vulnerability_type": "SQL Injection",
            "severity": "high",
            "confidence": "likely",
            "file_path": "app.py",
            "line_number": 3,
            "code_snippet": "cursor.execute(q)",
            "message": "Possible SQL injection",
        }]
        with patch("agents.security_reasoner.llm.complete_json",
                   new=AsyncMock(side_effect=ModelNotFoundError("openai/gpt-oss-20b"))):
            enriched, reason = await reason_batch(findings, {"technologies": [], "features": {}})

        assert reason  # unavailability was recorded
        assert enriched[0]["confidence"] == "likely"  # scanner confidence preserved
        assert enriched[0]["confidence_pct"] == 0    # "not AI-evaluated"
        assert "unavailable" in enriched[0]["ai_reasoning"].lower()
        assert enriched[0]["is_exploitable"] is None

    @pytest.mark.asyncio
    async def test_model_not_found_stops_further_batches(self):
        """Once the model 404s, no further LLM calls may be attempted (quota)."""
        from agents.security_reasoner import reason_batch
        from agents.llm_client import ModelNotFoundError

        findings = [
            {"vulnerability_type": "XSS", "severity": "medium", "confidence": "possible",
             "file_path": "a.py", "line_number": 1, "code_snippet": "x", "message": "m"}
            for _ in range(6)
        ]
        with patch("agents.security_reasoner.llm.complete_json",
                   new=AsyncMock(side_effect=ModelNotFoundError("openai/gpt-oss-20b"))) as llm_mock:
            enriched, reason = await reason_batch(findings, {"technologies": [], "features": {}})

        assert llm_mock.await_count == 1  # first batch only — no quota waste
        assert len(enriched) == 6
        assert all(f["confidence_pct"] == 0 for f in enriched)

    @pytest.mark.asyncio
    async def test_valid_ai_response_enriches_finding(self):
        from agents.security_reasoner import reason_batch

        findings = [{
            "vulnerability_type": "SQL Injection",
            "severity": "high",
            "confidence": "likely",
            "file_path": "app.py",
            "line_number": 3,
            "code_snippet": "cursor.execute(q)",
            "message": "Possible SQL injection",
        }]
        payload = {
            "findings": [{
                "index": 1,
                "confidence": "confirmed",
                "confidence_pct": 92,
                "is_exploitable": True,
                "root_cause": "Unsanitized input in query",
                "attack_path": ["user input", "handler", "cursor.execute"],
                "impact": "Data exfiltration",
                "evidence": "query built with f-string",
                "ai_reasoning": "Direct string interpolation into SQL",
                "false_positive_reason": None,
            }]
        }
        with patch("agents.security_reasoner.llm.complete_json",
                   new=AsyncMock(return_value=payload)):
            enriched, reason = await reason_batch(findings, {"technologies": [], "features": {}})

        assert reason == ""
        assert enriched[0]["confidence"] == "confirmed"
        assert enriched[0]["confidence_pct"] == 92
        assert enriched[0]["root_cause"] == "Unsanitized input in query"


# ── 10. Progress integrity ─────────────────────────────────────────────────

class TestProgressIntegrity:
    @pytest.mark.asyncio
    async def test_same_step_is_rewritten_not_appended(self):
        from core.database import AsyncSessionLocal
        from agents.orchestrator import _update_assessment
        from models.assessment import Assessment, AssessmentStatus

        async with AsyncSessionLocal() as db:
            user, repo = _seed_user_repo(db)
            a = Assessment(
                repository_id=repo.id,
                branch="main",
                status=AssessmentStatus.PENDING,
                run_number=int(uuid.uuid4().int % 100_000) + 1,
            )
            db.add(a)
            await db.commit()
            aid = a.id

        await _update_assessment(aid, "security_scan", 40)
        await _update_assessment(aid, "security_scan", 80)

        async with AsyncSessionLocal() as db:
            a = await db.get(Assessment, aid)
            steps = [t["step"] for t in (a.timeline or [])]
            assert steps == ["security_scan"]  # written once, rewritten in place
            assert a.progress_pct == 80

    @pytest.mark.asyncio
    async def test_distinct_steps_append_in_order(self):
        from core.database import AsyncSessionLocal
        from agents.orchestrator import _update_assessment
        from models.assessment import Assessment, AssessmentStatus

        async with AsyncSessionLocal() as db:
            user, repo = _seed_user_repo(db)
            a = Assessment(
                repository_id=repo.id,
                branch="main",
                status=AssessmentStatus.PENDING,
                run_number=int(uuid.uuid4().int % 100_000) + 1,
            )
            db.add(a)
            await db.commit()
            aid = a.id

        for step, pct in (("index", 5), ("repository_indexed", 15),
                          ("architecture_generated", 30), ("dependencies", 45),
                          ("secrets", 60), ("security_scan", 75),
                          ("ai_reasoning", 88), ("report_generated", 95),
                          ("completed", 100)):
            await _update_assessment(aid, step, pct)

        async with AsyncSessionLocal() as db:
            a = await db.get(Assessment, aid)
            steps = [t["step"] for t in (a.timeline or [])]
            assert steps == ["index", "repository_indexed", "architecture_generated",
                             "dependencies", "secrets", "security_scan",
                             "ai_reasoning", "report_generated", "completed"]
            assert len(steps) == len(set(steps))

    def test_orchestrator_has_canonical_stage_sequence(self):
        """The orchestrator must emit the 7 canonical stages + completed."""
        import pathlib
        orch = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch.read_text(encoding="utf-8")
        for step in ("repository_indexed", "architecture_generated", "dependencies",
                     "secrets", "security_scan", "ai_reasoning", "report_generated",
                     "completed"):
            assert f'"{step}"' in content, f"orchestrator missing stage {step}"
        # The old duplicated security_scan write at 80% must be gone.
        assert '_update_assessment(assessment_id, "security_scan", 80' not in content
        assert '_update_assessment(assessment_id, "findings", 90' in content

    def test_orchestrator_has_duplicate_worker_guard(self):
        import pathlib
        orch = pathlib.Path(__file__).resolve().parent.parent / "agents" / "orchestrator.py"
        content = orch.read_text(encoding="utf-8")
        assert "Duplicate worker suppressed" in content

    def test_router_launches_worker_only_when_created(self):
        """api.py must gate run_assessment on the created flag, never on status."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text(encoding="utf-8")
        assert "created" in content
        assert "if created:" in content
        assert 'background_tasks.add_task(' in content
        # The old status-based gate must be gone.
        assert "assessment.status == AssessmentStatus.PENDING:" not in content