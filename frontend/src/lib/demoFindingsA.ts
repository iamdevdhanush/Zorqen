import type { Finding } from './types';

const SQLI_SNIPPET = `@router.get("/search")
async def search_users(request: Request):
    q = request.query_params.get("q", "")
    conn = db.get_connection()
    cursor = conn.cursor()
    sql = f"SELECT id, name, role FROM users WHERE name LIKE '%{q}%'"
    cursor.execute(sql)
    rows = cursor.fetchall()
    conn.close()
    return rows`;

const SQLI_BEFORE = `37  @router.get("/search")
38  async def search_users(request: Request):
39      q = request.query_params.get("q", "")
40      conn = db.get_connection()
41      cursor = conn.cursor()
42      sql = f"SELECT id, name, role FROM users WHERE name LIKE '%{q}%'"
43      cursor.execute(sql)
44      rows = cursor.fetchall()
45      conn.close()
46      return rows`;

const SQLI_AFTER = `37  @router.get("/search")
38  async def search_users(request: Request):
39      q = request.query_params.get("q", "")
40      conn = db.get_connection()
41      cursor = conn.cursor()
42      sql = "SELECT id, name, role FROM users WHERE name LIKE %s"
43      cursor.execute(sql, (f"%{q}%",))
44      rows = cursor.fetchall()
45      conn.close()
46      return rows`;

function f(partial: Partial<Finding>): Finding {
  return {
    category: 'application',
    source_tool: 'semgrep',
    endpoint: undefined,
    root_cause: '',
    impact: '',
    attack_path: [],
    evidence: { static_analysis: '', ai_reasoning: '' },
    code: {
      language: 'python',
      snippet: '',
      vuln_line: 1,
      start_line: partial.line_number ?? 1,
    },
    ...partial,
  } as Finding;
}

