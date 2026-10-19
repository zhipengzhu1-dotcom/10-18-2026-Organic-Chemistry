// The submissions table in D1 (schema: site/migrations). This module is the only code that
// writes rows; the Pages Function and the triage command (#76) both go through it.
// It never sees request headers, so an IP address, user agent or cookie cannot reach a row.

/** The slice of Cloudflare's D1Database this module uses (Miniflare's and workerd's both fit). */
export interface Db {
  prepare(sql: string): Stmt;
}
interface Stmt {
  bind(...values: unknown[]): Stmt;
  run(): Promise<{ meta: { changes: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export type Kind = "problem" | "mistake";
export type Status = "received" | "screened-out" | "drafted" | "accepted" | "rejected";

/** What a Student sends, after validation. */
export interface NewSubmission {
  kind: Kind;
  unit: string;
  target_id: string | null;
  problem_text: string;
  answer: string;
  molecule: string | null;
  display_name: string | null;
  reply_email: string | null;
}

export interface Submission extends NewSubmission {
  id: string;
  consent: 1;
  status: Status;
  /** Epoch milliseconds (UTC). */
  created_at: number;
  /** When the row reached screened-out, accepted or rejected. */
  decided_at: number | null;
  /** When the one reply was recorded as sent; the email is gone from then on. */
  replied_at: number | null;
}

/** Stores one received row and returns its id. */
export async function insertSubmission(db: Db, s: NewSubmission, now: number): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO submissions (id, kind, unit, target_id, problem_text, answer, molecule, display_name, reply_email, consent, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'received', ?)`,
    )
    .bind(id, s.kind, s.unit, s.target_id, s.problem_text, s.answer, s.molecule, s.display_name, s.reply_email, now)
    .run();
  return id;
}

/** The states a row may move to from each state: received → screened-out | drafted → accepted | rejected. */
const NEXT: Record<Status, Status[]> = {
  received: ["screened-out", "drafted"],
  drafted: ["accepted", "rejected"],
  "screened-out": [],
  accepted: [],
  rejected: [],
};
/** States that are a decision; their time starts the retention clock. */
const DECIDED: Status[] = ["screened-out", "accepted", "rejected"];

const DAY = 86_400_000;
/** An unanswered reply email is deleted this long after the submission. */
export const EMAIL_KEPT_MS = 90 * DAY;
/** Rejected and screened-out rows are deleted this long after the decision. */
export const DECLINED_KEPT_MS = 30 * DAY;

async function statusOf(db: Db, id: string): Promise<Status> {
  const row = await db.prepare("SELECT status FROM submissions WHERE id = ?").bind(id).first<{ status: Status }>();
  if (!row) throw new Error(`No submission ${id}`);
  return row.status;
}

/** Moves a row to its next state; throws on a move the state machine doesn't allow. */
export async function moveTo(db: Db, id: string, to: Status, now: number): Promise<void> {
  const from = Object.entries(NEXT)
    .filter(([, next]) => next.includes(to))
    .map(([state]) => state);
  const decided = DECIDED.includes(to) ? now : null;
  const { meta } = await db
    .prepare(
      `UPDATE submissions SET status = ?, decided_at = COALESCE(?, decided_at)
       WHERE id = ? AND status IN (${from.map(() => "?").join(", ") || "NULL"})`,
    )
    .bind(to, decided, id, ...from)
    .run();
  if (meta.changes === 0) throw new Error(`Can't move a ${await statusOf(db, id)} submission to ${to}`);
}

/** Records the one reply as sent; the reply email is deleted at the same moment. */
export async function replySent(db: Db, id: string, now: number): Promise<void> {
  await statusOf(db, id);
  await db.prepare("UPDATE submissions SET reply_email = NULL, replied_at = ? WHERE id = ?").bind(now, id).run();
}

/** Deletes an accepted row once its Problem file has merged: only the published file remains. */
export async function problemMerged(db: Db, id: string): Promise<void> {
  const status = await statusOf(db, id);
  if (status !== "accepted") throw new Error(`Can't forget a ${status} submission; only accepted ones`);
  await db.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
}

/**
 * Applies the retention rules as of `now`: unanswered emails go after 90 days, rejected and
 * screened-out rows 30 days after the decision. Pages has no cron, so this runs on every
 * submission and in every triage run (#76).
 */
export async function cleanUp(db: Db, now: number): Promise<{ emailsDeleted: number; rowsDeleted: number }> {
  const emails = await db
    .prepare("UPDATE submissions SET reply_email = NULL WHERE reply_email IS NOT NULL AND created_at <= ?")
    .bind(now - EMAIL_KEPT_MS)
    .run();
  const rows = await db
    .prepare("DELETE FROM submissions WHERE status IN ('rejected', 'screened-out') AND decided_at <= ?")
    .bind(now - DECLINED_KEPT_MS)
    .run();
  return { emailsDeleted: emails.meta.changes, rowsDeleted: rows.meta.changes };
}

/** Every row, oldest first. Pass a status to read only rows in that state. */
export async function submissions(db: Db, status?: Status): Promise<Submission[]> {
  const stmt = status
    ? db.prepare("SELECT * FROM submissions WHERE status = ? ORDER BY created_at, id").bind(status)
    : db.prepare("SELECT * FROM submissions ORDER BY created_at, id");
  return (await stmt.all<Submission>()).results;
}
