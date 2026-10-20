// The Tutor's remembered settings (spec #104, ticket #106): the model and effort pair and the
// on/off switch, in localStorage next to `at-theme`/`at-motion`. Storage can be blocked, so every
// read and write is wrapped: the choice then lasts for this page only.
import type { TutorChoices } from "./contract.ts";

const PICK = "at-tutor-pick";
const SWITCH = "at-tutor-switch";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}

/** A model and effort pair, as the picker's option value: `model|effort`. */
export const pairOf = (model: string, effort: string) => `${model}|${effort}`;

/** The model and effort in a picker value; none for an empty one (the route then runs its default). */
export function parsePick(pair: string): { model?: string; effort?: string } {
  if (!pair) return {};
  const [model, effort] = pair.split("|");
  return { model, effort };
}

/** The remembered pair if the route still offers it, else the route's default. */
export function storedPick(choices: TutorChoices): string {
  const { model = "", effort = "" } = parsePick(read(PICK) ?? "");
  return model in choices.models && choices.efforts.includes(effort) ? pairOf(model, effort) : pairOf(choices.model, choices.effort);
}
export const storePick = (pair: string) => write(PICK, pair);

/** On unless the Student switched it off. */
export const storedOn = () => read(SWITCH) !== "off";
export const storeOn = (on: boolean) => write(SWITCH, on ? null : "off");
