// What a Step type's view is: the parts of the Step player only that type draws,
// each in its place on the screen. StepPlayer draws everything Steps share (the
// figures, the reveal Scene, the video, the 3D card, the Source note, the foot)
// and asks the Step's view (./index.ts) for the rest. How a choice becomes an
// answer is the type's rule (`answer` in its `rules.ts`), not the view's.
import type { ReactNode } from "react";
import type { ChoiceOf, PageStepOfType, StateOf, StepOfType, StepType } from "@astratron/content/step-types";
import type { Screen } from "../../engine/player.ts";

export interface ViewProps<T extends StepType> {
  /** The Step on screen, with its answer key once that has arrived. */
  step: StepOfType<T>;
  /** The same Step as the page carries it, with its page-only fields (Multiple choice's `select`). */
  page: PageStepOfType<T>;
  screen: Screen;
  /** The Step type's play state. */
  state: StateOf<T>;
  /** The answer key is in, so answers are graded. */
  keyed: boolean;
  /** A reveal Scene plays: it shows the answer in place of the question's widgets. */
  revealing: boolean;
  /** The Step's watch-only video is playing: its prompt waits (still read to screen readers). */
  waiting: boolean;
  /** What the Student has chosen so far (the view's `choice`; a view without one doesn't read it). */
  choice: ChoiceOf<T>;
  /** Changes the choice; Check submits it. */
  choose: (choice: ChoiceOf<T>) => void;
  /** Submits a choice at once (a push, a Scene move). */
  submit: (choice: ChoiceOf<T>) => void;
  /** Check, as the Check button does (Enter in the number box). */
  check: () => void;
  /** Continue tapped before the Step is done (`early`), or no move for a while (`idle`). */
  nudge: (kind: "early" | "idle") => void;
}

/** One part of a Step type's view. */
export type Part<T extends StepType> = (props: ViewProps<T>) => ReactNode;

/** A Step type's view: each part is drawn in its place, and a part left out draws nothing. */
export interface View<T extends StepType> {
  /** The top of the Step: its prompt, or an Explain's text. */
  Lead: Part<T>;
  /** Nothing to answer (Explain): its video plays full size and holds no prompt back. */
  tells?: true;
  /** After the figures, before any Scene: the drawing the Student works on (Tap, Draw arrows). */
  Drawing?: Part<T>;
  /** In place of the Step's Scene player: a Scene the Student works (Manipulate, goal-state Manipulate). */
  Scene?: Part<T>;
  /** The Step's Scene and video wait until it is done, then play in place of the drawing (Draw arrows). */
  sceneOnceDone?: true;
  /** Below the Scene and the 3D card: the choices, number box or cards. */
  Answer?: Part<T>;
  /** The foot button until the Step is done; Check when absent. */
  Foot?: Part<T>;
  /**
   * The choice Check submits, from what the Student did on this Step (`draft`, undefined until
   * they do something) and the Screen. Absent: no Check; the view submits each choice as it is made.
   */
  choice?: (step: StepOfType<T>, draft: ChoiceOf<T> | undefined, screen: Screen) => ChoiceOf<T>;
  /** A wrong try clears the choice, so the next pick starts afresh; else it stays to edit. */
  fresh?: true;
  /** On phones the prompt gives way to the feedback once there is some (see `.player.answered`). */
  dropsPrompt?: (step: StepOfType<T>) => boolean;
}

export const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

/** The prompt paragraph; `text` is HTML. */
export function Prompt({ text, waiting }: { text: string; waiting: boolean }) {
  return <p className={waiting ? "player-prompt sr" : "player-prompt"} {...html(text)} />;
}

/** The Step's own prompt, for every type that has one. */
export const StepPrompt = ({ step, waiting }: { step: { prompt: string }; waiting: boolean }) => <Prompt text={step.prompt} waiting={waiting} />;

/** A choice's hand-drawn bubble: a pen circle that a marker scribble fills once the choice is picked (global.css). */
export const Bubble = () => (
  <svg className="bub" viewBox="0 0 26 26" aria-hidden="true">
    <circle cx="13" cy="13" r="10.5" />
    <path d="M7 15 C10 6 14 20 19 9" />
  </svg>
);

/** Picking a choice: the one picked when the Step takes one, else it toggles. */
export const toggle = (chosen: string[], id: string, one: boolean) => (one ? [id] : chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
