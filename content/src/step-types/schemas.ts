// The Step type table's Node half: each type's file shapes and build checks
// (`<type>/schema.ts`, zod). It must have exactly the keys of the browser-safe
// table (index.ts), so a type missing from either fails to compile.
import type { z } from "zod";
import type { Structure } from "../model.ts";
import * as drawArrows from "./draw-arrows/schema.ts";
import * as explain from "./explain/schema.ts";
import type { StepType } from "./index.ts";
import * as manipulateGoal from "./manipulate-goal/schema.ts";
import * as manipulate from "./manipulate/schema.ts";
import * as multipleChoice from "./multiple-choice/schema.ts";
import * as numeric from "./numeric/schema.ts";
import * as rank from "./rank/schema.ts";
import * as rotateAndIdentify from "./rotate-and-identify/schema.ts";
import * as tapToIdentify from "./tap-to-identify/schema.ts";

interface StepTypeSchema<T extends StepType> {
  /** The Step's file shape. */
  step: z.ZodType<{ type: T }>;
  /** The Problem's file shape; absent when the type can't be a Problem. */
  problem?: z.ZodType<{ type: T }>;
  /** Messages for an item of this type (Step or Problem): its own rules, and grading through its `act`. */
  check: (item: never) => string[];
  /** File fields its resolved structures replace. */
  fileOnly?: readonly string[];
  /** Resolves the structures the item names (messages go to `errors`). */
  structures?: (item: never, all: Map<string, Structure | undefined>, errors: string[]) => object | undefined;
  /** The resolved Step, finished. */
  open?: (step: never) => object;
  /** Its molecule always shows in the 3D Step card. */
  card?: true;
}

export const stepSchemas = {
  explain,
  "multiple-choice": multipleChoice,
  numeric,
  rank,
  "tap-to-identify": tapToIdentify,
  manipulate,
  "rotate-and-identify": rotateAndIdentify,
  "draw-arrows": drawArrows,
  "manipulate-goal": manipulateGoal,
} satisfies { [T in StepType]: StepTypeSchema<T> };

type Schemas = typeof stepSchemas;
/** A Step's file shape, of any type. */
export type StepVariant = Schemas[StepType]["step"];
/** A Problem's file shape, of any type that can be one. */
export type ProblemVariant = { [T in StepType]: Schemas[T] extends { problem: infer P } ? P : never }[StepType];

/** The schema entry for an item of this type, its hooks typed loosely (each module types its own). */
export const schemaOf = (type: StepType) =>
  stepSchemas[type] as StepTypeSchema<StepType> & {
    check: (item: unknown) => string[];
    structures?: (item: unknown, all: Map<string, Structure | undefined>, errors: string[]) => object | undefined;
    open?: <S>(step: S) => S;
  };
