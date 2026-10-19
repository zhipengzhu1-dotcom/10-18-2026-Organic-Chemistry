// Seam 3: the submission endpoint against local D1 under Cloudflare's emulator (Miniflare/workerd).
// Turnstile is a fake verifier and the clock is injected, so these tests run offline.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import { handleSubmit, type SubmitDeps } from "./submit.ts";
import { cleanUp, moveTo, problemMerged, replySent, submissions, type Db } from "./store.ts";

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: Db }>>>;
let db: Db;

/** Applies site/migrations in order, as `wrangler d1 migrations apply` does. */
async function migrate(db: Db) {
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8").replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").filter((s) => s.trim())) await db.prepare(statement).run();
  }
}

beforeAll(async () => {
  // The D1 binding from site/wrangler.toml, in memory (persist: false), so tests never touch .wrangler/state.
  proxy = await getPlatformProxy<{ DB: Db }>({
    configPath: fileURLToPath(new URL("../../wrangler.toml", import.meta.url)),
    persist: false,
    remoteBindings: false,
  });
  db = proxy.env.DB;
  await migrate(db);
}, 60_000);
afterAll(() => proxy?.dispose());
beforeEach(async () => {
  await db.prepare("DELETE FROM submissions").run();
});

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 19, 12);

function deps(over: Partial<SubmitDeps> = {}): SubmitDeps {
  return { db, verify: async (token) => token === "good-token", now: () => T0, ...over };
}

const problem = {
  kind: "problem",
  unit: "u1",
  problem_text: "Which carbon in propene is sp3?",
  answer: "C3, the CH3: four sigma bonds and no pi bond.",
  consent: "on",
  "cf-turnstile-response": "good-token",
};

function post(fields: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/submit", { method: "POST", body: new URLSearchParams(fields), headers });
}

