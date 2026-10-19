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

/** Explore in 3D (#71): the molecule data file whose 3D view the Step or Problem offers. */
const molecule = id.optional();

/** What a Step may hide in a drawing. */
const hide = z.array(z.enum(["charges", "lone-pairs"])).optional();

/** A text option, or a structure card: `structure` names a structure file and `text` is then its screen-reader label. */
const option = z.strictObject({ id, text, structure: id.optional(), hide });

/** A text-only card (Rank items; structure Rank cards are not resolved yet). */
const textOption = z.strictObject({ id, text });

/** A value a Scene's settable state takes: a number (range) or an option id (choice). */
const sceneValue = z.union([z.number(), z.string()]);

/**
 * The Scene a Step shows: `scene: <id>`, or `{ id, state: { <settable state>: <value> } }`.
 * States left out take the manifest's default. The ids and values are checked
 * against the Scene registry (see scenes.ts).
 */
const sceneUse = z.preprocess(
  (v) => (typeof v === "string" ? { id: v } : v),
  z.strictObject({ id, state: z.record(z.string(), sceneValue).optional(), still: z.boolean().optional() }),
);

/**
 * A structure drawn with a Step (static): atoms it rings and bonds it outlines point the
 * Student at them; `alt` is its screen-reader text; `caption` (Markdown) is shown under it.
 */
const figure = z.strictObject({
  structure: id,
  hide,
  ring: z.array(id).min(1).optional(),
  outline: z.array(id).min(1).optional(),
  caption: text.optional(),
  alt: text,
});

/**
 * Something one tap away from the Step (a button named `label` opens it): a Scene (e.g. the
 * values to look up) or a reference table of drawings (column heads, then rows of cells; a
 * cell may be empty).
 */
const aside = z
  .strictObject({
    label: text,
    scene: sceneUse.optional(),
    table: z
      .strictObject({
        columns: z.array(text).min(1),
        /** Shown under the table (Markdown), e.g. where the table comes from. */
        caption: text.optional(),
        rows: z.array(z.strictObject({ head: text, cells: z.array(figure.nullable()).min(1) })).min(1),
      })
      .optional(),
  })
  .refine((a) => !!a.scene !== !!a.table, { message: "an aside holds a scene or a table" });

/** What any Step or Problem may show besides its interaction. */
const visuals = {
  figures: z.array(figure).min(1).optional(),
  aside: aside.optional(),
  /** A written Source note (Markdown): credits for structures, wording or ideas; cited numbers add their own. */
  sourceNote: text.optional(),
};

/** A graded Step's or Problem's visuals, plus a Scene that plays once it is answered (it can show the answer). */
const gradedVisuals = { ...visuals, revealScene: sceneUse.optional() };

