"""RAKSHA — Architecture Analyst Agent
Identifies application components from repo structure and source code.
"""
from __future__ import annotations

import re
from typing import Dict, List, Any, Optional
from agents.llm_client import LLM_EXTERNAL_ERRORS, llm


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

AUTH_INDICATORS = [
    "jwt", "oauth", "auth0", "passport", "login", "session", "bearer",
    "authenticate", "authorization", "permission", "role", "rbac",
]

SENSITIVE_INDICATORS = {
    "file_upload": ["multer", "upload", "file_save", "werkzeug.datastructures", "UploadFile"],
    "payment": ["stripe", "paypal", "braintree", "payment", "card_number"],
    "email": ["smtp", "sendgrid", "mailgun", "nodemailer", "smtplib"],
    "external_http": ["requests.get", "axios", "httpx", "fetch(", "urllib"],
    "command_exec": ["subprocess", "os.system", "child_process", "exec("],
}


def detect_frameworks(file_tree: List[str], file_contents: Dict[str, str]) -> Dict[str, List[str]]:
    """Return dict of category -> list of detected technologies."""
    all_content = " ".join(file_contents.values()).lower()
    all_paths = " ".join(file_tree).lower()
    combined = all_content + " " + all_paths

    detected = {}
    for tech, patterns in FRAMEWORK_PATTERNS.items():
        if any(re.search(pat, combined, re.IGNORECASE) for pat in patterns):
            detected[tech] = patterns  # just record detection

    return detected


def build_architecture_map(
    file_tree: List[str],
    file_contents: Dict[str, str],
    detected_techs: List[str],
) -> Dict[str, Any]:
    """Build a structured architecture map."""
    content_lower = " ".join(file_contents.values()).lower()
    paths_lower = " ".join(file_tree).lower()

    # Sensitive flows
    sensitive_flows = {}
    for flow, keywords in SENSITIVE_INDICATORS.items():
        if any(kw.lower() in content_lower for kw in keywords):
            sensitive_flows[flow] = True

    # Auth
    has_auth = any(kw in content_lower for kw in AUTH_INDICATORS)

    # CI/CD
    has_cicd = ".github/workflows" in paths_lower or "gitlab-ci" in paths_lower or "jenkinsfile" in paths_lower.lower()
    has_docker = "dockerfile" in paths_lower or "docker-compose" in paths_lower

    # Build the tree
    frontend = [t for t in detected_techs if t in ["React", "Vue", "Angular", "Svelte", "Next.js"]]
    backend = [t for t in detected_techs if t in ["FastAPI", "Flask", "Django", "Express", "NestJS", "Spring Boot", "Rails"]]
    databases = [t for t in detected_techs if t in ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite"]]
    infra = [t for t in detected_techs if t in ["Docker", "Kubernetes", "AWS", "GitHub Actions", "Nginx"]]

    return {
        "layers": {
            "frontend": frontend or ["Unknown"],
            "backend": backend or ["Unknown"],
            "database": databases or [],
            "infrastructure": infra or [],
        },
        "features": {
            "authentication": has_auth,
            "file_upload": sensitive_flows.get("file_upload", False),
            "payment_processing": sensitive_flows.get("payment", False),
            "email": sensitive_flows.get("email", False),
            "external_http": sensitive_flows.get("external_http", False),
            "command_execution": sensitive_flows.get("command_exec", False),
            "cicd": has_cicd,
            "containerized": has_docker,
        },
        "technologies": detected_techs,
        "risk_surface": _calculate_risk_surface(sensitive_flows, has_auth, detected_techs),
    }


def _calculate_risk_surface(sensitive_flows: dict, has_auth: bool, techs: List[str]) -> List[str]:
    surfaces = []
    if sensitive_flows.get("file_upload"):
        surfaces.append("File Upload (potential path traversal / malicious file execution)")
    if sensitive_flows.get("payment"):
        surfaces.append("Payment Processing (PCI-DSS scope)")
    if sensitive_flows.get("command_exec"):
        surfaces.append("Command Execution (potential command injection)")
    if sensitive_flows.get("external_http"):
        surfaces.append("Outbound HTTP (potential SSRF)")
    if not has_auth:
        surfaces.append("No authentication layer detected")
    return surfaces


async def analyze_architecture(
    file_tree: List[str],
    file_contents: Dict[str, str],
    repo_name: str,
) -> Dict[str, Any]:
    """Full architecture analysis — deterministic + LLM enrichment."""
    detected = detect_frameworks(file_tree, file_contents)
    tech_list = list(detected.keys())
    arch_map = build_architecture_map(file_tree, file_contents, tech_list)

    # LLM enrichment for summary
    try:
        sample_files = list(file_contents.items())[:10]
        file_summary = "\n".join(f"- {path}" for path, _ in sample_files)

        result = await llm.complete_json(
            system_prompt=(
                "You are a software architecture analyst. "
                "Analyze the repository structure and return a JSON object with keys: "
                "'summary' (2-3 sentence description of what this application does), "
                "'primary_language' (main programming language), "
                "'security_notes' (list of 2-3 security-relevant architectural observations). "
                "Be concise and technical."
            ),
            user_prompt=(
                f"Repository: {repo_name}\n"
                f"Detected technologies: {', '.join(tech_list)}\n"
                f"Key files:\n{file_summary}\n"
                f"Architecture layers: {arch_map['layers']}"
            ),
            max_tokens=512,
        )
        arch_map["ai_summary"] = result.get("summary", "")
        arch_map["primary_language"] = result.get("primary_language", "")
        arch_map["security_notes"] = result.get("security_notes", [])
    except LLM_EXTERNAL_ERRORS:
        arch_map["ai_summary"] = f"Repository using: {', '.join(tech_list) or 'unknown stack'}"
        arch_map["primary_language"] = tech_list[0] if tech_list else "Unknown"
        arch_map["security_notes"] = []

    return arch_map
