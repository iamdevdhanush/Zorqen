"""RAKSHA — Demo Workspace Seeder
Idempotent: creates the demo user, demo repositories, completed console-contract
runs (findings, validation results, remediation, score snapshots, audit trail)
so the API serves real data out of the box — no GitHub/Docker/AI required.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.assessment import Assessment, AssessmentStatus
from models.audit_log import AuditLog
from models.finding import Finding, FindingStatus
from models.remediation import Remediation, RemediationStatus
from models.repository import Repository
from models.snapshot import RepositorySnapshot, SnapshotSource
from models.user import User
from models.validation_result import ValidationResult, ValidationStatus
from services.scoring import calculate_security_score, severity_counts

log = structlog.get_logger()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _confidence_label(pct: int) -> str:
    if pct >= 95:
        return "confirmed"
    if pct >= 75:
        return "likely"
    return "possible"


# ── Compact finding specs for the demo workspace ────────────────────────────

# (slug, severity, status, title, file, line, cwe_id, cwe_name, tool, pct,
#  endpoint, language, snippet)
_DEFENCE_FINDINGS: List[tuple] = [
    ("F-0001", "critical", "open", "SQL Injection", "app/api/users.py", 42,
     "CWE-89", "SQL Injection", "semgrep", 97, "/api/users/search", "python",
     """@router.get("/search")
async def search_users(request: Request):
    q = request.query_params.get("q", "")
    conn = db.get_connection()
    cursor = conn.cursor()
    sql = f"SELECT id, name, role FROM users WHERE name LIKE '%{q}%'"
    cursor.execute(sql)
    rows = cursor.fetchall()
    conn.close()
    return rows"""),
    ("F-0002", "high", "open", "Hardcoded Secret", "config.py", 18,
     "CWE-798", "Hard-coded Credentials", "secret-detector", 99, None, "python",
     'AWS_ACCESS_KEY_ID = "AKIA6E4QNIXQW5KTL2RA"\nAWS_SECRET_ACCESS_KEY = "Vj9k2mP4x…"\nREGION = "eu-west-1"'),
    ("F-0003", "high", "open", "Broken Object Authorization", "app/api/admin/users.py", 118,
     "CWE-639", "Authorization Bypass Through User-Controlled Key", "custom rule authz-scope", 91,
     "PATCH /api/admin/users/:id", "python",
     """@router.patch("/users/{user_id}")
async def update_role(user_id: int, body: RoleUpdate):
    if "admin" not in current_user.auth_scopes:
        raise HTTPException(403)
    user = users.update_role(user_id, body.role)
    return user"""),
    ("F-0004", "high", "open", "Path Traversal in Export", "app/services/reports.py", 67,
     "CWE-22", "Path Traversal", "semgrep", 84, "GET /api/reports/export", "python",
     """@router.get("/export")
