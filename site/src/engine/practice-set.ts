// The Practice Set: the draw from a Unit's Problem Bank, a round played by the
// Step player engine (same two-try feedback, push by push for Draw arrows), and
// the summary with Retry missed. Pure; the random source is injected.
//
// Draw rules, in priority order:
//   1. only approved Problems of the Unit's core Lessons (never drafts, never the On-ramp's);
//   2. every core Lesson at least once (as far as the Bank has Problems for it);
//   3. avoid the previous draw where the Bank allows;
//   4. prefer Problems that are no Lesson's Check Step;
//   then spread the rest across Lessons, and order the Set easy → hard, then by Lesson.
import type { Problem } from "@astratron/content";
import { start, type LessonProgress, type PlayableLesson } from "./player.ts";

export const SET_SIZE = 10;

/** What the draw needs to know about a Bank Problem. */
export type BankEntry = Pick<Problem, "id" | "lesson" | "difficulty" | "status" | "check" | "onRamp">;

export interface DrawOptions {
  /** The last full draw, which a retake avoids. */
  previous?: string[];
  /** A number in [0, 1); Math.random in the browser, seeded in tests. */
  random?: () => number;
  size?: number;
}

/** Whether a Problem may ever be drawn into a Practice Set of these core Lessons. */
export const drawable = (p: BankEntry, coreLessons: string[]) =>
  p.status === "approved" && !p.onRamp && coreLessons.includes(p.lesson);

/** Draws a Practice Set: Problem ids, easy → hard. `coreLessons` are the Unit's core Lesson ids in order. */
export function drawSet(bank: BankEntry[], coreLessons: string[], options: DrawOptions = {}): string[] {
  const { previous = [], random = Math.random, size = SET_SIZE } = options;
  const seen = new Set(previous);
  /** Lower is better: a fresh Problem beats a repeat, and a Practice Problem beats a Check Problem. */
  const tier = (p: BankEntry) => (seen.has(p.id) ? 2 : 0) + (p.check ? 1 : 0);
  const pool = shuffle(bank.filter((p) => drawable(p, coreLessons)), random).sort((a, b) => tier(a) - tier(b));
  const count = Math.min(size, pool.length);

  const picked: BankEntry[] = [];
  const perLesson = new Map<string, number>();
  const take = (p: BankEntry) => {
    picked.push(p);
    pool.splice(pool.indexOf(p), 1);
    perLesson.set(p.lesson, (perLesson.get(p.lesson) ?? 0) + 1);
  };
  for (const lesson of coreLessons) {
    const best = pool.find((p) => p.lesson === lesson);
    if (best && picked.length < count) take(best);
  }
  while (picked.length < count) {
    const load = (p: BankEntry) => perLesson.get(p.lesson) ?? 0;
    // `pool` is already in tier order (shuffled within a tier), so the first lowest (tier, load) wins.
    take(pool.reduce((best, p) => (tier(p) < tier(best) || (tier(p) === tier(best) && load(p) < load(best)) ? p : best)));
  }
  const lessonIndex = (p: BankEntry) => coreLessons.indexOf(p.lesson);
  return picked
    .sort((a, b) => a.difficulty - b.difficulty || lessonIndex(a) - lessonIndex(b) || a.id.localeCompare(b.id))
    .map((p) => p.id);
}

/** A round of the Practice Set as the Step player plays it: the named Problems, in that order. */
export function roundOf<S extends { id: string }>(steps: S[], ids: string[]): { steps: S[] } {
  const byId = new Map(steps.map((s) => [s.id, s]));
  return { steps: ids.flatMap((id) => byId.get(id) ?? []) };
}

/** One Problem's outcome in a round. */
export interface ProblemOutcome {
  id: string;
  /** Graded tries used; 1 and correct = right first try. */
  tries: number;
  /** Right before the reveal. */
  correct: boolean;
}

export interface Summary {
  /** N: Problems in the round. */
  total: number;
  /** Right on the first try (a Draw-arrows Problem only when no push was wrong). */
  firstTry: number;
  firstTryPercent: number;
  /** n: right on the first or the second try. */
  eventuallyCorrect: number;
  /** Problems not eventually right (revealed or unanswered), in round order: what Retry missed replays. */
  missed: string[];
  results: ProblemOutcome[];
}

/** Reads the round's outcome from its progress, replaying each Problem through the engine. */
export function summarize(round: PlayableLesson, progress: LessonProgress): Summary {
  const results = round.steps.map((step): ProblemOutcome => {
    const screen = start(round, step.id, progress);
    return { id: step.id, tries: screen.tries, correct: screen.feedback?.kind === "correct" };
  });
  const firstTry = results.filter((r) => r.correct && r.tries === 1).length;
  const total = results.length;
  return {
    total,
    firstTry,
    firstTryPercent: total ? Math.round((100 * firstTry) / total) : 0,
    eventuallyCorrect: results.filter((r) => r.correct).length,
    missed: results.filter((r) => !r.correct).map((r) => r.id),
    results,
  };
}

/** Fisher–Yates on a copy. */
function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

