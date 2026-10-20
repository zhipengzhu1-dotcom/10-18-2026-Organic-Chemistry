// The Step player engine: a pure state machine with no DOM. The Lesson screen
// renders whatever Screen it returns. Two-try feedback: right → the Correct
// line; wrong #1 → the first matching Hint (generic fallback last); wrong #2 →
// the reveal. A Hook `prediction` accepts every choice and reveals at once.
// Navigation: back is allowed, answered Steps stay locked, Continue never passes
// an unanswered Step, and the Lesson is done on reaching Wrap. A Step link past
// the furthest Step reached opens that Step "ahead": it plays, but saves no
// answers, doesn't move the Student's place and can't make the Lesson done. Every Screen
// carries the Lesson's progress (answers by Step id), from which it resumes.
import type { DrawArrowsStep, GoalStep, GradedStep, HintRule, Lesson, Push, RankHint, SceneValue, Step, Structure } from "@astratron/content";
import { arrowsAct, arrowsStart, arrowsView, type ArrowsState, type Flag } from "@astratron/content/arrows";

export type Feedback =
  | { kind: "correct"; text: string }
  | { kind: "hint"; text: string }
  /** Draw arrows, second wrong try on a push: that push is placed for the Student ("Here is that push: …"). */
  | { kind: "shown"; text: string }
  /** `answer` is the Step's answer: option ids, a number, or an order of item ids. */
  | { kind: "reveal"; text: string; answer: GradedStep["answer"] };

/**
 * What a Student submits: chosen option ids (Multiple choice, Rotate-and-identify) or picked atom/bond/region ids
 * (Tap-to-identify), a number (Numeric), an order of item ids (Rank) or the control's
 * current value (Manipulate a Scene).
 */
export type Answer =
  | { choice: string[] }
  | { value: number }
  | { order: string[] }
  | { setting: number | string }
  /** Draw arrows: one curved arrow, graded the moment it is drawn, or undoing the last one. */
  | { push: Push }
  | { undo: true }
  /** Goal-state Manipulate: the Scene's state after a move its own rules accepted (the changed states). */
  | { state: Record<string, SceneValue> };

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

export interface GoalScreen {
  /** Index of the stage being worked. */
  stage: number;
  /** The stage's prompt. */
  prompt: string;
  /** Every settable state of the Scene, as the Student's moves left it. */
  state: Record<string, SceneValue>;
  /** Idle Hints since the last move: 1 shows the idle Hint, 2 or more also nudges the next move. */
  idle: number;
}

export interface ArrowsScreen extends ArrowsState {
  /** The start with every placed push applied: bonds, lone pairs and charges as they are now. */
  structure: Structure;
  /** Atoms over their octet or newly short of it (none once done). */
  flags: Flag[];
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
  if (action.type === "idle") return idle(screen);
  if (action.type === "continue") {
    // A goal-state Step answers an early Continue with its stage's Hint.
    const stage = screen.step.type === "manipulate-goal" && screen.goal && screen.step.stages[screen.goal.stage];
    if (!screen.canContinue && stage) return { ...screen, feedback: { kind: "hint", text: stage.blocked } };
    if (!screen.canContinue || screen.index + 1 >= lesson.steps.length) return screen;
    if (screen.ahead) return open(lesson, screen.index + 1, screen.progress);
    const reached = lesson.steps[Math.max(screen.index + 1, indexOf(lesson, screen.progress.reached))].id;
    return open(lesson, screen.index + 1, { ...screen.progress, reached });
  }
  const { type: _type, ...answer } = action;
  const next = answerStep(screen, answer);
  if (next === screen || screen.ahead) return next;
  const { answers } = screen.progress;
  const saved = [...(answers[screen.step.id] ?? []), answer];
  return { ...next, progress: { ...screen.progress, answers: { ...answers, [screen.step.id]: saved } } };
}

/** The Screen after one answer, or the same Screen when the Step can't take it. */
function answerStep(screen: Screen, answer: Answer): Screen {
  const { step } = screen;
  if (step.type === "explain" || screen.canContinue) return screen;
  if (step.type === "draw-arrows") return pushArrow(screen, step, answer);
  if (step.type === "manipulate-goal") return moveGoal(screen, step, answer);
  const result = grade(step, answer, screen.tries);
  return result ? { ...screen, ...result } : screen;
}

/** Opens a Step and replays its saved answers, so an answered Step shows its feedback, locked. */
function open(lesson: PlayableLesson, index: number, saved: LessonProgress): Screen {
  const step = lesson.steps[index];
  const ahead = index > indexOf(lesson, saved.reached ?? saved.step);
  const done = step.phase === "wrap" && !ahead;
  const fresh: Screen = {
    index,
    total: lesson.steps.length,
    step,
    tries: 0,
    feedback: null,
    canContinue: step.type === "explain",
    done,
    ahead,
    progress: ahead ? saved : { ...saved, step: step.id, done: saved.done || done },
    ...(step.type === "draw-arrows" && { arrows: arrowsScreen(step, arrowsStart()) }),
    ...(step.type === "manipulate-goal" && { goal: goalStart(step) }),
  };
  return (saved.answers[step.id] ?? []).reduce(answerStep, fresh);
}