async def export_report(request: Request):
    filename = request.query_params.get("file")
    path = os.path.join(EXPORT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404)
    return FileResponse(path)"""),
    ("F-0005", "medium", "open", "Permissive CORS", "main.py", 31,
     "CWE-942", "Permissive Cross-domain Policy", "semgrep", 88, "ALL /{path}", "python",
     """app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)"""),
    ("F-0006", "medium", "open", "Insecure Deserialization", "app/services/cache.py", 95,
     "CWE-502", "Deserialization of Untrusted Data", "semgrep", 76, None, "python",
     """def hydrate(key: str):
    raw = redis.get(f"cache:{key}")
    if raw is None:
        return None
    return pickle.loads(raw)  # tainted"""),
    ("F-0007", "medium", "open", "Missing Rate Limiting on Login", "app/api/auth.py", 203,
     "CWE-307", "Improper Restriction of Excessive Authentication Attempts", "custom rule brute-force", 71,
     "POST /api/auth/login", "python",
     """@router.post("/login")
async def login(body: LoginRequest):
    user = db.find_user_by_name(body.username)
    if user is None or not verify_password(body.password, user.hash):
        raise HTTPException(401)
    return issue_tokens(user)"""),
    ("F-0008", "medium", "open", "Weak JWT Signing Algorithm", "app/auth/jwt.py", 26,
     "CWE-327", "Use of a Broken Crypto Algorithm", "semgrep", 82, None, "python",
     """def decode_token(token: str):
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=["none", "HS256"],
    )
    return payload"""),
    ("F-0009", "medium", "open", "SSRF via Import URL", "app/services/imports.py", 48,
     "CWE-918", "Server-Side Request Forgery", "semgrep", 78, "POST /api/imports/url", "python",
     """async def import_from_url(url: str):
    resp = await httpx.get(url, timeout=10)
    return resp.json()"""),
    ("F-0010", "medium", "open", "Missing CSRF Protection", "app/api/admin/ui.py", 30,
     "CWE-352", "Cross-Site Request Forgery", "custom rule csrf", 66, "POST /api/admin/ui/*", "python",
     """@router.post("/settings")
async def update_settings(body: SettingsUpdate):
    await db.update_settings(body.model_dump())
    return {"ok": True}"""),
    ("F-0011", "medium", "open", "Username Enumeration in Login", "app/api/auth.py", 87,
     "CWE-204", "Observable Response Discrepancy", "custom rule user-enum", 64, "POST /api/auth/login", "python",
     """if user is None:
    raise HTTPException(404, "user not found")
if not verify_password(body.password, user.hash):
    raise HTTPException(401, "invalid credentials")"""),
    ("F-0012", "medium", "open", "Hardcoded Admin Credentials", "app/config.py", 41,
     "CWE-798", "Hard-coded Credentials", "secret-detector", 90, None, "python",
     'BOOTSTRAP_ADMIN = {\n    "username": "ops-admin",\n    "password": "S3cure#2024",\n}'),
    ("F-0013", "low", "open", "Debug Router Exposed", "main.py", 14,
     "CWE-489", "Debug Feature Enabled", "semgrep", 92, "GET /debug/env", "python",
     """app.include_router(debug_routes, prefix="/debug")
app.include_router(users.router)
app.include_router(admin.router)"""),
    ("F-0014", "low", "open", "Version Disclosure", "main.py", 8,
     "CWE-200", "Exposure of Sensitive Information", "semgrep", 85, "GET /health", "python",
     """return {
    "status": "ok",
    "version": app.version,
    "commit": GIT_SHA,
}"""),
    ("F-0024", "high", "open", "Committed .env with AWS Key", ".env", 1,
     "CWE-798", "Hard-coded Credentials", "secret-detector", 99, None, "dotenv",
     """AWS_ACCESS_KEY_ID=AKIA6E4QNIXQW5KTL2RA
AWS_SECRET_ACCESS_KEY=Vj9k2mP4x…
S3_BUCKET=secureops-logistics"""),
    ("F-0025", "high", "open", "Database Credentials in Source", "app/db.py", 12,
     "CWE-798", "Hard-coded Credentials", "secret-detector", 97, None, "python",
     'DATABASE_DSN = "postgresql://raksha:Tr0ub4dor!@db.internal:5432/logistics"'),
    ("F-0026", "medium", "open", "CVE-2026-0981 — fastapi < 0.99.0", "requirements.txt", 1,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 95, None, "text", "fastapi==0.98.4"),
    ("F-0027", "medium", "open", "CVE-2026-3312 — psycopg2-binary < 2.9.10", "requirements.txt", 2,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 95, None, "text", "psycopg2-binary==2.9.9"),
    ("F-0028", "medium", "open", "CVE-2025-2210 — authlib < 1.4.0", "requirements.txt", 3,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 94, None, "text", "authlib==1.3.9"),
    ("F-0029", "low", "open", "CVE-2026-0745 — uvicorn < 0.34.2", "requirements.txt", 4,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 93, None, "text", "uvicorn[standard]==0.33.0"),
    ("F-0030", "low", "open", "CVE-2025-2199 — pydantic < 2.10.6", "requirements.txt", 5,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 92, None, "text", "pydantic==2.10.5"),
]

