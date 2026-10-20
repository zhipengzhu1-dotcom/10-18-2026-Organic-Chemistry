// Draw arrows, file shape and build checks (Node only). Pushes, Hint ids,
// starts and results are checked against the structures, and the declared
// pushes replayed through the same rules `act` uses (resolveArrows in ../../structures.ts).
import { z } from "zod";
import type { Structure } from "../../model.ts";
import { resolveArrows } from "../../structures.ts";
import { gradedRules } from "../checks.ts";
import { gradedVisuals, id, molecule, phase, problemMeta, sceneUse, stepId, text, type Agrees } from "../fields.ts";
import type { Push, PushHint } from "./rules.ts";

/** One curved arrow: `from` an atom id (its lone pair) or a bond id; `to` an atom id or a bond id. */
export const push = z.strictObject({ from: id, to: id });
true satisfies Agrees<typeof push, Push>;

/**
 * A Draw-arrows Hint, matched on the wrong push: `from` = it starts at one of these (atom ids =
 * their lone pair, bond ids, `sigma` = any single bond); `to` = it lands on one of these.
 */
export const pushHint = z.strictObject({ from: z.array(id).min(1).optional(), to: z.array(id).min(1).optional(), text });
true satisfies Agrees<typeof pushHint, PushHint>;

/** Fields shared by a Draw-arrows Step and Problem. Structures are named by file id; atom ids are the atom map. */
export const fields = {
  ...gradedVisuals,
  type: z.literal("draw-arrows"),
  molecule,
  prompt: text,
  /** The structure the Student pushes on. */
  start: id,
  /** Every accepted result; the first is the target drawn dimmed beside the start. */
  results: z.array(id).min(1),
  /** Open Problems and "no target this time": don't draw the target. */
  hideTarget: z.boolean().optional(),
  /**
   * Lesson 8 (#86): orbital marks on the start drawing, drawing aids only: `lone-pair` labels an atom's
   * lone pair (e.g. "HOMO"); `empty-p` outlines an empty p orbital on the atom (e.g. "LUMO (empty)").
   */
  marks: z.array(z.strictObject({ atom: id, kind: z.enum(["lone-pair", "empty-p"]), text })).min(1).optional(),
  /** The correct pushes, in an order that works (shown after two wrong tries, and in the reveal). */
  answer: z.array(push).min(1),
  /** In-between copy; `{atom}` and `{electrons}` are filled in. Plain defaults apply when absent. */
  inBetween: z.strictObject({ over: text.optional(), short: text.optional() }).optional(),
  correct: text.optional(),
  hints: z.array(pushHint).optional(),
  reveal: text,
};

export const step = z.strictObject({ id: stepId, phase, ...fields, scene: sceneUse.optional() });
export const problem = z.strictObject({ ...problemMeta, ...fields });

export type DrawArrowsFile = z.infer<typeof step> | z.infer<typeof problem>;

/** The structure-free rules; the rest run once its structures are resolved. */
export const check = (item: DrawArrowsFile): string[] => gradedRules(item);

/** File fields its resolved structures replace. */
export const fileOnly = ["start", "results", "hideTarget"] as const;

export const structures = (item: DrawArrowsFile, all: Map<string, Structure | undefined>, errors: string[]) => resolveArrows(item, all, errors);
