"""
ZORQEN Backend — Report Generation & Live Event Stream Tests

Coverage:
 1. build_report_pdf produces a valid PDF for a completed assessment.
 2. The PDF contains key report sections (branding, score, findings).
 3. Dependency parsing covers pyproject.toml and pom.xml.
 4. Entrypoint detection finds application entry files.
 5. The in-process event bus fans out progress events to subscribers.
 6. Structured assessment errors carry stage + code (no generic 503s).

Run: pytest tests/test_report_and_events.py -v
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_zorqen.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-only")
os.environ.setdefault("ENCRYPTION_KEY", "AuH45lRRGEekjuOYo4JVSkms84ljujqW0u3Dc6DuuZw=")


def _make_assessment():
    from models.assessment import Assessment, AssessmentStatus
    from datetime import datetime, timezone

    return Assessment(
        id=str(uuid.uuid4()),
        repository_id=str(uuid.uuid4()),
        run_number=42,
        branch="main",
        commit_sha="a" * 40,
        status=AssessmentStatus.COMPLETED,
        progress_pct=100,
        security_score=72.5,
        critical_count=1,
        high_count=2,
        medium_count=3,
        low_count=4,
        secrets_count=1,
        dependency_count=7,
        started_at=datetime(2026, 8, 20, 10, 0, tzinfo=timezone.utc),
        completed_at=datetime(2026, 8, 20, 10, 0, 42, tzinfo=timezone.utc),
        timeline=[
            {"step": "repository_indexed", "status": "completed", "timestamp": "2026-08-20T10:00:01"},
            {"step": "completed", "status": "completed", "timestamp": "2026-08-20T10:00:42"},
        ],
        architecture_map={
            "primary_language": "python",
            "repo_intel": {
                "file_count": 24,
                "languages": {"python": 20, "javascript": 4},
                "primary_language": "python",
                "frameworks": ["FastAPI"],
                "entrypoints": ["main.py"],
                "routes": [{"method": "GET", "endpoint": "/health", "file_path": "main.py"}],
                "input_sources": [{"variable": "q"}],
                "sinks": [{"kind": "sql"}],
                "db_engines": ["postgres"],
                "integrations": ["github"],
                "dependencies": [{"name": "fastapi", "version": "0.115.0"}],
            },
        },
    )


def _make_findings():
    from models.finding import Finding

    return [
        Finding(
            id=str(uuid.uuid4()),
            assessment_id="a",
            title="SQL Injection",
            vulnerability_type="SQL Injection",
            severity="critical",
            confidence="likely",
            confidence_pct=88,
            status="open",
            cwe_id="CWE-89",
            cwe_name="SQL Injection",
            file_path="app/db.py",
            line_number=12,
            code_snippet="cursor.execute(f'SELECT * FROM users WHERE id = {uid}')",
            root_cause="Unsanitized user input interpolated into SQL.",
            impact="Database compromise and data exfiltration.",
            ai_reasoning="Direct string interpolation into a SQL statement.",
            evidence="f-string in cursor.execute",
        ),
        Finding(
            id=str(uuid.uuid4()),
            assessment_id="a",
            title="Hardcoded Secret",
            vulnerability_type="Hardcoded Secret (GitHub Token)",
            severity="critical",
            confidence="likely",
            status="open",
            cwe_id="CWE-798",
            file_path="config.py",
            line_number=3,
            code_snippet="GITHUB_TOKEN = 'ghp_***REDACTED***'",
            root_cause="Credential committed to source.",
            impact="Credential theft.",
        ),
    ]


def _make_repo():
    from models.repository import Repository

    return Repository(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        github_repo_id=1,
        full_name="zorqen/demo",
        owner="zorqen",
        name="demo",
        default_branch="main",
        head_commit="a" * 40,
    )


class TestReportGeneration:
    @staticmethod
    def _pdf_text(pdf: bytes) -> str:
        """Decompress ASCII85+FlateDecode streams so body text is searchable."""
        import base64
        import re
        import zlib

        chunks = []
        parts = re.split(rb"(stream\n|endstream)", pdf)
        in_stream = False
        for part in parts:
            if part == b"stream\n":
                in_stream = True
                continue
            if part == b"endstream":
                in_stream = False
                continue
            if not in_stream:
                continue
            data = part.strip()
            try:
                chunks.append(zlib.decompress(base64.a85decode(data, adobe=True)))
            except Exception:
                try:
                    chunks.append(zlib.decompress(base64.a85decode(data, adobe=False)))
                except Exception:
                    continue
        return b"\n".join(chunks).decode("latin-1", errors="replace")

    def test_report_is_valid_pdf(self):
        from services.report import build_report_pdf

        assessment = _make_assessment()
        findings = _make_findings()
        repo = _make_repo()
        pdf = build_report_pdf(assessment, findings, repo)

        assert pdf.startswith(b"%PDF")
        assert b"%%EOF" in pdf[-64:]
        # ZORQEN branding present in the binary stream.
        assert b"ZORQEN" in pdf
        assert b"Security Validation Report" in pdf

    def test_report_contains_score_and_findings(self):
        from services.report import build_report_pdf

        pdf = build_report_pdf(_make_assessment(), _make_findings(), _make_repo())
        text = self._pdf_text(pdf)
        assert "72" in text  # score
        assert "SQL Injection" in text
        assert "CWE-89" in text
        assert "CWE-798" in text

    def test_report_renders_failed_run(self):
        from services.report import build_report_pdf
        from models.assessment import AssessmentStatus

        assessment = _make_assessment()
        assessment.status = AssessmentStatus.FAILED
        assessment.error_message = "Semgrep scan failed"
        pdf = build_report_pdf(assessment, [], _make_repo())
        text = self._pdf_text(pdf)
        assert "did not" in text or "not complete" in text


class TestDependencyParsing:
    def test_pyproject_toml_parsed(self):
        from security.repo_intel import parse_dependencies

        content = """