_CYBER_FINDINGS: List[tuple] = [
    ("F-1001", "high", "open", "JWT Stored in localStorage", "src/lib/auth.ts", 41,
     "CWE-922", "Insecure Storage of Sensitive Information", "semgrep", 92, None, "typescript",
     """export function persistAuth(token: string) {
  localStorage.setItem("raksha_token", token);
}"""),
    ("F-1002", "medium", "open", "Permissive CORS Configuration", "src/server.ts", 27,
     "CWE-942", "Permissive Cross-domain Policy", "semgrep", 86, None, "typescript",
     """app.use(cors({
  origin: "*",
  credentials: true,
}))"""),
    ("F-1003", "medium", "open", "Unpinned npm Dependencies", "package.json", 4,
     "CWE-1104", "Use of Unmaintained Dependency", "trivy", 94, None, "json",
     """"dependencies": {
  "next": "^15.2.0",
  "axios": "^1.7.0"
}"""),
    ("F-1004", "low", "open", "Version Disclosure in Bundle", "src/pages/_app.tsx", 19,
     "CWE-200", "Exposure of Sensitive Information", "semgrep", 79, None, "typescript",
     'declare global { const __APP_META__: { version: string; commit: string } }'),
    ("F-1005", "low", "open", "Missing CSRF on Admin Mutations", "src/pages/admin.tsx", 33,
     "CWE-352", "Cross-Site Request Forgery", "custom rule csrf", 68, None, "typescript",
     """export async function updateTeam(payload: TeamUpdate) {
  return api.post("/admin/team", payload);
}"""),
    ("F-1006", "low", "open", "Sensitive Data in Client Logs", "src/lib/http.ts", 58,
     "CWE-532", "Data Exposure Through Logs", "semgrep", 82, None, "typescript",
     """axios.interceptors.request.use(req => {
  console.log("[http]", req.url, req.data);
  return req;
})"""),
]

_CWE_BRIEF = {
    "CWE-89": "User-controlled input is interpolated into a SQL string without parameterization, enabling statement manipulation.",
    "CWE-798": "A credential or secret value is committed directly in source instead of being injected at deploy time.",
    "CWE-639": "The handler mutates a resource resolved from the request without an ownership or scoped-authorization check.",
    "CWE-22": "A request-derived filename is joined to a directory path without neutralizing traversal sequences.",
    "CWE-942": "Cross-origin policy allows arbitrary origins, often combined with credentials.",
    "CWE-502": "Untrusted data is deserialized with a format that can execute code on construction.",
    "CWE-307": "The credential endpoint has no throttling or lockout on repeated authentication attempts.",
    "CWE-327": "A broken or weak cryptographic algorithm is used where a strong one is required by policy.",
    "CWE-918": "An arbitrary URL is fetched server-side without allowlist or internal-address validation.",
    "CWE-352": "State-changing endpoints accept sessions without a CSRF token or Origin verification.",
    "CWE-204": "Responses differ observably between known and unknown principals, leaking valid identities.",
    "CWE-489": "A debug-only route or feature is mounted unconditionally in all environments.",
    "CWE-200": "Sensitive metadata such as versions or build hashes is exposed in client-reachable responses.",
    "CWE-922": "Access tokens are persisted in browser storage reachable by any script.",
    "CWE-1104": "A dependency is pinned below the fixed release or uses a floating version tag.",
    "CWE-532": "Sensitive data is written to logs or CI output reachable by non-privileged viewers.",
}

# ── Completed run pipeline log lines (console contract) ─────────────────────

_COMPLETED_ACTIVITY: List[tuple] = [
    ("09:41:22", "indexer", "1,284 files indexed", "ok"),
    ("09:41:25", "architect", "12 modules · 4 layers · data flow mapped", "ok"),
    ("09:41:31", "semgrep", "152 rules · 14 findings", "info"),
    ("09:41:34", "secret-detector", "2 secrets found", "warn"),
    ("09:41:38", "trivy", "142 packages · 5 vulnerabilities", "warn"),
    ("09:41:42", "reasoner", "CWE-89 · confidence 97%", "info"),
    ("09:41:45", "reasoner", "CWE-798 · confidence 99%", "info"),
    ("09:41:51", "sandbox", "container secure-sandbox-0241 created", "info"),
    ("09:41:55", "validator", "SQL injection REPRODUCED · HTTP 500", "err"),
    ("09:41:58", "validator", "test complete · 4/4 reproduced", "warn"),
    ("09:42:01", "scorer", "SCORE_PLACEHOLDER", "warn"),
    ("09:42:04", "raksha", "assessment #A-0241 completed", "ok"),
]

