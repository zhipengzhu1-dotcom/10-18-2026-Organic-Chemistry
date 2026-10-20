// The real Turnstile verifier, with Cloudflare's siteverify replaced by a fake fetch (offline).
import { describe, expect, it } from "vitest";
import { turnstileVerifier } from "./turnstile.ts";

type Sent = { url: string; body: URLSearchParams };

function fakeFetch(reply: () => Response | Promise<Response>, sent: Sent[] = []) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), body: new URLSearchParams(init?.body as string) });
    return reply();
  };
}

describe("the Turnstile verifier", () => {
  it("asks siteverify with only the secret and the token, never the Student's IP", async () => {
    const sent: Sent[] = [];
    const verify = turnstileVerifier("secret-1", fakeFetch(() => Response.json({ success: true }), sent));
    expect(await verify("token-1")).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect([...sent[0].body.entries()]).toEqual([
      ["secret", "secret-1"],
      ["response", "token-1"],
    ]);
  });

  it("fails a token Cloudflare rejects", async () => {
    const verify = turnstileVerifier("s", fakeFetch(() => Response.json({ success: false, "error-codes": ["invalid-input-response"] })));
    expect(await verify("t")).toBe(false);
  });

  it("fails closed when Cloudflare can't be reached", async () => {
    const verify = turnstileVerifier("s", fakeFetch(() => Promise.reject(new TypeError("network down"))));
    expect(await verify("t")).toBe(false);
  });

  it("fails closed on a non-JSON reply", async () => {
    const verify = turnstileVerifier("s", fakeFetch(() => new Response("bad gateway", { status: 502 })));
    expect(await verify("t")).toBe(false);
  });
});
