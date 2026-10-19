// The Step player engine: a pure state machine with no DOM. The Lesson screen
// renders whatever Screen it returns. Two-try feedback: right → the Correct
// line; wrong #1 → the first matching Hint (generic fallback last); wrong #2 →
// the reveal. A Hook `prediction` accepts every choice and reveals at once.
// Navigation: back is allowed, answered Steps stay locked, Continue never passes
// an unanswered Step, and the Lesson is done on reaching Wrap. Every Screen
// carries the Lesson's progress (answers by Step id), from which it resumes.
import type { GradedStep, HintRule, Lesson, Step } from "@astratron/content";

export type Feedback =
  | { kind: "correct"; text: string }
  | { kind: "hint"; text: string }
  /** `answer` is the Step's answer: option ids, a number, or an order of item ids. */
  | { kind: "reveal"; text: string; answer: GradedStep["answer"] };

/**
 * What a Student submits: chosen option ids (Multiple choice) or picked atom/bond/region ids
 * (Tap-to-identify), a number (Numeric) or an order of item ids (Rank).
 */
export type Answer = { choice: string[] } | { value: number } | { order: string[] };

export type Action = ({ type: "answer" } & Answer) | { type: "continue" } | { type: "back" };

/** A Lesson's saved progress, keyed by stable Step ids so it survives content edits (ADR 0003). */
export interface LessonProgress {
  /** The Step the Student is on. */
  step: string;
  /** Every accepted answer per Step id, in order; replaying them restores each Step's feedback and lock. */
  answers: Record<string, Answer[]>;
  /** True once the Student has reached Wrap; going back doesn't undo it. */
  done: boolean;
}

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
  /** True while the current Step is the Wrap. */
  done: boolean;
  /** The Lesson's progress, updated by every action; save it to resume later. */
  progress: LessonProgress;
}

/** What the engine needs from a resolved Lesson. */
export type PlayableLesson = Pick<Lesson, "steps" | "deletedSteps">;

/**
 * Opens the Lesson at the Step a Step link names (ADR 0003), else where saved progress left
 * off, else at its first Step. A deleted Step's id opens the Step its old links now point at;
 * an unknown id opens the first Step. Saved answers come back locked.
 */
export function start(lesson: PlayableLesson, stepId?: string, saved?: LessonProgress): Screen {
  const id = stepId ?? saved?.step;
  const target = (id && lesson.deletedSteps?.[id]) || id;
  const progress = { step: "", answers: saved?.answers ?? {}, done: saved?.done ?? false };
  return open(lesson, Math.max(0, lesson.steps.findIndex((s) => s.id === target)), progress);
}

export function act(lesson: PlayableLesson, screen: Screen, action: Action): Screen {
  if (action.type === "back") return screen.index > 0 ? open(lesson, screen.index - 1, screen.progress) : screen;
  if (action.type === "continue") {
    if (!screen.canContinue || screen.index + 1 >= lesson.steps.length) return screen;
    return open(lesson, screen.index + 1, screen.progress);
  }
  const { type: _type, ...answer } = action;
  const next = answerStep(screen, answer);
  if (next === screen) return screen;
  const { answers } = screen.progress;
  const saved = [...(answers[screen.step.id] ?? []), answer];
  return { ...next, progress: { ...screen.progress, answers: { ...answers, [screen.step.id]: saved } } };
}

/** The Screen after one answer, or the same Screen when the Step can't take it. */
function answerStep(screen: Screen, answer: Answer): Screen {
  const { step } = screen;
  if (step.type === "explain" || screen.canContinue) return screen;
  const result = grade(step, answer, screen.tries);
  return result ? { ...screen, ...result } : screen;
}

/** Opens a Step and replays its saved answers, so an answered Step shows its feedback, locked. */
function open(lesson: PlayableLesson, index: number, saved: LessonProgress): Screen {
  const step = lesson.steps[index];
  const done = step.phase === "wrap";
  const fresh: Screen = {
    index,
    total: lesson.steps.length,
    step,
    tries: 0,
    feedback: null,
    canContinue: step.type === "explain",
    done,
    progress: { ...saved, step: step.id, done: saved.done || done },
  };
  return (saved.answers[step.id] ?? []).reduce(answerStep, fresh);
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
    case "multiple-choice":
    case "tap-to-identify": {
      if (!("choice" in answer)) return undefined;
      const { choice } = answer;
      return { right: sameSet(choice, step.answer), hint: step.hints?.find((h) => hintFits(h, choice)) };
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

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