_STEP_IDS = ["index", "architecture", "dependencies", "static", "secrets", "reasoning", "validation"]
_STEP_LABELS = ["Repository indexed", "Architecture analyzed", "Dependencies analyzed",
                "Static analysis completed", "Secrets scan completed", "AI reasoning completed",
                "Sandbox validation"]

# Curated triage statuses: showcase the full workflow while keeping the posture
# score plausible for a repo that is mid-remediation.
_DEFENCE_STATUS: Dict[str, str] = {
    "F-0001": "open",        # critical SQLi still open
    "F-0002": "fixing",      # fix generated for hardcoded secret
    "F-0003": "verified",    # IDOR fixed + verified
    "F-0004": "verified",    # path traversal fixed + verified
    "F-0005": "fixing",      # CORS fix generated
    "F-0006": "dismissed",
    "F-0007": "dismissed",
    "F-0008": "open",        # weak JWT still open
    "F-0009": "dismissed",
    "F-0010": "dismissed",
    "F-0011": "dismissed",
    "F-0012": "dismissed",
    "F-0013": "dismissed",
    "F-0014": "dismissed",
    "F-0024": "verified",    # committed .env removed + verified
    "F-0025": "verified",    # DB creds moved to env + verified
    "F-0026": "dismissed",
    "F-0027": "dismissed",
    "F-0028": "dismissed",
    "F-0029": "dismissed",
    "F-0030": "dismissed",
}


def _triage_status(slug: str, default: str) -> str:
    return _DEFENCE_STATUS.get(slug, default)


def _finding_narrative(slug: str, spec: tuple) -> dict:
    _, severity, _, title, file_path, line_number, cwe_id, cwe_name, tool, pct, endpoint, language, _snippet = spec
    brief = _CWE_BRIEF.get(cwe_id, f"{cwe_name}: control-flow or configuration weakness.")
    return {
        "root_cause": brief,
        "impact": f"Exploitation of {title} at {file_path}:{line_number} can lead to compromise of the demo application.",
        "attack_path": [f"{file_path}:{line_number}", cwe_name, title],
        "evidence": f"{tool}: rule match on {file_path}:{line_number} ({cwe_id}).",
        "ai_reasoning": f"Confirmed by static reasoning over the data flow reaching {file_path}:{line_number}; "
                        f"recommend the standard remediation for {cwe_id}.",
        "endpoint": endpoint,
        "language": language,
    }


async def _create_finding(db: AsyncSession, assessment: Assessment, spec: tuple,
                          narrative: Optional[dict] = None) -> Finding:
    (slug, severity, status, title, file_path, line_number, cwe_id, cwe_name,
     tool, pct, endpoint, language, snippet) = spec
    status = _triage_status(slug, status)
    narrative = narrative or _finding_narrative(slug, spec)
    finding = Finding(
        assessment_id=assessment.id,
        slug=slug,
        severity=severity,
        confidence=_confidence_label(pct),
        confidence_pct=pct,
        status=FindingStatus.OPEN if status == "open" else status,
        title=title,
        vulnerability_type=cwe_name,
        cwe_id=cwe_id,
        cwe_name=cwe_name,
        file_path=file_path,
        line_number=line_number,
        code_snippet=snippet,
        endpoint=narrative["endpoint"],
        language=narrative["language"],
        source_tool=tool,
        rule_id=f"demo::{tool}::{cwe_id}",
        root_cause=narrative["root_cause"],
        attack_path=narrative["attack_path"],
        impact=narrative["impact"],
        evidence=narrative["evidence"],
        ai_reasoning=narrative["ai_reasoning"],
        is_exploitable=severity in {"critical", "high"},
    )
    db.add(finding)
    await db.flush()
    return finding


