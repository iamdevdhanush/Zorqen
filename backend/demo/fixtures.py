"""RAKSHA — Demo Mode Fixtures
Pre-loaded vulnerable application and assessment data for hackathon judges.
This simulates the complete workflow without requiring GitHub credentials or Docker.
"""
from __future__ import annotations

from datetime import datetime, timezone

# ══════════════════════════════════════════════════════════════════════════════
# DEMO VULNERABLE APPLICATION SOURCE FILES
# A Python Flask + SQLite app with intentional vulnerabilities
# ══════════════════════════════════════════════════════════════════════════════

DEMO_FILE_TREE = [
    "app.py",
    "models.py",
    "routes/users.py",
    "routes/admin.py",
    "routes/upload.py",
    "utils/auth.py",
    "utils/db.py",
    "config.py",
    "requirements.txt",
    ".env",
    "Dockerfile",
    "docker-compose.yml",
    "templates/index.html",
    "templates/user.html",
    "static/app.js",
    "README.md",
]

DEMO_FILE_CONTENTS = {
    "app.py": """\
from flask import Flask
from flask_cors import CORS
from routes.users import users_bp
from routes.admin import admin_bp
from routes.upload import upload_bp

app = Flask(__name__)
CORS(app, origins="*")  # Overly permissive CORS

app.secret_key = "super_secret_key_12345"  # Hardcoded secret

app.register_blueprint(users_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(upload_bp)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
""",

    "routes/users.py": """\
import sqlite3
from flask import Blueprint, request, jsonify

users_bp = Blueprint("users", __name__)

def get_db():
    conn = sqlite3.connect("app.db")
    return conn

@users_bp.route("/api/users/search")
def search_users():
    query = request.args.get("q", "")
    conn = get_db()
    cursor = conn.cursor()
    # VULNERABILITY: SQL Injection — user input directly interpolated into query
    sql = f"SELECT id, username, email FROM users WHERE username LIKE '%{query}%'"
    cursor.execute(sql)
    results = cursor.fetchall()
    return jsonify([{"id": r[0], "username": r[1], "email": r[2]} for r in results])

@users_bp.route("/api/users/<int:user_id>/profile")
def get_user_profile(user_id):
    # VULNERABILITY: IDOR — no check that the authenticated user owns this profile
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"id": user[0], "username": user[1], "email": user[2], "password_hash": user[3]})
""",

    "routes/admin.py": """\
import os
from flask import Blueprint, request, jsonify

admin_bp = Blueprint("admin", __name__)

# VULNERABILITY: No authentication on admin endpoint
@admin_bp.route("/api/admin/users", methods=["GET"])
def list_all_users():
    \"\"\"Admin endpoint — lists all users. MISSING authentication check.\"\"\"
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role FROM users")
    users = cursor.fetchall()
    return jsonify([{"id": u[0], "username": u[1], "email": u[2], "role": u[3]} for u in users])

@admin_bp.route("/api/admin/exec", methods=["POST"])
def exec_command():
    \"\"\"Admin diagnostic endpoint.\"\"\"
    # VULNERABILITY: Command Injection via os.system with user input
    cmd = request.json.get("command", "")
    result = os.system(cmd)
    return jsonify({"result": result})
""",

    "routes/upload.py": """\
import os
from flask import Blueprint, request, jsonify

upload_bp = Blueprint("upload", __name__)

UPLOAD_DIR = "/tmp/uploads"

@upload_bp.route("/api/upload", methods=["POST"])
def upload_file():
    \"\"\"File upload endpoint.\"\"\"
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    filename = file.filename  # VULNERABILITY: Path traversal — no sanitization of filename
    
    # No extension validation — allows .php, .py, .sh upload
    save_path = os.path.join(UPLOAD_DIR, filename)
    file.save(save_path)
    
    return jsonify({"status": "uploaded", "path": save_path})
""",

    "utils/auth.py": """\
import random
import hashlib
from datetime import datetime

# VULNERABILITY: Insecure random for token generation
def generate_session_token():
    \"\"\"Generate a session token.\"\"\"
    seed = random.randint(0, 1000000)  # Predictable seed
    return hashlib.md5(str(seed).encode()).hexdigest()

def check_password(password, stored_hash):
    \"\"\"Insecure MD5 password hashing.\"\"\"
    # VULNERABILITY: MD5 is not suitable for password hashing
    return hashlib.md5(password.encode()).hexdigest() == stored_hash
""",

    "config.py": """\
# Application Configuration
DATABASE_URL = "sqlite:///app.db"
SECRET_KEY = "my-hardcoded-flask-secret-key"

# VULNERABILITY: Hardcoded credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
DATABASE_PASSWORD = "db_pass_12345"

# AWS credentials (NEVER hardcode these)
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

DEBUG = True
ALLOWED_HOSTS = ["*"]
""",

    ".env": """\
SECRET_KEY=prod-secret-key-abc123-do-not-share
DATABASE_URL=postgres://admin:P@ssw0rd123@db.internal:5432/appdb
STRIPE_SECRET_KEY=sk_live_51AbcDefGhijklMnopQrsTUVwxyZ
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_URL=redis://:r3d1s_p@ss@redis.internal:6379
""",

    "requirements.txt": """\
Flask==2.1.0
flask-cors==3.0.10
requests==2.25.0
Pillow==9.0.0
PyYAML==5.3.1
SQLAlchemy==1.3.0
Jinja2==2.11.3
""",

    "Dockerfile": """\
FROM python:3.9
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

# VULNERABILITY: Running as root
USER root

# VULNERABILITY: Exposing all ports
EXPOSE 0-65535

CMD ["python", "app.py"]
""",
}

