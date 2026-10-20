// Rotate-and-identify 3D: the Student turns the molecule in the 3D card and
// answers with ordinary choices, graded exactly like Multiple choice.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse } from "../../model.ts";
import { judgeChoice, selectOf, takesChoice, type ChoiceAnswer, type HintRule } from "../choice.ts";
import { gradedText, hintText, oneShot, oneShotStart, type PlayState, type Played, type StepRules } from "../play.ts";

export interface RotateAndIdentifyStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "rotate-and-identify";
  prompt: string;
  molecule: MoleculeUse;
  options: { id: string; text: string }[];
  /** The exact set of correct option ids. */
  answer: string[];
  correct?: string;
  hints?: HintRule[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

type Graded = Pick<RotateAndIdentifyStep, "answer" | "hints" | "correct" | "reveal">;

export const actRotate = (step: Graded, state: PlayState, input: object): Played<PlayState> | undefined =>
  takesChoice(input) ? oneShot(step, state, judgeChoice(step, input.choice)) : undefined;

export const rotateAndIdentify = {
  secret: ["answer", "correct", "hints", "reveal", "revealScene"] as const,
  blank: { answer: [], reveal: "" },
  page: (step) => ({ select: selectOf(step.answer) }),
  // The molecule's `describe` stays plain text: it is read aloud, not shown.
  render: (s, { md }) => ({
    ...s,
    ...gradedText(s, md),
    options: s.options.map((o) => ({ ...o, text: md(o.text) })),
    hints: hintText(s.hints, md),
  }),
  start: oneShotStart,
  takes: takesChoice,
  act: actRotate,
} satisfies StepRules<RotateAndIdentifyStep, PlayState, ChoiceAnswer, { select: "one" | "many" }>;
