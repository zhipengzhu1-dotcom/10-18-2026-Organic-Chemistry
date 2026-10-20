// File-shape pieces every Step type's schema builds on (Node only: zod).
// Text fields allow Markdown.
import { z } from "zod";
import type { HintRule } from "./choice.ts";

export const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes");
export const text = z.string().min(1);

/**
 * True when a schema's file shape and the hand-written type of the same thing agree both ways
 * (each Step type checks its leaf types, e.g. its Hints, with `true satisfies Agrees<…>`).
 */
export type Agrees<Schema extends z.ZodType, Hand> = [z.infer<Schema>] extends [Hand] ? ([Hand] extends [z.infer<Schema>] ? true : false) : false;

/** A Hint on a set of choices; see HintRule (choice.ts). */
export const hint = z.strictObject({
  match: z.array(id).min(1).optional(),
  includes: z.array(id).min(1).optional(),
  misses: z.array(id).min(1).optional(),
  text,
});
true satisfies Agrees<typeof hint, HintRule>;

/**
 * The molecule a Step or Problem names: `molecule: <data file id>`, or `{ id, card, view, describe }`.
 * Every Step that names one offers Explore in 3D (#71). `card: true` also shows it inline in the
 * 3D Step card (#68; Rotate-and-identify always does); `view` names a start view in the Subject's
 * views.yaml (default: the file's own axes); `describe` opens what the Describe button reads.
 */
const planeSheet = z.strictObject({
  through: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  label: text.optional(),
  on: z.boolean().optional(),
});

const moleculeFields = {
  id,
  card: z.boolean().optional(),
  view: id.optional(),
  describe: text.optional(),
  /** Lesson 3 (#81): the molecule's name on a segmented toggle (e.g. "BF₃"). */
  label: text.optional(),
  /** Atom names the Step uses, by 0-based atom index (e.g. `{ 1: C1 }`); the element letters stay. */
  labels: z.record(z.string().regex(/^\d+$/, "must be an atom index"), text).optional(),
  /** The page sheet: three atom indices; the sheet lies in the screen plane through the middle one, with an In-the-page badge for their plane. */
  pageSheet: z.tuple([z.number().int(), z.number().int(), z.number().int()]).optional(),
  /** Bond-dipole arrows (from the cited Pauling electronegativities) and an Add button that sums them. */
  dipoles: z.boolean().optional(),
  /** Computed orbitals drawn as lobes on the card (#70): `<orbital data file>/<orbital id>`. */
  orbitals: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/, "must be <orbital data file>/<orbital id>"))
    .min(1)
    .optional(),
  /** Lesson 4 (#82): a translucent sheet through three atoms that turns with the molecule, with a button to show it. */
  plane: planeSheet.optional(),
  /** Practice u1-hyb-allene-planes (#87): several such sheets, each with its own button (give `plane` or `planes`). */
  planes: z.array(planeSheet).min(2).optional(),
  /** Lesson 4 (#82): a bond (two atoms) or angle (three) measured and labelled on load. */
  measure: z.array(z.number().int()).min(2).max(3).optional(),
  /** Lesson 4 (#82): the start zoom (1 = the whole true-scale molecule fits in any rotation; at most 3). */
  zoom: z.number().min(0.5).max(3).optional(),
};
export const moleculeUse = z.preprocess(
  (v) => (typeof v === "string" ? { id: v } : v),
  z.strictObject({
    ...moleculeFields,
    /** Lesson 8 (#86): `hide` names each orbital only by its molecule's `label` (the spec's "labels: hide", shown as A/B). */
    orbitalLabels: z.literal("hide").optional(),
    /** Lesson 8 (#86): false switches tap-measuring off on the card (and every molecule of its toggle). */
    tapMeasure: z.literal(false).optional(),
    /** More molecules shown in the same card, switched with a segmented toggle (every molecule needs a `label`). */
    toggle: z.array(z.strictObject(moleculeFields)).min(1).optional(),
    /** Lesson 4 (#82): the toggle group's name (default "Molecule"), e.g. "Show" for σ | π | both. */
    toggleLabel: text.optional(),
    /** Lesson 4 (#82): step through the toggle once on entry, ending on the last (at once under reduced motion). */
    autoplay: z.boolean().optional(),
  }),
);
export const molecule = moleculeUse.optional();

/** What a Step may hide in a drawing. */
export const hide = z.array(z.enum(["charges", "lone-pairs"])).optional();

/** A text option, or a structure card: `structure` names a structure file and `text` is then its screen-reader label. */
export const option = z.strictObject({ id, text, structure: id.optional(), hide });

/** A text-only card (Rotate-and-identify choices). */
export const textOption = z.strictObject({ id, text });

/** A value a Scene's settable state takes: a number (range) or an option id (choice). */
export const sceneValue = z.union([z.number(), z.string()]);

/**
 * The Scene a Step shows: `scene: <id>`, or `{ id, state: { <settable state>: <value> } }`.
 * States left out take the manifest's default. The ids and values are checked
 * against the Scene registry (see scenes.ts).
 */
export const sceneUse = z.preprocess(
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
  /** A right-angle mark at the middle atom, between its bonds to the other two (Lesson 3's flat CH₄). */
  corner: z.tuple([id, id, id]).optional(),
  caption: text.optional(),
  alt: text,
  /** Draw it at a size to read, not as a thumbnail (e.g. the molecule a Tap Step compares against). */
  large: z.boolean().optional(),
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
export const visuals = {
  figures: z.array(figure).min(1).optional(),
  aside: aside.optional(),
  /** A written Source note (Markdown): credits for structures, wording or ideas; cited numbers add their own. */
  sourceNote: text.optional(),
};

/** A graded Step's or Problem's visuals, plus a Scene that plays once it is answered (it can show the answer). */
export const gradedVisuals = { ...visuals, revealScene: sceneUse.optional() };

export const stepId = z.string().regex(/^s\d{2,}$/, 'must look like "s01"');
export const phase = z.enum(["hook", "build", "wrap"]);

/** What a Problem file has besides its interaction (the fields of the Step type of that name). */
export const problemMeta = {
  id,
  unit: id,
  lesson: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: z.enum(["draft", "approved"]),
  /** Where the Problem comes from, e.g. "Adapted from MIT 5.12 PS1 Q1" or "Original". */
  source: text,
  credit: text.optional(),
  /** The Scene the Problem shows from the start, as on a graded Step (its `revealScene` comes with its visuals). */
  scene: sceneUse.optional(),
};
