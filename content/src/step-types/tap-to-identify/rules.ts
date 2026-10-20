// Tap-to-identify: the Student taps atoms, bonds or regions of a drawing;
// graded on the exact set picked, like Multiple choice.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse, Structure, StructureView, TapTarget } from "../../model.ts";
import { choiceAnswer, judgeChoice, takesChoice, type ChoiceAnswer, type HintRule } from "../choice.ts";
import type { Push } from "../draw-arrows/rules.ts";
import { gradedText, hintText, oneShot, oneShotStart, promptOutline, type PlayState, type Played, type StepRules } from "../play.ts";

export interface TapStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "tap-to-identify";
  prompt: string;
  structure: StructureView;
  /** Screen-reader text for the whole drawing. */
  alt?: string;
  targets: TapTarget[];
  /** The exact set of target ids to pick. */
  answer: string[];
  correct?: string;
  hints?: HintRule[];
  reveal: string;
  /** Shown when the Step sits among Draw-arrows Steps: it is tap-only. */
  tapOnly?: { idle: string; drag: string };
  /** Played (push-replay) in place of the drawing once the Step is answered: pushes on `start` that make the δ site (Lesson 7). Secret. */
  replay?: { start: Structure; pushes: Push[] };
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
  /** The molecule the Step names: Explore in 3D (#71). */
  molecule?: MoleculeUse;
}

type Graded = Pick<TapStep, "answer" | "hints" | "correct" | "reveal">;

export const actTap = (step: Graded, state: PlayState, input: object): Played<PlayState> | undefined =>
  takesChoice(input) ? oneShot(step, state, judgeChoice(step, input.choice)) : undefined;

export const tapToIdentify = {
  secret: ["answer", "correct", "hints", "reveal", "revealScene", "replay"] as const,
  blank: { answer: [], reveal: "" },
  render: (s, { md, draw }) => ({ ...s, ...gradedText(s, md), structure: draw(s.structure, s.targets), hints: hintText(s.hints, md) }),
  outline: promptOutline,
  answer: choiceAnswer,
  start: oneShotStart,
  takes: takesChoice,
  act: actTap,
} satisfies StepRules<TapStep, PlayState, ChoiceAnswer, string[]>;