# ══════════════════════════════════════════════════════════════════════════════
# PRE-COMPUTED DEMO ASSESSMENT DATA
# Realistic findings with full AI reasoning already populated
# ══════════════════════════════════════════════════════════════════════════════

DEMO_REPOSITORY = {
    "id": "demo-repo-001",
    "full_name": "acme-corp/defence-portal",
    "owner": "acme-corp",
    "name": "defence-portal",
    "description": "Internal defence management portal (DEMO — intentionally vulnerable)",
    "language": "Python",
    "default_branch": "main",
    "is_demo": True,
    "html_url": "https://github.com/acme-corp/defence-portal",
    "stars": 12,
    "topics": ["flask", "sqlite", "internal"],
}

DEMO_ASSESSMENT = {
    "id": "demo-assessment-001",
    "repository_id": "demo-repo-001",
    "branch": "main",
    "commit_sha": "a4f2c91b8e3d7f0c2a1b5e8d3c6f9a2b4e7d0c1a",
    "status": "completed",
    "security_score": 38.0,
    "critical_count": 3,
    "high_count": 2,
    "medium_count": 3,
    "low_count": 2,
    "secrets_count": 5,
    "dependency_count": 4,
    "is_demo": True,
    "architecture_map": {
        "layers": {
            "frontend": ["Jinja2 Templates"],
            "backend": ["Flask"],
            "database": ["SQLite"],
            "infrastructure": ["Docker"],
        },
        "features": {
            "authentication": True,
            "file_upload": True,
            "payment_processing": False,
            "email": False,
            "external_http": False,
            "command_execution": True,
            "cicd": False,
            "containerized": True,
        },
        "technologies": ["Flask", "SQLite", "Docker"],
        "ai_summary": "A Python Flask web application providing a defence management portal with user management, file upload, and admin functionality. Uses SQLite for data storage and runs in Docker.",
        "primary_language": "Python",
        "security_notes": [
            "Application runs as root in Docker container — privilege escalation risk",
            "Admin endpoints lack authentication middleware",
            "Direct SQL string formatting detected in user-facing search endpoint",
        ],
        "risk_surface": [
            "File Upload (potential path traversal / malicious file execution)",
            "Command Execution (potential command injection)",
        ],
    },
    "timeline": [
        {"step": "repository_connected", "status": "completed", "timestamp": "2026-08-09T15:00:00Z"},
        {"step": "repository_indexed", "status": "completed", "timestamp": "2026-08-09T15:00:05Z"},
        {"step": "architecture_generated", "status": "completed", "timestamp": "2026-08-09T15:00:15Z"},
        {"step": "security_scan", "status": "completed", "timestamp": "2026-08-09T15:00:45Z"},
        {"step": "ai_reasoning", "status": "completed", "timestamp": "2026-08-09T15:01:20Z"},
        {"step": "completed", "status": "completed", "timestamp": "2026-08-09T15:01:25Z"},
    ],
}