async def _create_completed_run(
    db: AsyncSession,
    repository: Repository,
    *,
    run_number: int,
    commit: str,
    findings_specs: List[tuple],
    score: float,
    counts: dict,
) -> Assessment:
    started = _utcnow() - timedelta(hours=2)
    completed = started + timedelta(seconds=46)

    log_lines = []
    for i, (time_str, source, text, tone) in enumerate(_COMPLETED_ACTIVITY):
        line_text = text
        if text == "SCORE_PLACEHOLDER":
            line_text = f"{int(round(score))}/100 · {'HIGH RISK' if score < 60 else 'MODERATE RISK' if score < 80 else 'LOW RISK'}"
        log_lines.append({
            "step": _STEP_IDS[min(i // 2, 6)],
            "status": "completed",
            "timestamp": (started + timedelta(seconds=i * 3)).isoformat(),
            "source": source,
            "text": line_text,
            "tone": tone,
        })
    # ensure the completion line uses the real run number
    for entry in log_lines:
        if entry["source"] == "raksha" and "completed" in entry["text"]:
            entry["text"] = f"assessment #{run_number:04d} completed"

    assessment = Assessment(
        repository_id=repository.id,
        run_number=run_number,
        branch="main",
        commit_sha=commit,
        commit_message="Security assessment run",
        status=AssessmentStatus.COMPLETED,
        current_step="validation",
        progress_pct=100,
        security_score=score,
        score_change=0.0,
        critical_count=counts["critical"],
        high_count=counts["high"],
        medium_count=counts["medium"],
        low_count=counts["low"],
        info_count=counts["info"],
        secrets_count=counts["critical"] + counts["high"],
        dependency_count=sum(1 for f in findings_specs if f[9] in {"trivy", "dependency"}),
        architecture_map={
            "primary_language": repository.language,
            "modules": ["api", "auth", "models", "services"],
            "entry_points": ["/api/users/search", "/api/auth/login", "/api/reports/export"],
            "data_flow": {"request": "->", "auth": "->", "db": "->", "response": ""},
            "ai_summary": f"{repository.name}: FastAPI service with JWT auth and PostgreSQL.",
            "technologies": [repository.language, "FastAPI", "PostgreSQL", "Docker"],
        },
        timeline=[
            {"step": step_id, "status": "completed", "timestamp": started.isoformat()}
            for step_id in _STEP_IDS
        ],
        pipeline_logs=log_lines,
        is_demo=True,
        started_at=started,
        completed_at=completed,
    )
    db.add(assessment)
    await db.flush()

    for spec in findings_specs:
        await _create_finding(db, assessment, spec)
    return assessment


async def _seed_repo(db: AsyncSession, user: User, *, name: str, commit: str, run_number: int,
                     findings_specs: List[tuple]) -> tuple:
    existing = await db.execute(
        select(Repository).where(Repository.user_id == user.id, Repository.name == name)
    )
    repo = existing.scalar_one_or_none()
    if repo:
        return repo, None

    repo = Repository(
        user_id=user.id,
        full_name=f"secureops/{name}",
        owner="secureops",
        name=name,
        description="Demo repository with intentional vulnerabilities",
        language="Python" if name == "defence-logistics-api" else "TypeScript",
        default_branch="main",
        is_private=True,
        is_demo=True,
        head_commit=commit,
    )
    db.add(repo)
    await db.flush()

    statuses = [_triage_status(s[0], s[2]) for s in findings_specs]
    counts = severity_counts([
        {"severity": s[1], "confidence": _confidence_label(s[9]), "status": st} for s, st in zip(findings_specs, statuses)
    ])
    score = round(calculate_security_score([
        {"severity": s[1], "confidence": _confidence_label(s[9]), "status": st} for s, st in zip(findings_specs, statuses)
    ]), 1)
    assessment = await _create_completed_run(
        db, repo, run_number=run_number, commit=commit,
        findings_specs=findings_specs, score=score, counts=counts,
    )

    # Baseline + scan snapshots for the overview score chart (monotonic trend)
    for days_ago, offset, src in [
        (30, -6, SnapshotSource.BASELINE),
        (21, -4, SnapshotSource.BASELINE),
        (12, -2, SnapshotSource.SCAN),
        (5, -1, SnapshotSource.SCAN),
        (1, 0, SnapshotSource.SCAN),
    ]:
        db.add(RepositorySnapshot(
            repository_id=repo.id,
            assessment_id=assessment.id,
            score=max(0.0, round(score + offset, 1)),
            source=src,
            critical_count=counts["critical"],
            high_count=counts["high"],
            medium_count=counts["medium"],
            low_count=counts["low"],
            created_at=_utcnow() - timedelta(days=days_ago),
        ))
    await db.flush()
    return repo, assessment


async def ensure_demo_data(db: AsyncSession) -> None:
    """Create the demo workspace once. Safe to call repeatedly."""
    if not settings.demo_mode_enabled:
        return

    existing = (
        await db.execute(
            select(Repository.id)
            .join(User, Repository.user_id == User.id)
            .where(User.github_login == settings.demo_user_login)
            .limit(1)
        )
    ).first()
    if existing:
        log.info("demo_workspace_already_seeded")
        return

    user_result = await db.execute(select(User).where(User.github_login == settings.demo_user_login))
    user = user_result.scalar_one_or_none()
    if user is None:
        user = User(
            github_id=999999,
            github_login=settings.demo_user_login,
            github_name="RAKSHA Demo",
            github_email="demo@raksha.ai",
            github_avatar_url="",
            is_demo=True,
        )
        db.add(user)
        await db.flush()
        log.info("demo_user_created", login=user.github_login)

    repo_a, assessment_a = await _seed_repo(
        db, user, name="defence-logistics-api", commit="8f3a21c",
        run_number=241, findings_specs=_DEFENCE_FINDINGS,
    )
    repo_b, assessment_b = await _seed_repo(
        db, user, name="cyber-portal", commit="c91d4fe",
        run_number=240, findings_specs=_CYBER_FINDINGS,
    )

    # Flagship finding: SQL injection gets a reproduced validation + remediation
    if assessment_a:
        flag = (await db.execute(
            select(Finding).where(Finding.assessment_id == assessment_a.id, Finding.slug == "F-0001")
        )).scalar_one_or_none()
        if flag:
            db.add(ValidationResult(
                finding_id=flag.id,
                status=ValidationStatus.REPRODUCED,
                test_type="sql-injection-probe",
                test_payload="' OR '1'='1",
                http_response_code=500,
                response_evidence=("q = \"' OR '1'='1\" returns all 1,284 rows (HTTP 200); "
                                   "q = \"'\" returns HTTP 500 (psycopg2 syntax error)."),
                sandbox_id="secure-sandbox-0241",
                sandbox_image="raksha/sandbox:py3.12",
                confidence_pct=97,
                sandbox_created_at=_utcnow() - timedelta(hours=1),
                sandbox_destroyed_at=_utcnow() - timedelta(minutes=59),
                completed_at=_utcnow() - timedelta(hours=1),
            ))
            db.add(Remediation(
                finding_id=flag.id,
                status=RemediationStatus.GENERATED,
                file_path=flag.file_path,
                code_before=flag.code_snippet,
                code_after="""@router.get("/search")
async def search_users(request: Request):
    q = request.query_params.get("q", "")
    conn = db.get_connection()
    cursor = conn.cursor()
    sql = "SELECT id, name, role FROM users WHERE name LIKE %s"
    cursor.execute(sql, (f"%{q}%",))
    rows = cursor.fetchall()
    conn.close()
    return rows""",
                explanation="Replaces f-string SQL construction with a parameterized query. The user input is "
                            "passed as a bound parameter, so it can never alter the statement structure.",
                risks="Low: bound parameters are treated as data, not SQL syntax; LIKE wildcards are preserved.",
                branch_name="raksha/fix/sql-injection-users-search",
            ))
            flag.is_exploitable = True
            await db.flush()

    # Audit trail for the activity feed
    for detail, action, tone in [
        ("demo assessment #0241 completed · defence-logistics-api", "TRIGGER_ASSESSMENT", "ok"),
        ("critical vulnerability confirmed · CWE-89 SQL Injection", "TRIGGER_ASSESSMENT", "warn"),
        ("remediation generated · raksha/fix/sql-injection-users-search", "TRIGGER_ASSESSMENT", "info"),
        ("demo workspace seeded", "TRIGGER_SIGNUP", "info"),
    ]:
        db.add(AuditLog(
            user_id=user.id,
            action=action,
            resource_type="repository" if "assessment" not in detail else "assessment",
            detail=detail,
            extra={"tone": tone},
        ))

    await db.commit()
    log.info("demo_workspace_seeded",
             repos=[repo_a.name, repo_b.name],
             score=assessment_a.security_score if assessment_a else None)
