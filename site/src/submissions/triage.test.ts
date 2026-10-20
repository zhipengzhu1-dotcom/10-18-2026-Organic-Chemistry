// The triage command (#76) against local D1 under Cloudflare's emulator, with a temp content
// tree as the Problem Bank and an injected clock. Nothing here touches the network or GitHub.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import { insertSubmission, moveTo, submissions, type Db, type NewSubmission } from "./store.ts";
import { accept, draftFix, draftProblem, draftReply, reject, screenOut, startRun } from "./triage.ts";

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: Db }>>>;
let db: Db;

async function migrate(db: Db) {
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(file, dir), "utf8").replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").filter((s) => s.trim())) await db.prepare(statement).run();
  }
}

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: Db }>({
    configPath: fileURLToPath(new URL("../../wrangler.toml", import.meta.url)),
    persist: false,
    remoteBindings: false,
  });
  db = proxy.env.DB;
  await migrate(db);
}, 60_000);
afterAll(() => proxy?.dispose());

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 19, 12);

/** A one-Subject content tree holding one Bank Problem and one Lesson. */
let subject: string;
beforeEach(async () => {
  await db.prepare("DELETE FROM submissions").run();
  subject = join(mkdtempSync(join(tmpdir(), "astratron-triage-")), "organic");
  mkdirSync(join(subject, "problems"), { recursive: true });
  mkdirSync(join(subject, "lessons"), { recursive: true });
  writeFileSync(
    join(subject, "problems", "u1-p1.yaml"),
    [
      "id: u1-p1",
      "unit: u1",
      "lesson: u1-l4",
      "difficulty: 1",
      "status: approved",
      "source: Original",
      "type: multiple-choice",
      "prompt: Which carbon in propene is sp3 hybridized?",
      "options:",
      "  - { id: a, text: C1 }",
      "  - { id: b, text: C3 }",
      "answer: [b]",
      "correct: C3 has four sigma bonds.",
      "hints:",
      "  - text: Count the bonds on each carbon.",
      "reveal: C3, the CH3.",
      "",
    ].join("\n"),
  );
  writeFileSync(join(subject, "lessons", "u1-l4.yaml"), "id: u1-l4\n");
});

const base: NewSubmission = {
  kind: "problem",
  unit: "u1",
  target_id: null,
  problem_text: "How many pi bonds are in acetonitrile, CH3CN, and what holds the nitrogen lone pair?",
  answer: "Two pi bonds in the triple bond; the lone pair sits in an sp orbital on nitrogen.",
  molecule: "CC#N",
  display_name: null,
  reply_email: null,
};
const add = (over: Partial<NewSubmission> = {}, at = T0) => insertSubmission(db, { ...base, ...over }, at);
const rowOf = async (id: string) => (await submissions(db)).find((r) => r.id === id);

describe("starting a triage run", () => {
  it("applies the retention rules first, then lists only received rows, oldest first", async () => {
    const stale = await add({ reply_email: "old@example.org" }, T0 - 100 * DAY);
    const declined = await add({}, T0 - 50 * DAY);
    await moveTo(db, declined, "screened-out", T0 - 40 * DAY);
    const drafted = await add({}, T0 - DAY);
    await moveTo(db, drafted, "drafted", T0 - DAY);
    const fresh = await add({}, T0);

    const run = await startRun(db, subject, T0);

    expect(run.cleanedUp).toEqual({ emailsDeleted: 1, rowsDeleted: 1 });
    expect(run.candidates.map((c) => c.id)).toEqual([stale, fresh]);
    expect(await rowOf(declined)).toBeUndefined();
  });

  it("never hands out the reply email, only whether one was given", async () => {
    await add({ reply_email: "ana@example.org", display_name: "Ana" });
    const { candidates } = await startRun(db, subject, T0);
    expect(candidates[0]).toMatchObject({ hasEmail: true, credit: "Ana" });
    expect(JSON.stringify(candidates)).not.toContain("ana@example.org");
  });

  it("credits a Student who gave no display name as \"a Student\"", async () => {
    await add();
    expect((await startRun(db, subject, T0)).candidates[0].credit).toBe("a Student");
  });

  it("flags personal info in the text", async () => {
    await add({ problem_text: "Email me at kid@school.edu or call 555-123-4567 about this alkene." });
    await add({ answer: "My name is Jordan Lee, and the answer is sp2." }, T0 + 1);
    await add({}, T0 + 2);
    const flags = (await startRun(db, subject, T0)).candidates.map((c) => c.flags.personalInfo);
    expect(flags).toEqual([["an email address", "a phone number"], ["a name"], []]);
  });

  it("flags spam", async () => {
    await add({ problem_text: "BUY CHEAP ESSAYS https://spam.example.com now!!!" });
    await add({ problem_text: "aaaaaaaaaaaaaaaaaaaaaaaa" }, T0 + 1);
    const flags = (await startRun(db, subject, T0)).candidates.map((c) => c.flags.spam);
    expect(flags).toEqual([["a link"], ["no real words"]]);
  });

  it("flags a likely duplicate of a Bank Problem", async () => {
    await add({ problem_text: "In propene, which carbon is sp3 hybridized?" });
    await add({}, T0 + 1);
    const dupes = (await startRun(db, subject, T0)).candidates.map((c) => c.flags.duplicateOf);
    expect(dupes).toEqual([["u1-p1"], []]);
  });
});

