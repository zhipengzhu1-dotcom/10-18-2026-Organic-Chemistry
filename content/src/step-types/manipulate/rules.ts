// Manipulate a Scene: the Student works a slider (one settable state of the
// Scene) and presses Check on a value.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse, SceneValue } from "../../model.ts";
import { gradedText, hintText, oneShot, oneShotStart, promptOutline, sameValue, type PlayState, type Played, type StepRules } from "../play.ts";

/** A Manipulate Hint: `match` lists the wrong control values it answers. */
export interface ManipulateHint {
  match?: SceneValue[];
  text: string;
}

export interface ManipulateStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "manipulate";
  prompt: string;
  scene: SceneUse;
  /** The settable state the slider drives; it starts at `scene.state[control]`. */
  control: string;
  answer: SceneValue;
  correct?: string;
  hints?: ManipulateHint[];
  reveal: string;
  problemId?: string;
  citations?: Cited[];
  /** The molecule the Step names: Explore in 3D (#71). */
  molecule?: MoleculeUse;
}

/** The control's value when Check is pressed. */
export type ManipulateAnswer = { setting: SceneValue };

const takesSetting = (answer: object): answer is ManipulateAnswer => "setting" in answer;

type Graded = Pick<ManipulateStep, "answer" | "hints" | "correct" | "reveal">;

export function actManipulate(step: Graded, state: PlayState, input: object): Played<PlayState> | undefined {
  if (!takesSetting(input)) return undefined;
  const same = (v: SceneValue) => sameValue(v, input.setting);
  return oneShot(step, state, { right: same(step.answer), hint: step.hints?.find((h) => !h.match || h.match.some(same)) });
}

export const manipulate = {
  secret: ["answer", "correct", "hints", "reveal", "revealScene"] as const,
  blank: { answer: Number.NaN, reveal: "" },
  render: (s, { md }) => ({ ...s, ...gradedText(s, md), hints: hintText(s.hints, md) }),
  outline: promptOutline,
  answer: (setting) => ({ setting }),
  start: oneShotStart,
  takes: takesSetting,
  act: actManipulate,
} satisfies StepRules<ManipulateStep, PlayState, ManipulateAnswer, SceneValue>;
