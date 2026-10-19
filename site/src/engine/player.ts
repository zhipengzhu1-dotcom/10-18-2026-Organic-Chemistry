// The Step player engine: a pure state machine with no DOM. The Lesson screen
// renders whatever Screen it returns. Two-try feedback: right → the Correct
// line; wrong #1 → the first matching Hint (generic fallback last); wrong #2 →
// the reveal. A Hook `prediction` accepts every choice and reveals at once.
import type { GradedStep, Lesson, Step } from "@astratron/content";

export type Feedback =
  | { kind: "correct"; text: string }
  | { kind: "hint"; text: string }
  /** `answer` is the Step's answer: option ids, a number, or an order of item ids. */
  | { kind: "reveal"; text: string; answer: GradedStep["answer"] };

/** What a Student submits: chosen option ids (Multiple choice), a number (Numeric) or an order of item ids (Rank). */
export type Answer = { choice: string[] } | { value: number } | { order: string[] };

export type Action = ({ type: "answer" } & Answer) | { type: "continue" };

export interface Screen {
  /** Position of the current Step (0-based); `step.id` is its permanent Step id. */
  index: number;
  total: number;
  step: Step;
  /** Graded tries made on this Step. */
  tries: number;
  feedback: Feedback | null;
  /** True once the Step needs nothing more from the Student; it is then locked. */
  canContinue: boolean;
  /** True on reaching Wrap. */
  done: boolean;
}

export function start(lesson: Lesson): Screen {
  return open(lesson, 0);
}

export function act(lesson: Lesson, screen: Screen, action: Action): Screen {
  if (action.type === "continue") {
    if (!screen.canContinue || screen.index + 1 >= lesson.steps.length) return screen;
    return open(lesson, screen.index + 1);
  }
  const { step } = screen;
  if (step.type === "explain" || screen.canContinue) return screen;
  const result = grade(step, action, screen.tries);
  return result ? { ...screen, ...result } : screen;
}

function open(lesson: Lesson, index: number): Screen {
  const step = lesson.steps[index];
  return {
    index,
    total: lesson.steps.length,
    step,
    tries: 0,
    feedback: null,
    canContinue: step.type === "explain",
    done: step.phase === "wrap",
  };
}

/** Returns the Screen changes for an answer, or undefined when the answer doesn't fit the Step type. */
function grade(step: GradedStep, answer: Answer, triesBefore: number): Partial<Screen> | undefined {
  const reveal: Feedback = { kind: "reveal", text: step.reveal, answer: step.answer };
  if (step.type === "multiple-choice" && step.prediction) return { feedback: reveal, canContinue: true };

  const judged = judge(step, answer);
  if (!judged) return undefined;
  const tries = triesBefore + 1;
  if (judged.right) return { tries, feedback: { kind: "correct", text: step.correct ?? "" }, canContinue: true };
  if (tries >= 2) return { tries, feedback: reveal, canContinue: true };
  return { tries, feedback: { kind: "hint", text: judged.hint?.text ?? "" } };
}

/** Whether the answer is right and, if not, the first Hint that matches it (the generic fallback matches anything). */
function judge(step: GradedStep, answer: Answer): { right: boolean; hint?: { text: string } } | undefined {
  switch (step.type) {
    case "multiple-choice": {
      if (!("choice" in answer)) return undefined;
      const { choice } = answer;
      return { right: sameSet(choice, step.answer), hint: step.hints?.find((h) => !h.match || sameSet(h.match, choice)) };
    }
    case "numeric": {
      if (!("value" in answer) || !Number.isFinite(answer.value)) return undefined;
      const near = (target: number) => Math.abs(answer.value - target) <= step.tolerance + 1e-9;
      return { right: near(step.answer), hint: step.hints?.find((h) => h.match === undefined || near(h.match)) };
    }
    case "rank": {
      if (!("order" in answer)) return undefined;
      const { order } = answer;
      return { right: sameOrder(order, step.answer), hint: step.hints?.find((h) => !h.match || sameOrder(h.match, order)) };
    }
  }
}

function sameSet(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((x) => set.has(x));
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
