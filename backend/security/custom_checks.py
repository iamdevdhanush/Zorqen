"""RAKSHA — Custom Deterministic Security Checks
Stateless, regex/AST-free checks on raw source content.
Covers vulnerability classes that Semgrep may miss or where custom logic adds value.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CustomFinding:
    check_name: str
    vulnerability_type: str
    severity: str
    confidence: str
    cwe_id: str
    owasp_category: str
    file_path: str
    line_number: int
    code_snippet: str
    description: str
    source_tool: str = "custom"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _line_findings(lines: List[str], file_path: str, pattern: str, flags: int,
                   check_name: str, vtype: str, severity: str, confidence: str,
                   cwe_id: str, owasp: str, description: str) -> List[CustomFinding]:
    results = []
    for i, line in enumerate(lines, start=1):
        if re.search(pattern, line, flags):
            results.append(CustomFinding(
                check_name=check_name,
                vulnerability_type=vtype,
                severity=severity,
                confidence=confidence,
                cwe_id=cwe_id,
                owasp_category=owasp,
                file_path=file_path,
                line_number=i,
                code_snippet=line.strip()[:300],
                description=description,
            ))
    return results


# ---------------------------------------------------------------------------
# Individual Checks
# ---------------------------------------------------------------------------

def check_cors_wildcard(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect overly permissive CORS: Access-Control-Allow-Origin: *"""
    patterns = [
        r"Access-Control-Allow-Origin['\"]?\s*[,:]?\s*['\"]?\*",
        r"allow_origins\s*=\s*\[?\s*['\"]?\*['\"]?",
        r"CORS\s*\([^)]*origins\s*=\s*\[?\s*['\"]?\*",
    ]
    results = []
    for pat in patterns:
        results.extend(_line_findings(
            lines, file_path, pat, re.IGNORECASE,
            "cors_wildcard", "Overly Permissive CORS", "medium", "likely",
            "CWE-942", "A05:2021", "CORS wildcard allows any origin to make cross-origin requests."
        ))
    return results


