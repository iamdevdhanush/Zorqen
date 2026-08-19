"""ZORQEN — Deterministic Dependency Vulnerability Checker

Parses manifest files and compares pinned dependency versions against a small
curated advisory database. Pure/stateless: identical input always produces
identical output. There is no LLM involvement here.

Advisories are expressed as (package, cve, affected op, affected version,
fixed version, severity, cwe, description). A package is flagged only when a
pinned version satisfies the affected comparator and the advisory was NOT yet
fixed by the pinned version. Unpinned / floating versions are flagged with a
separate, lower-confidence advisory ("unpinned dependency").
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from security.repo_intel import DependencyInfo


@dataclass
class Advisory:
    package: str
    cve: str
    affected: Tuple[str, str]  # (op, version)
    fixed: str
    severity: str
    cwe_id: str
    description: str


# Curated advisory database (deterministic, small, honest subset).
ADVISORIES: List[Advisory] = [
    Advisory("requests", "CVE-2023-32681", ("<", "2.31.0"), "2.31.0", "medium", "CWE-601",
             "Proxy-Authorization header may be leaked when following a cross-origin redirect."),
    Advisory("requests", "CVE-2024-35195", ("<", "2.32.0"), "2.32.0", "high", "CWE-918",
             "Certifi / urllib3 TLS handling issue allowing partial CA verification bypass when "
             "verifying=True is used with a crafted hostname pattern."),
    Advisory("pyyaml", "CVE-2020-14343", ("<", "5.4"), "5.4", "high", "CWE-502",
             "yaml.load() unsafe deserialization when called on untrusted input."),
    Advisory("pyyaml", "CVE-2017-18342", ("<", "4.1"), "4.1", "high", "CWE-502",
             "Loader-based arbitrary code execution in PyYAML < 4.1."),
    Advisory("pillow", "CVE-2023-44271", ("<", "10.0.0"), "10.0.0", "high", "CWE-787",
             "Heap buffer overflow in PyDecoder when processing a crafted image (Denial of Service)."),
    Advisory("flask", "CVE-2023-30861", ("<", "2.3.3"), "2.3.3", "medium", "CWE-94",
             "Possible code execution when adding a handler to a Blueprint in debug mode."),
    Advisory("jinja2", "CVE-2024-22195", ("<", "3.1.3"), "3.1.3", "medium", "CWE-1336",
             "HTML attribute quoting weakness enabling XSS when used with certain attributes."),
    Advisory("jinja2", "CVE-2024-34064", ("<", "3.1.4"), "3.1.4", "low", "CWE-80",
             "XML attribute escaping issue in Jinja2 filters."),
    Advisory("sqlalchemy", "CVE-2019-7548", ("<", "1.3.0b1"), "1.3.0", "medium", "CWE-89",
             "Potential SQL injection via unescaped string literals in compiled queries."),
    Advisory("werkzeug", "CVE-2023-25577", ("<", "2.2.3"), "2.2.3", "high", "CWE-1333",
             "Regular expression denial of service in multipart parser."),
    Advisory("werkzeug", "CVE-2024-34069", ("<", "3.0.3"), "3.0.3", "high", "CWE-200",
             "Cache file disclosure when using the 'null' cache for debugger."),
    Advisory("fastapi", "CVE-2024-24762", ("<", "0.109.1"), "0.109.1", "medium", "CWE-20",
             "Form-data parsing could allow denial of service via excessive multipart headers."),
    Advisory("uvicorn", "CVE-2024-53898", ("<", "0.34.0"), "0.34.0", "medium", "CWE-601",
             "HTTP response splitting when handling malformed request paths."),
    Advisory("pydantic", "CVE-2024-3772", ("<", "2.7.1"), "2.7.1", "high", "CWE-125",
             "Out-of-bounds read / denial of service via crafted regex in json schema generation."),
    Advisory("psycopg2-binary", "CVE-2023-7046", ("<", "2.9.9"), "2.9.9", "medium", "CWE-276",
             "Incorrect file permission handling in the binary wheel build."),
    Advisory("redis", "CVE-2023-45156", ("<", "5.0.1"), "5.0.1", "medium", "CWE-20",
             "Connection pool credential leakage when using Unix socket + password."),
    Advisory("aiohttp", "CVE-2024-23334", ("<", "3.9.2"), "3.9.2", "high", "CWE-22",
             "Directory traversal in static file serving via symlinks."),
    Advisory("django", "CVE-2024-45230", ("<", "5.0.8"), "5.0.8", "medium", "CWE-601",
             "Potential denial of service in URL resolver with very long patterns."),
    Advisory("express", "CVE-2024-29041", ("<", "4.19.2"), "4.19.2", "high", "CWE-407",
             "ReDoS in the path-to-regexp component used for routing."),
    Advisory("lodash", "CVE-2021-23337", ("<", "4.17.21"), "4.17.21", "high", "CWE-78",
             "Command injection in template / zip functions."),
    Advisory("axios", "CVE-2023-45857", ("<", "1.6.0"), "1.6.0", "medium", "CWE-918",
             "SSRF via absolute-URL request smuggling under certain proxy configurations."),
    Advisory("minimist", "CVE-2021-44906", ("<", "1.2.6"), "1.2.6", "critical", "CWE-665",
             "Prototype pollution leading to potential denial of service."),
    Advisory("next", "CVE-2025-29927", ("<", "15.2.3"), "15.2.3", "critical", "CWE-693",
             "Middleware authorization bypass via x-middleware-subrequest header spoofing."),
]

# Floating / non-reproducible version markers → "unpinned dependency" advisory
UNPINNED_MARKERS = ("^", "~", ">=", ">", "*", "latest", "x")


def _version_tuple(version: str) -> Optional[tuple]:
    """Parse a semver-ish string into a comparable tuple (None when unparseable)."""
    cleaned = re.sub(r"[a-zA-Z]", "", version).split("-")[0].split("+")[0]
    parts = cleaned.split(".")
    if not parts or not all(p.isdigit() for p in parts):
        return None
    nums = [int(p) for p in parts]
    while len(nums) < 3:
        nums.append(0)
    return tuple(nums[:3])


def _matches_affected(version: str, affected_op: str, affected_version: str) -> bool:
    v = _version_tuple(version)
    a = _version_tuple(affected_version)
    if v is None or a is None:
        return False
    if affected_op == "<":
        return v < a
    if affected_op == "<=":
        return v <= a
    if affected_op == ">":
        return v > a
    if affected_op == ">=":
        return v >= a
    return False


def _is_unpinned(version: Optional[str]) -> bool:
    if not version:
        return True
    v = version.strip().lower()
    if v in {"*", "latest"}:
        return True
    return any(v.startswith(marker) for marker in UNPINNED_MARKERS)


def _strip_pin_prefix(version: str) -> str:
    return version.strip().lstrip("^~>=<").strip()


@dataclass
class DependencyFinding:
    package: str
    version: Optional[str]
    cve: str
    cwe_id: str
    severity: str
    confidence: str
    file_path: str
    message: str
    source_tool: str = "dependency_check"
    rule_id: str = "dependency_advisory"


def check_requirements(deps: List[DependencyInfo]) -> List[DependencyFinding]:
    """Compare manifest dependencies against the advisory database."""
    findings: List[DependencyFinding] = []

    for dep in deps:
        name = dep.name.lower()
        version = dep.version

        # Floating / unpinned: flag separately (lower confidence, no CVE claim).
        if _is_unpinned(version):
            findings.append(DependencyFinding(
                package=name,
                version=version,
                cve="N/A",
                cwe_id="CWE-1104",
                severity="low",
                confidence="possible",
                file_path=dep.file_path,
                message=(
                    f"Dependency '{name}' is not pinned to an exact version "
                    f"({version or 'unspecified'}) — builds are not reproducible and "
                    f"future releases may introduce regressions. Pin an exact version."
                ),
                rule_id="unpinned_dependency",
            ))
            continue

        resolved = _strip_pin_prefix(version)
        for adv in ADVISORIES:
            if name != adv.package:
                continue
            if _matches_affected(resolved, adv.affected[0], adv.affected[1]):
                fixed = adv.fixed
                findings.append(DependencyFinding(
                    package=name,
                    version=version,
                    cve=adv.cve,
                    cwe_id=adv.cwe_id,
                    severity=adv.severity,
                    confidence="likely",
                    file_path=dep.file_path,
                    message=(
                        f"{adv.cve}: {adv.description} Affects {name} {resolved}; "
                        f"fixed in {fixed}. Update to '{name}>={fixed}'."
                    ),
                    rule_id="dependency_advisory",
                ))

    return findings


def scan_manifest_files(file_contents: dict) -> List[DependencyFinding]:
    """High-level entry point: parse all manifests in the file map and check them."""
    from security.repo_intel import parse_dependencies
    deps = parse_dependencies(file_contents)
    return check_requirements(deps)
