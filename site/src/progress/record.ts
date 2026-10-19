// The Student's progress record: one versioned object, kept in the browser
// (localStorage, see store.ts) and keyed by stable Lesson, Step and Problem ids,
// so content edits never orphan it. Pure functions with the clock injected.
//
// Versioning: CURRENT_VERSION is the shape below. To change the shape, add the
// old shape's saved record to PAST_RECORDS in record.test.ts, bump the version
// and add a step to MIGRATIONS that lifts version n to n + 1.
import type { LessonProgress } from "../engine/player.ts";

export const CURRENT_VERSION = 1;

/** The latest result of a Problem, wherever it was played (a Check Step or the Practice Set). */
export interface ProblemResult {
  /** Graded tries used: 1 = right first try. */
  tries: number;
  /** Eventually right (before the reveal). */
  correct: boolean;
}

export interface StreakState {
  /** Days in the current Streak (frozen days keep it alive but don't add to it). */
  count: number;
  /** Last local day (YYYY-MM-DD) the Streak was earned. */
  lastDay: string | null;
  /** Freezes held, 0–2; each covers one missed day automatically. */
  freezes: number;
  /** Streak days earned since a freeze was last spent or regained. */
  sinceFreeze: number;
}

export interface ProgressRecord {
  version: typeof CURRENT_VERSION;
  /** Lesson id → its progress (the Step the Student is on, answers by Step id, done). */
  lessons: Record<string, LessonProgress>;
  /** Problem id → its latest result. */
  problems: Record<string, ProblemResult>;
  /** The Lesson the Student last played, for the Hub's Continue card. */
  last?: string;
  streak: StreakState;
  /** What counts toward today's Streak day. */
  today: { day: string; lessons: string[]; problems: string[] };
}

export type LessonStatus = "not-started" | "in-progress" | "done";

/** Lessons a day needs, or Problems (GLOSSARY: Streak). */
const LESSONS_A_DAY = 1;
const PROBLEMS_A_DAY = 3;
const MAX_FREEZES = 2;
/** Streak days that win back one spent freeze. */
const DAYS_PER_FREEZE = 7;

export function emptyRecord(): ProgressRecord {
  return {
    version: CURRENT_VERSION,
    lessons: {},
    problems: {},
    last: undefined,
    streak: { count: 0, lastDay: null, freezes: MAX_FREEZES, sinceFreeze: 0 },
    today: { day: "", lessons: [], problems: [] },
  };
}

/** Version n → version n + 1, for every past version. None yet: version 1 is the first. */
const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

const NOT_A_RECORD = "That file isn't an AstraTron progress file.";
const TOO_NEW = "That file comes from a newer version of AstraTron. Reload the page and try again.";

/** Reads a saved or imported record of any version and brings it up to the current one. */
function upgrade(text: string): { record: ProgressRecord } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: NOT_A_RECORD };
  }
  if (!isObject(data) || typeof data.version !== "number" || !isObject(data.lessons)) return { error: NOT_A_RECORD };
  if (data.version > CURRENT_VERSION) return { error: TOO_NEW };
  let current = data;
  for (let v = data.version; v < CURRENT_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { error: NOT_A_RECORD };
    current = migrate(current);
  }
  const empty = emptyRecord();
  const record = { ...empty, ...current, version: CURRENT_VERSION } as ProgressRecord;
  return { record: { ...record, streak: { ...empty.streak, ...record.streak }, today: { ...empty.today, ...record.today } } };
}

/** The record saved in the browser (or null for a first visit); anything unreadable starts fresh. */
export function loadRecord(saved: string | null): ProgressRecord {
  if (saved === null) return emptyRecord();
  const result = upgrade(saved);
  return "record" in result ? result.record : emptyRecord();
}

export const exportRecord = (record: ProgressRecord) => JSON.stringify(record, null, 2);

/** Reads an exported progress file, from this or an older version of the site. */
export const importRecord = (text: string) => upgrade(text);

export function lessonStatus(record: ProgressRecord, lessonId: string): LessonStatus {
  const lesson = record.lessons[lessonId];
  if (lesson?.done) return "done";
  return lesson && Object.keys(lesson.answers).length > 0 ? "in-progress" : "not-started";
}

/** "n of N Lessons" for a Unit: the On-ramp is optional and doesn't count. */
export function unitCount(record: ProgressRecord, lessons: { id: string; onRamp: boolean }[]) {
  const core = lessons.filter((l) => !l.onRamp);
  return { done: core.filter((l) => lessonStatus(record, l.id) === "done").length, total: core.length };
}

/**
 * Saves a Lesson's progress. Reaching Wrap for the first time counts toward today's Streak;
 * `earned` is true when this save earned today's Streak day.
 */
export function saveLesson(
  record: ProgressRecord,
  lessonId: string,
  progress: LessonProgress,
  now: Date,
): { record: ProgressRecord; earned: boolean } {
  const wasDone = record.lessons[lessonId]?.done ?? false;
  const saved = { ...progress, done: wasDone || progress.done };
  const next = { ...record, lessons: { ...record.lessons, [lessonId]: saved }, last: lessonId };
  if (wasDone || !progress.done) return { record: next, earned: false };
  return countToday(next, now, (t) => ({ ...t, lessons: [...t.lessons, lessonId] }));
}

/** Saves a Problem's result; three different Problems in a day earn the Streak day. */
export function recordProblem(
  record: ProgressRecord,
  problemId: string,
  result: ProblemResult,
  now: Date,
): { record: ProgressRecord; earned: boolean } {
  const next = { ...record, problems: { ...record.problems, [problemId]: result } };
  return countToday(next, now, (t) => (t.problems.includes(problemId) ? t : { ...t, problems: [...t.problems, problemId] }));
}

/** The Streak as the header shows it today: a gap longer than the freezes reads as zero. */
export function streakOn(record: ProgressRecord, now: Date): { count: number; freezes: number; today: boolean } {
  const { count, lastDay, freezes } = record.streak;
  const today = localDay(now);
  if (lastDay === today) return { count, freezes, today: true };
  const missed = lastDay ? daysBetween(lastDay, today) - 1 : 0;
  return missed <= freezes ? { count, freezes: freezes - missed, today: false } : { count: 0, freezes, today: false };
}

type Today = ProgressRecord["today"];

function countToday(record: ProgressRecord, now: Date, add: (t: Today) => Today) {
  const day = localDay(now);
  const today = add(record.today.day === day ? record.today : { day, lessons: [], problems: [] });
  const next = { ...record, today };
  const counts = today.lessons.length >= LESSONS_A_DAY || today.problems.length >= PROBLEMS_A_DAY;
  if (!counts || record.streak.lastDay === day) return { record: next, earned: false };
  return { record: { ...next, streak: earn(record.streak, day) }, earned: true };
}

/** Today joins the Streak: missed days since the last one spend freezes, or restart it. */
function earn(streak: StreakState, day: string): StreakState {
  const missed = streak.lastDay ? daysBetween(streak.lastDay, day) - 1 : 0;
  if (!streak.lastDay || missed > streak.freezes) return { ...streak, count: 1, lastDay: day, sinceFreeze: 1 };
  let freezes = streak.freezes - missed;
  let sinceFreeze = missed > 0 ? 0 : streak.sinceFreeze + 1;
  if (freezes < MAX_FREEZES && sinceFreeze >= DAYS_PER_FREEZE) {
    freezes += 1;
    sinceFreeze = 0;
  }
  return { count: streak.count + 1, lastDay: day, freezes, sinceFreeze };
}

/** The Student's local calendar day, YYYY-MM-DD. */
export function localDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / 86_400_000);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
