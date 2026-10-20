// The view table: one view per Step type, each in its own file here. A Step type
// missing from it fails to compile (its keys are the Step type table's).
import type { StepType } from "@astratron/content/step-types";
import { drawArrows } from "./draw-arrows.tsx";
import { explain } from "./explain.tsx";
import { manipulateGoal } from "./manipulate-goal.tsx";
import { manipulate } from "./manipulate.tsx";
import { multipleChoice } from "./multiple-choice.tsx";
import { numeric } from "./numeric.tsx";
import { rank } from "./rank.tsx";
import { rotateAndIdentify } from "./rotate-and-identify.tsx";
import { tapToIdentify } from "./tap-to-identify.tsx";
import type { View } from "./view.tsx";

export const views = {
  explain,
  "multiple-choice": multipleChoice,
  numeric,
  rank,
  "tap-to-identify": tapToIdentify,
  manipulate,
  "rotate-and-identify": rotateAndIdentify,
  "draw-arrows": drawArrows,
  "manipulate-goal": manipulateGoal,
} satisfies { [T in StepType]: View<T> };

/** The view for a Step of this type, typed loosely (each view file types its own). */
export const viewOf = (type: StepType) => views[type] as unknown as View<StepType>;

export type { View, ViewProps } from "./view.tsx";
