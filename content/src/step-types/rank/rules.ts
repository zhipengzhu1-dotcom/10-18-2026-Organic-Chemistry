// Rank / order: the Student puts the items into one strict order (the prompt
// names which end is first). Hints match a whole wrong order or a pattern.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Option, Phase, SceneUse } from "../../model.ts";
import { gradedText, hintText, oneShot, oneShotStart, type PlayState, type Played, type StepRules } from "../play.ts";

/** A Rank Hint: a whole wrong order, or a pattern (an item not first / not last, one item before another). */
export interface RankHint {
  match?: string[];
  notFirst?: string;
  notLast?: string;
  before?: [string, string];
  /** At least one of these [upper, lower] pairs has its first item above its second (Lesson 7: "`c` or `d` above `a` or `b`"). */
  above?: [string, string][];
  text: string;
}

export interface RankStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "rank";
  prompt: string;
  /** In the order the cards start in; a structure card's text is its screen-reader label (Lesson 7). */
  items: Option[];
  /** The one correct order of item ids, first to last. */
  answer: string[];
  correct?: string;
  /** A Hint's `match` is one whole wrong order; or it names a pattern (see RankHint). */
  hints?: RankHint[];
  reveal: string;
  /** Once answered, each card's note on why it sits there; secret (it gives the order away). */
  revealTags?: Record<string, string>;
  problemId?: string;
  scene?: SceneUse;
  molecule?: MoleculeUse;
  citations?: Cited[];
}

/** The item ids in the order the Student left them, first to last. */
export type RankAnswer = { order: string[] };

const takesOrder = (answer: object): answer is RankAnswer => "order" in answer;

type Graded = Pick<RankStep, "answer" | "hints" | "correct" | "reveal">;

export function actRank(step: Graded, state: PlayState, input: object): Played<PlayState> | undefined {
  if (!takesOrder(input)) return undefined;
  const { order } = input;
  const at = (id: string) => order.indexOf(id);
  const fits = (h: RankHint) =>
    (!h.match || sameOrder(h.match, order)) &&
    (!h.notFirst || at(h.notFirst) !== 0) &&
    (!h.notLast || at(h.notLast) !== order.length - 1) &&
    (!h.before || at(h.before[0]) < at(h.before[1])) &&
    (!h.above || h.above.some(([upper, lower]) => at(upper) < at(lower)));
  return oneShot(step, state, { right: sameOrder(order, step.answer), hint: step.hints?.find(fits) });
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export const rank = {
  secret: ["answer", "correct", "hints", "reveal", "revealScene", "revealTags"] as const,
  blank: { answer: [], reveal: "" },
  render: (s, { md, draw }) => ({
    ...s,
    ...gradedText(s, md),
    // A structure card's text is its screen-reader label: kept plain; its drawing is pre-rendered SVG.
    items: s.items.map((o) => (o.structure ? { ...o, structure: draw(o.structure) } : { ...o, text: md(o.text) })),
    hints: hintText(s.hints, md),
  }),
  outline: (s) => ({ lead: s.prompt, choices: s.items.map((i) => i.text) }),
  // Any order of the cards is an answer, the one they were dealt in too.
  answer: (order) => ({ order }),
  start: oneShotStart,
  takes: takesOrder,
  act: actRank,
} satisfies StepRules<RankStep, PlayState, RankAnswer, string[]>;
