// File schemas for the content tree. One file per Lesson, one per Problem,
// one course manifest per Course. Text fields allow Markdown. Each Step type's
// own file shape lives in its module (step-types/<type>/schema.ts).
import { z } from "zod";
import { push, pushHint } from "./step-types/draw-arrows/schema.ts";
import { id, stepId, text } from "./step-types/fields.ts";
import { stepSchemas, type ProblemVariant, type StepVariant } from "./step-types/schemas.ts";

/** A named start view; see ViewSpec in molecule.ts. Atoms are 0-based indices in the data file's order. */
const atomIndex = z.number().int().nonnegative();
const viewSpec = z.strictObject({
  look: z.tuple([atomIndex, atomIndex]).optional(),
  plane: z.tuple([atomIndex, atomIndex, atomIndex]).optional(),
  front: atomIndex.optional(),
  up: atomIndex.optional(),
  rotate: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

/** `<subject>/views.yaml`: molecule id → view name → view. */
export const viewsFile = z.record(id, z.record(id, viewSpec));

/** A Check Step is a Problem from the Bank, referenced by id; its Step type is the Problem's. */
const checkStep = z.strictObject({
  id: stepId,
  phase: z.literal("check"),
  type: z.literal("check"),
  problem: id,
});

/** Picks the Step schema by `type` (a Check Step is recognised by its `problem`), so errors point at the broken field. */
const step = z.preprocess(
  (v) => (v && typeof v === "object" && "problem" in v && !("type" in v) ? { ...v, type: "check" } : v),
  z.discriminatedUnion("type", [checkStep, ...(Object.values(stepSchemas).map((s) => s.step) as StepVariant[])]),
);

export const lessonFile = z.strictObject({
  id,
  slug: id,
  title: text,
  goal: text,
  keyIdea: text,
  onRamp: z.boolean().default(false),
  /** The act this Lesson sits in on the Unit's Level select page, e.g. "Shape". */
  act: text.optional(),
  /** The Unit's capstone, styled as a boss level. */
  capstone: z.boolean().default(false),
  /** The Step whose type is shown as the Lesson's signature Step type; defaults to the first graded Build Step. */
  signature: stepId.optional(),
  steps: z.array(step).min(1),
  /** ADR 0003: a deleted Step's id → the live Step its old links now open. Ids here are never reused. */
  deletedSteps: z.record(stepId, stepId).optional(),
});

/** `<subject>/step-ids.lock.yaml`: every Step id each Lesson has ever had, written by `pnpm content:freeze`. */
export const stepIdLock = z.record(id, z.array(stepId));

/** A Problem's `type` picks its interaction: the same fields as the Step type of that name. */
export const problemFile = z.discriminatedUnion(
  "type",
  Object.values(stepSchemas).flatMap((s) => ("problem" in s ? [s.problem] : [])) as [ProblemVariant, ...ProblemVariant[]],
);

const unit = z.strictObject({
  id,
  slug: id,
  title: text,
  /** One-line scope shown on the Unit tile. */
  summary: text.optional(),
  status: z.enum(["available", "coming-soon"]),
  /** Lesson ids in play order. */
  lessons: z.array(id).default([]),
});

export const courseFile = z.strictObject({
  title: text,
  units: z.array(unit).min(1),
});

/**
 * The homepage Push hero: one live push a first-time visitor makes before reading anything.
 * Checked like a Draw-arrows Step (structures exist, the pushes reach a result, Hints name real ids).
 */
const heroPush = z.strictObject({
  start: id,
  results: z.array(id).min(1),
  answer: z.array(push).min(1),
  hints: z.array(pushHint).optional(),
});

export const subjectFile = z.strictObject({ title: text, hero: heroPush.optional() });

/** A 2D structure, written by `pnpm structure` (RDKit.js layout) and committed. */
export const structureFile = z.strictObject({
  id,
  style: z.enum(["full", "lewis", "line-angle"]),
  smiles: text.optional(),
  source: text.optional(),
  atoms: z
    .array(
      z.strictObject({
        id,
        el: z.string().regex(/^([A-Z][a-z]?|\*)$/, "must be an element symbol, or * for a loose bond end"),
        x: z.number(),
        y: z.number(),
        charge: z.number().int().optional(),
        h: z.number().int().min(0).optional(),
        lp: z.number().int().min(0).max(4).optional(),
        letter: z.boolean().optional(),
        label: text.optional(),
        /** A short visible tag beside the atom, e.g. "1" to number carbons (#82). */
        tag: z.string().max(3).optional(),
      }),
    )
    .min(1),
  bonds: z
    .array(
      z.strictObject({
        id,
        a: id,
        b: id,
        order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        stereo: z.enum(["wedge", "hash"]).optional(),
        label: text.optional(),
      }),
    )
    .default([]),
});

export type LessonFile = z.infer<typeof lessonFile>;
export type ProblemFile = z.infer<typeof problemFile>;
export type CourseFile = z.infer<typeof courseFile>;
export type StructureFile = z.infer<typeof structureFile>;