describe("screening out", () => {
  it("moves a received row to screened-out, starting its 30-day clock", async () => {
    const id = await add();
    await screenOut(db, id, T0);
    expect(await rowOf(id)).toMatchObject({ status: "screened-out", decided_at: T0 });
  });
});

/** A full draft Problem file, as the agent would write it. */
const draftFile = (problemId: string, over: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    id: problemId,
    unit: "u1",
    lesson: "u1-l4",
    difficulty: "2",
    status: "draft",
    source: "Submitted Problem",
    credit: "a Student",
    type: "multiple-choice",
    prompt: "Acetonitrile is CH₃–C≡N. How many π bonds does it have?",
    ...over,
  };
  return [
    ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`),
    "options:",
    '  - { id: a, text: "1" }',
    '  - { id: b, text: "2" }',
    "answer: [b]",
    "correct: A triple bond is one σ bond and two π bonds.",
    "hints:",
    "  - match: [a]",
    "    text: A triple bond holds more than one π bond.",
    "  - text: Count the bonds in C≡N beyond the first.",
    "reveal: Two, both in the C≡N triple bond.",
    "",
  ].join("\n");
};

describe("drafting a Problem file", () => {
  it("writes a draft Problem file, moves the row to drafted and returns a PR with no email or raw text", async () => {
    const id = await add({ reply_email: "ana@example.org" });
    const [candidate] = (await startRun(db, subject, T0)).candidates;
    const draft = await draftProblem(db, id, draftFile(candidate.draftId), { subjectDir: subject, now: T0 + DAY });

    expect(candidate.draftId).toMatch(/^u1-s-[a-f0-9]{8}$/);
    expect(draft.file).toBe(join(subject, "problems", `${candidate.draftId}.yaml`));
    expect(readFileSync(draft.file, "utf8")).toBe(draftFile(candidate.draftId));
    expect(draft.branch).toBe(`submission/${candidate.draftId}`);
    expect(draft.prBody).toContain(candidate.draftId);
    expect(draft.prBody).toContain("Credit: a Student");
    expect(draft.prBody).toContain(`pnpm triage accept ${id}`);
    for (const leak of ["ana@example.org", base.problem_text, base.answer, "acetonitrile, CH3CN, and what holds"])
      expect(draft.prBody).not.toContain(leak);
    expect(await rowOf(id)).toMatchObject({ status: "drafted", decided_at: null });
  });

  it.each([
    ["isn't a valid Problem file", { type: "essay" }, "type"],
    ["is already approved", { status: "approved" }, "status must be draft"],
    ["credits the wrong name", { credit: "Ana" }, 'credit must be "a Student"'],
    ["is for another Unit", { unit: "u2" }, "unit must be u1"],
    ["names a Lesson that doesn't exist", { lesson: "u1-l9" }, "no Lesson u1-l9"],
    ["has the wrong id", { id: "u1-mine" }, "id must be"],
    ["holds personal info", { prompt: "Ask kid@school.edu how many π bonds in CH₃CN?" }, "an email address"],
  ])("refuses a file that %s, leaving the row received", async (_, over, error) => {
    const id = await add();
    const [{ draftId }] = (await startRun(db, subject, T0)).candidates;
    await expect(draftProblem(db, id, draftFile(draftId, over), { subjectDir: subject, now: T0 })).rejects.toThrow(error);
    expect((await rowOf(id))?.status).toBe("received");
    expect(existsSync(join(subject, "problems", `${draftId}.yaml`))).toBe(false);
  });

  it("refuses to draft a Problem from a Mistake report", async () => {
    const id = await add({ kind: "mistake", target_id: "u1-p1" });
    const [{ draftId }] = (await startRun(db, subject, T0)).candidates;
    await expect(draftProblem(db, id, draftFile(draftId), { subjectDir: subject, now: T0 })).rejects.toThrow(
      "is a Mistake report",
    );
  });
});

describe("a confirmed Mistake report", () => {
  const report = {
    kind: "mistake" as const,
    problem_text: "The reveal says C1 but C1 is sp2 in propene, so the answer key looks wrong.",
    answer: "C3 is the sp3 carbon, it has four single bonds.",
  };

  it("becomes a fix PR naming the built file it changes, and the row moves to drafted", async () => {
    const id = await add({ ...report, target_id: "u1-p1", reply_email: "ana@example.org" });
    const fix = await draftFix(db, id, { subjectDir: subject, summary: "Reveal now names C3 as the sp3 carbon.", now: T0 });
    expect(fix.file).toBe(join(subject, "problems", "u1-p1.yaml"));
    expect(fix.branch).toBe(`fix/u1-p1-${id.slice(0, 8)}`);
    expect(fix.prBody).toContain("Reveal now names C3 as the sp3 carbon.");
    expect(fix.prBody).toContain(`pnpm triage accept ${id}`);
    expect(fix.prBody).not.toContain("ana@example.org");
    expect((await rowOf(id))?.status).toBe("drafted");
  });

  it("about a Step points at its Lesson file", async () => {
    const id = await add({ ...report, target_id: "u1-l4#s07" });
    const fix = await draftFix(db, id, { subjectDir: subject, summary: "Fixes the angle in Step s07.", now: T0 });
    expect(fix.file).toBe(join(subject, "lessons", "u1-l4.yaml"));
    expect(fix.prBody).toContain("u1-l4#s07");
  });

  it.each([
    ["copies the report's raw text", "the answer key looks wrong. C3 is the sp3 carbon, it has four single bonds.", "raw text"],
    ["holds personal info", "Fix from Jordan, call 555-123-4567.", "a phone number"],
  ])("refuses a summary that %s", async (_, summary, error) => {
    const id = await add({ ...report, target_id: "u1-p1" });
    await expect(draftFix(db, id, { subjectDir: subject, summary, now: T0 })).rejects.toThrow(error);
    expect((await rowOf(id))?.status).toBe("received");
  });

  it("refuses a target that isn't a built file", async () => {
    const id = await add({ ...report, target_id: "u1-p404" });
    await expect(draftFix(db, id, { subjectDir: subject, summary: "x", now: T0 })).rejects.toThrow(
      "No built file for u1-p404",
    );
  });
});

describe("the owner's decision", () => {
  it("accepting after the PR merges deletes the row: only the published file remains", async () => {
    const id = await add({ display_name: "Ana", reply_email: "ana@example.org" });
    await moveTo(db, id, "drafted", T0);
    await accept(db, id, T0 + DAY);
    expect(await submissions(db)).toEqual([]);
  });

  it("rejecting keeps the row 30 days, then the next run deletes it", async () => {
    const id = await add();
    await moveTo(db, id, "drafted", T0);
    await reject(db, id, T0);
    expect((await rowOf(id))?.status).toBe("rejected");
    await startRun(db, subject, T0 + 30 * DAY);
    expect(await rowOf(id)).toBeUndefined();
  });

  it("can't accept a row that was never drafted", async () => {
    const id = await add();
    await expect(accept(db, id, T0)).rejects.toThrow("Can't move a received submission to accepted");
  });
});

describe("the one reply", () => {
  it("is drafted as text without the address, and nothing is recorded as sent", async () => {
    const id = await add({ display_name: "Ana", reply_email: "ana@example.org" });
    await moveTo(db, id, "drafted", T0);
    const reply = await draftReply(db, id, "accepted");
    expect(reply).toContain("Ana");
    expect(reply).toContain("accepted");
    expect(reply).not.toContain("ana@example.org");
    expect(await rowOf(id)).toMatchObject({ reply_email: "ana@example.org", replied_at: null });
  });

  it("words each outcome differently", async () => {
    const id = await add({ reply_email: "s@example.org" });
    const texts = await Promise.all(
      (["accepted", "rejected", "screened-out"] as const).map((o) => draftReply(db, id, o)),
    );
    expect(new Set(texts).size).toBe(3);
  });

  it("for an accepted row is handed back by accept, since accepting deletes the row (stories 87/88)", async () => {
    const id = await add({ display_name: "Ana", reply_email: "ana@example.org" });
    await moveTo(db, id, "drafted", T0);
    const reply = await accept(db, id, T0 + DAY);
    expect(reply).toContain("Ana");
    expect(reply).toContain("accepted");
    expect(reply).not.toContain("ana@example.org");
    expect(await submissions(db)).toEqual([]);
  });

  it("promises only what v1 does with the address: it goes within 90 days, not now", async () => {
    const id = await add({ reply_email: "s@example.org" });
    for (const outcome of ["accepted", "rejected", "screened-out"] as const) {
      const reply = (await draftReply(db, id, outcome))!;
      expect(reply).not.toMatch(/delete your address now/);
      expect(reply).toContain("within 90 days");
    }
  });

  it("is not drafted when the Student left no address", async () => {
    const id = await add();
    expect(await draftReply(db, id, "rejected")).toBeNull();
  });
});