/** Fields shared by a Multiple choice Step and a Multiple choice Problem. */
const multipleChoice = {
  ...gradedVisuals,
  type: z.literal("multiple-choice"),
  molecule,
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
  ...gradedVisuals,
  type: z.literal("tap-to-identify"),
  molecule,
  prompt: text,
  /** The structure file drawn. */
  structure: id,
  hide,
  /** Bonds drawn with a thick outline (not colour alone), e.g. the bond each tap is about. */
  outline: z.array(id).min(1).optional(),
  /** Screen-reader text for the whole drawing. */
  alt: text.optional(),
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

/** A Numeric Hint: `match` is a common wrong value, matched within the Step's tolerance. */
const numericHint = z.strictObject({ match: z.number().optional(), text });

/** Fields shared by a Numeric input Step and a Numeric Problem. The unit is fixed here and shown, never typed. */
const numeric = {
  ...gradedVisuals,
  type: z.literal("numeric"),
  molecule,
  prompt: text,
  /** The unit of measure, e.g. "°", "Å", "kJ/mol" (named so it can't be read as a course Unit). */
  unitSymbol: z.string(),
  /** Show a ± key beside the box (answers that may be negative, e.g. a formal charge). */
  signKey: z.boolean().optional(),
  answer: z.number(),
  /** Absolute: answer ± tolerance is right. */
  tolerance: z.number().min(0),
  correct: text.optional(),
  hints: z.array(numericHint).optional(),
  reveal: text,
};

/** A Rank Hint: a whole wrong order, or a pattern (an item not first / not last, one item before another). */
const rankHint = z.strictObject({
  match: z.array(id).min(1).optional(),
  notFirst: id.optional(),
  notLast: id.optional(),
  before: z.tuple([id, id]).optional(),
  text,
});

/** Fields shared by a Rank / order Step and a Rank Problem. */
const rank = {
  ...gradedVisuals,
  type: z.literal("rank"),
  molecule,
  prompt: text,
  /** The cards, in the order they start in. */
  items: z.array(textOption).min(2),
  /** The one strict order of item ids, first to last. */
  answer: z.array(id).min(2),
  correct: text.optional(),
  /** A Rank Hint's `match` is one whole wrong order; `notFirst`, `notLast` and `before` name a pattern. */
  hints: z.array(rankHint).optional(),
  reveal: text,
};

/** A Manipulate Hint: `match` lists the wrong control values it answers. */
const manipulateHint = z.strictObject({ match: z.array(sceneValue).min(1).optional(), text });

/**
 * Manipulate a Scene: the Student works a control (one of the Scene's settable
 * states, drawn as a slider under the Scene) and presses Check on a value.
 */
const manipulate = {
  ...gradedVisuals,
  type: z.literal("manipulate"),
  molecule,
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

/** One curved arrow: `from` an atom id (its lone pair) or a bond id; `to` an atom id or a bond id. */
const push = z.strictObject({ from: id, to: id });

/**
 * A Draw-arrows Hint, matched on the wrong push: `from` = it starts at one of these (atom ids =
 * their lone pair, bond ids, `sigma` = any single bond); `to` = it lands on one of these.
 */
const pushHint = z.strictObject({ from: z.array(id).min(1).optional(), to: z.array(id).min(1).optional(), text });

/** Fields shared by a Draw-arrows Step and Problem. Structures are named by file id; atom ids are the atom map. */
const drawArrows = {
  ...gradedVisuals,
  type: z.literal("draw-arrows"),
  molecule,
  prompt: text,
  /** The structure the Student pushes on. */
  start: id,
  /** Every accepted result; the first is the target drawn dimmed beside the start. */
  results: z.array(id).min(1),
  /** Open Problems and "no target this time": don't draw the target. */
  hideTarget: z.boolean().optional(),
  /** The correct pushes, in an order that works (shown after two wrong tries, and in the reveal). */
  answer: z.array(push).min(1),
  /** In-between copy; `{atom}` and `{electrons}` are filled in. Plain defaults apply when absent. */
  inBetween: z.strictObject({ over: text.optional(), short: text.optional() }).optional(),
  correct: text.optional(),
  hints: z.array(pushHint).optional(),
  reveal: text,
};

const stepId = z.string().regex(/^s\d{2,}$/, 'must look like "s01"');
const phase = z.enum(["hook", "build", "wrap"]);

const explainStep = z.strictObject({
  id: stepId,
  phase,
  type: z.literal("explain"),
  molecule,
  text,
  scene: sceneUse.optional(),
  ...visuals,
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
const drawArrowsStep = z.strictObject({ id: stepId, phase, ...drawArrows, scene: sceneUse.optional() });

/** A Check Step is a Problem from the Bank, referenced by id; its Step type is the Problem's. */
const checkStep = z.strictObject({
  id: stepId,
  phase: z.literal("check"),
  type: z.literal("check"),
  problem: id,
});

const tapStep = z.strictObject({ id: stepId, phase, ...tapToIdentify, scene: sceneUse.optional() });

/** Picks the Step schema by `type` (a Check Step is recognised by its `problem`), so errors point at the broken field. */
const step = z.preprocess(
  (v) => (v && typeof v === "object" && "problem" in v && !("type" in v) ? { ...v, type: "check" } : v),
  z.discriminatedUnion("type", [checkStep, explainStep, multipleChoiceStep, numericStep, rankStep, tapStep, manipulateStep, drawArrowsStep]),
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
  z.strictObject({ ...problemMeta, ...tapToIdentify }),
  z.strictObject({ ...problemMeta, ...drawArrows }),
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
