// Goal-state Manipulate a Scene, file shape and build checks (Node only). Each
// stage's start and goal are checked against the Scene's settable states in
// ../../scenes.ts; never a Problem.
import { z } from "zod";
import { phase, sceneUse, sceneValue, stepId, text, visuals, type Agrees } from "../fields.ts";
import { actGoal, startGoal, type GoalStage } from "./rules.ts";

/** One stage of a goal-state Manipulate Step: work the Scene until its state reaches `goal`. */
const goalStage = z.strictObject({
  prompt: text,
  /** States the Scene is set to as the stage opens (on top of where the last stage left it). */
  start: z.record(z.string(), sceneValue).optional(),
  /** The stage is done once the Scene's state holds every one of these values. */
  goal: z.record(z.string(), sceneValue),
  correct: text,
  /** The Hint when Continue is tapped before the stage is done. */
  blocked: text,
  /** The Hint after `idleSeconds` with no move (a second idle shows the next move as a nudge). */
  idle: text,
});
true satisfies Agrees<typeof goalStage, GoalStage>;

/**
 * A goal-state Manipulate a Scene Step: the Student works the Scene itself (drags atoms) until
 * its state reaches each stage's goal in turn. No Check: Continue opens when the last stage is
 * done; the Scene's own rules refuse moves that can't be made.
 */
export const step = z.strictObject({
  id: stepId,
  phase,
  type: z.literal("manipulate-goal"),
  ...visuals,
  scene: sceneUse,
  /** Seconds without a move before the stage's idle Hint. */
  idleSeconds: z.number().positive().default(30),
  stages: z.array(goalStage).min(1),
});

/** Played through: reaching each stage's goal in turn, with its Correct line, finishes the Step. */
export function check(item: z.infer<typeof step>): string[] {
  const playable = { ...item, prompt: item.stages[0].prompt, scene: { state: item.scene.state ?? {} } };
  let state = startGoal(playable);
  for (const [i, stage] of item.stages.entries()) {
    const played = actGoal(playable, state, { state: stage.goal });
    if (played?.feedback?.text !== stage.correct) return [`stage ${i + 1}: reaching its goal doesn't finish the stage`];
    state = played.state;
  }
  return state.done ? [] : ["the stages end before the Step is done"];
}

/** The resolved Step opens on its first stage's prompt. */
export const open = <S extends { stages: { prompt: string }[] }>(step: S) => ({ ...step, prompt: step.stages[0].prompt });
