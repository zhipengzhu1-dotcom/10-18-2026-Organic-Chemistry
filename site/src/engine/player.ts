// The Step player engine: a pure state machine with no DOM. The Lesson screen
// renders whatever Screen it returns. Two-try feedback: right → the Correct
// line; wrong #1 → the first matching Hint (generic fallback last); wrong #2 →
// the reveal. A Hook `prediction` accepts every choice and reveals at once.
import type { HintRule, Lesson, MultipleChoiceStep, Step, TapStep } from "@astratron/content";

export type Feedback =
  | { kind: "correct"; text: string }
  | { kind: "hint"; text: string }
  | { kind: "reveal"; text: string; answer: string[] };

/** `choice` is the chosen option ids (Multiple choice) or the picked target ids (Tap-to-identify). */
export type Action = { type: "answer"; choice: string[] } | { type: "continue" };

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
  return { ...screen, ...grade(step, action.choice, screen.tries) };
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

function grade(step: MultipleChoiceStep | TapStep, choice: string[], triesBefore: number): Partial<Screen> {
  const reveal: Feedback = { kind: "reveal", text: step.reveal, answer: step.answer };
  if (step.type === "multiple-choice" && step.prediction) return { feedback: reveal, canContinue: true };

  const tries = triesBefore + 1;
  if (sameSet(choice, step.answer)) return { tries, feedback: { kind: "correct", text: step.correct ?? "" }, canContinue: true };
  if (tries >= 2) return { tries, feedback: reveal, canContinue: true };
  const hint = step.hints?.find((h) => hintFits(h, choice));
  return { tries, feedback: { kind: "hint", text: hint?.text ?? "" } };
}

/** Every condition the Hint gives must hold; the generic fallback has none. */
function hintFits(hint: HintRule, choice: string[]): boolean {
  return (
    (!hint.match || sameSet(hint.match, choice)) &&
    (!hint.includes || hint.includes.some((id) => choice.includes(id))) &&
    (!hint.misses || hint.misses.some((id) => !choice.includes(id)))
  );
}

function sameSet(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((x) => set.has(x));
}