describe("a submission", () => {
  it("stores one received row and answers ok", async () => {
    const res = await handleSubmit(post(problem), deps());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const rows = await submissions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "problem",
      unit: "u1",
      target_id: null,
      problem_text: "Which carbon in propene is sp3?",
      answer: "C3, the CH3: four sigma bonds and no pi bond.",
      molecule: null,
      display_name: null,
      reply_email: null,
      status: "received",
      created_at: T0,
    });
  });

  it("as a Mistake report carries its target id and the optional fields", async () => {
    const report = {
      ...problem,
      kind: "mistake",
      target_id: "u1-l4-hybridization#s07",
      problem_text: "The reveal says 109.5° for the H-C-H angle in ethylene.",
      answer: "Ethylene is sp2, so about 120°.",
      molecule: "C=C",
      display_name: "Ana",
      reply_email: "ana@example.org",
    };
    await handleSubmit(post(report), deps());
    expect(await submissions(db)).toMatchObject([
      {
        kind: "mistake",
        target_id: "u1-l4-hybridization#s07",
        molecule: "C=C",
        display_name: "Ana",
        reply_email: "ana@example.org",
      },
    ]);
  });

  it("never stores the IP address, user agent or cookies", async () => {
    const res = await handleSubmit(
      post(problem, {
        "CF-Connecting-IP": "203.0.113.42",
        "X-Forwarded-For": "203.0.113.42",
        "User-Agent": "Mozilla/5.0 (StudentPhone) TestBrowser/99",
        Cookie: "session=abc123secret",
      }),
      deps(),
    );
    expect(res.headers.get("set-cookie")).toBeNull();
    const [row] = await submissions(db);
    expect(Object.keys(row).sort()).toEqual(
      [
        "id", "kind", "unit", "target_id", "problem_text", "answer", "molecule", "display_name",
        "reply_email", "consent", "status", "created_at", "decided_at", "replied_at",
      ].sort(),
    );
    const stored = JSON.stringify(row);
    for (const leak of ["203.0.113.42", "StudentPhone", "TestBrowser", "abc123secret", "session="])
      expect(stored).not.toContain(leak);
  });

  it("without licence consent is rejected with a field error and stores nothing", async () => {
    const { consent: _, ...noConsent } = problem;
    const res = await handleSubmit(post(noConsent), deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      errors: { consent: "Tick the box to agree that an accepted Problem is published under CC BY-NC-SA 4.0." },
    });
    expect(await submissions(db)).toEqual([]);
  });

  it("accepts Problem text of exactly 2,000 characters", async () => {
    const res = await handleSubmit(post({ ...problem, problem_text: "x".repeat(2000) }), deps());
    expect(res.status).toBe(200);
  });

  it.each([
    ["over-length Problem text", { problem_text: "x".repeat(2001) }, { problem_text: "Keep it to 2,000 characters (this is 2,001)." }],
    ["empty Problem text", { problem_text: "  " }, { problem_text: "Write the Problem." }],
    ["no answer", { answer: "" }, { answer: "Give your answer and how you got it." }],
    ["an unknown kind", { kind: "question" }, { kind: "Choose Suggest a Problem or Report a mistake." }],
    ["no Unit", { unit: "" }, { unit: "Choose a Unit." }],
    ["a malformed Unit", { unit: "unit one" }, { unit: "Choose a Unit." }],
    ["a malformed reply email", { reply_email: "me at home" }, { reply_email: "That doesn't look like an email address." }],
    ["an over-long molecule", { molecule: "C".repeat(201) }, { molecule: "Keep it to 200 characters." }],
    ["an over-long display name", { display_name: "a".repeat(61) }, { display_name: "Keep it to 60 characters." }],
    ["a Mistake report with no target", { kind: "mistake" }, { target_id: "Say which Step or Problem is wrong." }],
  ])("with %s is rejected with that field's error", async (_, change, errors) => {
    const res = await handleSubmit(post({ ...problem, ...change }), deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, errors });
    expect(await submissions(db)).toEqual([]);
  });

  it("that isn't form data is rejected, not a server error", async () => {
    const req = new Request("http://localhost/api/submit", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
    const res = await handleSubmit(req, deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, errors: { form: "Send the form from the AstraTron form page." } });
  });

  it("reports every bad field at once", async () => {
    const res = await handleSubmit(post({ kind: "problem", unit: "u1" }), deps());
    expect(Object.keys(((await res.json()) as { errors: object }).errors).sort()).toEqual([
      "answer",
      "consent",
      "problem_text",
    ]);
  });

  it("with a bad Turnstile token is rejected and stores nothing", async () => {
    const res = await handleSubmit(post({ ...problem, "cf-turnstile-response": "forged" }), deps());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      errors: { turnstile: "We couldn't check you're not a bot. Reload the page and try again." },
    });
    expect(await submissions(db)).toEqual([]);
  });

  it("with no Turnstile token is rejected without asking Cloudflare", async () => {
    let asked = false;
    const { "cf-turnstile-response": _, ...noToken } = problem;
    const res = await handleSubmit(post(noToken), deps({ verify: async () => (asked = true) }));
    expect(res.status).toBe(400);
    expect(asked).toBe(false);
  });
});

/** Stores a valid submission at time `at` and returns its id. */
async function submitAt(at: number, fields: Record<string, string> = {}): Promise<string> {
  await handleSubmit(post({ ...problem, ...fields }), deps({ now: () => at }));
  const rows = await submissions(db);
  return rows.find((r) => r.created_at === at)!.id;
}
const statusOf = async (id: string) => (await submissions(db)).find((r) => r.id === id)?.status;

