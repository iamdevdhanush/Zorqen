# ZORQEN Phase 4B + Phase 5 Report: GitHub Least Privilege & Semgrep Integration

**Date:** 2026-10-15  
**Platform:** Windows 10/11 x64, Python 3.10.6, Node 20.x, React 19  
**Status:** Verification Passed (174 Backend Tests Passing, Frontend Production Build Passing)

---

## 1. Executive Summary

In this combined cycle, ZORQEN addressed two major security and scanner infrastructure requirements:

1. **Workstream A (GitHub Least Privilege & Multi-Worker State):**
   - Audited the GitHub OAuth workflow and enforced read-only boundaries by disabling mutation methods (`create_branch`, `create_or_update_file`, `create_pull_request`).
   - Replaced in-memory OAuth CSRF tracking with stateless, cryptographically signed, time-limited JWT state tokens verified across multiple processes and instances.
   - Updated UI disclosures and documentation to truthfully articulate the OAuth permissions model vs GitHub App capabilities.

2. **Workstream B (Real Semgrep Integration & Scanner Defect Remediation):**
   - Installed `semgrep==1.90.0` in the backend Python runtime.
   - Diagnosed upstream PyPI wheel limitations on native Windows (bundled Linux `x86_64` ELF binary and reliance on Unix `resource` / `fork`).
   - Added robust CLI path discovery, explicit host-architecture exception handling (`OSError`, `WinError 193`), and timeout enforcement.
   - Removed silent scanner fallback in the orchestrator that previously allowed an incomplete/missing static analysis scan to report success.
   - Fixed regex detection defects (filtering comments, preventing false positives on parameterized queries, sanitizing path traversal).
   - Created controlled corpus benchmark fixtures demonstrating 100% precision and 100% recall on the defined test suite.

---

## 2. Files Changed Per Workstream

