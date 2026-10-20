// Rank / order, file shape and build checks (Node only).
import { z } from "zod";
import type { Structure } from "../../model.ts";
import { resolveOptions } from "../../structures.ts";
import { actChecks, gradedRules, orders } from "../checks.ts";
import { gradedVisuals, id, molecule, option, phase, problemMeta, sceneUse, stepId, text, type Agrees } from "../fields.ts";
import { actRank, type RankHint } from "./rules.ts";

/** A Rank Hint: a whole wrong order, or a pattern (an item not first / not last, one item before another). */
const rankHint = z.strictObject({
  match: z.array(id).min(1).optional(),
  notFirst: id.optional(),
  notLast: id.optional(),
  before: z.tuple([id, id]).optional(),
  /** At least one of these [upper, lower] pairs has its first item above its second (Lesson 7: "`c` or `d` above `a` or `b`"). */
  above: z.array(z.tuple([id, id])).min(1).optional(),
  text,
});
true satisfies Agrees<typeof rankHint, RankHint>;

/** Fields shared by a Rank / order Step and a Rank Problem. */
export const fields = {
  ...gradedVisuals,
  type: z.literal("rank"),
  molecule,
  prompt: text,
  /** The cards, in the order they start in: text, or structure cards (Lesson 7). */
  items: z.array(option).min(2),
  /** The one strict order of item ids, first to last. */
  answer: z.array(id).min(2),
  correct: text.optional(),
  /** A Rank Hint's `match` is one whole wrong order; `notFirst`, `notLast` and `before` name a pattern. */
  hints: z.array(rankHint).optional(),
  reveal: text,
  /** Shown on each card once the Step is answered, in the right order: why it sits there (secret: it gives the order away). */
  revealTags: z.record(id, text).optional(),
};

export const step = z.strictObject({ id: stepId, phase, ...fields, scene: sceneUse.optional() });
export const problem = z.strictObject({ ...problemMeta, ...fields });
type RankFile = z.infer<typeof step> | z.infer<typeof problem>;

/** Structure cards resolve to drawings; text items pass through. */
export const structures = (item: RankFile, all: Map<string, Structure | undefined>, errors: string[]) => ({
  items: resolveOptions(item.items, all, errors),
});

/** Orders and Hints name the items; then every wrong order is graded, so each Hint must show on one. */
export function check(item: RankFile): string[] {
  const errors: string[] = [];
  const itemIds = item.items.map((i) => i.id);
  const wholeOrder = (order: string[]) =>
    order.length === itemIds.length && new Set(order).size === order.length && itemIds.every((id) => order.includes(id));
  if (!wholeOrder(item.answer)) errors.push("answer must list every item exactly once");
  else if (item.answer.every((id, i) => id === itemIds[i]))
    errors.push("the items start in the answer order; list them in a different order");
  if (item.hints?.some((h) => h.match && !wholeOrder(h.match)))
    errors.push("a Hint's match must list every item exactly once");
  for (const h of item.hints ?? [])
    for (const id of [h.notFirst, h.notLast, ...(h.before ?? [])])
      if (id !== undefined && !itemIds.includes(id)) errors.push(`a Hint names unknown item "${id}"`);
  for (const [upper, lower] of item.hints?.flatMap((h) => h.above ?? []) ?? []) {
    const unknown = [upper, lower].filter((id) => !itemIds.includes(id));
    for (const id of unknown) errors.push(`a Hint names unknown item "${id}"`);
    if (!unknown.length && item.answer.indexOf(upper) < item.answer.indexOf(lower))
      errors.push(`a Hint's "above" pair ${upper} above ${lower} holds in the answer order`);
  }
  for (const id of Object.keys(item.revealTags ?? {}))
    if (!itemIds.includes(id)) errors.push(`a reveal tag names unknown item "${id}"`);
  if (!errors.length) {
    const wrong = orders(itemIds)?.filter((o) => o.some((id, i) => id !== item.answer[i]));
    errors.push(...actChecks(actRank, item, { order: item.answer }, wrong?.map((order) => ({ order }))));
  }
  return [...errors, ...gradedRules(item)];
}
