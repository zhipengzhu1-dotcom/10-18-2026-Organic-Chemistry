// Keeps answers out of the Lesson page's static HTML (spec story 99). The page
// gets only what a Student sees before answering; the answer key is a separate
// built file (/answers/<subject>/<lesson id>.json) that the Step player fetches.
// What is secret is each Step type's own list (`secret` in content/src/step-types/<type>/rules.ts);
// content/test/answer-fields.test.ts fails on a field named like an answer that isn't on it.
import type { Lesson, Step } from "@astratron/content";
import { joinStep, splitStep, type AnswerKey, type PageStep } from "@astratron/content/step-types";

export type { AnswerKey, PageStep };
export type PageLesson = Omit<Lesson, "steps"> & { steps: PageStep[] };

export function splitLesson(lesson: Lesson): { page: PageLesson; key: AnswerKey } {
  const { steps, key } = splitSteps(lesson.steps);
  return { page: { ...lesson, steps }, key };
}

/** Splits Steps (a Lesson's, or a Practice Set's Problems) into what the page shows and the key, by Step id. */
export function splitSteps(all: Step[]): { steps: PageStep[]; key: AnswerKey } {
  const key: AnswerKey = {};
  const steps = all.map((step) => {
    const { shown, secrets } = splitStep(step);
    if (secrets) key[step.id] = secrets;
    return shown;
  });
  return { steps, key };
}

/** The playable Lesson. Without the key, graded Steps carry blank secrets and must not be graded. */
export function withKey(page: PageLesson, key: AnswerKey = {}): Lesson {
  return { ...page, steps: page.steps.map((step) => joinStep(step, key[step.id])) };
}

/** Key fields that hold values, not words: answers and Hint conditions (ids, numbers, Scene values), Scenes, citations, structures, goals. */
const VALUES = new Set([
  "answer", "tolerance", "results", "revealScene", "replay", "answerCitations",
  "match", "includes", "misses", "notFirst", "notLast", "before", "above", "from", "to", "start", "goal",
  // A stage's prompt is a question, not an answer (the first is the Step's own prompt).
  "prompt",
]);

/**
 * The words a key entry carries (Correct lines, Hints, reveals, reveal tags, in-between copy, stage
 * Hints): what must never be on the page.
 */
export function keyText(secrets: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (!VALUES.has(k)) walk(v);
  };
  walk(secrets);
  return out;
}
