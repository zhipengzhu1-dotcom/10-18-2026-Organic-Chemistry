// Rotate-and-identify 3D, file shape and build checks (Node only): checked and
// graded like Multiple choice.
import { z } from "zod";
import { hintIds } from "../choice.ts";
import { actChecks, gradedRules } from "../checks.ts";
import { gradedVisuals, hint, id, moleculeUse, phase, problemMeta, sceneUse, stepId, text, textOption } from "../fields.ts";
import { wrongPicks } from "../multiple-choice/schema.ts";
import { actRotate } from "./rules.ts";

/**
 * Rotate-and-identify 3D: the Student turns the molecule in the 3D card and answers with ordinary
 * choices, graded exactly like Multiple choice (the exact set of correct option ids).
 */
export const fields = {
  type: z.literal("rotate-and-identify"),
  prompt: text,
  molecule: moleculeUse,
  ...gradedVisuals,
  options: z.array(textOption).min(2),
  answer: z.array(id).min(1),
  correct: text.optional(),
  hints: z.array(hint).optional(),
  reveal: text,
};

export const step = z.strictObject({ id: stepId, phase, ...fields, scene: sceneUse.optional() });
export const problem = z.strictObject({ ...problemMeta, ...fields });

export function check(item: z.infer<typeof step> | z.infer<typeof problem>): string[] {
  const errors: string[] = [];
  const optionIds = item.options.map((o) => o.id);
  for (const id of item.answer) if (!optionIds.includes(id)) errors.push(`answer names unknown option "${id}"`);
  for (const hint of item.hints ?? [])
    for (const id of hintIds(hint)) if (!optionIds.includes(id)) errors.push(`a Hint matches unknown option "${id}"`);
  if (!errors.length) errors.push(...actChecks(actRotate, item, { choice: item.answer }, wrongPicks(optionIds, item.answer)));
  return [...errors, ...gradedRules(item)];
}

/** Its molecule always shows in the 3D Step card. */
export const card = true;
