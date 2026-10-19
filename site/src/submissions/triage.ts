// The submissions triage (#76): what the owner's agent runs, on request, to turn new
// Submitted Problems and Mistake reports into Problem-file and fix PRs. The agent never sees a
// reply email, and everything bound for a PR is checked for personal data and raw text first.
// Rows go through store.ts only; nothing here sends email or talks to GitHub.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseProblem, readBank } from "@astratron/content";
import { cleanUp, moveTo, problemMerged, submissions, type Db, type Kind, type Submission } from "./store.ts";

/** What the agent sees of a received row: everything but the reply email. */
export interface Candidate {
  id: string;
  kind: Kind;
  unit: string;
  target_id: string | null;
  problem_text: string;
  answer: string;
  molecule: string | null;
  /** The name an accepted Problem is credited to. */
  credit: string;
  /** The id its draft Problem file must use (Submitted Problems only). */
  draftId: string;
  hasEmail: boolean;
  /** Mechanical screens; the agent adds its own judgment (off-topic, wrong chemistry). */
  flags: { personalInfo: string[]; spam: string[]; duplicateOf: string[] };
}

/** The id a Submitted Problem's draft Problem file must use. */
export const draftIdOf = (row: Pick<Submission, "id" | "unit">) => `${row.unit}-s-${row.id.slice(0, 8)}`;

/** Credit for an accepted Problem: the chosen display name, else "a Student". */
export const creditOf = (row: Pick<Submission, "display_name">) => row.display_name?.trim() || "a Student";

const PERSONAL: [string, RegExp][] = [
  ["an email address", /[^\s@]+@[^\s@]+\.[a-z]{2,}/i],
  ["a phone number", /(?:\+?\d[\s().-]*){9,}/],
  ["a name", /\b(?:my name is|my name's|i'm called|i am called|call me)\b/i],
  ["a social handle", /(?:^|\s)@[a-z0-9_]{3,}/i],
];
/** Kinds of personal info found in a piece of text. */
export const personalInfoIn = (text: string) => PERSONAL.filter(([, re]) => re.test(text)).map(([what]) => what);

function spamIn(text: string): string[] {
  const found: string[] = [];
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|ru|xyz)\b/i.test(text)) found.push("a link");
  const words = text.match(/[a-z]{2,}/gi) ?? [];
  if (/(.)\1{7,}/.test(text) || new Set(words.map((w) => w.toLowerCase())).size < 3) found.push("no real words");
  return found;
}

const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
/** Word-set overlap (Jaccard) at which a submission is flagged as a likely duplicate. */
const DUPLICATE_AT = 0.6;
function overlap(a: Set<string>, b: Set<string>) {
  const shared = [...a].filter((w) => b.has(w)).length;
  return shared / (a.size + b.size - shared || 1);
}

/**
 * Starts a triage run: applies the retention rules (Pages has no cron, so every run does),
 * then returns the received rows, oldest first, screened against `subjectDir`'s Problem Bank.
 */
export async function startRun(db: Db, subjectDir: string, now: number) {
  const cleanedUp = await cleanUp(db, now);
  const bank = readBank(subjectDir).map((p) => ({ id: p.id, words: words(p.prompt) }));
  const candidates: Candidate[] = (await submissions(db, "received")).map((row) => {
    const text = `${row.problem_text}\n${row.answer}\n${row.molecule ?? ""}`;
    const asked = words(row.problem_text);
    return {
      id: row.id,
      kind: row.kind,
      unit: row.unit,
      target_id: row.target_id,
      problem_text: row.problem_text,
      answer: row.answer,
      molecule: row.molecule,
      credit: creditOf(row),
      draftId: draftIdOf(row),
      hasEmail: row.reply_email !== null,
      flags: {
        personalInfo: personalInfoIn(text),
        spam: spamIn(row.problem_text),
        duplicateOf:
          row.kind === "problem" ? bank.filter((p) => overlap(asked, p.words) >= DUPLICATE_AT).map((p) => p.id) : [],
      },
    };
  });
  return { cleanedUp, candidates };
}

async function received(db: Db, id: string): Promise<Submission> {
  const row = (await submissions(db)).find((r) => r.id === id);
  if (!row) throw new Error(`No submission ${id}`);
  if (row.status !== "received") throw new Error(`Submission ${id} is ${row.status}, not received`);
  return row;
}

/** Throws if `text` (bound for a PR or the repo) holds personal info or the row's reply email. */
function assertPrivate(text: string, row: Submission, what: string) {
  const found = personalInfoIn(text);
  if (row.reply_email && text.toLowerCase().includes(row.reply_email.toLowerCase())) found.push("the reply email");
  if (found.length) throw new Error(`The ${what} holds personal info: ${[...new Set(found)].join(", ")}`);
}

/** How many words in a row, copied from the submission, count as raw text in a PR. */
const RAW_RUN = 6;
/** Throws if `text` copies a run of the submission's own words: a PR carries no raw text. */
function assertNoRawText(text: string, row: Submission, what: string) {
  const seq = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const runs = (s: string) => {
    const w = seq(s);
    return new Set(w.slice(0, Math.max(0, w.length - RAW_RUN + 1)).map((_, i) => w.slice(i, i + RAW_RUN).join(" ")));
  };
  const mine = runs(text);
  for (const raw of [row.problem_text, row.answer])
    for (const run of runs(raw)) if (mine.has(run)) throw new Error(`The ${what} copies raw text from the submission: "${run}"`);
}

const afterMerge = (id: string) =>
  [
    "",
    "Drafted by the submissions triage. This PR holds no reply email and none of the submission's raw text.",
    "",
    `After merging, record the decision: \`pnpm triage accept ${id}\` (deletes the row).`,
    `If you close it unmerged instead: \`pnpm triage reject ${id}\`.`,
  ].join("\n");

