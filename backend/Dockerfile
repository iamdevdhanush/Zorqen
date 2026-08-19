FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (semgrep is pinned in requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create data directory
RUN mkdir -p /data

# Cloudflare Containers run images WITHOUT root privileges, so the app must
# run as an unprivileged user. Scratch space (Semgrep scan temp dirs, git
# config) stays under the world-writable /tmp directory; /data is owned by
# the app user but is only written in SQLite dev mode (production uses
# PostgreSQL via DATABASE_URL).
RUN useradd --create-home --uid 1000 raksha \
    && chown -R raksha:raksha /data

USER raksha
ENV HOME=/tmp

EXPOSE 8000

# Koyeb / Render / other PaaS inject PORT at runtime; fall back to 8000 for local Docker use.
# --proxy-headers lets uvicorn honour X-Forwarded-* from the platform proxy so
# rate-limit keying and trusted-host checks see the real client.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers"]
