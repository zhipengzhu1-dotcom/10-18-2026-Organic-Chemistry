// Build checks Step types share: the rules every graded Step and Problem keeps,
// and validation through the type's own `act` (the grading the Step player
// runs), so the build and the player can't disagree.
import { oneShotStart, type PlayState, type Played } from "./play.ts";

type Condition = {
  match?: unknown;
  includes?: string[];
  misses?: string[];
  notFirst?: string;
  notLast?: string;
  before?: string[];
  above?: string[][];
  from?: string[];
  to?: string[];
};
/** The generic fallback Hint has no condition. */
const isFallback = (h: Condition) =>
  h.match === undefined && !h.includes && !h.misses && !h.notFirst && !h.notLast && !h.before && !h.above && !h.from && !h.to;

/** Every graded Step and Problem: exactly one generic fallback Hint, last, and a Correct line. */
export function gradedRules(item: { hints?: Condition[]; correct?: string }): string[] {
  const errors: string[] = [];
  const hints = item.hints ?? [];
  const fallbacks = hints.filter(isFallback);
  if (fallbacks.length !== 1 || fallbacks[0] !== hints.at(-1))
    errors.push("needs exactly one generic fallback Hint (no match), and it must come last");
  if (!item.correct) errors.push("needs a Correct line");
  return errors;
}

type Act<S, A> = (step: S, state: PlayState, input: A) => Played<PlayState> | undefined;

/**
 * Grades through the type's own `act`: the declared answer must be marked right, and each Hint
 * with a condition must show on some wrong answer among `wrong` (an earlier Hint, or the answer
 * being right, can shadow it). `wrong` lists every answer a Student can give, or is left out
 * where that can't be listed.
 */
export function actChecks<S extends { hints?: (Condition & { text: string })[] }, A>(
  act: Act<S, A>,
  step: S,
  right: A,
  wrong?: Iterable<A>,
): string[] {
  const errors: string[] = [];
  if (act(step, oneShotStart(), right)?.feedback?.kind !== "correct") errors.push("the answer isn't marked right");
  if (!wrong) return errors;
  const shown = new Set<string>();
  for (const answer of wrong) {
    const feedback = act(step, oneShotStart(), answer)?.feedback;
    if (feedback?.kind === "hint") shown.add(feedback.text);
  }
  (step.hints ?? []).forEach((h, i) => {
    if (!isFallback(h) && !shown.has(h.text)) errors.push(`Hint ${i + 1} never shows: every answer it matches is right or meets an earlier Hint first`);
  });
  return errors;
}

/** Every pick a Student can make: one choice when the answer is one, else any non-empty set. Undefined past 10 choices. */
export function picks(ids: string[], one: boolean): string[][] | undefined {
  if (one) return ids.map((id) => [id]);
  if (ids.length > 10) return undefined;
  return Array.from({ length: 2 ** ids.length - 1 }, (_, n) => ids.filter((_, i) => (n + 1) & (1 << i)));
}

/** Every order of the items. Undefined past 8 items. */
export function orders(ids: string[]): string[][] | undefined {
  if (ids.length > 8) return undefined;
  const all = (rest: string[]): string[][] => (rest.length ? rest.flatMap((id) => all(rest.filter((x) => x !== id)).map((o) => [id, ...o])) : [[]]);
  return all(ids);
}
