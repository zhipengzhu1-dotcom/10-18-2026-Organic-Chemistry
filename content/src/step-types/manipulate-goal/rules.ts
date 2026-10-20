// Goal-state Manipulate a Scene: the Student works the Scene itself (its
// handles, e.g. atoms to drag) until its state reaches each stage's goal in
// turn. Nothing is graded: the Scene's own rules refuse impossible moves, and
// Continue opens when the last stage is done. Never a Problem.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse, SceneValue } from "../../model.ts";
import { reached, type PlayState, type Played, type StepRules } from "../play.ts";

/** One stage of a goal-state Manipulate Step: work the Scene until its state reaches `goal`. */
export interface GoalStage {
  prompt: string;
  /** States the Scene is set to as the stage opens (on top of where the last stage left it). */
  start?: Record<string, SceneValue>;
  /** The stage is done once the Scene's state holds every one of these values. */
  goal: Record<string, SceneValue>;
  correct: string;
  /** The Hint when Continue is tapped before the stage is done. */
  blocked: string;
  /** The Hint after `idleSeconds` with no move (a second idle shows the next move as a nudge). */
  idle: string;
}

export interface GoalStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "manipulate-goal";
  /** The first stage's prompt. */
  prompt: string;
  scene: SceneUse;
  idleSeconds: number;
  stages: GoalStage[];
  /** Nothing is graded, so there is no reveal; never a Problem. */
  reveal?: undefined;
  problemId?: undefined;
  citations?: Cited[];
  molecule?: MoleculeUse;
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

export interface GoalState extends PlayState {
  goal: GoalScreen;
}

/** The Scene's state after a move its own rules accepted (the changed states). */
export type GoalAnswer = { state: Record<string, SceneValue> };

const takesState = (answer: object): answer is GoalAnswer => "state" in answer;

/** What playing reads, so the content build can play a Step file before its Scene resolves. */
type Playable = Pick<GoalStep, "stages" | "prompt"> & { scene: Pick<SceneUse, "state"> };

/** A goal-state Step opens on its first stage, the Scene at its Step state plus the stage's start. */
export function startGoal(step: Playable): GoalState {
  // Before the answer key arrives the Step has no stages: it shows its prompt and Scene, and grades nothing.
  const first = step.stages[0];
  return { tries: 0, done: false, goal: { stage: 0, prompt: first?.prompt ?? step.prompt, state: { ...step.scene.state, ...first?.start }, idle: 0 } };
}

/**
 * A move: the Scene's new state. Reaching the stage's goal shows its Correct line and opens the
 * next stage (or Continue, after the last). Any move clears a Hint and the idle count. Continue
 * tapped early answers with the stage's `blocked` Hint; no move for a while, with its `idle` Hint
 * (counted, so the second can nudge).
 */
export function actGoal(step: Playable, state: GoalState, input: object): Played<GoalState> | undefined {
  const { goal } = state;
  const current = step.stages[goal.stage];
  if ("early" in input) return current && { state, feedback: { kind: "hint", text: current.blocked } };
  if ("idle" in input) return current && { state: { ...state, goal: { ...goal, idle: goal.idle + 1 } }, feedback: { kind: "hint", text: current.idle } };
  if (!takesState(input)) return undefined;
  const now = { ...goal.state, ...input.state };
  if (!current || !reached(now, current.goal)) return { state: { ...state, goal: { ...goal, state: now, idle: 0 } }, feedback: null };
  const feedback = { kind: "correct", text: current.correct } as const;
  const next = step.stages[goal.stage + 1];
  if (!next) return { state: { ...state, done: true, goal: { ...goal, state: now, idle: 0 } }, feedback };
  return { state: { ...state, goal: { stage: goal.stage + 1, prompt: next.prompt, state: { ...now, ...next.start }, idle: 0 } }, feedback };
}

export const manipulateGoal = {
  secret: ["stages", "revealScene"] as const,
  blank: { stages: [] },
  render: (s, { md }) => ({
    ...s,
    prompt: md(s.prompt),
    stages: s.stages.map((g) => ({ ...g, prompt: md(g.prompt), correct: md(g.correct), blocked: md(g.blocked), idle: md(g.idle) })),
  }),
  start: startGoal,
  takes: takesState,
  act: actGoal,
} satisfies StepRules<GoalStep, GoalState, GoalAnswer>;
