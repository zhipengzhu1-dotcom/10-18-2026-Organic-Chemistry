// Numeric input, file shape and build checks (Node only).
import { z } from "zod";
import { actChecks, gradedRules } from "../checks.ts";
import { gradedVisuals, molecule, phase, problemMeta, sceneUse, stepId, text, type Agrees } from "../fields.ts";
import { actNumeric, type NumericHint } from "./rules.ts";

/** A Numeric Hint: `match` is a common wrong value, matched within the Step's tolerance. */
const numericHint = z.strictObject({ match: z.number().optional(), text });
true satisfies Agrees<typeof numericHint, NumericHint>;

/** Fields shared by a Numeric input Step and a Numeric Problem. The unit is fixed here and shown, never typed. */
export const fields = {
  ...gradedVisuals,
  type: z.literal("numeric"),
  molecule,
  prompt: text,
  /** The unit of measure, e.g. "°", "Å", "kJ/mol" (named so it can't be read as a course Unit). */
  unitSymbol: z.string(),
  /** Show a ± key beside the box (answers that may be negative, e.g. a formal charge). */
  signKey: z.boolean().optional(),
  answer: z.number(),
  /** Absolute: answer ± tolerance is right. */
  tolerance: z.number().min(0),
  correct: text.optional(),
  hints: z.array(numericHint).optional(),
  reveal: text,
};

export const step = z.strictObject({ id: stepId, phase, ...fields, scene: sceneUse.optional() });
export const problem = z.strictObject({ ...problemMeta, ...fields });

/** Graded at each Hint's own value: it must be wrong there, and that Hint the one shown. */
export function check(item: z.infer<typeof step> | z.infer<typeof problem>): string[] {
  const errors: string[] = [];
  const matches = (item.hints ?? []).flatMap((h) => (h.match === undefined ? [] : [h.match]));
  for (const match of matches)
    if (actNumeric(item, { tries: 0, done: false }, { value: match })?.feedback?.kind === "correct")
      errors.push(`a Hint matches ${match}, which is within the tolerance of the answer`);
  if (!errors.length) errors.push(...actChecks(actNumeric, item, { value: item.answer }, matches.map((value) => ({ value }))));
  return [...errors, ...gradedRules(item)];
}
