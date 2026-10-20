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

/**
 * The words a key entry carries (Hints, Correct lines, reveals, reveal tags, in-between copy, later
 * stages): what must never be on the page. Ids, numbers and structured data (Scenes, citations,
 * structures, pushes) are left out, and so are stage prompts (the first is the Step's own prompt).
 */
export function keyText(secrets: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (value: unknown, field?: string) => {
    if (typeof value === "string") {
      if (field !== "prompt" && !/^[a-z0-9][a-z0-9-]*$/.test(value)) out.push(value);
    } else if (Array.isArray(value)) value.forEach((v) => walk(v, field));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  for (const [field, value] of Object.entries(secrets))
    if (!["revealScene", "answerCitations", "results", "replay"].includes(field)) walk(value, field);
  return out;
}
