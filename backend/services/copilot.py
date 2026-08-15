"""RAKSHA — ASK RAKSHA investigation copilot.

Architecture:
  RAKSHA DATA → RETRIEVAL → EVIDENCE CONTEXT → GROK REASONING
             → GROUNDED ANSWER → SOURCE REFERENCES

The copilot is READ-ONLY. It inspects the user's repositories, assessments,
findings, source evidence, and validation results, then grounds Grok's answer
in that evidence. It never modifies any data and never exposes secrets.

Grok is only ever called from the backend; GROK_API_KEY never leaves the server.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional

import structlog
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.assessment import Assessment
from models.finding import Finding
from models.repository import Repository
from models.user import User
from services.findings import find_by_slug
from services.grok import grok
from services.scoring import RESOLVED_STATUSES, risk_level

log = structlog.get_logger()


class CopilotContextError(RuntimeError):
    """Raised when the Raksha assessment context cannot be loaded (DB failure,
    model error). The router maps this to the ASSESSMENT_CONTEXT_ERROR log code.

    Never carries secrets or stack details to the API response.
    """

    code = "ASSESSMENT_CONTEXT_ERROR"

MAX_HISTORY_TURNS = 6
MAX_HIGH_IMPACT_FINDINGS = 10
MAX_FILES = 12
MAX_MESSAGE_CHARS = 4000
MAX_ANSWER_CHARS = 6000

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]


# ── Request contracts ────────────────────────────────────────────────────────

def to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatContext(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    page: str = "/"
    repository_id: Optional[str] = None
    assessment_id: Optional[str] = None
    finding_id: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)


class CopilotRequest(BaseModel):
    message: str
    context: Optional[ChatContext] = None
    # Legacy flat fields — still accepted for compatibility.
    assessment_id: Optional[str] = None
    finding_id: Optional[str] = None


# ── Intent detection (targeted retrieval) ────────────────────────────────────

def detect_intent(message: str) -> str:
    """Classify the question so only the relevant Raksha data is retrieved.

    Explicit IDs in the page context are always resolved regardless of intent;
    this decides which EXTRA aggregates are pulled in.
    """
    m = (message or "").lower().strip()

    def has(*kws: str) -> bool:
        return any(kw in m for kw in kws)

    if has("security score", "security posture", "current posture", "current score",
           "what's the score", "what is the score"):
        return "score"
    if has("how many critical", "how many high", "critical findings",
           "high severity issues", "high-severity issues", "how many findings"):
        return "counts"
    if has("most dangerous", "fix first", "should i fix first", "prioritize",
           "highest risk", "highest-risk", "most critical", "biggest risk"):
        return "high_impact"
    if has("attack path", "attack graph", "how does an attacker reach",
           "how can an attacker", "exploit path", "reach this"):
        return "attack_path"
    if has("show me the evidence", "what evidence", "corroborat"):
        return "evidence_detail"
    if has("vulnerable code", "show me the code", "show me the source",
           "where is it", "where's the code", "source code", "which line"):
        return "code"
    if has("validated", "actually valid", "was this validated", "actually confirmed",
           "prove", "reproduc", "real exploit", "really exploitable"):
        return "validation"
    if has("how should i fix", "how do i fix", "how to fix", "remediat",
           "mitigat", "what's the fix", "what is the fix", "fix this", "resolve this"):
        return "remediation"
    if has("which files", "files are most affected", "files have the most",
           "most affected files"):
        return "files"
    if has("summarize", "summary", "overview", "summaris"):
        return "summarize"
    if has("why", "dangerous", "what does cwe", "mean in this",
           "what is the impact", "consequence", "so what"):
        return "finding_explanation"
    if m in {"why", "how", "where", "what", "really", "explain", "more", "go on"}:
        return "follow_up"
    return "default"


# ── Resolution helpers ───────────────────────────────────────────────────────

async def _resolve_owned_assessment(db: AsyncSession, user: User, ref: str) -> Optional[Assessment]:
    from services.assessments import resolve_assessment

    assessment = await resolve_assessment(db, ref)
    if not assessment:
        return None
    repo = await db.get(Repository, assessment.repository_id)
    if not repo or repo.user_id != user.id:
        return None
    return assessment


async def _resolve_finding(
    db: AsyncSession,
    user: User,
    assessment: Optional[Assessment],
    ref: str,
) -> Optional[Finding]:
    ref = (ref or "").strip()
    if not ref:
        return None
    if assessment:
        result = await db.execute(
            select(Finding)
            .options(
                selectinload(Finding.validation_result),
                selectinload(Finding.remediation),
            )
            .where(Finding.assessment_id == assessment.id, Finding.slug == ref)
        )
        finding = result.scalar_one_or_none()
        if finding:
            return finding
    finding = await find_by_slug(db, user, ref)
    if finding:
        return finding
    result = await db.execute(
        select(Finding)
        .options(
            selectinload(Finding.validation_result),
            selectinload(Finding.remediation),
        )
        .where(Finding.id == ref)
    )
    return result.scalar_one_or_none()


async def _findings_for(db: AsyncSession, assessment_id: str) -> List[Finding]:
    result = await db.execute(
        select(Finding)
        .options(
            selectinload(Finding.validation_result),
            selectinload(Finding.remediation),
        )
        .where(Finding.assessment_id == assessment_id)
    )
    return list(result.scalars().all())


# ── Context construction ─────────────────────────────────────────────────────

def _display_run_id(assessment: Assessment) -> str:
    if assessment.run_number:
        return f"#A-{assessment.run_number:04d}"
    return f"#{assessment.id[:4].upper()}"


def _validation_label(finding: Finding) -> str:
    validation = finding.validation_result
    remediation = finding.remediation
    if validation:
        if validation.status == "reproduced":
            return "CONFIRMED"
        if validation.status in {"not_reproduced", "inconclusive"}:
            return "UNVALIDATED"
    if remediation and remediation.verification_status == "verified":
        return "VALIDATED"
    if finding.is_exploitable:
        return "CONFIRMED"
    return "STATIC"


def _finding_evidence(finding: Finding) -> dict:
    validation = finding.validation_result
    ev: Dict[str, Any] = {
        "source_code": finding.code_snippet or "",
        "attack_path": finding.attack_path or [],
        "impact": finding.impact or "",
        "root_cause": finding.root_cause or "",
        "ai_reasoning": finding.ai_reasoning or "",
        "static_analysis": finding.evidence or "",
        "validation": _validation_label(finding),
        "probe_result": None,
    }
    if validation:
        ev["probe_result"] = validation.status or None
        if validation.response_evidence:
            ev["runtime_evidence"] = validation.response_evidence
        if validation.http_response_code:
            ev["http_response_code"] = validation.http_response_code
    if finding.remediation:
        rem = finding.remediation
        ev["remediation"] = {
            "branch": rem.branch_name,
            "explanation": rem.explanation,
            "risks": rem.risks,
            "verification_status": rem.verification_status,
            "diff_after_preview": (rem.code_after or "")[:1200],
        }
    return ev


def _files_aggregation(findings: List[Finding]) -> list:
    by_file: Dict[str, Dict[str, Any]] = {}
    for finding in findings:
        path = finding.file_path or "unknown"
        entry = by_file.setdefault(path, {
            "file": path,
            "count": 0,
            "severities": {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0},
        })
        entry["count"] += 1
        sev = (finding.severity or "info").lower()
        if sev in entry["severities"]:
            entry["severities"][sev] += 1
    ranked = sorted(
        by_file.values(),
        key=lambda e: (-e["count"], -e["severities"]["critical"], -e["severities"]["high"]),
    )
    return ranked[:MAX_FILES]


async def build_rakasha_context(
    db: AsyncSession,
    user: User,
    ctx: ChatContext,
    message: str,
) -> dict:
    """Retrieve ONLY the Raksha evidence relevant to the current question/page."""
    context: Dict[str, Any] = {"page": ctx.page or "/", "retrieved": []}
    intent = detect_intent(message)

    repo: Optional[Repository] = None
    assessment: Optional[Assessment] = None

    if ctx.repository_id:
        repo = await db.get(Repository, ctx.repository_id)
        if repo and repo.user_id != user.id:
            repo = None
    if ctx.assessment_id:
        assessment = await _resolve_owned_assessment(db, user, ctx.assessment_id)
    if repo is None and assessment:
        repo = await db.get(Repository, assessment.repository_id)

    if repo is not None:
        branch = assessment.branch if assessment else (repo.default_branch or "main")
        commit = (assessment.commit_sha if assessment else None) or repo.head_commit or branch
        commit = commit[:7]
        context["repository"] = {
            "id": repo.id,
            "name": repo.name,
            "owner": repo.owner,
            "branch": branch,
            "commit": commit,
            "is_demo": repo.is_demo,
        }
        context["retrieved"].append("repository")

    if assessment is not None:
        context["assessment"] = {
            "id": _display_run_id(assessment),
            "run_number": assessment.run_number,
            "status": assessment.status,
            "score": assessment.security_score,
            "risk": risk_level(assessment.security_score) if assessment.security_score is not None else None,
            "critical": assessment.critical_count,
            "high": assessment.high_count,
            "medium": assessment.medium_count,
            "low": assessment.low_count,
            "info": assessment.info_count,
            "branch": assessment.branch or "main",
            "commit": (assessment.commit_sha or (repo.head_commit if repo else None) or "main")[:7],
        }
        arch = assessment.architecture_map or {}
        if arch.get("ai_summary"):
            context["assessment"]["architecture_summary"] = arch["ai_summary"]
        context["retrieved"].append("assessment_summary")

    finding: Optional[Finding] = None
    if ctx.finding_id:
        finding = await _resolve_finding(db, user, assessment, ctx.finding_id)
        if finding:
            context["selected_finding"] = {
                "id": finding.slug or finding.id,
                "title": finding.title,
                "severity": (finding.severity or "info").lower(),
                "confidence": finding.confidence_pct or 0,
                "status": finding.status or "open",
                "cwe_id": finding.cwe_id,
                "cwe_name": finding.cwe_name,
                "file": finding.file_path,
                "line": finding.line_number,
                "vulnerability_type": finding.vulnerability_type,
                "source_tool": finding.source_tool,
            }
            context["evidence"] = _finding_evidence(finding)
            context["retrieved"].extend(["finding_details", "finding_evidence"])

    if intent in {"high_impact", "summarize", "counts", "files"} and assessment is not None:
        findings = await _findings_for(db, assessment.id)
        if intent in {"high_impact", "summarize"}:
            high_impact = [
                f for f in findings
                if (f.severity or "").lower() in {"critical", "high"}
                and (f.status or "").lower() not in RESOLVED_STATUSES
            ]
            context["high_impact_findings"] = [
                {
                    "id": f.slug or f.id,
                    "title": f.title,
                    "severity": (f.severity or "info").lower(),
                    "confidence": f.confidence_pct or 0,
                    "status": f.status,
                    "cwe_id": f.cwe_id,
                    "file": f.file_path,
                    "line": f.line_number,
                }
                for f in high_impact[:MAX_HIGH_IMPACT_FINDINGS]
            ]
            if context["high_impact_findings"]:
                context["retrieved"].append("high_impact_findings")
        if intent == "files":
            context["files"] = _files_aggregation(findings)
            if context["files"]:
                context["retrieved"].append("files_aggregation")

    return context


# ── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are ASK RAKSHA, the evidence-grounded security investigation copilot for the RAKSHA Security Validation Platform.

Your job is to answer questions about the currently loaded RAKSHA workspace using ONLY the supplied RAKSHA context and evidence. You are NOT a generic chatbot.

PRIORITY of evidence (highest first):
1. Current page context
2. Currently selected repository
3. Currently selected assessment
4. Currently selected finding
5. Retrieved RAKSHA evidence
6. Conversation history

HARD RULES — never invent anything that is not in the supplied RAKSHA CONTEXT:
- vulnerabilities, CVEs, source code, endpoints, attack paths
- repository statistics, security scores, validation results, remediation evidence
- Finding IDs, CWE mappings, files, lines, commits, repository names

If the supplied RAKSHA CONTEXT does not contain enough evidence to answer a question, explicitly say:

"I don't have enough evidence in the current Raksha assessment to confirm that."

and briefly state which evidence would be needed.

Clearly distinguish the following in your answers:
- OBSERVED — facts present in the supplied evidence.
- INFERRED — reasonable reasoning derived from the supplied evidence.
- UNKNOWN — not supported by the supplied evidence.

Never convert an inference into a confirmed security finding.

When answering security questions, prefer precise evidence references such as Finding ID, CWE, File, Line, Assessment ID, Repository, Commit, and Validation result.

When possible, structure answers as:
ANSWER
EVIDENCE
IMPACT
VALIDATION
RECOMMENDATION

Keep answers concise unless the user asks for detailed analysis. You are READ-ONLY: you can only analyze evidence. Remediation suggestions are guidance only."""


