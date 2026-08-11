# RAKSHA — AI-Powered Autonomous Security Validation & Vulnerability Remediation Platform

> **"Find it. Fix it. Prove it."**

---

## 🚀 Quick Start (Demo Mode — No Setup Required)

Demo Mode works **without** GitHub OAuth or Groq API key.

### 1. Start the Backend

```powershell
cd "d:\RAKSHA AI\backend"
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy aiosqlite greenlet httpx "python-jose[cryptography]" "passlib[bcrypt]" groq python-dotenv aiofiles structlog sse-starlette python-multipart cryptography gitpython pygments pyyaml
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend

```powershell
cd "d:\RAKSHA AI\frontend"
npm install
npm run dev
```

### 3. Open the App

Visit **http://localhost:5173** and click **"Try Demo Mode"**.

---

## 🔑 Configuration

Copy `.env.example` to `.env` in the project root and fill in your values.

### Required for Full Features

| Variable | Description | Get it at |
|---|---|---|
| `GROQ_API_KEY` | AI reasoning & copilot | https://console.groq.com |
| `GITHUB_CLIENT_ID` | GitHub OAuth | https://github.com/settings/applications/new |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | Same as above |

### GitHub OAuth App Setup

1. Go to https://github.com/settings/applications/new
2. **Homepage URL**: `http://localhost:5173`
3. **Authorization callback URL**: `http://localhost:8000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

---

## 🏗️ Architecture

```
RAKSHA/
├── frontend/          # React + TypeScript + Vite + Tailwind v4
│   ├── src/
│   │   ├── pages/     # LandingPage, DemoPage, DashboardPage
│   │   ├── components/ # SecurityScore, ArchitectureMap, SecurityCopilot, DiffViewer
│   │   └── services/  # api.ts — Axios API client
│   └── Dockerfile
│
├── backend/           # Python + FastAPI
│   ├── main.py        # FastAPI app entry point
│   ├── core/          # Config, Database, Security utilities
│   ├── models/        # SQLAlchemy ORM (User, Repository, Assessment, Finding, etc.)
│   ├── routers/       # auth, demo, api (repos, assessments, findings, copilot)
│   ├── agents/        # orchestrator, architecture_analyst, security_reasoner, remediation_agent
│   ├── security/      # semgrep_runner, secret_detector, custom_checks
│   ├── github/        # oauth, client
│   ├── demo/          # fixtures.py (pre-loaded demo data)
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🎭 Demo Flow (Hackathon Presentation)

The full DETECT → REASON → VALIDATE → REMEDIATE → VERIFY story:

1. **Click "Try Demo Mode"** → No GitHub account needed
2. **Dashboard** → Security Score: 38/100, 3 Critical, 2 High findings
3. **Architecture Map** → Flask + SQLite + Docker detected
4. **Assessment Timeline** → All 6 pipeline steps completed
5. **View Findings** → 10 realistic vulnerabilities with full AI reasoning
6. **Finding Detail: SQL Injection** →
   - Attack path visualization
   - Vulnerable code highlighted
   - AI reasoning: "CONFIRMED — f-string SQL interpolation"
   - Sandbox validation: "REPRODUCED — payload returned all 47 user records"
7. **Review Fix** → Unified diff: f-string → parameterized query
8. **Verify Patch** → "PATCH VERIFIED — same payload now blocked"
9. **Score jumps: 38 → 74**

---

## 🤖 Agent Architecture

| Agent | Responsibility |
|---|---|
| `orchestrator.py` | Controls the full pipeline state machine |
| `architecture_analyst.py` | Detects frameworks, builds architecture map |
| `security_reasoner.py` | Groq LLM reasoning over tool findings |
| `remediation_agent.py` | Generates minimal code patches |
| `semgrep_runner.py` | Async Semgrep static analysis |
| `secret_detector.py` | 16-pattern secret detection with redaction |
| `custom_checks.py` | 8 deterministic security check categories |

---

## 🐳 Docker Deployment

```bash
# Copy and fill in your .env
cp .env.example .env

# Start the full stack
docker-compose up --build
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000/api/docs

---

## ⚠️ Safety Boundaries

- **Only** analyzes repositories the user is authorized to assess
- **Never** scans arbitrary external targets
- **Never** executes repository code directly on the host
- All dynamic testing happens in **isolated, disposable Docker containers**
- Secrets found in code are **redacted** before display
- Every finding backed by **evidence**, not just AI claims

---

## 📊 Vulnerability Coverage

| Category | Tool | CWE |
|---|---|---|
| SQL Injection | Semgrep + Custom | CWE-89 |
| Command Injection | Semgrep + Custom | CWE-78 |
| Path Traversal | Custom | CWE-22 |
| XSS | Semgrep | CWE-79 |
| Hardcoded Secrets | Secret Detector | CWE-798 |
| Missing Authentication | Custom | CWE-306 |
| IDOR | Custom | CWE-639 |
| CORS Misconfiguration | Custom | CWE-942 |
| Insecure Deserialization | Custom | CWE-502 |
| Insecure Cryptography | Custom | CWE-338 |
| Docker Misconfiguration | Custom | CWE-250 |
| Vulnerable Dependencies | Custom | CWE-1035 |

---

## 📋 API Documentation

Interactive docs available at: http://localhost:8000/api/docs

Key endpoints:
- `POST /api/auth/demo-login` — Start demo session
- `GET /api/demo/assessment` — Get demo assessment data
- `GET /api/demo/findings` — Get all demo findings
- `GET /api/demo/findings/{id}` — Get finding detail
- `POST /api/demo/simulate-remediation/{id}` — Simulate patch verification
- `POST /api/copilot/chat` — AI Security Copilot

---

*Assessment performed only against the authorized repository and isolated test environment.*  
*RAKSHA — Find it. Fix it. Prove it.*
