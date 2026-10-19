// Keeps answers out of the Lesson page's static HTML (spec story 99). The page
// gets only what a Student sees before answering; the answer key is a separate
// built file (/answers/<subject>/<lesson id>.json) that the Step player fetches.
// A new Step type whose grading needs other fields adds them to SECRET_FIELDS.
import type { GradedStep, Lesson, Step } from "@astratron/content";

// Draw arrows: `results` (accepted results) and `inBetween` (flag copy) grade pushes, so they are secret too;
// the start and the target the Step shows stay on the page.
const SECRET_FIELDS = ["answer", "tolerance", "correct", "hints", "reveal", "results", "inBetween"] as const;
type Secret = (typeof SECRET_FIELDS)[number];
type Shown<S> = S extends GradedStep ? Omit<S, Extract<Secret, keyof S>> : S;

/**
 * A Step as the page carries it: graded Steps lose their secrets. A Multiple choice Step
 * says whether one or many choices are picked, which the Student sees before answering.
 */
export type PageStep = Shown<Step> & { select?: "one" | "many" };
export type PageLesson = Omit<Lesson, "steps"> & { steps: PageStep[] };
/** Step id → that Step's secret fields. */
export type AnswerKey = Record<string, Record<string, unknown>>;

export function splitLesson(lesson: Lesson): { page: PageLesson; key: AnswerKey } {
  const { steps, key } = splitSteps(lesson.steps);
  return { page: { ...lesson, steps }, key };
}

/** Splits Steps (a Lesson's, or a Practice Set's Problems) into what the page shows and the key, by Step id. */
export function splitSteps(all: Step[]): { steps: PageStep[]; key: AnswerKey } {
  const key: AnswerKey = {};
  const steps = all.map((step): PageStep => {
    if (step.type === "explain") return step;
    const shown: Record<string, unknown> = { ...step };
    const secrets: Record<string, unknown> = {};
    for (const field of SECRET_FIELDS) {
      if (!(field in step)) continue;
      secrets[field] = shown[field];
      delete shown[field];
    }
    key[step.id] = secrets;
    if (step.type === "multiple-choice" || step.type === "rotate-and-identify") shown.select = step.answer.length === 1 ? "one" : "many";
    return shown as PageStep;
  });
  return { steps, key };
}

/** The playable Lesson. Without the key, graded Steps carry empty secrets and must not be graded. */
export function withKey(page: PageLesson, key: AnswerKey = {}): Lesson {
  const steps = page.steps.map((step): Step => {
    if (step.type === "explain") return step;
    const { select: _select, ...shown } = step;
    return { answer: [], reveal: "", ...shown, ...key[step.id] } as GradedStep;
  });
  return { ...page, steps };
}