### Workstream A: GitHub Least Privilege & Authentication
- [`backend/github/client.py`](file:///d:/Zorqen/backend/github/client.py): Disabled mutating methods (`create_branch`, `create_or_update_file`, `create_pull_request`) by explicitly raising `PermissionError("Write operations are disabled. ZORQEN operates in read-only analysis mode.")`.
- [`backend/routers/auth.py`](file:///d:/Zorqen/backend/routers/auth.py): Implemented `generate_oauth_state()` and `validate_oauth_state()` using signed HMAC/JWT state tokens (15-minute expiration, cryptographic signature, purpose check) to support distributed multi-worker/multi-instance architectures while maintaining backwards compatibility with legacy in-memory test mocks.
- [`frontend/src/pages/OverviewPage.tsx`](file:///d:/Zorqen/frontend/src/pages/OverviewPage.tsx): Corrected the card label from `"READ-ONLY INTEGRATION"` to `"OAUTH ACCESS (READ-ONLY ANALYSIS WORKFLOW) // ENCRYPTED"`.
- [`frontend/src/pages/RepositoriesPage.tsx`](file:///d:/Zorqen/frontend/src/pages/RepositoriesPage.tsx): Updated badge to `"READ-ONLY ANALYSIS WORKFLOW"`.
- [`README.md`](file:///d:/Zorqen/README.md): Added dedicated section detailing the GitHub OAuth App vs. GitHub App permissions architecture.
- [`backend/tests/test_github_permissions.py`](file:///d:/Zorqen/backend/tests/test_github_permissions.py): Added 10 tests verifying disabled write methods, stateless CSRF state verification across processes, expired/tampered token rejection, and scope requirements.

### Workstream B: Semgrep & Scanner Integrity
- [`backend/requirements.txt`](file:///d:/Zorqen/backend/requirements.txt): Installed `semgrep==1.90.0` and downgraded setuptools to `<70` (`69.5.1`) to resolve `pkg_resources` compatibility.
- [`backend/security/semgrep_runner.py`](file:///d:/Zorqen/backend/security/semgrep_runner.py):
  - Added `_find_semgrep_bin()` for environment-aware binary discovery (`shutil.which`, `sys.prefix/Scripts/semgrep`, etc.).
  - Added `OSError` exception handling for host architecture incompatibilities (`kind="os_incompatible"`).
  - Handled both `asyncio.TimeoutError` and built-in `TimeoutError` across Python 3.10 and 3.11.
  - Implemented structured JSON stdout extraction and error reporting.
- [`backend/agents/orchestrator.py`](file:///d:/Zorqen/backend/agents/orchestrator.py): Removed the silent fallback in `run_assessment` that degraded a failed Semgrep scan to an unverified success state; assessments now fail explicitly with `SEMGREP_FAILED` when the static engine fails.
- [`backend/security/custom_checks.py`](file:///d:/Zorqen/backend/security/custom_checks.py):
  - Added `_is_comment()` to prevent commented-out code (`#`, `//`, `/*`, `*`) from triggering false alerts.
  - Refined SQL injection regexes to avoid false positives on standard `%s` parameterized queries.
  - Refined command injection patterns to exclude literal array commands and safe subprocess executions.
  - Updated path traversal checks to respect `os.path.basename` and `secure_filename`.
  - Re-labeled all custom findings with `source_tool="custom_regex"` and title `(Regex Heuristic)` so they are never misrepresented as AST analysis.
- [`backend/tests/fixtures/scanner_corpus/`](file:///d:/Zorqen/backend/tests/fixtures/scanner_corpus/): Created 7 controlled benchmark fixtures:
  - `sql_injection_vuln.py`
  - `sql_injection_safe.py`
  - `command_injection_vuln.py`
  - `command_injection_safe.py`
  - `path_traversal_vuln.py`
  - `path_traversal_safe.py`
  - `commented_out_code.py`
- [`backend/tests/test_scanner_benchmark.py`](file:///d:/Zorqen/backend/tests/test_scanner_benchmark.py): Added 11 tests covering detection benchmarks, precision/recall metrics, and Semgrep runner contracts.

---

## 3. GitHub Permission Model & Limitations

### Analysis of Current Permissions
- **Supported Operational Workflow**: ZORQEN performs read-only analysis. The engine reads user identity (`GET /user`), lists accessible repositories (`GET /user/repos`), and fetches file trees and blobs (`GET /repos/{owner}/{repo}/git/trees/{sha}`, `GET /repos/{owner}/{repo}/contents/{path}`).
- **Classic OAuth App Limitation**:
  GitHub OAuth 2.0 does not provide a granular `repo:read` scope. To read private repositories, an OAuth App must request the broad `repo` scope, which inherently grants write and admin permissions on GitHub's API.
- **Enforced Least Privilege**:
  To protect users despite this OAuth protocol limitation:
  1. All client-side mutation functions (`create_branch`, `create_or_update_file`, `create_pull_request`) in `GitHubClient` are strictly disabled and raise `PermissionError`.
  2. UI disclosures now explicitly state `"OAUTH ACCESS (READ-ONLY ANALYSIS WORKFLOW)"` rather than claiming that the OAuth token itself is read-only.
- **Recommended Production Model (GitHub App)**:
  For enterprise and production deployments, ZORQEN should be installed as a **GitHub App** rather than an OAuth App, requesting fine-grained read-only permissions:
  - `Repository permissions: Contents (read)`
  - `Repository permissions: Metadata (read)`
  - `User permissions: Email addresses (read)`

---

## 4. Semgrep Version, Installation & Execution Architecture

- **Semgrep Version**: `1.90.0`
- **Installation Method**: `pip install semgrep==1.90.0`
- **Upstream Engine Architecture & Native Windows Blocker**:
  - Upstream Semgrep distributes a pre-compiled Linux `x86_64` ELF binary (`semgrep-core`) inside the PyPI universal wheel (`semgrep-1.90.0-...-none-any.whl`).
  - Native Windows execution of this bundled ELF binary fails with `[WinError 193] %1 is not a valid Win32 application`.
  - Furthermore, `semgrep` Python CLI wrapper imports the Unix-only standard library module `resource`, which is unavailable on Windows.
- **Runtime Resolution & Error Handling**:
  - `semgrep_runner.py` now resolves binary location via `shutil.which` and `sys.prefix/Scripts/semgrep`.
  - When invoked on Windows native environments without WSL or Docker, it catches `OSError` and cleanly raises:
    ```
    SemgrepError: Semgrep cannot execute on this host architecture: [WinError 193] ...
    (Semgrep engine requires Linux container/WSL runtime environment on Windows hosts).
    ```
  - Silent degradation has been excised: `orchestrator.py` marks the assessment as `status=FAILED` with `error_code="SEMGREP_FAILED"`, rather than pretending static analysis completed.

---

## 5. Benchmark Results Over Controlled Test Corpus

### Test Corpus Composition
Located in [`backend/tests/fixtures/scanner_corpus/`](file:///d:/Zorqen/backend/tests/fixtures/scanner_corpus/):

| Fixture File | Vulnerability Class | Expected Findings | Detected Findings | Result |
| :--- | :--- | :---: | :---: | :---: |
| `sql_injection_vuln.py` | SQL Injection (f-string, %, concat) | 3 | 3 | **PASS** |
| `sql_injection_safe.py` | Safe Parameterized SQL (%s tuple, :named, static) | 0 | 0 | **PASS** (Zero False Positives) |
| `command_injection_vuln.py` | Command Injection (`os.system`, `shell=True`, `eval`) | 3 | 3 | **PASS** |
| `command_injection_safe.py` | Safe Subprocess (`["cmd", arg]`, static) | 0 | 0 | **PASS** (Zero False Positives) |
| `path_traversal_vuln.py` | Path Traversal (`open(filename)`, `open(path)`) | 2 | 2 | **PASS** |
| `path_traversal_safe.py` | Safe File Access (`os.path.basename`, fixed path) | 0 | 0 | **PASS** (Zero False Positives) |
| `commented_out_code.py` | Inactive SQL/shell/open lines in comments | 0 | 0 | **PASS** (Zero False Positives) |

### Benchmark Metrics

$$\text{Precision} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Positives}} = \frac{8}{8 + 0} = \mathbf{1.0\ (100\%)}$$

$$\text{Recall} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Negatives}} = \frac{8}{8 + 0} = \mathbf{1.0\ (100\%)}$$

$$\text{False Positive Rate (FPR)} = \mathbf{0.0\%}$$

---

## 6. Commands Executed & Verification Results

### Backend Unit & Regression Tests
```bash
python -m pytest tests/test_github_permissions.py -v
# Output: 10 passed in 1.04s

python -m pytest tests/test_scanner_benchmark.py -v
# Output: 11 passed in 0.13s

python -m pytest tests/test_auth_flow.py -v
# Output: 2 passed in 2.32s

python -m pytest -q
# Output: 174 passed, 2 warnings in 4.69s
```

### Frontend Production Build
```bash
npm run build (tsc -b && vite build)
# Output: ✓ 2329 modules transformed, built in 600ms, 0 errors
```

---

## 7. Remaining Security & Deployment Blockers

1. **Linux Container Execution Required for Real Semgrep CLI**:
   Because `semgrep` on PyPI includes only Linux/macOS binary distributions of `semgrep-core`, running real Semgrep requires deploying the backend inside a Linux-based Docker container or Linux VM/host. In the current native Windows host without WSL/Docker daemon active, Semgrep CLI execution raises `os_incompatible` as expected.
2. **Migration to GitHub App for True Least Privilege**:
   While client write methods are disabled in code, users authorizing private repository access via classic GitHub OAuth must still grant the `repo` scope due to GitHub's OAuth 2.0 API limitations. Creating a registered GitHub App will allow users to grant purely read-only `Contents` permissions.
3. **Sandbox Execution Remains Unimplemented**:
   As determined in Phase 3 and Phase 4A, ephemeral Docker sandbox exploit verification remains unimplemented. All UI representations now truthfully reflect sandbox verification as unavailable/pending.

---
*End of Phase 4B + Phase 5 Report.*