/**
 * Draw arrows: each push is graded the moment it is made, by the structure it gives. Two tries
 * per push (its Hint, then the push is shown). `tries` counts wrong pushes, plus one when done,
 * so 1 means no push was wrong (first try). Done with every push the Student's own → the Correct
 * line; a push had to be shown → the reveal.
 */
function pushArrow(screen: Screen, step: DrawArrowsStep, answer: Answer): Screen {
  if (!("push" in answer) && !("undo" in answer)) return screen;
  const before = screen.arrows ?? arrowsScreen(step, arrowsStart());
  const state = arrowsAct(taskOf(step), before, answer);
  if (state === before) return screen;
  const tries = state.wrong + (state.done ? 1 : 0);
  const last = state.last!;
  let feedback: Feedback | null = null;
  if (state.done)
    feedback = state.pushes.some((p) => p.shown)
      ? { kind: "reveal", text: step.reveal, answer: step.answer }
      : { kind: "correct", text: step.correct ?? "" };
  else if (last.kind === "wrong") feedback = { kind: "hint", text: last.hint };
  else if (last.kind === "shown") feedback = { kind: "shown", text: `Here is that push: ${last.label}.` };
  return { ...screen, arrows: arrowsScreen(step, state), tries, feedback, canContinue: state.done };
}

/** A goal-state Step opens on its first stage, the Scene at its Step state plus the stage's start. */
function goalStart(step: GoalStep): GoalScreen {
  // Before the answer key arrives the Step has no stages: it shows its prompt and Scene, and grades nothing.
  const first = step.stages[0];
  return { stage: 0, prompt: first?.prompt ?? step.prompt, state: { ...step.scene.state, ...first?.start }, idle: 0 };
}

const reached = (state: Record<string, SceneValue>, goal: Record<string, SceneValue>) =>
  Object.entries(goal).every(([k, v]) => (typeof v === "number" ? Math.abs(Number(state[k]) - v) < 1e-9 : state[k] === v));

/**
 * A move on a goal-state Step: the Scene's new state. Reaching the stage's goal shows its Correct
 * line and opens the next stage (or Continue, after the last). Any move clears a Hint and the idle count.
 */
function moveGoal(screen: Screen, step: GoalStep, answer: Answer): Screen {
  if (!("state" in answer) || !screen.goal) return screen;
  const { stage } = screen.goal;
  const state = { ...screen.goal.state, ...answer.state };
  const current = step.stages[stage];
  if (!current || !reached(state, current.goal)) return { ...screen, feedback: null, goal: { ...screen.goal, state, idle: 0 } };
  const feedback: Feedback = { kind: "correct", text: current.correct };
  const next = step.stages[stage + 1];
  if (!next) return { ...screen, feedback, canContinue: true, goal: { ...screen.goal, state, idle: 0 } };
  return {
    ...screen,
    feedback,
    goal: { stage: stage + 1, prompt: next.prompt, state: { ...state, ...next.start }, idle: 0 },
  };
}

/** No move for a while on a goal-state Step: its stage's idle Hint (counted, so the second can nudge). */
function idle(screen: Screen): Screen {
  const stage = screen.step.type === "manipulate-goal" && screen.goal && screen.step.stages[screen.goal.stage];
  if (!stage || !screen.goal || screen.canContinue) return screen;
  const text = stage.idle;
  return { ...screen, feedback: { kind: "hint", text }, goal: { ...screen.goal, idle: screen.goal.idle + 1 } };
}

// Before the answer key arrives a Draw-arrows Step has no results yet: it draws, but grades nothing.
const taskOf = (step: DrawArrowsStep) => ({ ...step, start: step.start.structure, results: step.results ?? [] });

function arrowsScreen(step: DrawArrowsStep, state: ArrowsState): ArrowsScreen {
  const { structure, flags } = arrowsView(taskOf(step), state);
  return { ...state, structure, flags };
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
    case "rotate-and-identify":
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
      const at = (id: string) => order.indexOf(id);
      const fits = (h: RankHint) =>
        (!h.match || sameOrder(h.match, order)) &&
        (!h.notFirst || at(h.notFirst) !== 0) &&
        (!h.notLast || at(h.notLast) !== order.length - 1) &&
        (!h.before || at(h.before[0]) < at(h.before[1])) &&
        (!h.above || h.above.some(([upper, lower]) => at(upper) < at(lower)));
      return { right: sameOrder(order, step.answer), hint: step.hints?.find(fits) };
    }
    case "manipulate": {
      if (!("setting" in answer)) return undefined;
      const same = (v: number | string) =>
        typeof v === "number" && typeof answer.setting === "number" ? Math.abs(v - answer.setting) < 1e-9 : v === answer.setting;
      return { right: same(step.answer), hint: step.hints?.find((h) => !h.match || h.match.some(same)) };
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
