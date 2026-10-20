// Manipulate a Scene, file shape and build checks (Node only). The control,
// answer and Hint values are checked against the Scene's settable states in
// ../../scenes.ts; never a Problem.
import { z } from "zod";
import { actChecks, gradedRules } from "../checks.ts";
import { gradedVisuals, molecule, phase, sceneUse, sceneValue, stepId, text, type Agrees } from "../fields.ts";
import { actManipulate, type ManipulateHint } from "./rules.ts";

/** A Manipulate Hint: `match` lists the wrong control values it answers. */
const manipulateHint = z.strictObject({ match: z.array(sceneValue).min(1).optional(), text });
true satisfies Agrees<typeof manipulateHint, ManipulateHint>;

/**
 * Manipulate a Scene: the Student works a control (one of the Scene's settable
 * states, drawn as a slider under the Scene) and presses Check on a value.
 */
const fields = {
  ...gradedVisuals,
  type: z.literal("manipulate"),
  molecule,
  prompt: text,
  scene: sceneUse,
  /** The settable state the slider drives. */
  control: z.string(),
  /** The control value that is right. */
  answer: sceneValue,
  correct: text.optional(),
  hints: z.array(manipulateHint).optional(),
  reveal: text,
};

export const step = z.strictObject({ id: stepId, phase, ...fields });

/** Graded at each Hint's values: none may be marked right, and each Hint must show on one. */
export function check(item: z.infer<typeof step>): string[] {
  const errors: string[] = [];
  const values = item.hints?.flatMap((h) => h.match ?? []) ?? [];
  if (values.some((setting) => actManipulate(item, { tries: 0, done: false }, { setting })?.feedback?.kind === "correct"))
    errors.push(`a Hint matches the answer ${item.answer}`);
  if (!errors.length) errors.push(...actChecks(actManipulate, item, { setting: item.answer }, values.map((setting) => ({ setting }))));
  return [...errors, ...gradedRules(item)];
}