export const FINDINGS_A: Finding[] = [
  f({
    id: 'F-0001',
    severity: 'critical',
    title: 'SQL Injection',
    endpoint: '/api/users/search',
    file_path: 'app/api/users.py',
    line_number: 42,
    cwe_id: 'CWE-89',
    cwe_name: 'SQL Injection',
    confidence_pct: 97,
    validation: 'CONFIRMED',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause:
      'User-controlled query parameter "q" is interpolated directly into a SQL string, then executed against PostgreSQL.',
    impact:
      'Full database extraction, authentication bypass, and lateral access to logistics records, manifests and user PII.',
    attack_path: [
      'HTTP request',
      'query parameter "q"',
      'app/api/users.py:42',
      'string interpolation into SQL',
      'PostgreSQL query',
    ],
    evidence: {
      static_analysis:
        'semgrep rule python.lang.security.audit.raw-sql-interpolation — pattern matches f-string used as cursor.execute() argument at users.py:42.',
      ai_reasoning:
        'Input flows from Request.query_params into an interpolated SQL string with no escaping. Parameterized execution is available but unused. Confidence raised by the confirmed quoting bypass below.',
      runtime:
        `q = "' OR '1'='1" -> query returns all 1,284 rows (HTTP 200). Error-based proof: q = "'" -> HTTP 500, psycopg2 syntax error.`,
      runtime_result: 'REPRODUCED',
    },
    code: { language: 'python', snippet: SQLI_SNIPPET, vuln_line: 6, start_line: 37 },
    remediation: {
      branch: 'raksha/fix/sql-injection-users-search',
      diff_before: SQLI_BEFORE,
      diff_after: SQLI_AFTER,
      explanation:
        'Replaces f-string SQL construction with a parameterized query. The user input is passed as a bound parameter, so it can never alter the statement structure.',
      why_this_fix:
        'The patch removes dynamic SQL construction entirely. Bound parameters are interpreted by the driver as data, not as SQL syntax. No behaviour change for legitimate searches; client-supplied LIKE wildcards are preserved literally.',
      risk: 'Low',
      regression_tests: 12,
      regression_passed: 12,
    },
  }),

  f({
    id: 'F-0002',
    severity: 'high',
    title: 'Hardcoded Secret',
    file_path: 'config.py',
    line_number: 18,
    cwe_id: 'CWE-798',
    cwe_name: 'Hard-coded Credentials',
    confidence_pct: 99,
    validation: 'STATIC',
    status: 'OPEN',
    source_tool: 'secret-detector',
    root_cause: 'AWS access key (AKIA…) committed in config.py alongside its 68-character secret value.',
    impact: 'Compromise of the AWS account grants access to S3 logistics payloads and infrastructure modification.',
    attack_path: ['repository clone', 'config.py:18', 'AWS_ACCESS_KEY constant', 'AWS account takeover'],
    evidence: {
      static_analysis:
        'secret-detector: high-entropy + AKIA prefix match (entropy 4.92). Key confirmed active against the AWS public metadata service on scan date.',
      ai_reasoning:
        'The key is declared as a default in source rather than injected at deploy time (no os.environ read). Recommendation: move to a secrets manager and rotate immediately.',
    },
    code: {
      language: 'python',
      snippet:
        'AWS_ACCESS_KEY_ID = "AKIA6E4QNIXQW5KTL2RA"\nAWS_SECRET_ACCESS_KEY = "Vj9k2mP4x…"\nREGION = "eu-west-1"',
      vuln_line: 1,
      start_line: 18,
    },
  }),

  f({
    id: 'F-0003',
    severity: 'high',
    title: 'Broken Object Authorization',
    endpoint: 'PATCH /api/admin/users/:id',
    file_path: 'app/api/admin/users.py',
    line_number: 118,
    cwe_id: 'CWE-639',
    cwe_name: 'Authorization Bypass Through User-Controlled Key',
    confidence_pct: 91,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'custom rule authz-scope',
    root_cause:
      'The endpoint mutates the target user record without validating that the caller holds an admin scope for that organisation.',
    impact: 'A principal with any valid session can escalate any user to admin or change their role.',
    attack_path: [
      'HTTP request',
      'PATCH /api/admin/users/:id',
      'auth.py:204 role check (org-scoped only)',
      'user role mutation',
    ],
    evidence: {
      static_analysis:
        'custom rule authz-scope: mutation handler reads current_user.auth_scopes but never compares the target principal before calling update_user().',
      ai_reasoning:
        'The role check at auth.py:204 verifies the caller holds an admin scope, but the object id is resolved from the path without an ownership or org check. Classic IDOR on a privileged operation.',
    },
    code: {
      language: 'python',
      snippet: `@router.patch("/users/{user_id}")
async def update_role(user_id: int, body: RoleUpdate):
    if "admin" not in current_user.auth_scopes:
        raise HTTPException(403)
    user = users.update_role(user_id, body.role)
    return user`,
      vuln_line: 4,
      start_line: 113,
    },
  }),

  f({
    id: 'F-0004',
    severity: 'high',
    title: 'Path Traversal in Export',
    endpoint: 'GET /api/reports/export',
    file_path: 'app/services/reports.py',
    line_number: 67,
    cwe_id: 'CWE-22',
    cwe_name: 'Path Traversal',
    confidence_pct: 84,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause: 'Report filename is joined to the export directory without neutralizing ".." sequences.',
    impact: 'Arbitrary file read from the container filesystem, including env files and certificates.',
    attack_path: ['HTTP request', 'filename query param', 'os.path.join(EXPORT_DIR, filename)', 'filesystem read'],
    evidence: {
      static_analysis:
        'semgrep rule python.lang.security.audit.path-traversal-open — os.path.join of a tainted request parameter reaches open().',
      ai_reasoning:
        'The common bypass "../../../etc/passwd" survives join() whenever the prefix length permits. The filename should be basenamed and validated against an allowlist.',
    },
    code: {
      language: 'python',
      snippet: `@router.get("/export")
async def export_report(request: Request):
    filename = request.query_params.get("file")
    path = os.path.join(EXPORT_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404)
    return FileResponse(path)`,
      vuln_line: 3,
      start_line: 63,
    },
  }),

  f({
    id: 'F-0005',
    severity: 'medium',
    title: 'Permissive CORS',
    endpoint: 'ALL /{path}',
    file_path: 'main.py',
    line_number: 31,
    cwe_id: 'CWE-942',
    cwe_name: 'Permissive Cross-domain Policy',
    confidence_pct: 88,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause: 'CORSMiddleware allows all origins with credentials enabled.',
    impact: 'Any website can issue authenticated cross-origin requests against the API while an operator session is active.',
    attack_path: ['malicious origin', 'OPTIONS preflight allowed (origin: *)', 'credentialed request', 'API mutation'],
    evidence: {
      static_analysis:
        'semgrep rule python.lang.security.audit.cors-wildcard — allow_origins=["*"] combined with allow_credentials=True.',
      ai_reasoning:
        'With credentials + wildcard the browser rejects credentialed reads, but non-credentialed sensitive GET endpoints remain exposed, and a single misconfigured cookie makes the policy exploitable.',
    },
    code: {
      language: 'python',
      snippet: `app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`,
      vuln_line: 3,
      start_line: 31,
    },
  }),

  f({
    id: 'F-0006',
    severity: 'medium',
    title: 'Insecure Deserialization',
    file_path: 'app/services/cache.py',
    line_number: 95,
    cwe_id: 'CWE-502',
    cwe_name: 'Deserialization of Untrusted Data',
    confidence_pct: 76,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause:
      'pickle.loads() hydrates cache entries where the cache writer is reachable from an unauthenticated endpoint.',
    impact: 'Remote code execution in the worker process if an attacker can control cache content.',
    attack_path: ['HTTP request', 'cache pollute via search endpoint', 'pickle.loads(cache_entry)', 'worker RCE'],
    evidence: {
      static_analysis: 'semgrep rule python.lang.security.audit.suspicious-pickle-use flagged pickle.loads at cache.py:95.',
      ai_reasoning:
        'Cache values derive from request-driven writes; pickle is not safe against crafted data. Prefer JSON or msgpack with an explicit schema.',
    },
    code: {
      language: 'python',
      snippet: `def hydrate(key: str):
    raw = redis.get(f"cache:{key}")
    if raw is None:
        return None
    return pickle.loads(raw)  # tainted`,
      vuln_line: 4,
      start_line: 92,
    },
  }),

  f({
    id: 'F-0007',
    severity: 'medium',
    title: 'Missing Rate Limiting on Login',
    endpoint: 'POST /api/auth/login',
    file_path: 'app/api/auth.py',
    line_number: 203,
    cwe_id: 'CWE-307',
    cwe_name: 'Improper Restriction of Excessive Authentication Attempts',
    confidence_pct: 71,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'custom rule brute-force',
    root_cause: 'No throttling or lockout on the credential endpoint; failed attempts are not counted.',
    impact: 'Online brute force of operator credentials, amplified by the username enumeration finding (F-0011).',
    attack_path: ['HTTP request', 'POST /api/auth/login', 'no attempt counter', 'credential brute force'],
    evidence: {
      static_analysis: 'custom rule brute-force: login handler has no dependency on a rate-limit guard.',
      ai_reasoning:
        'The endpoint performs a full bcrypt comparison per attempt, so sustained guessing is cheap. Recommend per-account exponential backoff.',
    },
    code: {
      language: 'python',
      snippet: `@router.post("/login")
async def login(body: LoginRequest):
    user = db.find_user_by_name(body.username)
    if user is None or not verify_password(body.password, user.hash):
        raise HTTPException(401)
    return issue_tokens(user)`,
      vuln_line: 4,
      start_line: 198,
    },
  }),

  f({
    id: 'F-0008',
    severity: 'medium',
    title: 'Weak JWT Signing Algorithm',
    file_path: 'app/auth/jwt.py',
    line_number: 26,
    cwe_id: 'CWE-327',
    cwe_name: 'Use of a Broken Crypto Algorithm',
    confidence_pct: 82,
    validation: 'STATIC',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause:
      'HS256 is used with a static server secret shipped in the image; algorithm confusion is not prevented at verify time.',
    impact: 'Token forgery if the secret leaks (see F-0002 / F-0025) or if the verifier accepts alg=none.',
    attack_path: ['token supply', 'verify(alg=none)', 'forged session'],
    evidence: {
      static_analysis:
        'semgrep rule python.lang.security.audit.jwt-none-alg matched decode() called without pinning algorithms=["RS256"].',
      ai_reasoning:
        'Pinning the allowed algorithm set closes the confusion vector; prefer RS256 with a key pair managed by the platform.',
    },
    code: {
      language: 'python',
      snippet: `def decode_token(token: str):
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=["none", "HS256"],
    )
    return payload`,
      vuln_line: 4,
      start_line: 22,
    },
  }),

  f({
    id: 'F-0009',
    severity: 'medium',
    title: 'SSRF via Import URL',
    endpoint: 'POST /api/imports/url',
    file_path: 'app/services/imports.py',
    line_number: 48,
    cwe_id: 'CWE-918',
    cwe_name: 'Server-Side Request Forgery',
    confidence_pct: 78,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'semgrep',
    root_cause: 'Arbitrary URL is fetched server-side with no allowlist or internal-address check.',
    impact: 'Access to the cloud metadata service (169.254.169.254) and internal services from the worker.',
    attack_path: ['HTTP request', 'import_url param', 'httpx.get(url)', 'internal network / metadata'],
    evidence: {
      static_analysis: 'semgrep rule python.lang.security.audit.ssrf-url-open — tainted URL reaches httpx.get().',
      ai_reasoning: 'No scheme, port or host validation before the request. Recommend an explicit allowlist plus DNS rebinding protection.',
    },
    code: {
      language: 'python',
      snippet: `async def import_from_url(url: str):
    resp = await httpx.get(url, timeout=10)
    return resp.json()`,
      vuln_line: 2,
      start_line: 46,
    },
  }),

  f({
    id: 'F-0010',
    severity: 'medium',
    title: 'Missing CSRF Protection',
    endpoint: 'POST /api/admin/ui/*',
    file_path: 'app/api/admin/ui.py',
    line_number: 30,
    cwe_id: 'CWE-352',
    cwe_name: 'Cross-Site Request Forgery',
    confidence_pct: 66,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'custom rule csrf',
    root_cause: 'State-changing endpoints under the admin UI accept cookie sessions without a CSRF token.',
    impact: 'Cross-site state changes executed while an admin session is active.',
    attack_path: ['malicious page', 'auto-submitted form', 'cookie session', 'state change'],
    evidence: {
      static_analysis: 'custom rule csrf: no Origin check or CSRF guard on POST handlers under /api/admin/ui.',
      ai_reasoning: 'Given permissive CORS (F-0005), a cross-origin POST is currently unimpeded.',
    },
    code: {
      language: 'python',
      snippet: `@router.post("/settings")
async def update_settings(body: SettingsUpdate):
    await db.update_settings(body.model_dump())
    return {"ok": True}`,
      vuln_line: 2,
      start_line: 28,
    },
  }),

  f({
    id: 'F-0011',
    severity: 'medium',
    title: 'Username Enumeration in Login',
    endpoint: 'POST /api/auth/login',
    file_path: 'app/api/auth.py',
    line_number: 87,
    cwe_id: 'CWE-204',
    cwe_name: 'Observable Response Discrepancy',
    confidence_pct: 64,
    validation: 'UNVALIDATED',
    status: 'OPEN',
    source_tool: 'custom rule user-enum',
    root_cause: 'Unknown users return HTTP 404 while known users return HTTP 401.',
    impact: 'Operator account names can be harvested for targeted brute force (see F-0007).',
    attack_path: ['HTTP request', 'login attempt', '404 vs 401 branch', 'account enumeration'],
    evidence: {
      static_analysis: 'custom rule user-enum: distinct exception classes mapped to 404/401.',
      ai_reasoning: 'Return a constant 401 and run a dummy verify for unknown users to equalize response behaviour.',
    },
    code: {
      language: 'python',
      snippet: `if user is None:
    raise HTTPException(404, "user not found")
if not verify_password(body.password, user.hash):
    raise HTTPException(401, "invalid credentials")`,
      vuln_line: 2,
      start_line: 85,
    },
  }),

  f({
    id: 'F-0012',
    severity: 'medium',
    title: 'Hardcoded Admin Credentials',
    file_path: 'app/config.py',
    line_number: 41,
    cwe_id: 'CWE-798',
    cwe_name: 'Hard-coded Credentials',
    confidence_pct: 90,
    validation: 'STATIC',
    status: 'OPEN',
    source_tool: 'secret-detector',
    root_cause: 'Bootstrap admin password is a literal in config, enabling default-credential login.',
    impact: 'Default credential login if the deployer does not override it.',
    attack_path: ['source read', 'config.py:41', 'bootstrap admin', 'account takeover'],
    evidence: {
      static_analysis: 'secret-detector: literal password constant matched the known-default pattern.',
      ai_reasoning: 'Seed the admin from environment variables and force rotation on first login.',
    },
    code: {
      language: 'python',
      snippet: `BOOTSTRAP_ADMIN = {
    "username": "ops-admin",
    "password": "S3cure#2024",
}`,
      vuln_line: 3,
      start_line: 39,
    },
  }),
];