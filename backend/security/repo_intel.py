"""RAKSHA — Repository Intelligence Layer

Deterministic extraction of security-relevant context from a repository's
file tree and file contents. This is the first real stage of the pipeline:
it builds the *targeted* context that every later stage (static analysis,
AI reasoning, validation) consumes. The entire repository is never handed
to an LLM as a blob — only the extracted intelligence is.

Extracted context includes:

- languages / primary language
- frameworks & technologies
- dependencies (from manifest files)
- environment variables referenced
- API routes / endpoints (with auth requirement where determinable)
- functions
- database engines in use
- external integrations
- user-controlled inputs
- dangerous sinks
- authentication indicators

Everything here is deterministic (regex/parse based). No LLM calls.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

LANGUAGE_BY_EXT = {
    ".py": "python", ".pyw": "python", ".pyi": "python",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".go": "go", ".java": "java", ".rb": "ruby", ".php": "php",
    ".cs": "csharp", ".cpp": "cpp", ".cc": "cpp", ".c": "c", ".rs": "rust",
    ".sh": "bash", ".bash": "bash", ".zsh": "bash", ".ps1": "powershell",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".ini": "ini", ".cfg": "ini", ".conf": "ini", ".sql": "sql",
    ".html": "html", ".htm": "html", ".css": "css", ".md": "markdown",
    ".xml": "xml", ".vue": "vue", ".svelte": "svelte", ".dockerfile": "dockerfile",
}

# Priority for primary-language selection when counts are tied.
LANG_PRIORITY = [
    "python", "javascript", "typescript", "go", "java", "ruby", "php",
    "csharp", "rust", "c", "cpp", "bash", "kotlin", "swift",
]

FRAMEWORK_PATTERNS = {
    # Frontend
    "React": [r"react", r"jsx", r"tsx", r"create-react-app", r"next\.js"],
    "Vue": [r"vue\.js", r"nuxt"],
    "Angular": [r"@angular", r"angular\.json"],
    "Svelte": [r"svelte"],
    "Next.js": [r"next\.js", r'"next"'],
    # Backend
    "FastAPI": [r"fastapi", r"from fastapi"],
    "Flask": [r"from flask", r"import flask"],
    "Django": [r"django", r"from django"],
    "Express": [r"express\(\)", r"require\(['\"]express"],
    "NestJS": [r"@nestjs", r"nestjs"],
    "Spring Boot": [r"spring-boot", r"@SpringBootApplication"],
    "Rails": [r"Rails", r"ActiveRecord"],
    # Database
    "PostgreSQL": [r"psycopg2", r"asyncpg", r"postgres", r"postgresql"],
    "MySQL": [r"mysql", r"pymysql", r"mysql2"],
    "MongoDB": [r"pymongo", r"mongoose", r"mongodb"],
    "Redis": [r"redis", r"aioredis"],
    "SQLite": [r"sqlite", r"aiosqlite"],
    # Infrastructure
    "Docker": [r"dockerfile", r"docker-compose"],
    "Kubernetes": [r"kubernetes", r"kubectl", r"\.yaml.*kind:\s*Deployment"],
    "AWS": [r"boto3", r"aws-sdk", r"amazonaws\.com"],
    "GitHub Actions": [r"\.github/workflows", r"on:\s*push"],
    "Nginx": [r"nginx\.conf", r"nginx"],
}

AUTH_KEYWORDS = [
    "jwt", "oauth", "auth0", "passport", "login", "session", "bearer",
    "authenticate", "authorization", "permission", "role", "rbac",
]

AUTH_DECORATORS = [
    "login_required", "jwt_required", "require_auth", "require_admin",
    "auth_required", "roles_required", "login_required", "fresh_login_required",
]

AUTH_DEPENDENCIES = [
    "get_current_user", "get_current_active_user", "get_current_admin",
    "Depends(get_current_user", "Depends(require_", "Depends(auth",
]

INPUT_PATTERNS: List[tuple] = [
    (r"request\.args\.get\(\s*['\"]([^'\"]+)['\"]", "query"),
    (r"request\.args\[\s*['\"]([^'\"]+)['\"]", "query"),
    (r"request\.query_params\.get\(\s*['\"]([^'\"]+)['\"]", "query"),
    (r"request\.query_params\[\s*['\"]([^'\"]+)['\"]", "query"),
    (r"request\.form\.get\(\s*['\"]([^'\"]+)['\"]", "form"),
    (r"request\.form\[\s*['\"]([^'\"]+)['\"]", "form"),
    (r"request\.json\.get\(\s*['\"]([^'\"]+)['\"]", "body"),
    (r"request\.json\[\s*['\"]([^'\"]+)['\"]", "body"),
    (r"request\.get_json\(\)", "body"),
    (r"request\.values\.get\(\s*['\"]([^'\"]+)['\"]", "query"),
    (r"request\.files\[?\s*['\"]([^'\"]+)['\"]", "file"),
    (r"req\.query\.([A-Za-z_][A-Za-z0-9_]*)", "query"),
    (r"req\.query\[\s*['\"]([^'\"]+)['\"]", "query"),
    (r"req\.body\.([A-Za-z_][A-Za-z0-9_]*)", "body"),
    (r"req\.params\.([A-Za-z_][A-Za-z0-9_]*)", "path"),
    (r"req\.params\[\s*['\"]([^'\"]+)['\"]", "path"),
    (r"body\.([A-Za-z_][A-Za-z0-9_]*)", "body"),
    (r"ctx\.query\.([A-Za-z_][A-Za-z0-9_]*)", "query"),
    (r"event\.body\.([A-Za-z_][A-Za-z0-9_]*)", "body"),
    (r"cookies\.get\(\s*['\"]([^'\"]+)['\"]", "cookie"),
    (r"request\.cookies\.get\(\s*['\"]([^'\"]+)['\"]", "cookie"),
]

SINK_PATTERNS: List[tuple] = [
    ("sql", r"(cursor|conn|connection|db|session)\.(execute|executemany)\s*\("),
    ("sql", r"(execute|executemany|query)\s*\(\s*[f\"'][^\"']*SELECT"),
    ("command", r"os\.system\s*\("),
    ("command", r"os\.popen\s*\("),
    ("command", r"subprocess\.(call|run|Popen|check_output|check_call)\s*\("),
    ("command", r"child_process\.(exec|execSync|spawn|spawnSync)\s*\("),
    ("eval", r"\beval\s*\("),
    ("eval", r"\bexec\s*\("),
    ("file", r"\bopen\s*\("),
    ("file", r"os\.path\.(join|abspath|realpath)\s*\("),
    ("file", r"send_file\s*\("),
    ("file", r"FileResponse\s*\("),
    ("file", r"\.save\s*\("),
    ("file", r"file\.save\s*\("),
    ("deserialization", r"pickle\.(load|loads)\s*\("),
    ("deserialization", r"yaml\.load\s*\("),
    ("deserialization", r"marshal\.(load|loads)\s*\("),
    ("deserialization", r"jsonpickle\.decode\s*\("),
    ("deserialization", r"pyyaml"),
    ("template", r"render_template_string\s*\("),
    ("http", r"(requests|httpx|urllib|aiohttp)\.(get|post|put|delete|patch|request)\s*\("),
    ("http", r"(axios|fetch)\s*\.?(get|post|put|delete|patch)?\s*\("),
]

DB_ENGINE_PATTERNS = [
    (r"import sqlite3", "sqlite"),
    (r"sqlite3\.connect", "sqlite"),
    (r"psycopg2", "postgres"),
    (r"asyncpg", "postgres"),
    (r"pymysql", "mysql"),
    (r"mysql2", "mysql"),
    (r"import mysql\.connector", "mysql"),
    (r"pymongo", "mongodb"),
    (r"mongoose", "mongodb"),
    (r"aioredis", "redis"),
    (r"from redis", "redis"),
    (r"sqlalchemy", "sqlalchemy"),
    (r"peewee", "sqlalchemy"),
]

INTEGRATION_PATTERNS = [
    (r"stripe", "payments"),
    (r"paypal", "payments"),
    (r"twilio", "sms"),
    (r"sendgrid", "email"),
    (r"mailgun", "email"),
    (r"nodemailer", "email"),
    (r"smtplib", "email"),
    (r"boto3", "aws"),
    (r"aws-sdk", "aws"),
    (r"googleapis|google\.cloud", "gcp"),
    (r"firebase", "firebase"),
    (r"slack", "slack"),
    (r"github", "github"),
    (r"openai|anthropic|groq|langchain", "llm"),
    (r"requests\.get|httpx\.get|aiohttp\.get|axios\.get|fetch\(", "outbound_http"),
]

ENV_VAR_PATTERNS = [
    r"os\.environ\.(get|getenv)\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]",
    r"os\.getenv\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]",
    r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)",
    r"process\.env\[\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]",
    r"env\(['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]",
    r"\$\(?[A-Z][A-Z0-9_]{2,}\)?",
]

MANIFEST_FILES = {
    "requirements.txt": "python",
    "Pipfile": "python",
    "pyproject.toml": "python",
    "setup.py": "python",
    "package.json": "node",
    "package-lock.json": "node",
    "yarn.lock": "node",
    "pnpm-lock.yaml": "node",
    "Gemfile": "ruby",
    "go.mod": "go",
    "composer.json": "php",
    "pom.xml": "java",
}

VERSION_PIN = re.compile(r"^([A-Za-z0-9_.-]+)\s*([<>=!~^]+)\s*([0-9][A-Za-z0-9.+-]*)", re.IGNORECASE)


@dataclass
class RouteInfo:
    endpoint: str
    method: str
    file_path: str
    line_number: int
    handler: str = ""
    auth_required: Optional[bool] = None
    framework: str = ""


@dataclass
class InputSource:
    variable: str
    file_path: str
    line_number: int
    kind: str = "query"


@dataclass
class SinkInfo:
    kind: str
    file_path: str
    line_number: int
    code: str = ""


@dataclass
class FunctionInfo:
    name: str
    file_path: str
    line_number: int


@dataclass
class DependencyInfo:
    name: str
    version: Optional[str]
    file_path: str
    ecosystem: str


@dataclass
class RepositoryIntel:
    repo_name: str = ""
    file_count: int = 0
    languages: Dict[str, int] = field(default_factory=dict)
    primary_language: str = ""
    frameworks: List[str] = field(default_factory=list)
    dependencies: List[DependencyInfo] = field(default_factory=list)
    env_vars: List[str] = field(default_factory=list)
    routes: List[RouteInfo] = field(default_factory=list)
    functions: List[FunctionInfo] = field(default_factory=list)
    db_engines: List[str] = field(default_factory=list)
    integrations: List[str] = field(default_factory=list)
    inputs: List[InputSource] = field(default_factory=list)
    sinks: List[SinkInfo] = field(default_factory=list)
    auth_indicators: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "repo_name": self.repo_name,
            "file_count": self.file_count,
            "languages": self.languages,
            "primary_language": self.primary_language,
            "frameworks": self.frameworks,
            "dependencies": [
                {"name": d.name, "version": d.version, "file_path": d.file_path, "ecosystem": d.ecosystem}
                for d in self.dependencies
            ],
            "env_vars": self.env_vars,
            "routes": [
                {"endpoint": r.endpoint, "method": r.method, "file_path": r.file_path,
                 "line_number": r.line_number, "handler": r.handler, "auth_required": r.auth_required,
                 "framework": r.framework}
                for r in self.routes
            ],
            "db_engines": self.db_engines,
            "integrations": self.integrations,
            "auth_indicators": self.auth_indicators,
            "input_sources": [
                {"variable": i.variable, "file_path": i.file_path, "line_number": i.line_number, "kind": i.kind}
                for i in self.inputs
            ],
            "sinks": [
                {"kind": s.kind, "file_path": s.file_path, "line_number": s.line_number, "code": s.code}
                for s in self.sinks
            ],
        }


# ── Individual extractors ─────────────────────────────────────────────────

def detect_languages(file_tree: List[str]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for path in file_tree:
        ext = os.path.splitext(path)[1].lower()
        lang = LANGUAGE_BY_EXT.get(ext)
        if not lang and os.path.basename(path).lower() in {"dockerfile", "makefile"}:
            lang = "dockerfile" if os.path.basename(path).lower() == "dockerfile" else "makefile"
        if lang:
            counts[lang] = counts.get(lang, 0) + 1
    return counts


def primary_language(languages: Dict[str, int]) -> str:
    if not languages:
        return "Unknown"
    ranked = sorted(languages.items(), key=lambda kv: (-kv[1], LANG_PRIORITY.index(kv[0]) if kv[0] in LANG_PRIORITY else 99))
    return ranked[0][0].title()


def detect_technologies(file_tree: List[str], file_contents: Dict[str, str]) -> List[str]:
    all_content = " ".join(file_contents.values()).lower()
    all_paths = " ".join(file_tree).lower()
    combined = all_content + " " + all_paths
    detected = []
    for tech, patterns in FRAMEWORK_PATTERNS.items():
        if any(re.search(pat, combined, re.IGNORECASE) for pat in patterns):
            detected.append(tech)
    return detected


def parse_dependencies(file_contents: Dict[str, str]) -> List[DependencyInfo]:
    deps: List[DependencyInfo] = []
    for path, content in file_contents.items():
        name = os.path.basename(path)
        ecosystem = MANIFEST_FILES.get(name)
        if not ecosystem:
            continue
        if name == "requirements.txt":
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith(("#", "-e", "--")):
                    continue
                m = VERSION_PIN.match(line)
                if m:
                    deps.append(DependencyInfo(m.group(1).strip().lower(), m.group(3), path, ecosystem))
                else:
                    pkg = re.split(r"[<=>\s]", line)[0].strip().lower()
                    if pkg:
                        deps.append(DependencyInfo(pkg, None, path, ecosystem))
        elif name == "package.json":
            try:
                import json
                data = json.loads(content)
                for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
                    for pkg, ver in (data.get(section) or {}).items():
                        deps.append(DependencyInfo(str(pkg).lower(), str(ver), path, ecosystem))
            except Exception:
                continue
        elif name == "go.mod":
            for line in content.splitlines():
                line = line.strip()
                if line.startswith(("require ", "\t")):
                    m = re.match(r"^([\w\-./]+)\s+([v0-9][\w.+-]*)", line.replace("require ", "").strip())
                    if m:
                        deps.append(DependencyInfo(m.group(1).lower(), m.group(2), path, ecosystem))
        elif name == "Gemfile":
            for line in content.splitlines():
                m = re.search(r"gem\s+['\"]([^'\"]+)['\"](?:\s*,\s*['\"]([^'\"]+)['\"])?", line)
                if m:
                    deps.append(DependencyInfo(m.group(1).lower(), m.group(2), path, ecosystem))
    return deps


def _py_routes(lines: List[str], file_path: str) -> List[RouteInfo]:
    """Flask/FastAPI style @decorator routes."""
    routes: List[RouteInfo] = []
    for i, line in enumerate(lines, start=1):
        m = re.search(r"@(\w+\.)?(?:app|bp|router|blueprint|api)\.(route|get|post|put|delete|patch|options|head)\s*\(\s*['\"]([^'\"]+)['\"]", line)
        if not m:
            continue
        method = "ANY" if m.group(2) == "route" else m.group(2).upper()
        endpoint = m.group(3)
        framework = "Flask" if m.group(2) == "route" else "FastAPI"
        handler = ""
        # Look for the function definition a few lines below.
        for j in range(i, min(i + 6, len(lines) + 1)):
            hm = re.search(r"(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", lines[j - 1])
            if hm:
                handler = hm.group(1)
                break
        # Auth: decorators stacked above this line.
        auth_required = _looks_authenticated(lines[max(0, i - 6):i])
        routes.append(RouteInfo(endpoint, method, file_path, i, handler, auth_required, framework))
    return routes


def _express_routes(lines: List[str], file_path: str) -> List[RouteInfo]:
    routes: List[RouteInfo] = []
    for i, line in enumerate(lines, start=1):
        m = re.search(r"(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['\"]([^'\"]+)['\"]", line)
        if not m:
            continue
        method = "ANY" if m.group(1) == "use" else m.group(1).upper()
        endpoint = m.group(2)
        context = "\n".join(lines[max(0, i - 2):i + 2])
        auth_required = bool(re.search(r"(auth|jwt|verifyToken|requireAuth|passport|Bearer)", context, re.IGNORECASE))
        routes.append(RouteInfo(endpoint, method, file_path, i, "", auth_required, "Express"))
    return routes


def _looks_authenticated(decorator_lines: List[str]) -> bool:
    block = "\n".join(decorator_lines)
    for dec in AUTH_DECORATORS:
        if dec in block:
            return True
    for dep in AUTH_DEPENDENCIES:
        if dep in block:
            return True
    if re.search(r"@\w+\.(?:jwt|auth|require)", block):
        return True
    return False


def extract_routes(file_contents: Dict[str, str]) -> List[RouteInfo]:
    routes: List[RouteInfo] = []
    for path, content in file_contents.items():
        lines = content.splitlines()
        routes.extend(_py_routes(lines, path))
        routes.extend(_express_routes(lines, path))
    return routes


def extract_functions(file_contents: Dict[str, str]) -> List[FunctionInfo]:
    funcs: List[FunctionInfo] = []
    for path, content in file_contents.items():
        for i, line in enumerate(content.splitlines(), start=1):
            m = re.search(r"(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", line)
            if m:
                funcs.append(FunctionInfo(m.group(1), path, i))
    return funcs


def extract_db_engines(content: str) -> List[str]:
    engines: List[str] = []
    for pattern, name in DB_ENGINE_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE) and name not in engines:
            engines.append(name)
    return engines


def extract_integrations(content: str) -> List[str]:
    integrations: List[str] = []
    for pattern, name in INTEGRATION_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE) and name not in integrations:
            integrations.append(name)
    return integrations


def extract_env_vars(content: str) -> List[str]:
    vars_: List[str] = []
    for pattern in ENV_VAR_PATTERNS:
        for m in re.finditer(pattern, content, re.IGNORECASE):
            var = m.group(1) if m.lastindex else m.group(0)
            if var and var not in vars_:
                vars_.append(var)
    return vars_


def extract_inputs(file_contents: Dict[str, str]) -> List[InputSource]:
    inputs: List[InputSource] = []
    for path, content in file_contents.items():
        for i, line in enumerate(content.splitlines(), start=1):
            for pattern, kind in INPUT_PATTERNS:
                for m in re.finditer(pattern, line):
                    var = m.group(1)
                    inputs.append(InputSource(var, path, i, kind))
    return inputs


def extract_sinks(file_contents: Dict[str, str]) -> List[SinkInfo]:
    sinks: List[SinkInfo] = []
    for path, content in file_contents.items():
        for i, line in enumerate(content.splitlines(), start=1):
            for kind, pattern in SINK_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    sinks.append(SinkInfo(kind, path, i, line.strip()[:160]))
    return sinks


def auth_indicators(content: str) -> List[str]:
    found = [kw for kw in AUTH_KEYWORDS if re.search(rf"\b{kw}\b", content, re.IGNORECASE)]
    return found


# ── Public API ──────────────────────────────────────────────────────────────

def analyze_repository(
    file_tree: List[str],
    file_contents: Dict[str, str],
    repo_name: str = "",
) -> RepositoryIntel:
    """Deterministically build the full repository intelligence object."""
    all_content = "\n".join(file_contents.values())

    languages = detect_languages(file_tree)
    intel = RepositoryIntel(
        repo_name=repo_name,
        file_count=len(file_tree),
        languages=languages,
        primary_language=primary_language(languages),
        frameworks=detect_technologies(file_tree, file_contents),
        dependencies=parse_dependencies(file_contents),
        env_vars=extract_env_vars(all_content),
        routes=extract_routes(file_contents),
        functions=extract_functions(file_contents),
        db_engines=extract_db_engines(all_content),
        integrations=extract_integrations(all_content),
        inputs=extract_inputs(file_contents),
        sinks=extract_sinks(file_contents),
        auth_indicators=auth_indicators(all_content),
    )
    return intel


def snippet_window(
    file_contents: Dict[str, str],
    file_path: str,
    line: Optional[int],
    span: int = 6,
) -> str:
    """Return a small window of code around a line (for evidence)."""
    content = file_contents.get(file_path)
    if content is None or line is None:
        return ""
    lines = content.splitlines()
    start = max(0, line - 1 - span)
    end = min(len(lines), line + span)
    return "\n".join(lines[start:end])