def build_system_prompt(context: dict) -> str:
    context_json = json.dumps(context, ensure_ascii=False, indent=2, default=str)
    return (
        f"{_SYSTEM_PROMPT}\n\n"
        "# RAKSHA CONTEXT (the ONLY evidence available)\n"
        f"{context_json}"
    )


# ── Response safety ──────────────────────────────────────────────────────────

_SECRET_PATTERNS = [
    re.compile(r"\bxai-[A-Za-z0-9]{12,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{16,}\b"),
    re.compile(r"\bgsk_[A-Za-z0-9]{16,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
]


def sanitize_response(text: str) -> str:
    """Treat the model output as untrusted: clean, truncate, redact secrets."""
    if not isinstance(text, str):
        return "ASK RAKSHA could not produce a readable answer."
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    for pattern in _SECRET_PATTERNS:
        cleaned = pattern.sub("[REDACTED]", cleaned)
    cleaned = cleaned[:MAX_ANSWER_CHARS].strip()
    return cleaned or "ASK RAKSHA could not produce a readable answer."


# ── Sources ──────────────────────────────────────────────────────────────────

def build_sources(context: dict) -> list:
    sources: List[Dict[str, Any]] = []
    seen = set()

    def add(source: dict) -> None:
        key = (source.get("type"), source.get("id") or source.get("file") or source.get("name"))
        if key not in seen:
            seen.add(key)
            sources.append(source)

    repo = context.get("repository")
    if repo:
        add({"type": "repository", "id": repo.get("id"), "name": repo.get("name")})

    assessment = context.get("assessment")
    if assessment:
        add({
            "type": "assessment",
            "id": assessment.get("id"),
            "run_number": assessment.get("run_number"),
        })

    finding = context.get("selected_finding")
    if finding:
        add({"type": "finding", "id": finding.get("id"), "title": finding.get("title")})
        add({
            "type": "source",
            "file": finding.get("file"),
            "line": finding.get("line"),
            "finding_id": finding.get("id"),
        })

    for item in context.get("high_impact_findings") or []:
        add({"type": "finding", "id": item.get("id"), "title": item.get("title")})

    return sources


# ── Investigation entry point ────────────────────────────────────────────────

async def investigate(db: AsyncSession, user: User, request: CopilotRequest) -> dict:
    context = request.context or ChatContext()
    if not context.assessment_id and request.assessment_id:
        context.assessment_id = request.assessment_id
    if not context.finding_id and request.finding_id:
        context.finding_id = request.finding_id

    rakasha_context = None
    try:
        rakasha_context = await build_rakasha_context(db, user, context, request.message)
    except Exception as e:
        log.warning(
            "[COPILOT] context_load_failed",
            error_code="ASSESSMENT_CONTEXT_ERROR",
            error_type=type(e).__name__,
        )
        raise CopilotContextError("Failed to load assessment context") from e
    system_prompt = build_system_prompt(rakasha_context)

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in context.history[-MAX_HISTORY_TURNS:]:
        if turn.role == "system":
            continue
        messages.append({"role": turn.role, "content": turn.content[:MAX_MESSAGE_CHARS]})
    messages.append({"role": "user", "content": request.message[:MAX_MESSAGE_CHARS]})

    answer = await grok.chat(messages, max_tokens=1200, temperature=0.2)
    answer = sanitize_response(answer)

    return {
        "answer": answer,
        "response": answer,  # legacy alias for in-flight frontend/backend deploys
        "sources": build_sources(rakasha_context),
        "context_loaded": bool(rakasha_context.get("retrieved")),
    }
