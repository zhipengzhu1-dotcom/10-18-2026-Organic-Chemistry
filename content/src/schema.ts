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

const stepId = z.string().regex(/^s\d{2,}$/, 'must look like "s01"');
const phase = z.enum(["hook", "build", "wrap"]);

const explainStep = z.strictObject({
  id: stepId,
  phase,
  type: z.literal("explain"),
  text,
});

const multipleChoiceStep = z.strictObject({
  id: stepId,
  phase,
  ...multipleChoice,
  /** Hook only: every choice is accepted and the reveal follows at once. */
  prediction: z.boolean().optional(),
});

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
  z.discriminatedUnion("type", [checkStep, explainStep, multipleChoiceStep]),
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
});

export const problemFile = z.strictObject({
  id,
  unit: id,
  lesson: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["draft", "approved"]),
  /** Where the Problem comes from, e.g. "Adapted from MIT 5.12 PS1 Q1" or "Original". */
  source: text,
  credit: text.optional(),
  ...multipleChoice,
});

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
