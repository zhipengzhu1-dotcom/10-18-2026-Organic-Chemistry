// Cloudflare Pages Function: POST /api/submit. A thin adapter; the endpoint's behaviour and its
// tests live in src/submissions. Bindings come from wrangler.toml (DB) and the TURNSTILE_SECRET var.
import { handleSubmit } from "../../src/submissions/submit.ts";
import { turnstileVerifier } from "../../src/submissions/turnstile.ts";
import type { Db } from "../../src/submissions/store.ts";

interface Env {
  DB: Db;
  TURNSTILE_SECRET: string;
}

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) =>
  handleSubmit(request, { db: env.DB, verify: turnstileVerifier(env.TURNSTILE_SECRET), now: Date.now });
