// What the Tutor panel and the Tutor route agree on (spec #104): the dev-server path, the
// request and the NDJSON lines streamed back. Dev only: nothing here ships in the build.
import type { TutorContext } from "./context.ts";

/** The dev-server path of the Tutor route. */
export const TUTOR_PATH = "/__tutor";

/** The Tutor panel's class (the built-site check looks for it). */
export const PANEL_CLASS = "tutor-panel";

export interface Turn {
  role: "student" | "tutor";
  text: string;
}

export interface TutorRequest {
  model?: string;
  effort?: string;
  message: string;
  history: Turn[];
  context: TutorContext;
}

/** The stage moves a reply may carry, carried out through the Step player's own controls. */
export const ACTION_TYPES = ["play", "pause", "replay", "seek", "set", "highlight", "clear"] as const;
/** At most this many stage moves per reply. */
export const MAX_ACTIONS = 4;

/**
 * One stage move: `seek` jumps the Scene to `at` (0..1 of its length), `set` moves the Scene
 * control to `value`, `highlight` rings `context.stage.atoms[atom]`, `clear` removes the rings.
 */
export type StageAction =
  | { type: "play" | "pause" | "replay" | "clear" }
  | { type: "seek"; at: number }
  | { type: "set"; value: number }
  | { type: "highlight"; atom: number };

/** What `GET` returns, for the picker: model ids to labels, the efforts, and the default pair. */
export interface TutorChoices {
  models: Record<string, string>;
  efforts: string[];
  model: string;
  effort: string;
}

/** One NDJSON line: the reply so far (repeated as it grows), then `done`, or `error`. */
export type TutorEvent =
  | { type: "reply"; text: string }
  | { type: "done"; reply: string; actions: StageAction[]; model: string; effort: string; ms: number }
  | { type: "error"; message: string };
