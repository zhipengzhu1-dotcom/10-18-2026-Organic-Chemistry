// File schemas for the content tree. One file per Lesson, one per Problem,
// one course manifest per Course. Text fields allow Markdown.
import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes");
const text = z.string().min(1);

/**
 * A Hint. Every condition given must hold: `match` = the exact chosen set; `includes` = at least
 * one of these was chosen; `misses` = at least one of these was not. The generic fallback has no
 * condition and comes last. Hints are tried first to last.
 */
const hint = z.strictObject({
  match: z.array(id).min(1).optional(),
  includes: z.array(id).min(1).optional(),
  misses: z.array(id).min(1).optional(),
  text,
});

/** What a Step may hide in a drawing. */
const hide = z.array(z.enum(["charges", "lone-pairs"])).optional();

/** A text option, or a structure card: `structure` names a structure file and `text` is then its screen-reader label. */
const option = z.strictObject({ id, text, structure: id.optional(), hide });

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

/** Fields shared by a Tap-to-identify Step and Problem. */
const tapToIdentify = {
  type: z.literal("tap-to-identify"),
  prompt: text,
  /** The structure file drawn. */
  structure: id,
  hide,
  /** What can be tapped: atom and bond ids of the structure ("all" for every one), and named regions (fixed atom sets). */
  tappable: z.strictObject({
    atoms: z.union([z.literal("all"), z.array(id).min(1)]).optional(),
    bonds: z.union([z.literal("all"), z.array(id).min(1)]).optional(),
    regions: z.array(z.strictObject({ id, atoms: z.array(id).min(1), label: text })).optional(),
  }),
  /** The exact set of target ids to pick. */
  answer: z.array(id).min(1),
  correct: text.optional(),
  hints: z.array(hint).optional(),
  reveal: text,
  /** The tap-only cue, required when the Step sits among Draw-arrows Steps: the idle callout and the message on a drag. */
  tapOnly: z.strictObject({ idle: text, drag: text }).optional(),
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

const tapStep = z.strictObject({ id: stepId, phase, ...tapToIdentify });

/** Picks the Step schema by `type` (a Check Step is recognised by its `problem`), so errors point at the broken field. */
const step = z.preprocess(
  (v) => (v && typeof v === "object" && "problem" in v && !("type" in v) ? { ...v, type: "check" } : v),
  z.discriminatedUnion("type", [checkStep, explainStep, multipleChoiceStep, tapStep]),
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

const problemBase = {
  id,
  unit: id,
  lesson: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["draft", "approved"]),
  /** Where the Problem comes from, e.g. "Adapted from MIT 5.12 PS1 Q1" or "Original". */
  source: text,
  credit: text.optional(),
};

export const problemFile = z.discriminatedUnion("type", [
  z.strictObject({ ...problemBase, ...multipleChoice }),
  z.strictObject({ ...problemBase, ...tapToIdentify }),
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

/** A 2D structure, written by `pnpm structure` (RDKit.js layout) and committed. */
export const structureFile = z.strictObject({
  id,
  style: z.enum(["full", "line-angle"]),
  smiles: text.optional(),
  source: text.optional(),
  atoms: z
    .array(
      z.strictObject({
        id,
        el: z.string().regex(/^[A-Z][a-z]?$/, "must be an element symbol"),
        x: z.number(),
        y: z.number(),
        charge: z.number().int().optional(),
        h: z.number().int().min(0).optional(),
        lp: z.number().int().min(0).max(4).optional(),
        letter: z.boolean().optional(),
        label: text.optional(),
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
