// Multiple choice: pick one option, or several when the answer is several;
// graded on the exact set. A Hook prediction accepts every choice and reveals at once.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Option, Phase, SceneUse } from "../../model.ts";
import { choiceAnswer, judgeChoice, selectOf, takesChoice, type ChoiceAnswer, type HintRule } from "../choice.ts";
import { gradedText, hintText, oneShot, oneShotStart, reveal, type PlayState, type Played, type StepRules } from "../play.ts";

export interface MultipleChoiceStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "multiple-choice";
  prompt: string;
  /** Text options or structure cards. */
  options: Option[];
  answer: string[];
  correct?: string;
  hints?: HintRule[];
  reveal: string;
  prediction?: boolean;
  /** Set on Check Steps: the Bank Problem this Step plays. */
  problemId?: string;
  scene?: SceneUse;
  molecule?: MoleculeUse;
  /** The cited values this Step's text shows (`{{file/key}}`); its Source note is generated from them. */
  citations?: Cited[];
}

/** What grading reads, so the content build can grade a Step file before it is resolved. */
type Graded = Pick<MultipleChoiceStep, "answer" | "hints" | "correct" | "reveal" | "prediction">;

export function actMultipleChoice(step: Graded, state: PlayState, input: object): Played<PlayState> | undefined {
  if (!takesChoice(input)) return undefined;
  if (step.prediction) return { state: { ...state, done: true }, feedback: reveal(step) };
  return oneShot(step, state, judgeChoice(step, input.choice));
}

export const multipleChoice = {
  secret: ["answer", "correct", "hints", "reveal", "revealScene"] as const,
  blank: { answer: [], reveal: "" },
  page: (step) => ({ select: selectOf(step.answer) }),
  render: (s, { md, draw }) => ({
    ...s,
    ...gradedText(s, md),
    // A structure card's text is its screen-reader label: kept plain; its drawing is pre-rendered SVG.
    options: s.options.map((o) => (o.structure ? { ...o, structure: draw(o.structure) } : { ...o, text: md(o.text) })),
    hints: hintText(s.hints, md),
  }),
  // A structure card's text is its plain label.
  outline: (s) => ({ lead: s.prompt, choices: s.options.map((o) => o.text) }),
  answer: choiceAnswer,
  start: oneShotStart,
  takes: takesChoice,
  act: actMultipleChoice,
} satisfies StepRules<MultipleChoiceStep, PlayState, ChoiceAnswer, string[], { select: "one" | "many" }>;
