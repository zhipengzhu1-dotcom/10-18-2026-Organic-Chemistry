// What every Step type's rules share: the rules interface the table holds, the
// feedback a Step gives, the two-try rule of one-shot Step types and "goal
// reached". Browser-safe, no zod (the Step player bundles it).
import type { SceneValue, StructureView, TapTarget } from "../model.ts";
import type { GradedStep } from "./index.ts";

export type Feedback =
  | { kind: "correct"; text: string }
  | { kind: "hint"; text: string }
  /** Draw arrows, second wrong try on a push: that push is placed for the Student ("Here is that push: …"). */
  | { kind: "shown"; text: string }
  /** `answer` is the Step's answer: option ids, a number, or an order of item ids. */
  | { kind: "reveal"; text: string; answer: GradedStep["answer"] };

/** What every Step type's play state carries; a type may add its own (Draw arrows' pushes, a goal-state Step's stage). */
export interface PlayState {
  /** Graded tries made; the Practice Set reads `tries === 1` and correct as first try. */
  tries: number;
  /** The Step needs nothing more from the Student: it is locked, and Continue opens. */
  done: boolean;
}

/** What one `act` gives: the type's next state and the feedback to show (null clears it). */
export interface Played<St extends PlayState> {
  state: St;
  feedback: Feedback | null;
}

/**
 * Not an answer, and never saved: Continue tapped before the Step is done (`early`), or no move
 * for the Step's `idleSeconds` (`idle`, sent by the player's timer). Goal-state Manipulate answers
 * both with its stage's Hints; other types ignore them.
 */
export type Nudge = { early: true } | { idle: true };

/** Turns text fields' Markdown into HTML and pre-renders structures (the site build passes its own). */
export interface Renderer {
  /** Inline Markdown. */
  md: (text: string) => string;
  /** Block Markdown (paragraphs, lists). */
  mdBlocks: (text: string) => string;
  /** A structure drawn to SVG; a Tap drawing also gets its hit areas. */
  draw: (view: StructureView, targets?: TapTarget[]) => StructureView;
}

/**
 * One Step type's rules: the half of its module the browser gets (its file shape and build
 * checks are the other half, `schema.ts`). `S` is the resolved Step, `St` its play state, `A`
 * what a Student submits, `P` what the page adds before the answer key arrives.
 */
export interface StepRules<S extends { id: string; type: string }, St extends PlayState, A extends object, P extends object = object> {
  /**
   * Fields that give the answer away: they ship in the answer key, never in the page's HTML
   * (story 99), and numbers cited only in them travel as `answerCitations`. Listed in
   * ANSWER_ORDER. None: the Step ships whole, with no key entry (Explain).
   */
  secret: readonly (keyof S & AnswerField)[];
  /** The secret fields' stand-ins until the key arrives: the Step draws, but grades nothing. */
  blank: Partial<S>;
  /** Fields only the page carries, worked out from secrets the Student may see the shape of (Multiple choice: one or many). */
  page?: (step: S) => P;
  /** The Step with every text field's Markdown turned into HTML and its structures pre-rendered. */
  render: (step: S, r: Renderer) => S;
  /** The state a Step opens in, before any answer. */
  start: (step: S) => St;
  /** Whether a saved or submitted answer has this type's shape (saved progress may predate an edit). */
  takes: (answer: object) => answer is A;
  /** One answer (or nudge): the next state and its feedback, or undefined when the Step can't take it (no try spent). */
  act: (step: S, state: St, input: A | Nudge) => Played<St> | undefined;
}

/**
 * Every field any Step type keeps secret, in the order the answer key lists them; `answerCitations`
 * (added by the content build to every Step with secrets) goes last. Order keeps the built key stable.
 */
export const ANSWER_ORDER = [
  "answer", "tolerance", "correct", "hints", "reveal", "results", "inBetween", "stages", "revealScene", "replay", "revealTags",
] as const;
export type AnswerField = (typeof ANSWER_ORDER)[number];

// ── One-shot Step types: one answer, two tries ──────────────────────────────

/** Whether an answer is right and, if not, the first Hint that matches it (the generic fallback matches anything). */
export interface Judged {
  right: boolean;
  hint?: { text: string };
}

export const oneShotStart = (): PlayState => ({ tries: 0, done: false });

/** Right → the Correct line; wrong #1 → the first matching Hint; wrong #2 → the reveal. No judgment: not an answer. */
export function oneShot(
  step: { correct?: string; reveal: string; answer: GradedStep["answer"] },
  state: PlayState,
  judged: Judged | undefined,
): Played<PlayState> | undefined {
  if (!judged) return undefined;
  const tries = state.tries + 1;
  if (judged.right) return { state: { tries, done: true }, feedback: { kind: "correct", text: step.correct ?? "" } };
  if (tries >= 2) return { state: { tries, done: true }, feedback: reveal(step) };
  return { state: { tries, done: false }, feedback: { kind: "hint", text: judged.hint?.text ?? "" } };
}

export const reveal = (step: { reveal: string; answer: GradedStep["answer"] }): Feedback => ({
  kind: "reveal",
  text: step.reveal,
  answer: step.answer,
});

/** Inline Markdown on the text every graded Step has. */
export const gradedText = (s: { prompt: string; correct?: string; reveal: string }, md: Renderer["md"]) => ({
  prompt: md(s.prompt),
  correct: s.correct && md(s.correct),
  reveal: md(s.reveal),
});

/** Inline Markdown on each Hint's text. */
export const hintText = <H extends { text: string }>(hints: H[] | undefined, md: Renderer["md"]) =>
  hints?.map((h) => ({ ...h, text: md(h.text) }));

// ── Scene values ────────────────────────────────────────────────────────────

/** Both values say the same thing (numbers compare within rounding). */
export const sameValue = (a: SceneValue, b: SceneValue) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b;

/** The Scene's state holds every value the goal asks for: "goal reached", for grading and for the content build. */
export const reached = (state: Record<string, SceneValue>, goal: Record<string, SceneValue>) =>
  Object.entries(goal).every(([k, v]) => state[k] !== undefined && sameValue(state[k], v));
