// The Step type table (`@astratron/content/step-types`): one entry per Step type,
// each a module in its own folder (`<type>/rules.ts` here, `<type>/schema.ts` for
// the content build). Browser-safe: no zod, not even through an import, so the
// Step player bundles it. The Step union and everything keyed by Step type are
// worked out from this table, and the schema table (schemas.ts) must have the
// same keys, so a type missing from either fails to compile.
//
// Adding a Step type: a folder with `rules.ts` and `schema.ts`, one entry here
// and one in schemas.ts (docs/dev/content.md).
import { drawArrows } from "./draw-arrows/rules.ts";
import { explain } from "./explain/rules.ts";
import { manipulateGoal } from "./manipulate-goal/rules.ts";
import { manipulate } from "./manipulate/rules.ts";
import { multipleChoice } from "./multiple-choice/rules.ts";
import { numeric } from "./numeric/rules.ts";
import type { Nudge, PlayState, Played, StepRules } from "./play.ts";
import { rank } from "./rank/rules.ts";
import { rotateAndIdentify } from "./rotate-and-identify/rules.ts";
import { tapToIdentify } from "./tap-to-identify/rules.ts";

export const stepTypes = {
  explain,
  "multiple-choice": multipleChoice,
  numeric,
  rank,
  "tap-to-identify": tapToIdentify,
  manipulate,
  "rotate-and-identify": rotateAndIdentify,
  "draw-arrows": drawArrows,
  "manipulate-goal": manipulateGoal,
};

type Table = typeof stepTypes;
export type StepType = keyof Table;
type StepOf<R> = R extends { render: (step: infer S, ...rest: never[]) => unknown } ? S : never;

/** A resolved Step of each type, as the content build hands it to the site. */
export type Step = { [T in StepType]: StepOf<Table[T]> }[StepType];
/** The resolved Step of one type. */
export type StepOfType<T extends StepType> = StepOf<Table[T]>;
/** A Step the Student answers and the engine grades. */
export type GradedStep = Exclude<Step, StepOfType<"explain" | "manipulate-goal">>;
/** The play state of a Step of one type (`PlayState` plus the type's own). */
export type StateOf<T extends StepType> = ReturnType<Table[T]["start"]>;
/** What a Student submits on a Step of one type. */
export type AnswerOf<T extends StepType> = Table[T]["takes"] extends (a: any) => a is infer A ? A : never; // eslint-disable-line @typescript-eslint/no-explicit-any
/** What a Student submits, on any Step type; answers are JSON, so saved progress replays them. */
export type Answer = { [T in StepType]: AnswerOf<T> }[StepType];
/** The fields of a Step of one type that ship in the answer key. */
export type SecretOf<T extends StepType> = Table[T]["secret"][number];
type PageOf<T extends StepType> = Table[T] extends { page: (step: never) => infer P } ? P : object;
/** A Step as the Lesson page carries it before the key arrives: no secrets, plus its page-only fields. */
export type PageStep = { [T in StepType]: Omit<StepOfType<T>, SecretOf<T> | "answerCitations"> & PageOf<T> }[StepType];

/** The table entry for this Step, typed for it. */
type AnyRules = StepRules<Step, PlayState, object, object>;
const rulesOf = (step: { type: StepType }) => stepTypes[step.type] as unknown as AnyRules;

/** Where a Step's play starts. */
export const startStep = <S extends Step>(step: S): StateOf<S["type"]> => rulesOf(step).start(step) as StateOf<S["type"]>;

/**
 * One answer or nudge on a Step: its next play state and feedback, or undefined when nothing
 * changes (the Step is done, the answer isn't this type's shape, or the type ignores the nudge).
 */
export function act<S extends Step>(step: S, state: StateOf<S["type"]>, input: Answer | Nudge): Played<StateOf<S["type"]>> | undefined {
  const rules = rulesOf(step);
  if (state.done || !("early" in input || "idle" in input || rules.takes(input))) return undefined;
  return rules.act(step, state, input) as Played<StateOf<S["type"]>> | undefined;
}

/** The type's secret fields: answers, Hints, reveals and whatever else gives the answer away (story 99). */
export const secretFields = (type: StepType): readonly string[] => stepTypes[type].secret;

/** Step id → that Step's secret fields. */
export type AnswerKey = Record<string, Record<string, unknown>>;

/**
 * Splits a Step into what the page carries and its answer key entry: its type's secret fields,
 * then `answerCitations` (numbers cited only in them). A type with no secrets ships whole, with no entry.
 */
export function splitStep(step: Step): { shown: PageStep; secrets?: Record<string, unknown> } {
  const rules = rulesOf(step);
  if (!rules.secret.length) return { shown: step as PageStep };
  const shown: Record<string, unknown> = { ...step };
  const secrets: Record<string, unknown> = {};
  for (const field of [...rules.secret, "answerCitations"] as const) {
    if (!(field in step)) continue;
    secrets[field] = shown[field];
    delete shown[field];
  }
  Object.assign(shown, rules.page?.(step));
  return { shown: shown as PageStep, secrets };
}

/** The playable Step from the page's Step and its key entry. Without the entry its secrets are the type's blanks: it draws, but must not be graded. */
export function joinStep(shown: PageStep, secrets?: Record<string, unknown>): Step {
  const rules = rulesOf(shown);
  if (!rules.secret.length) return shown as Step;
  const step: Record<string, unknown> = { ...rules.blank, ...shown, ...secrets };
  for (const field of Object.keys(rules.page?.(step as unknown as Step) ?? {})) delete step[field];
  return step as unknown as Step;
}

export { ANSWER_ORDER, oneShotStart, reached, sameValue } from "./play.ts";
export type { Feedback, Nudge, PlayState, Played, Renderer, StepRules } from "./play.ts";
export type { ChoiceAnswer, HintRule } from "./choice.ts";
export type { DrawArrowsAnswer, DrawArrowsState, ArrowsScreen, DrawArrowsStep, Push, PushHint } from "./draw-arrows/rules.ts";
export type { ExplainStep } from "./explain/rules.ts";
export type { GoalAnswer, GoalScreen, GoalStage, GoalState, GoalStep } from "./manipulate-goal/rules.ts";
export type { ManipulateAnswer, ManipulateHint, ManipulateStep } from "./manipulate/rules.ts";
export type { MultipleChoiceStep } from "./multiple-choice/rules.ts";
export type { NumericAnswer, NumericHint, NumericStep } from "./numeric/rules.ts";
export type { RankAnswer, RankHint, RankStep } from "./rank/rules.ts";
export type { RotateAndIdentifyStep } from "./rotate-and-identify/rules.ts";
export type { TapStep } from "./tap-to-identify/rules.ts";
