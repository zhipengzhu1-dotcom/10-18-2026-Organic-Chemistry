// Tap-to-identify, file shape and build checks (Node only). The answer and
// Hint ids are checked against the structure's targets once it is resolved
// (resolveTap in ../../structures.ts).
import { z } from "zod";
import type { Structure } from "../../model.ts";
import { resolveTap } from "../../structures.ts";
import { actChecks, gradedRules } from "../checks.ts";
import { push } from "../draw-arrows/schema.ts";
import { gradedVisuals, hide, hint, id, molecule, phase, problemMeta, sceneUse, stepId, text } from "../fields.ts";
import { actTap } from "./rules.ts";

/** Fields shared by a Tap-to-identify Step and Problem. */
export const fields = {
  ...gradedVisuals,
  type: z.literal("tap-to-identify"),
  molecule,
  prompt: text,
  /** The structure file drawn. */
  structure: id,
  hide,
  /** Bonds drawn with a thick outline (not colour alone), e.g. the bond each tap is about. */
  outline: z.array(id).min(1).optional(),
  /** Screen-reader text for the whole drawing. */
  alt: text.optional(),
  /** What can be tapped: atom and bond ids of the structure ("all" for every one), and named regions (fixed atom sets). */
  tappable: z.strictObject({
    atoms: z.union([z.literal("all"), z.array(id).min(1)]).optional(),
    bonds: z.union([z.literal("all"), z.array(id).min(1)]).optional(),
    regions: z.array(z.strictObject({ id, atoms: z.array(id).min(1), label: text })).optional(),
  }),
  /** The exact set of target ids to pick. */
  answer: z.array(id).min(1),
  correct: text.optional(),
  hints: z.array(hint).optional(),
  reveal: text,
  /** The tap-only cue, required when the Step sits among Draw-arrows Steps: the idle callout and the message on a drag. */
  tapOnly: z.strictObject({ idle: text, drag: text }).optional(),
  /** Pushes played (push-replay) once the Step is answered, in place of the drawing: they turn `start` into `result`. Secret. */
  replay: z.strictObject({ start: id, result: id, pushes: z.array(push).min(1) }).optional(),
};

export const step = z.strictObject({ id: stepId, phase, ...fields, scene: sceneUse.optional() });
export const problem = z.strictObject({ ...problemMeta, ...fields });
export type TapFile = z.infer<typeof step> | z.infer<typeof problem>;

/** The targets are known only once the structure resolves, so Hints aren't graded against every pick here. */
export const check = (item: TapFile): string[] => [...actChecks(actTap, item, { choice: item.answer }), ...gradedRules(item)];

/** File fields its resolved structure and targets replace. */
export const fileOnly = ["tappable", "hide", "outline"] as const;

export const structures = (item: TapFile, all: Map<string, Structure | undefined>, errors: string[]) => resolveTap(item, all, errors);
