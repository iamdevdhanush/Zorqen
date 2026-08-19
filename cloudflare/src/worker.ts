import { Container, getContainer } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

/**
 * Container-enabled Durable Object hosting the RAKSHA FastAPI backend.
 *
 * The FastAPI app listens on port 8000 (uvicorn, `backend/Dockerfile`).
 * `sleepAfter` keeps the container awake for one hour after the last
 * request; the frontend polls assessment status every few seconds while the
 * console is open, so in-flight assessments keep the container warm.
 * Non-secret values live in `vars` in wrangler.jsonc; secrets are set with
 * `wrangler secret put` and land in `env` (the `cloudflare:workers` global),
 * which is the documented way to inject Worker Secrets into a Container.
 */
export class RakshaContainer extends Container {
  defaultPort = 8000;
  sleepAfter = "1h";

  envVars = {
    APP_ENV: env.APP_ENV ?? "production",
    FRONTEND_URL: env.FRONTEND_URL ?? "",
    BACKEND_URL: env.BACKEND_URL ?? "",
    CORS_ORIGINS: env.CORS_ORIGINS ?? "[]",
    TRUSTED_HOSTS: env.TRUSTED_HOSTS ?? "",
    DATABASE_URL: env.DATABASE_URL ?? "",
    SECRET_KEY: env.SECRET_KEY ?? "",
    ENCRYPTION_KEY: env.ENCRYPTION_KEY ?? "",
    GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID ?? "",
    GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET ?? "",
    GITHUB_REDIRECT_URI: env.GITHUB_REDIRECT_URI ?? "",
    GROQ_API_KEY: env.GROQ_API_KEY ?? "",
    GROQ_MODEL: env.GROQ_MODEL ?? "openai/gpt-oss-20b",
    GROK_API_KEY: env.GROK_API_KEY ?? "",
    GROK_MODEL: env.GROK_MODEL ?? "grok-4-latest",
    SANDBOX_ENABLED: "false",
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Wrangler assets config runs this Worker first only for /api/* and
    // /health*; every other path is served directly from static assets with
    // SPA fallback, so this handler only ever sees backend traffic.
    const container = getContainer(env.RAKSHA_CONTAINER);
    return container.fetch(request);
  },
};