export interface DraftOptions {
  /** The Subject folder in the content tree, e.g. content/subjects/organic. */
  subjectDir: string;
  now: number;
}

/**
 * Turns an accepted candidate into a draft Problem file: validates the agent-written file
 * (schema, status draft, the row's Unit and credit, no personal info), writes it into the
 * Problem Bank, moves the row to drafted and returns the PR's branch and body.
 */
export async function draftProblem(db: Db, id: string, fileText: string, { subjectDir, now }: DraftOptions) {
  const row = await received(db, id);
  if (row.kind !== "problem") throw new Error(`Submission ${id} is a Mistake report; use draftFix`);
  const { problem, errors } = parseProblem(fileText);
  if (!problem) throw new Error(`The Problem file isn't valid:\n${errors.join("\n")}`);
  const expectedId = draftIdOf(row);
  const credit = creditOf(row);
  const wrong = [
    problem.id !== expectedId && `id must be ${expectedId}`,
    problem.status !== "draft" && "status must be draft (the owner approves it)",
    problem.unit !== row.unit && `unit must be ${row.unit}`,
    problem.credit !== credit && `credit must be "${credit}"`,
    !existsSync(join(subjectDir, "lessons", `${problem.lesson}.yaml`)) && `there is no Lesson ${problem.lesson}`,
  ].filter(Boolean);
  if (wrong.length) throw new Error(`The Problem file is wrong: ${wrong.join("; ")}`);
  assertPrivate(fileText, row, "Problem file");

  const file = join(subjectDir, "problems", `${problem.id}.yaml`);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  writeFileSync(file, fileText);
  await moveTo(db, id, "drafted", now);
  const prBody = [
    `Adds the draft Problem \`${problem.id}\` from a Submitted Problem (submission \`${id}\`).`,
    "",
    `- Unit: ${problem.unit}, Lesson: ${problem.lesson}`,
    `- Type: ${problem.type}, difficulty ${problem.difficulty}`,
    `- Source: ${problem.source}`,
    `- Credit: ${credit}`,
    "- Status: draft. Check the chemistry, then set `status: approved` before merging.",
    afterMerge(id),
  ].join("\n");
  return { file, branch: `submission/${problem.id}`, prBody };
}

/** The built file a Mistake report's target lives in: a Problem file, or the Lesson file for `<lesson>#<step>`. */
function targetFile(subjectDir: string, target: string) {
  const [lesson, step] = target.split("#");
  const file = step ? join(subjectDir, "lessons", `${lesson}.yaml`) : join(subjectDir, "problems", `${target}.yaml`);
  if (!existsSync(file)) throw new Error(`No built file for ${target}`);
  return file;
}

/**
 * Records a confirmed Mistake report: the agent has fixed the built Lesson or Problem file;
 * this checks its one-line summary (no personal info, no raw text), moves the row to drafted
 * and returns the fix PR's branch and body.
 */
export async function draftFix(db: Db, id: string, { subjectDir, summary, now }: DraftOptions & { summary: string }) {
  const row = await received(db, id);
  if (row.kind !== "mistake" || !row.target_id) throw new Error(`Submission ${id} is a Submitted Problem; use draftProblem`);
  const file = targetFile(subjectDir, row.target_id);
  assertPrivate(summary, row, "summary");
  assertNoRawText(summary, row, "summary");
  await moveTo(db, id, "drafted", now);
  const prBody = [
    `Fixes \`${row.target_id}\` from a confirmed Mistake report (submission \`${id}\`).`,
    "",
    summary,
    afterMerge(id),
  ].join("\n");
  return { file, branch: `fix/${row.target_id.replace("#", "-")}-${id.slice(0, 8)}`, prBody };
}

/** Screens out a received row (personal info, spam, off-topic, duplicate, or not a mistake). */
export const screenOut = (db: Db, id: string, now: number) => moveTo(db, id, "screened-out", now);

/** The owner merged the PR: the row is accepted and deleted, leaving only the published file. */
export async function accept(db: Db, id: string, now: number) {
  await moveTo(db, id, "accepted", now);
  await problemMerged(db, id);
}

/** The owner closed the PR unmerged: the row is rejected, and deleted 30 days later. */
export const reject = (db: Db, id: string, now: number) => moveTo(db, id, "rejected", now);

export type Outcome = "accepted" | "rejected" | "screened-out";

/**
 * Drafts the one reply as text, or null when the Student left no address. v1 sends nothing,
 * so the reply is not recorded as sent; the address is never part of the draft.
 */
export async function draftReply(db: Db, id: string, outcome: Outcome): Promise<string | null> {
  const row = (await submissions(db)).find((r) => r.id === id);
  if (!row) throw new Error(`No submission ${id}`);
  if (!row.reply_email) return null;
  const what = row.kind === "problem" ? "the Problem you suggested" : "the mistake you reported";
  const body: Record<Outcome, string> = {
    accepted:
      row.kind === "problem"
        ? `A chemist checked ${what} and it has been accepted. It now appears in AstraTron's Problem Bank, credited to "${creditOf(row)}".`
        : `A chemist checked ${what}: you were right, and the fix has been accepted and published.`,
    rejected: `A chemist looked closely at ${what}, and this time it hasn't been accepted.`,
    "screened-out":
      row.kind === "problem"
        ? `We weren't able to use ${what}: it overlaps a Problem we already have, or falls outside what AstraTron covers.`
        : `We checked ${what} and the content looks right as it stands.`,
  };
  return [
    `Hi ${row.display_name?.trim() || "there"},`,
    "",
    `Thank you for writing to AstraTron. ${body[outcome]}`,
    "",
    "This is the only reply we send, and we delete your address now.",
    "",
    "AstraTron",
  ].join("\n");
}