[project]
name = "demo"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]~=0.30",
]

[tool.poetry.dependencies]
flask = "^2.0.1"
"""
        deps = parse_dependencies({"pyproject.toml": content})
        names = {d.name for d in deps}
        assert "fastapi" in names
        assert "uvicorn" in names
        assert "flask" in names
        assert any(d.ecosystem == "python" for d in deps)

    def test_pom_xml_parsed(self):
        from security.repo_intel import parse_dependencies

        content = """
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.1</version>
    </dependency>
  </dependencies>
</project>
"""
        deps = parse_dependencies({"pom.xml": content})
        assert any("spring-boot-starter-web" in d.name for d in deps)
        assert any(d.version == "3.2.1" for d in deps)
        assert any(d.ecosystem == "java" for d in deps)

    def test_entrypoints_detected(self):
        from security.repo_intel import detect_entrypoints

        tree = ["README.md", "src/main.py", "src/server.js", "package.json", "src/utils/helper.py"]
        entrypoints = detect_entrypoints(tree)
        assert "src/main.py" in entrypoints
        assert "src/server.js" in entrypoints
        assert "package.json" not in entrypoints
        assert "README.md" not in entrypoints


class TestEventBus:
    def test_publish_fans_out_to_subscribers(self):
        async def _run():
            from services.events import event_bus, publish_progress

            aid = str(uuid.uuid4())
            queue = event_bus.subscribe(aid)
            await publish_progress(aid, stage="Dependencies Scanned", progress=45,
                                   file="requirements.txt", files_scanned=3, total_files=10,
                                   eta_seconds=20)

            event = await asyncio.wait_for(queue.get(), timeout=2)
            assert event["type"] == "progress"
            assert event["stage"] == "Dependencies Scanned"
            assert event["progress"] == 45
            assert event["file"] == "requirements.txt"
            assert event["filesScanned"] == 3
            assert event["totalFiles"] == 10
            assert event["etaSeconds"] == 20
            event_bus.unsubscribe(aid, queue)

        asyncio.run(_run())

    def test_unsubscribed_assessment_drops_events(self):
        async def _run():
            from services.events import AssessmentEventBus

            bus = AssessmentEventBus()
            await bus.publish("nobody-listening", {"type": "progress"})  # must not raise
            assert bus.subscriber_count("nobody-listening") == 0

        asyncio.run(_run())


class TestStructuredErrors:
    def test_start_assessment_never_returns_generic_503(self):
        """POST /assessments must raise structured errors with stage + code."""
        import pathlib
        api_path = pathlib.Path(__file__).resolve().parent.parent / "routers" / "api.py"
        content = api_path.read_text(encoding="utf-8")
        assert 'status_code=503, detail="GitHub is unreachable. Please retry."' not in content
        assert 'status_code=503, detail="GitHub could not resolve the requested commit' not in content
        assert "GITHUB_RATE_LIMIT" in content
        assert "GITHUB_AUTH_EXPIRED" in content
        assert "GITHUB_UNREACHABLE" in content

    def test_structured_error_contract(self):
        from core.errors import structured_error

        exc = structured_error(
            status_code=429,
            stage="commit_resolution",
            code="GITHUB_RATE_LIMIT",
            message="GitHub API rate limit exceeded.",
        )
        assert exc.status_code == 429
        assert exc.detail["success"] is False
        assert exc.detail["stage"] == "commit_resolution"
        assert exc.detail["code"] == "GITHUB_RATE_LIMIT"
        assert exc.detail["message"] == "GitHub API rate limit exceeded."