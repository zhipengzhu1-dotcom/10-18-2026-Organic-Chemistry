// The Step player engine: a pure state machine with no DOM. The Lesson screen
// renders whatever Screen it returns. Each Step plays through its Step type's
// `act` (@astratron/content/step-types): one-shot types give two tries (right →
// the Correct line; wrong #1 → the first matching Hint, generic fallback last;
// wrong #2 → the reveal), Draw arrows grades push by push, a goal-state Step
// works through its stages. Navigation: back is allowed, answered Steps stay
// locked, Continue never passes an unanswered Step, and the Lesson is done on
// reaching Wrap. A Step link past the furthest Step reached opens that Step
// "ahead": it plays, but saves no answers, doesn't move the Student's place and
// can't make the Lesson done. Every Screen carries the Lesson's progress
// (answers by Step id), from which it resumes.
import type { Lesson, Step } from "@astratron/content";
import {
  act as playStep,
  startStep,
  type Answer,
  type ArrowsScreen,
  type Feedback,
  type GoalScreen,
  type Nudge,
  type StateOf,
  type StepType,
} from "@astratron/content/step-types";

// Feedback, what a Student submits (each Step type's own answer shape) and the per-type play
// screens come from the Step type table (@astratron/content/step-types).
export type { Answer, ArrowsScreen, Feedback, GoalScreen };

/** `idle`: a goal-state Manipulate Step saw no move for its `idleSeconds` (the player's timer sends it). */
export type Action = ({ type: "answer" } & Answer) | { type: "continue" } | { type: "back" } | { type: "idle" };

/** A Lesson's saved progress, keyed by stable Step ids so it survives content edits (ADR 0003). */
export interface LessonProgress {
  /** The Step the Student is on. */
  step: string;
  /** Every accepted answer per Step id, in order; replaying them restores each Step's feedback and lock. */
  answers: Record<string, Answer[]>;
  /** True once the Student has reached Wrap; going back doesn't undo it. */
  done: boolean;
  /**
   * The furthest Step reached in order (by Continue). Records saved before it existed lack it:
   * then it is `step`, or every Step once `done`.
   */
  reached?: string;
}

/** A Step's play state, of whichever type it is. */
type StepState = StateOf<StepType>;

export interface Screen {
  /** Position of the current Step (0-based); `step.id` is its permanent Step id. */
  index: number;
  total: number;
  step: Step;
  /** The Step type's play state; `tries`, `canContinue`, `arrows` and `goal` are read from it. */
  state: StepState;
  /** Graded tries made on this Step. */
  tries: number;
  feedback: Feedback | null;
  /** True once the Step needs nothing more from the Student; it is then locked. */
  canContinue: boolean;
  /** True while the current Step is the Wrap, reached in order. */
  done: boolean;
  /** True on a Step past the furthest one reached, opened by a Step link (story 17). */
  ahead: boolean;
  /** The Lesson's progress, updated by every action; save it to resume later. */
  progress: LessonProgress;
  /** Draw-arrows Steps: the pushes so far, the drawing they give and its in-between flags. */
  arrows?: ArrowsScreen;
  /** Goal-state Manipulate Steps: the stage on screen and the Scene's state. */
  goal?: GoalScreen;
}

/** What the engine needs from a resolved Lesson. */
export type PlayableLesson = Pick<Lesson, "steps" | "deletedSteps">;

/**
 * Opens the Lesson at the Step a Step link names (ADR 0003), else where saved progress left
 * off, else at its first Step. A deleted Step's id opens the Step its old links now point at;
 * an unknown id opens the first Step. Saved answers come back locked.
 */
export function start(lesson: PlayableLesson, stepId?: string, saved?: LessonProgress): Screen {
  const reached = lesson.steps[indexOf(lesson, saved?.done ? lesson.steps.at(-1)!.id : (saved?.reached ?? saved?.step))].id;
  const progress = { step: saved?.step ?? reached, answers: saved?.answers ?? {}, done: saved?.done ?? false, reached };
  return open(lesson, indexOf(lesson, stepId ?? saved?.step), progress);
}

/** Where a Step id (or a deleted Step's id) stands now; the first Step for none or an unknown id. */
function indexOf(lesson: PlayableLesson, id?: string): number {
  const target = (id && lesson.deletedSteps?.[id]) || id;
  return Math.max(0, lesson.steps.findIndex((s) => s.id === target));
}

export function act(lesson: PlayableLesson, screen: Screen, action: Action): Screen {
  if (action.type === "back") return screen.index > 0 ? open(lesson, screen.index - 1, screen.progress) : screen;
  // Nudges go to the Step type (a goal-state Step answers them with its stage's Hints) and are never saved.
  if (action.type === "idle") return play(screen, { idle: true });
  if (action.type === "continue") {
    if (!screen.canContinue) return play(screen, { early: true });
    if (screen.index + 1 >= lesson.steps.length) return screen;
    if (screen.ahead) return open(lesson, screen.index + 1, screen.progress);
    const reached = lesson.steps[Math.max(screen.index + 1, indexOf(lesson, screen.progress.reached))].id;
    return open(lesson, screen.index + 1, { ...screen.progress, reached });
  }
  const { type: _type, ...answer } = action;
  const next = play(screen, answer);
  if (next === screen || screen.ahead) return next;
  const { answers } = screen.progress;
  const saved = [...(answers[screen.step.id] ?? []), answer];
  return { ...next, progress: { ...screen.progress, answers: { ...answers, [screen.step.id]: saved } } };
}

/** The Screen after one answer or nudge, or the same Screen when the Step can't take it. */
function play(screen: Screen, input: Answer | Nudge): Screen {
  const played = playStep(screen.step, screen.state, input);
  return played ? { ...withState(screen, played.state), feedback: played.feedback } : screen;
}

/** Opens a Step and replays its saved answers, so an answered Step shows its feedback, locked. */
function open(lesson: PlayableLesson, index: number, saved: LessonProgress): Screen {
  const step = lesson.steps[index];
  const ahead = index > indexOf(lesson, saved.reached ?? saved.step);
  const done = step.phase === "wrap" && !ahead;
  const progress = ahead ? saved : { ...saved, step: step.id, done: saved.done || done };
  const fresh = withState({ index, total: lesson.steps.length, step, feedback: null, done, ahead, progress }, startStep(step));
  return (saved.answers[step.id] ?? []).reduce(play, fresh);
}

/** The Screen with the Step's play state: its tries, whether it is done, and its type's own (pushes, stage). */
function withState(screen: Omit<Screen, "state" | "tries" | "canContinue">, state: StepState): Screen {
  const { tries, done, ...own } = state;
  return { ...screen, ...own, state, tries, canContinue: done };
}
