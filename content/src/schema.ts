// File schemas for the content tree. One file per Lesson, one per Problem,
// one course manifest per Course. Text fields allow Markdown.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes");
const text = z.string().min(1);

/** A Hint: `match` is the exact set of chosen option ids it answers; the generic fallback has no `match` and comes last. */
const hint = z.strictObject({ match: z.array(id).min(1).optional(), text });

const option = z.strictObject({ id, text });

/** Fields shared by a Multiple choice Step and a Multiple choice Problem. */
const multipleChoice = {
  type: z.literal("multiple-choice"),
  prompt: text,
  options: z.array(option).min(2),
  /** The exact set of correct option ids. */
  answer: z.array(id).min(1),
  /** The Correct line: the short "why" shown on a right answer. */
  correct: text.optional(),
  hints: z.array(hint).optional(),
  reveal: text,
};

/** A Numeric Hint: `match` is a common wrong value, matched within the Step's tolerance. */
const numericHint = z.strictObject({ match: z.number().optional(), text });

/** Fields shared by a Numeric input Step and a Numeric Problem. The unit is fixed here and shown, never typed. */
const numeric = {
  type: z.literal("numeric"),
  prompt: text,
  /** The unit of measure, e.g. "°", "Å", "kJ/mol" (named so it can't be read as a course Unit). */
  unitSymbol: z.string(),
  answer: z.number(),
  /** Absolute: answer ± tolerance is right. */
  tolerance: z.number().min(0),
  correct: text.optional(),
  hints: z.array(numericHint).optional(),
  reveal: text,
};

/** Fields shared by a Rank / order Step and a Rank Problem. */
const rank = {
  type: z.literal("rank"),
  prompt: text,
  /** The cards, in the order they start in. */
  items: z.array(option).min(2),
  /** The one strict order of item ids, first to last. */
  answer: z.array(id).min(2),
  correct: text.optional(),
  /** A Rank Hint's `match` is one whole wrong order. */
  hints: z.array(hint).optional(),
  reveal: text,
};

/** A value a Scene's settable state takes: a number (range) or an option id (choice). */
const sceneValue = z.union([z.number(), z.string()]);

/**
 * The Scene a Step shows: `scene: <id>`, or `{ id, state: { <settable state>: <value> } }`.
 * States left out take the manifest's default. The ids and values are checked
 * against the Scene registry (see scenes.ts).
 */
const sceneUse = z.preprocess(
  (v) => (typeof v === "string" ? { id: v } : v),
  z.strictObject({ id, state: z.record(z.string(), sceneValue).optional() }),
);

/** A Manipulate Hint: `match` lists the wrong control values it answers. */
const manipulateHint = z.strictObject({ match: z.array(sceneValue).min(1).optional(), text });

/**
 * Manipulate a Scene: the Student works a control (one of the Scene's settable
 * states, drawn as a slider under the Scene) and presses Check on a value.
 */
const manipulate = {
  type: z.literal("manipulate"),
  prompt: text,
  scene: sceneUse,
  /** The settable state the slider drives. */
  control: z.string(),
  /** The control value that is right. */
  answer: sceneValue,
  correct: text.optional(),
  hints: z.array(manipulateHint).optional(),
  reveal: text,
};

const stepId = z.string().regex(/^s\d{2,}$/, 'must look like "s01"');
const phase = z.enum(["hook", "build", "wrap"]);

const explainStep = z.strictObject({
  id: stepId,
  phase,
  type: z.literal("explain"),
  text,
  scene: sceneUse.optional(),
});

const multipleChoiceStep = z.strictObject({
  id: stepId,
  phase,
  ...multipleChoice,
  scene: sceneUse.optional(),
  /** Hook only: every choice is accepted and the reveal follows at once. */
  prediction: z.boolean().optional(),
});

const numericStep = z.strictObject({ id: stepId, phase, ...numeric, scene: sceneUse.optional() });
const rankStep = z.strictObject({ id: stepId, phase, ...rank, scene: sceneUse.optional() });
const manipulateStep = z.strictObject({ id: stepId, phase, ...manipulate });

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
  z.discriminatedUnion("type", [checkStep, explainStep, multipleChoiceStep, numericStep, rankStep, manipulateStep]),
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

const problemMeta = {
  id,
  unit: id,
  lesson: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["draft", "approved"]),
  /** Where the Problem comes from, e.g. "Adapted from MIT 5.12 PS1 Q1" or "Original". */
  source: text,
  credit: text.optional(),
};

/** A Problem's `type` picks its interaction: the same fields as the Step type of that name. */
export const problemFile = z.discriminatedUnion("type", [
  z.strictObject({ ...problemMeta, ...multipleChoice }),
  z.strictObject({ ...problemMeta, ...numeric }),
  z.strictObject({ ...problemMeta, ...rank }),
]);

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

export const subjectFile = z.strictObject({ title: text });

export type LessonFile = z.infer<typeof lessonFile>;
export type ProblemFile = z.infer<typeof problemFile>;
export type CourseFile = z.infer<typeof courseFile>;
