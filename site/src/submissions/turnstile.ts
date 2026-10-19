// Server-side Turnstile check (spam control for the submission form, spec story 84).
// `remoteip` is never sent, so the Student's IP never passes through our code.
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** A verifier for the endpoint: true only when Cloudflare says the token is good. Fails closed. */
export function turnstileVerifier(secret: string, fetcher: Fetch = fetch): (token: string) => Promise<boolean> {
  return async (token) => {
    try {
      const res = await fetcher(SITEVERIFY, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }).toString(),
      });
      const outcome = (await res.json()) as { success?: unknown };
      return outcome.success === true;
    } catch {
      return false;
    }
  };
}