describe("row states", () => {
  it("move received → drafted → accepted, stamping the decision time", async () => {
    const id = await submitAt(T0);
    await moveTo(db, id, "drafted", T0 + DAY);
    await moveTo(db, id, "accepted", T0 + 2 * DAY);
    expect(await submissions(db)).toMatchObject([{ id, status: "accepted", decided_at: T0 + 2 * DAY }]);
  });

  it("move received → screened-out and drafted → rejected", async () => {
    const a = await submitAt(T0);
    const b = await submitAt(T0 + 1);
    await moveTo(db, a, "screened-out", T0 + DAY);
    await moveTo(db, b, "drafted", T0 + DAY);
    await moveTo(db, b, "rejected", T0 + DAY);
    expect([await statusOf(a), await statusOf(b)]).toEqual(["screened-out", "rejected"]);
  });

  it.each([
    ["received", "accepted"],
    ["received", "rejected"],
    ["screened-out", "drafted"],
    ["accepted", "rejected"],
    ["drafted", "received"],
  ] as const)("refuse %s → %s", async (from, to) => {
    const id = await submitAt(T0);
    if (from === "screened-out") await moveTo(db, id, "screened-out", T0);
    if (from === "drafted" || from === "accepted") await moveTo(db, id, "drafted", T0);
    if (from === "accepted") await moveTo(db, id, "accepted", T0);
    await expect(moveTo(db, id, to, T0 + DAY)).rejects.toThrow(`Can't move a ${from} submission to ${to}`);
    expect(await statusOf(id)).toBe(from);
  });

  it("refuse to move a row that doesn't exist", async () => {
    await expect(moveTo(db, "nope", "drafted", T0)).rejects.toThrow("No submission nope");
  });

  it("an accepted row is deleted once its Problem file merges", async () => {
    const id = await submitAt(T0);
    await moveTo(db, id, "drafted", T0);
    await expect(problemMerged(db, id)).rejects.toThrow("Can't forget a drafted submission");
    await moveTo(db, id, "accepted", T0);
    await problemMerged(db, id);
    expect(await submissions(db)).toEqual([]);
  });
});

describe("retention clean-up (injected clock)", () => {
  const withEmail = { reply_email: "student@example.org" };

  it("deletes the email when the reply is recorded as sent", async () => {
    const id = await submitAt(T0, withEmail);
    await replySent(db, id, T0 + DAY);
    expect(await submissions(db)).toMatchObject([{ id, reply_email: null, replied_at: T0 + DAY }]);
  });

  it("deletes an unanswered email after 90 days, not before", async () => {
    const id = await submitAt(T0, withEmail);
    await cleanUp(db, T0 + 90 * DAY - 1);
    expect((await submissions(db))[0].reply_email).toBe("student@example.org");
    await cleanUp(db, T0 + 90 * DAY);
    expect(await submissions(db)).toMatchObject([{ id, reply_email: null, status: "received" }]);
  });

  it("deletes rejected and screened-out rows 30 days after the decision, not before", async () => {
    const rejected = await submitAt(T0);
    const screened = await submitAt(T0 + 1);
    const accepted = await submitAt(T0 + 2);
    const waiting = await submitAt(T0 + 3);
    await moveTo(db, rejected, "drafted", T0);
    await moveTo(db, rejected, "rejected", T0 + 10 * DAY);
    await moveTo(db, screened, "screened-out", T0 + 10 * DAY);
    await moveTo(db, accepted, "drafted", T0);
    await moveTo(db, accepted, "accepted", T0 + 10 * DAY);

    await cleanUp(db, T0 + 40 * DAY - 1);
    expect((await submissions(db)).map((r) => r.id)).toEqual([rejected, screened, accepted, waiting]);
    await cleanUp(db, T0 + 40 * DAY);
    expect((await submissions(db)).map((r) => r.id)).toEqual([accepted, waiting]);
  });

  it("runs on every submission, so no cron is needed", async () => {
    const old = await submitAt(T0, withEmail);
    const gone = await submitAt(T0 + 1);
    await moveTo(db, gone, "screened-out", T0 + 1);
    await submitAt(T0 + 90 * DAY);
    const rows = await submissions(db);
    expect(rows.map((r) => r.id)).not.toContain(gone);
    expect(rows.find((r) => r.id === old)?.reply_email).toBeNull();
  });
});