def check_missing_auth_decorator(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect Flask/FastAPI routes missing authentication decorators."""
    if not file_path.endswith(".py"):
        return []
    results = []
    # Routes without login_required or Depends(get_current_user)
    route_pattern = r'@(app|router|blueprint)\.(get|post|put|delete|patch)\s*\(['
    for i, line in enumerate(lines, start=1):
        if re.search(route_pattern, line, re.IGNORECASE):
            # Check surrounding 5 lines for auth indicators
            context = "\n".join(lines[max(0, i-1):min(len(lines), i+5)])
            if not re.search(r"login_required|get_current_user|require_auth|@jwt_required|oauth_required|Depends\(", context, re.IGNORECASE):
                results.append(CustomFinding(
                    check_name="missing_auth_decorator",
                    vulnerability_type="Missing Authentication",
                    severity="medium",
                    confidence="possible",
                    cwe_id="CWE-306",
                    owasp_category="A01:2021",
                    file_path=file_path,
                    line_number=i,
                    code_snippet=line.strip()[:300],
                    description="Route definition does not appear to require authentication.",
                ))
    return results


def check_sql_string_formatting(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect string-formatted SQL queries (potential SQL injection)."""
    if not file_path.endswith(".py"):
        return []
    results = []
    patterns = [
        r'(execute|query)\s*\(\s*[f"\'].*%s',                    # % formatting
        r'(execute|query)\s*\(\s*f["\'].*\{',                    # f-string in SQL
        r'(execute|query)\s*\(\s*["\'].*\+\s*\w',               # string concat
        r'cursor\.execute\s*\(\s*["\'][^"\']*"\s*\+',
        r'\.format\s*\([^)]+\)[^#\n]*#?\s*(sql|query)',
    ]
    for pat in patterns:
        results.extend(_line_findings(
            lines, file_path, pat, re.IGNORECASE,
            "sql_string_formatting", "SQL Injection", "critical", "likely",
            "CWE-89", "A03:2021",
            "User-controlled data may be interpolated into a SQL query string."
        ))
    return results


def check_command_injection(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect shell=True or os.system with potential user input."""
    results = []
    if file_path.endswith(".py"):
        patterns = [
            r'os\.system\s*\(',
            r'subprocess\.(call|run|Popen|check_output)\s*\([^)]*shell\s*=\s*True',
            r'eval\s*\(\s*(request|input|data)',
            r'exec\s*\(\s*(request|input|data)',
        ]
        for pat in patterns:
            results.extend(_line_findings(
                lines, file_path, pat, re.IGNORECASE,
                "command_injection", "Command Injection", "critical", "likely",
                "CWE-78", "A03:2021",
                "Potential command injection via shell execution or eval with user-controlled input."
            ))
    if file_path.endswith((".js", ".ts")):
        patterns = [
            r'child_process\.(exec|execSync|spawn)\s*\(',
            r'eval\s*\(\s*(req\.|request\.|input)',
        ]
        for pat in patterns:
            results.extend(_line_findings(
                lines, file_path, pat, re.IGNORECASE,
                "command_injection", "Command Injection", "critical", "likely",
                "CWE-78", "A03:2021",
                "Potential command injection via child_process or eval."
            ))
    return results


def check_insecure_deserialization(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect unsafe pickle/yaml.load/marshal usage."""
    results = []
    if file_path.endswith(".py"):
        patterns = [
            (r'pickle\.loads?\s*\(', "Insecure Deserialization (pickle)", "CWE-502"),
            (r'yaml\.load\s*\([^,)]+\)', "Insecure Deserialization (yaml.load)", "CWE-502"),
            (r'marshal\.loads?\s*\(', "Insecure Deserialization (marshal)", "CWE-502"),
            (r'jsonpickle\.decode\s*\(', "Insecure Deserialization (jsonpickle)", "CWE-502"),
        ]
        for pat, vtype, cwe in patterns:
            results.extend(_line_findings(
                lines, file_path, pat, re.IGNORECASE,
                "insecure_deserialization", vtype, "high", "likely",
                cwe, "A08:2021",
                f"Unsafe deserialization detected: {vtype}."
            ))
    return results


def check_path_traversal(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect potential path traversal."""
    results = []
    if file_path.endswith(".py"):
        patterns = [
            r'open\s*\(\s*(request\.|req\.|args\[|form\[|data\[)',
            r'os\.path\.(join|abspath)\s*\(\s*(request\.|req\.)',
            r'send_file\s*\(\s*(request\.|req\.|args\[)',
        ]
        for pat in patterns:
            results.extend(_line_findings(
                lines, file_path, pat, re.IGNORECASE,
                "path_traversal", "Path Traversal", "high", "likely",
                "CWE-22", "A01:2021",
                "User-controlled input used in file path operations without sanitization."
            ))
    return results


def check_insecure_random(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect use of non-cryptographic random for security-sensitive operations."""
    results = []
    if file_path.endswith(".py"):
        security_contexts = re.search(r"(token|password|secret|salt|nonce|csrf|session|key)", content, re.IGNORECASE)
        if security_contexts:
            patterns = [
                r'\brandom\.(random|randint|choice|randrange|shuffle)\b',
                r'import random\b',
            ]
            for pat in patterns:
                results.extend(_line_findings(
                    lines, file_path, pat, re.IGNORECASE,
                    "insecure_random", "Insecure Cryptography", "medium", "possible",
                    "CWE-338", "A02:2021",
                    "Non-cryptographic random used in file with security-sensitive context."
                ))
    return results


def check_missing_security_headers(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Detect web frameworks missing security header middleware."""
    results = []
    if file_path.endswith(".py") and ("flask" in content.lower() or "fastapi" in content.lower() or "django" in content.lower()):
        if not re.search(r"(X-Frame-Options|Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options)", content, re.IGNORECASE):
            results.append(CustomFinding(
                check_name="missing_security_headers",
                vulnerability_type="Missing Security Headers",
                severity="medium",
                confidence="possible",
                cwe_id="CWE-693",
                owasp_category="A05:2021",
                file_path=file_path,
                line_number=1,
                code_snippet=lines[0].strip()[:200] if lines else "",
                description="Web framework file does not appear to set common security headers (X-Frame-Options, CSP, HSTS).",
            ))
    return results


def check_hardcoded_ips(content: str, file_path: str, lines: List[str]) -> List[CustomFinding]:
    """Flag hardcoded non-loopback IP addresses in config/source."""
    results = []
    ip_pattern = re.compile(r'\b(?!127\.0\.0\.1|0\.0\.0\.0|localhost)(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b')
    for i, line in enumerate(lines, start=1):
        if ip_pattern.search(line) and not line.strip().startswith("#"):
            results.append(CustomFinding(
                check_name="hardcoded_ip",
                vulnerability_type="Hardcoded IP Address",
                severity="low",
                confidence="likely",
                cwe_id="CWE-798",
                owasp_category="A05:2021",
                file_path=file_path,
                line_number=i,
                code_snippet=line.strip()[:300],
                description="Hardcoded IP address detected — use environment variables for infrastructure configuration.",
            ))
    return results


# ---------------------------------------------------------------------------
# Main Scanner
# ---------------------------------------------------------------------------

ALL_CHECKS = [
    check_cors_wildcard,
    check_sql_string_formatting,
    check_command_injection,
    check_insecure_deserialization,
    check_path_traversal,
    check_insecure_random,
    check_missing_security_headers,
    check_hardcoded_ips,
    check_missing_auth_decorator,
]


def scan_file(file_path: str, content: str) -> List[CustomFinding]:
    lines = content.splitlines()
    results = []
    for check in ALL_CHECKS:
        try:
            results.extend(check(content, file_path, lines))
        except Exception:
            pass  # Don't let a failing check crash the whole scan
    return results


def scan_files(files: dict[str, str]) -> List[CustomFinding]:
    all_results = []
    for path, content in files.items():
        all_results.extend(scan_file(path, content))
    return all_results
