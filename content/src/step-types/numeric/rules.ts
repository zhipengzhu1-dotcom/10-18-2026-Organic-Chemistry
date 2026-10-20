// Numeric input: the Student types a number; the unit is fixed and shown beside
// the box, never typed. Right within answer ± tolerance.
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse } from "../../model.ts";
import { gradedText, hintText, oneShot, oneShotStart, type PlayState, type Played, type StepRules } from "../play.ts";

/** A Numeric Hint: `match` is a common wrong value, matched within the Step's tolerance. */
export interface NumericHint {
  match?: number;
  text: string;
}

export interface NumericStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "numeric";
  prompt: string;
  /** The unit of measure shown beside the box, e.g. "°" or "Å". */
  unitSymbol: string;
  /** A ± key beside the box flips the sign of what is typed. */
  signKey?: boolean;
  answer: number;
  /** Absolute: a value within answer ± tolerance is right. */
  tolerance: number;
  correct?: string;
  hints?: NumericHint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  molecule?: MoleculeUse;
  citations?: Cited[];
}

/** The number typed. */
export type NumericAnswer = { value: number };

const takesValue = (answer: object): answer is NumericAnswer => "value" in answer;

type Graded = Pick<NumericStep, "answer" | "tolerance" | "hints" | "correct" | "reveal">;

export function actNumeric(step: Graded, state: PlayState, input: object): Played<PlayState> | undefined {
  if (!takesValue(input) || !Number.isFinite(input.value)) return undefined;
  const near = (target: number) => Math.abs(input.value - target) <= step.tolerance + 1e-9;
  return oneShot(step, state, { right: near(step.answer), hint: step.hints?.find((h) => h.match === undefined || near(h.match)) });
}

export const numeric = {
  secret: ["answer", "tolerance", "correct", "hints", "reveal", "revealScene"] as const,
  blank: { answer: Number.NaN, tolerance: 0, reveal: "" },
  render: (s, { md }) => ({ ...s, ...gradedText(s, md), hints: hintText(s.hints, md) }),
  start: oneShotStart,
  takes: takesValue,
  act: actNumeric,
} satisfies StepRules<NumericStep, PlayState, NumericAnswer>;
