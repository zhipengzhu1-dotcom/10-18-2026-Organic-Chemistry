// Keeps answers out of the Lesson page's static HTML (spec story 99). The page
// gets only what a Student sees before answering; the answer key is a separate
// built file (/answers/<subject>/<lesson id>.json) that the Step player fetches.
// A new Step type with its own grading fields adds them to SECRET_FIELDS.
import type { Lesson, MultipleChoiceStep, Step } from "@astratron/content";

const SECRET_FIELDS = ["answer", "correct", "hints", "reveal"] as const;
type Secret = (typeof SECRET_FIELDS)[number];

/** A Step as the page carries it: graded Steps lose their secrets and say whether one or many choices are picked. */
export type PageStep = Exclude<Step, MultipleChoiceStep> | (Omit<MultipleChoiceStep, Secret> & { select: "one" | "many" });
export type PageLesson = Omit<Lesson, "steps"> & { steps: PageStep[] };
/** Step id → that Step's secret fields. */
export type AnswerKey = Record<string, Partial<Pick<MultipleChoiceStep, Secret>>>;

export function splitLesson(lesson: Lesson): { page: PageLesson; key: AnswerKey } {
  const key: AnswerKey = {};
  const steps = lesson.steps.map((step): PageStep => {
    if (step.type === "explain") return step;
    const { answer, correct, hints, reveal, ...shown } = step;
    key[step.id] = { answer, correct, hints, reveal };
    return { ...shown, select: answer.length === 1 ? "one" : "many" };
  });
  return { page: { ...lesson, steps }, key };
}

/** The playable Lesson. Without the key, graded Steps carry empty secrets and must not be graded. */
export function withKey(page: PageLesson, key: AnswerKey = {}): Lesson {
  const steps = page.steps.map((step): Step => {
    if (step.type === "explain") return step;
    const { select: _select, ...shown } = step;
    return { answer: [], reveal: "", ...shown, ...key[step.id] } as MultipleChoiceStep;
  });
  return { ...page, steps };
}
