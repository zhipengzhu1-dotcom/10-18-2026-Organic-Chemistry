// The submission endpoint (spec #56, seam 3): POST /api/submit. functions/api/submit.ts is the
// thin Pages Function adapter; everything testable lives here, with D1, Turnstile and the
// clock injected. Only the form fields are read: never headers, cookies or request.cf.
import { validate } from "./form.ts";
import { cleanUp, insertSubmission, type Db } from "./store.ts";

export interface SubmitDeps {
  db: Db;
  /** Checks a Turnstile token with Cloudflare; tests pass a fake. */
  verify: (token: string) => Promise<boolean>;
  /** Epoch milliseconds. */
  now: () => number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function handleSubmit(request: Request, deps: SubmitDeps): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, errors: { form: "Send the form from the AstraTron form page." } }, 400);
  }
  const result = validate((name) => {
    const value = form.get(name);
    return typeof value === "string" ? value : null;
  });
  if (!result.ok) return json({ ok: false, errors: result.errors }, 400);
  const token = form.get("cf-turnstile-response");
  if (typeof token !== "string" || !token || !(await deps.verify(token)))
    return json({ ok: false, errors: { turnstile: "We couldn't check you're not a bot. Reload the page and try again." } }, 400);
  const now = deps.now();
  await cleanUp(deps.db, now);
  await insertSubmission(deps.db, result.submission, now);
  return json({ ok: true });
}