DEMO_FINDINGS = [
    {
        "id": "finding-001",
        "assessment_id": "demo-assessment-001",
        "title": "SQL Injection",
        "vulnerability_type": "SQL Injection",
        "severity": "critical",
        "confidence": "confirmed",
        "confidence_pct": 97,
        "status": "open",
        "cwe_id": "CWE-89",
        "cwe_name": "SQL Injection",
        "owasp_category": "A03:2021",
        "file_path": "routes/users.py",
        "line_number": 14,
        "code_snippet": 'sql = f"SELECT id, username, email FROM users WHERE username LIKE \'%{query}%\'"',
        "root_cause": "User-controlled input from request.args.get('q') is directly interpolated into a SQL query string using an f-string without any sanitization or parameterization.",
        "attack_path": [
            "HTTP GET /api/users/search?q=<payload>",
            "request.args.get('q') returns attacker-controlled string",
            "routes/users.py:14 — f-string interpolation into SQL",
            "cursor.execute(sql) — raw SQL executed against SQLite",
            "Database contents returned or error-based extraction possible",
        ],
        "impact": "An attacker can extract all database contents, bypass authentication, and potentially drop tables. This endpoint is unauthenticated making it externally exploitable.",
        "evidence": "Line 14: sql = f\"SELECT id, username, email FROM users WHERE username LIKE '%{query}%'\" — The variable 'query' is taken directly from request.args without any validation.",
        "ai_reasoning": "This is a CONFIRMED SQL injection. The f-string directly embeds user input into the SQL query with no parameterization, sanitization, or whitelisting. The endpoint has no authentication requirement, making it trivially exploitable by any network-accessible attacker. Evidence is unambiguous — this is not a false positive.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "sql_string_formatting",
        "validation_result": {
            "status": "reproduced",
            "confidence_pct": 97,
            "test_type": "SQLi probe",
            "http_response_code": 200,
            "response_evidence": "Request: /api/users/search?q=' OR '1'='1 — Response returned all 47 user records",
        },
        "remediation": {
            "status": "verified",
            "code_before": "sql = f\"SELECT id, username, email FROM users WHERE username LIKE '%{query}%'\"\ncursor.execute(sql)",
            "code_after": "cursor.execute(\n    \"SELECT id, username, email FROM users WHERE username LIKE ?\",\n    (f\"%{query}%\",)\n)",
            "unified_diff": """--- a/routes/users.py
+++ b/routes/users.py
@@ -13,8 +13,8 @@
     cursor = conn.cursor()
-    # VULNERABILITY: SQL Injection — user input directly interpolated into query
-    sql = f"SELECT id, username, email FROM users WHERE username LIKE '%{query}%'"
-    cursor.execute(sql)
+    cursor.execute(
+        "SELECT id, username, email FROM users WHERE username LIKE ?",
+        (f"%{query}%",)
+    )""",
            "explanation": "Replaced f-string SQL construction with a parameterized query using SQLite's ? placeholder. The query parameter is passed separately as a tuple, preventing any SQL injection regardless of the input value.",
            "risks": "Functionally equivalent — the LIKE pattern behavior is preserved. Ensure that existing unit tests for the search endpoint still pass. No schema changes required.",
            "branch_name": "raksha/fix-sql-injection-users-search",
            "verification_status": "verified",
            "verification_evidence": "Re-ran SQL injection probe against patched application. Payload ' OR '1'='1 now returns 0 results. Parameterized query correctly treats the input as a literal string.",
            "regression_passed": True,
        },
    },
    {
        "id": "finding-002",
        "assessment_id": "demo-assessment-001",
        "title": "Hardcoded AWS Credentials",
        "vulnerability_type": "Hardcoded Secret (AWS Access Key)",
        "severity": "critical",
        "confidence": "confirmed",
        "confidence_pct": 99,
        "status": "open",
        "cwe_id": "CWE-798",
        "cwe_name": "Use of Hard-coded Credentials",
        "owasp_category": "A02:2021",
        "file_path": "config.py",
        "line_number": 12,
        "code_snippet": 'AWS_ACCESS_KEY_ID = "AKIA***REDACTED***"\nAWS_SECRET_ACCESS_KEY = "wJalr***REDACTED***"',
        "root_cause": "AWS credentials are hardcoded as string literals in config.py. These credentials are committed to version control and accessible to anyone with repository access.",
        "attack_path": [
            "Attacker obtains repository access (e.g., via GitHub)",
            "config.py:12-13 — AWS credentials exposed as plaintext",
            "Attacker uses credentials with AWS CLI or SDK",
            "Unauthorized access to all AWS resources associated with the account",
        ],
        "impact": "Complete compromise of the associated AWS account. An attacker could access S3 buckets, EC2 instances, RDS databases, and other cloud resources. Potential for significant financial damage and data breach.",
        "evidence": "Lines 12-13 contain AWS Access Key ID matching pattern AKIA[A-Z0-9]{16} and a 40-character secret key. Both values have been redacted in this report.",
        "ai_reasoning": "CONFIRMED critical secret exposure. AWS access keys following the AKIA prefix pattern are immediately usable by an attacker. The presence of both the access key ID and secret access key means complete programmatic AWS access is possible. This requires immediate rotation of the credentials and removal from the codebase.",
        "is_exploitable": True,
        "source_tool": "secret_detector",
        "rule_id": "secret_detection",
        "validation_result": None,
        "remediation": {
            "status": "generated",
            "code_before": 'AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\nAWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
            "code_after": 'import os\nAWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")\nAWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")',
            "unified_diff": """--- a/config.py
+++ b/config.py
@@ -11,5 +11,7 @@
+import os
 # AWS credentials
-AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
-AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
+AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
+AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")""",
            "explanation": "Replaced hardcoded AWS credentials with environment variable lookups using os.environ.get(). Add the actual values to your .env file (which must be in .gitignore) or your deployment secrets manager.",
            "risks": "Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in all deployment environments. IMMEDIATELY rotate the existing AWS credentials — they should be considered compromised.",
        },
    },
    {
        "id": "finding-003",
        "assessment_id": "demo-assessment-001",
        "title": "Unauthenticated Admin Endpoint",
        "vulnerability_type": "Missing Authentication",
        "severity": "critical",
        "confidence": "confirmed",
        "confidence_pct": 95,
        "status": "open",
        "cwe_id": "CWE-306",
        "cwe_name": "Missing Authentication for Critical Function",
        "owasp_category": "A01:2021",
        "file_path": "routes/admin.py",
        "line_number": 7,
        "code_snippet": '@admin_bp.route("/api/admin/users", methods=["GET"])\ndef list_all_users():\n    """Admin endpoint — lists all users. MISSING authentication check."""',
        "root_cause": "The /api/admin/users endpoint is decorated as a route but has no authentication decorator, middleware, or manual token check before serving sensitive user data.",
        "attack_path": [
            "HTTP GET /api/admin/users (no token required)",
            "routes/admin.py:7-13 — no authentication check",
            "SQLite query returns all user records including role information",
            "Full user database exposed to unauthenticated attacker",
        ],
        "impact": "Any unauthenticated user can enumerate all users including their roles, enabling targeted attacks against privileged accounts. Combined with the SQL injection, this provides complete data access.",
        "evidence": "Route decorator at line 7 has no corresponding authentication decorator. The docstring itself notes 'MISSING authentication check'. No @login_required, @jwt_required, or manual token validation present in the function.",
        "ai_reasoning": "CONFIRMED broken access control. The admin endpoint exposes sensitive user data including account roles with zero authentication. The absence of any auth decorator or manual check in a function explicitly labeled as 'admin' is an unambiguous vulnerability. This is exploitable by any network-accessible client.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "missing_auth_decorator",
        "validation_result": {
            "status": "reproduced",
            "confidence_pct": 99,
            "test_type": "Unauthenticated access probe",
            "http_response_code": 200,
            "response_evidence": "curl http://localhost:5000/api/admin/users returned HTTP 200 with full user list (47 records) — no authentication required.",
        },
        "remediation": {
            "status": "generated",
            "code_before": '@admin_bp.route("/api/admin/users", methods=["GET"])\ndef list_all_users():',
            "code_after": 'from functools import wraps\nfrom flask import request, jsonify\n\ndef require_admin(f):\n    @wraps(f)\n    def decorated(*args, **kwargs):\n        token = request.headers.get("Authorization", "").replace("Bearer ", "")\n        if not token or not verify_admin_token(token):\n            return jsonify({"error": "Unauthorized"}), 401\n        return f(*args, **kwargs)\n    return decorated\n\n@admin_bp.route("/api/admin/users", methods=["GET"])\n@require_admin\ndef list_all_users():',
            "explanation": "Added a @require_admin decorator that validates a Bearer token in the Authorization header before allowing access. Implement verify_admin_token() to check the token against your auth system.",
            "risks": "Ensure all admin clients send the Authorization header. Implement proper token validation using your existing auth infrastructure.",
        },
    },
    {
        "id": "finding-004",
        "assessment_id": "demo-assessment-001",
        "title": "Command Injection via os.system",
        "vulnerability_type": "Command Injection",
        "severity": "critical",
        "confidence": "confirmed",
        "confidence_pct": 98,
        "status": "open",
        "cwe_id": "CWE-78",
        "cwe_name": "OS Command Injection",
        "owasp_category": "A03:2021",
        "file_path": "routes/admin.py",
        "line_number": 20,
        "code_snippet": 'cmd = request.json.get("command", "")\nresult = os.system(cmd)',
        "root_cause": "User-supplied 'command' parameter from request body is passed directly to os.system() without any validation, sanitization, or whitelisting.",
        "attack_path": [
            "HTTP POST /api/admin/exec (no authentication required)",
            "request.json.get('command') returns attacker-controlled string",
            "routes/admin.py:20 — os.system(cmd) executes arbitrary shell commands",
            "Commands execute with Flask process privileges",
            "Full system compromise if process has elevated privileges",
        ],
        "impact": "Remote code execution on the server. An attacker can execute any shell command with the privileges of the Flask process. Combined with Docker running as root, this provides full host system access.",
        "evidence": "Line 19-20: cmd = request.json.get('command') followed immediately by os.system(cmd). No authentication, validation, or sandboxing present. The endpoint description 'Admin diagnostic endpoint' suggests this was intended for legitimate use but is critically unsafe.",
        "ai_reasoning": "CONFIRMED remote code execution. os.system() with unvalidated user input is one of the most severe vulnerabilities possible. This endpoint requires no authentication and accepts arbitrary shell commands. The Docker container running as root (per Dockerfile) amplifies the impact to full host system compromise.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "command_injection",
        "validation_result": None,
        "remediation": None,
    },
    {
        "id": "finding-005",
        "assessment_id": "demo-assessment-001",
        "title": "Insecure Direct Object Reference (IDOR)",
        "vulnerability_type": "Insecure Direct Object Reference",
        "severity": "high",
        "confidence": "likely",
        "confidence_pct": 82,
        "status": "open",
        "cwe_id": "CWE-639",
        "cwe_name": "Authorization Bypass Through User-Controlled Key",
        "owasp_category": "A01:2021",
        "file_path": "routes/users.py",
        "line_number": 22,
        "code_snippet": '@users_bp.route("/api/users/<int:user_id>/profile")\ndef get_user_profile(user_id):\n    # No check that the authenticated user owns this profile',
        "root_cause": "The user_id path parameter is used directly to retrieve a user profile without verifying that the requesting user is authorized to access that specific profile.",
        "attack_path": [
            "Authenticated user accesses /api/users/1/profile (their own profile)",
            "User modifies URL to /api/users/2/profile",
            "routes/users.py:22 — no authorization check on user_id",
            "Any authenticated user can access any other user's full profile",
            "Profile includes password_hash — potential for offline cracking",
        ],
        "impact": "Any authenticated user can access all other users' profiles including password hashes. This enables horizontal privilege escalation and credential harvesting.",
        "evidence": "The route handler accepts user_id as a path parameter and queries the database directly without comparing user_id to the session's authenticated user ID. The response includes password_hash field at line 27.",
        "ai_reasoning": "LIKELY IDOR vulnerability. The pattern is clear — user-controlled ID with no authorization check. Classified as LIKELY rather than CONFIRMED because we cannot statically verify whether authentication middleware provides implicit authorization context. The response including password_hash makes this high severity regardless.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "missing_auth_decorator",
        "validation_result": None,
        "remediation": None,
    },
    {
        "id": "finding-006",
        "assessment_id": "demo-assessment-001",
        "title": "Overly Permissive CORS Configuration",
        "vulnerability_type": "Overly Permissive CORS",
        "severity": "medium",
        "confidence": "confirmed",
        "confidence_pct": 90,
        "status": "open",
        "cwe_id": "CWE-942",
        "cwe_name": "Permissive Cross-domain Policy",
        "owasp_category": "A05:2021",
        "file_path": "app.py",
        "line_number": 6,
        "code_snippet": 'CORS(app, origins="*")  # Overly permissive CORS',
        "root_cause": "The Flask application configures CORS to allow requests from any origin (*), eliminating the same-origin policy protection for all endpoints.",
        "attack_path": [
            "Victim user visits malicious website while authenticated to defence portal",
            "Malicious site's JavaScript makes cross-origin request to /api/admin/users",
            "CORS wildcard allows the cross-origin request",
            "Response body returned to attacker's JavaScript",
            "Sensitive data exfiltrated to attacker's server",
        ],
        "impact": "Combined with the unauthenticated admin endpoint, any website can make requests to the API on behalf of a victim user. Even for authenticated endpoints, CORS wildcard enables CSRF-style data exfiltration.",
        "evidence": "Line 6: CORS(app, origins='*') — the wildcard origin allows any domain to make cross-origin requests. The inline comment acknowledges this is problematic.",
        "ai_reasoning": "CONFIRMED CORS misconfiguration. The wildcard origin is explicitly set and noted as problematic in the code itself. This is particularly severe because the application has no CSRF protection either, and several endpoints lack authentication. Should be restricted to specific allowed origins.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "cors_wildcard",
        "validation_result": None,
        "remediation": {
            "status": "generated",
            "code_before": 'CORS(app, origins="*")  # Overly permissive CORS',
            "code_after": 'CORS(app, origins=["https://portal.acme-corp.internal", "https://admin.acme-corp.internal"])',
            "explanation": "Replaced wildcard origin with an explicit allowlist of the legitimate frontend domains. Only these origins will be permitted to make cross-origin requests.",
            "risks": "Update the allowlist to match your actual frontend deployment URLs. Do not re-add the wildcard.",
        },
    },
    {
        "id": "finding-007",
        "assessment_id": "demo-assessment-001",
        "title": "Insecure Password Hashing (MD5)",
        "vulnerability_type": "Insecure Cryptography",
        "severity": "high",
        "confidence": "confirmed",
        "confidence_pct": 95,
        "status": "open",
        "cwe_id": "CWE-916",
        "cwe_name": "Use of Password Hash With Insufficient Computational Effort",
        "owasp_category": "A02:2021",
        "file_path": "utils/auth.py",
        "line_number": 12,
        "code_snippet": 'return hashlib.md5(password.encode()).hexdigest() == stored_hash',
        "root_cause": "Passwords are hashed using MD5, which is a fast cryptographic hash function not designed for password storage. MD5 hashes can be cracked at billions of hashes per second using modern GPU hardware.",
        "attack_path": [
            "Attacker exploits SQL injection to dump password hashes",
            "MD5 hashes from utils/auth.py:12 are obtained",
            "Attacker uses hashcat or John the Ripper with GPU acceleration",
            "MD5 hashes cracked at ~10 billion/second (RTX 4090)",
            "Plaintext passwords recovered for offline credential stuffing",
        ],
        "impact": "All user passwords can be cracked offline once an attacker obtains the database (facilitated by the SQL injection). MD5 provides no meaningful protection against modern hardware.",
        "evidence": "Line 12: hashlib.md5(password.encode()).hexdigest() — MD5 is used for password verification. No salt is applied, making rainbow table attacks trivially effective.",
        "ai_reasoning": "CONFIRMED use of cryptographically weak password hashing. MD5 without salt has no defense against rainbow tables, and even with a salt, MD5 is too fast for password hashing. Modern standards require bcrypt, scrypt, or Argon2id. This finding is amplified by the SQL injection that provides access to the hashed values.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "insecure_random",
        "validation_result": None,
        "remediation": None,
    },
    {
        "id": "finding-008",
        "assessment_id": "demo-assessment-001",
        "title": "Path Traversal in File Upload",
        "vulnerability_type": "Path Traversal",
        "severity": "high",
        "confidence": "likely",
        "confidence_pct": 78,
        "status": "open",
        "cwe_id": "CWE-22",
        "cwe_name": "Improper Limitation of a Pathname to a Restricted Directory",
        "owasp_category": "A01:2021",
        "file_path": "routes/upload.py",
        "line_number": 15,
        "code_snippet": 'filename = file.filename  # Path traversal — no sanitization\nsave_path = os.path.join(UPLOAD_DIR, filename)',
        "root_cause": "The uploaded filename is used directly in os.path.join() without sanitization. An attacker can supply a filename like '../../etc/cron.d/evil' to write files outside the intended upload directory.",
        "attack_path": [
            "Attacker uploads file with filename '../../etc/cron.d/evil_cron'",
            "routes/upload.py:15 — filename used without sanitization",
            "os.path.join('/tmp/uploads', '../../etc/cron.d/evil_cron') resolves to '/etc/cron.d/evil_cron'",
            "Attacker-controlled file written to arbitrary filesystem location",
            "Potential remote code execution via cron or other system mechanisms",
        ],
        "impact": "Attacker can write files to arbitrary locations on the server filesystem. This can lead to code execution by overwriting scripts, cron jobs, or web server configuration files.",
        "evidence": "Lines 14-16: filename = file.filename (unsanitized) followed by os.path.join(UPLOAD_DIR, filename). No call to werkzeug.utils.secure_filename() or similar sanitization.",
        "ai_reasoning": "LIKELY path traversal. The pattern of using user-supplied filename without secure_filename() is a well-known vulnerability. Classified as LIKELY because we cannot statically verify the runtime behavior of os.path.join with all possible inputs, but the pattern is unambiguously dangerous.",
        "is_exploitable": True,
        "source_tool": "custom",
        "rule_id": "path_traversal",
        "validation_result": None,
        "remediation": None,
    },
    {
        "id": "finding-009",
        "assessment_id": "demo-assessment-001",
        "title": "Outdated Dependency: requests 2.25.0 (CVE-2023-32681)",
        "vulnerability_type": "Vulnerable Dependency",
        "severity": "medium",
        "confidence": "confirmed",
        "confidence_pct": 93,
        "status": "open",
        "cwe_id": "CWE-601",
        "cwe_name": "URL Redirection to Untrusted Site",
        "owasp_category": "A06:2021",
        "file_path": "requirements.txt",
        "line_number": 2,
        "code_snippet": "requests==2.25.0",
        "root_cause": "The requests library version 2.25.0 has known CVE-2023-32681 — Proxy-Authorization header leakage when following cross-origin redirects.",
        "attack_path": [
            "Application makes HTTP requests via requests library",
            "Server responds with redirect to attacker-controlled host",
            "requests 2.25.0 forwards Proxy-Authorization header to redirect target",
            "Attacker receives proxy credentials",
        ],
        "impact": "Proxy credentials may be leaked to attacker-controlled servers if the application follows HTTP redirects. Update to requests >= 2.31.0.",
        "evidence": "requirements.txt:2 specifies requests==2.25.0. CVE-2023-32681 is confirmed in this version. Fixed in requests 2.31.0.",
        "ai_reasoning": "CONFIRMED vulnerable dependency. The pinned version 2.25.0 is over 2 years old and has multiple known CVEs. The fix is straightforward — update the version pin.",
        "is_exploitable": False,
        "source_tool": "custom",
        "rule_id": "dependency_check",
        "validation_result": None,
        "remediation": {
            "status": "generated",
            "code_before": "requests==2.25.0",
            "code_after": "requests>=2.32.3",
            "explanation": "Updated requests to the current stable version which resolves CVE-2023-32681 and multiple other security fixes.",
            "risks": "Verify that no deprecated API methods are used. Run existing test suite after update.",
        },
    },
    {
        "id": "finding-010",
        "assessment_id": "demo-assessment-001",
        "title": "Docker Container Running as Root",
        "vulnerability_type": "Insecure Docker Configuration",
        "severity": "medium",
        "confidence": "confirmed",
        "confidence_pct": 99,
        "status": "open",
        "cwe_id": "CWE-250",
        "cwe_name": "Execution with Unnecessary Privileges",
        "owasp_category": "A05:2021",
        "file_path": "Dockerfile",
        "line_number": 7,
        "code_snippet": "# Running as root\nUSER root\n\n# Exposing all ports\nEXPOSE 0-65535",
        "root_cause": "The Dockerfile explicitly sets USER root, meaning all container processes run with root privileges. Additionally, EXPOSE 0-65535 exposes every port unnecessarily.",
        "attack_path": [
            "Attacker exploits command injection vulnerability in Flask app",
            "Process executes with root privileges (per USER root in Dockerfile)",
            "Container breakout or full host filesystem access becomes possible",
            "EXPOSE 0-65535 increases attack surface for network-based attacks",
        ],
        "impact": "If any code execution vulnerability is exploited, the attacker immediately has root access within the container. Combined with Docker socket mounting or privileged mode, this enables full host system compromise.",
        "evidence": "Dockerfile:7 explicitly sets USER root. This is the opposite of best practice — containers should run as non-root users.",
        "ai_reasoning": "CONFIRMED insecure Docker configuration. USER root is an explicit, unnecessary privilege escalation. The default Docker behavior if USER is not set would be root, so this appears intentional but incorrect. EXPOSE 0-65535 is also clearly misconfigured.",
        "is_exploitable": False,
        "source_tool": "custom",
        "rule_id": "docker_configuration",
        "validation_result": None,
        "remediation": {
            "status": "generated",
            "code_before": "USER root\nEXPOSE 0-65535",
            "code_after": "RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser\nUSER appuser\nEXPOSE 5000",
            "explanation": "Creates a non-privileged system user and group, switches to that user before running the application, and exposes only the required Flask port (5000).",
            "risks": "Ensure the application code doesn't require root privileges (e.g., writing to /etc, binding to port < 1024). Update any volume mounts or file permissions accordingly.",
        },
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# DEMO AFTER-REMEDIATION STATE (showing score improvement)
# ══════════════════════════════════════════════════════════════════════════════

DEMO_POST_REMEDIATION = {
    "security_score": 74.0,
    "score_change": 36.0,
    "critical_count": 1,
    "high_count": 2,
    "medium_count": 2,
    "patch_verified": True,
    "verified_findings": ["finding-001"],  # SQL injection - verified fixed
    "message": "3 critical vulnerabilities remediated and verified. Score improved from 38 → 74.",
}
