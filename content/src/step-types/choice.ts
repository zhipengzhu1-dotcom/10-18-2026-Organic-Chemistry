// Grading a set of choices, shared by Multiple choice, Rotate-and-identify and
// Tap-to-identify: the exact set is right, and Hints match on what was picked.
import type { Judged } from "./play.ts";

/**
 * A Hint. Every condition given must hold: `match` = the exact chosen set; `includes` = at least
 * one of these was chosen; `misses` = at least one of these was not. The generic fallback has no
 * condition and comes last. Hints are tried first to last.
 */
export interface HintRule {
  match?: string[];
  includes?: string[];
  misses?: string[];
  text: string;
}

/** Chosen option ids (Multiple choice, Rotate-and-identify), or picked atom / bond / region ids (Tap-to-identify). */
export type ChoiceAnswer = { choice: string[] };

export const takesChoice = (answer: object): answer is ChoiceAnswer => "choice" in answer;

/** The ids picked so far; nothing picked is no answer yet. */
export const choiceAnswer = (choice: string[]): ChoiceAnswer | null => (choice.length ? { choice } : null);

export function judgeChoice(step: { answer: string[]; hints?: HintRule[] }, choice: string[]): Judged {
  return { right: sameSet(choice, step.answer), hint: step.hints?.find((h) => hintFits(h, choice)) };
}

/** Every condition the Hint gives must hold; the generic fallback has none. */
function hintFits(hint: HintRule, choice: string[]): boolean {
  return (
    (!hint.match || sameSet(hint.match, choice)) &&
    (!hint.includes || hint.includes.some((id) => choice.includes(id))) &&
    (!hint.misses || hint.misses.some((id) => !choice.includes(id)))
  );
}

/** Every id a set Hint names: its exact `match`, and its `includes` / `misses` conditions. */
export const hintIds = (h: HintRule) => [...(h.match ?? []), ...(h.includes ?? []), ...(h.misses ?? [])];

function sameSet(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((x) => set.has(x));
}

/** A Student picks one choice when the answer is one, else any set of them. */
export const selectOf = (answer: string[]): "one" | "many" => (answer.length === 1 ? "one" : "many");
