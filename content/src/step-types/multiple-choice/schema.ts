// Multiple choice, file shape and build checks (Node only).
import { z } from "zod";
import type { Structure } from "../../model.ts";
import { resolveOptions } from "../../structures.ts";
import { hintIds, selectOf } from "../choice.ts";
import { actChecks, gradedRules, picks } from "../checks.ts";
import { gradedVisuals, hint, id, molecule, option, phase, problemMeta, sceneUse, stepId, text } from "../fields.ts";
import { actMultipleChoice } from "./rules.ts";

/** Fields shared by a Multiple choice Step and a Multiple choice Problem. */
export const fields = {
  ...gradedVisuals,
  type: z.literal("multiple-choice"),
  molecule,
  prompt: text,
  options: z.array(option).min(2),
  /** The exact set of correct option ids. */
  answer: z.array(id).min(1),
  /** The Correct line: the short "why" shown on a right answer. */
  correct: text.optional(),
  hints: z.array(hint).optional(),
  reveal: text,
};

export const step = z.strictObject({
  id: stepId,
  phase,
  ...fields,
  scene: sceneUse.optional(),
  /** Hook only: every choice is accepted and the reveal follows at once. */
  prediction: z.boolean().optional(),
});
export const problem = z.strictObject({ ...problemMeta, ...fields });
export type MultipleChoiceFile = z.infer<typeof step> | z.infer<typeof problem>;

/** A Hook prediction is ungraded: no Hint or Correct-line rules. Option ids are checked before grading. */
export function check(item: MultipleChoiceFile): string[] {
  const prediction = "prediction" in item && item.prediction === true;
  const errors: string[] = [];
  if (prediction && "phase" in item && item.phase !== "hook") errors.push("prediction is allowed only in the Hook");
  const optionIds = item.options.map((o) => o.id);
  for (const id of item.answer) if (!optionIds.includes(id)) errors.push(`answer names unknown option "${id}"`);
  if (prediction) return errors;
  for (const hint of item.hints ?? [])
    for (const id of hintIds(hint)) if (!optionIds.includes(id)) errors.push(`a Hint matches unknown option "${id}"`);
  if (!errors.length) errors.push(...actChecks(actMultipleChoice, item, { choice: item.answer }, wrongPicks(optionIds, item.answer)));
  return [...errors, ...gradedRules(item)];
}

/** Structure cards resolve to drawings; text options pass through. */
export const structures = (item: MultipleChoiceFile, all: Map<string, Structure | undefined>, errors: string[]) => ({
  options: resolveOptions(item.options, all, errors),
});

/** Every pick but the right one (shared with Rotate-and-identify). */
export const wrongPicks = (optionIds: string[], answer: string[]) =>
  picks(optionIds, selectOf(answer) === "one")
    ?.filter((p) => !(p.length === answer.length && p.every((id) => answer.includes(id))))
    .map((choice) => ({ choice }));
