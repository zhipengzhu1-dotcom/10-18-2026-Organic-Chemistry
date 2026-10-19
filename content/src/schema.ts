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

const numericStep = z.strictObject({ id: stepId, phase, ...numeric });
const rankStep = z.strictObject({ id: stepId, phase, ...rank });

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
  z.discriminatedUnion("type", [checkStep, explainStep, multipleChoiceStep, numericStep, rankStep]),
);

export const lessonFile = z.strictObject({
  id,
  slug: id,
  title: text,
  goal: text,
  keyIdea: text,
  onRamp: z.boolean().default(false),
  steps: z.array(step).min(1),
});

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
