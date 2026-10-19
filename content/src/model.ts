// The resolved course model: what the content build hands to the site and the
// video renderer. Check Steps arrive with their Problem inlined.

export type Phase = "hook" | "build" | "check" | "wrap";

/** A Hint; see HintRule. */
export type Hint = HintRule;

export interface ExplainStep {
  id: string;
  phase: Phase;
  type: "explain";
  text: string;
}

export interface MultipleChoiceStep {
  id: string;
  phase: Phase;
  type: "multiple-choice";
  prompt: string;
  /** Text options or structure cards. */
  options: Option[];
  answer: string[];
  correct?: string;
  hints?: Hint[];
  reveal: string;
  prediction?: boolean;
  /** Set on Check Steps: the Bank Problem this Step plays. */
  problemId?: string;
}

export type Step = ExplainStep | MultipleChoiceStep | TapStep;

// ── Structures (2D drawings) ────────────────────────────────────────────────
// A structure file is laid out once by RDKit.js (content/src/layout.ts) and
// committed; the site's own renderer (@astratron/scenes) draws it. RDKit never draws.

export interface StructureAtom {
  /** Stable id within the structure ("a1", "a2", …), used by Tap answers and Hints. */
  id: string;
  /** Element symbol. */
  el: string;
  /** Drawing coordinates in RDKit units (bond ≈ 1.5), y pointing down. */
  x: number;
  y: number;
  /** Formal charge; 0 when absent. */
  charge?: number;
  /** Hydrogens written with the letter (line-angle "OH", "NH₂"); 0 when absent. */
  h?: number;
  /** Lone pairs; 0 when absent. Every one is drawn. */
  lp?: number;
  /** Line-angle only: draw this carbon's letter even though it is neutral. */
  letter?: boolean;
  /** Screen-reader name, e.g. "the single-bonded O"; generated when absent. */
  label?: string;
}

export interface StructureBond {
  /** Stable id within the structure ("b1", "b2", …). */
  id: string;
  a: string;
  b: string;
  order: 1 | 2 | 3;
  /** Wedge or hash, narrow end at `a`. */
  stereo?: "wedge" | "hash";
  label?: string;
}

export interface Structure {
  id: string;
  /** full = every atom a letter (Lewis/Kekulé); line-angle = carbons are corners unless charged or `letter`. */
  style: "full" | "line-angle";
  /** The SMILES it was laid out from (provenance). */
  smiles?: string;
  /** Where the structure comes from, e.g. "PubChem CID 750". */
  source?: string;
  atoms: StructureAtom[];
  bonds: StructureBond[];
}

/** What a Step may hide in a drawing (e.g. "The charges have been hidden"). */
export type Hidden = "charges" | "lone-pairs";

/** A structure as one Step shows it. */
export interface StructureView {
  structure: Structure;
  hide: Hidden[];
  /** Added at site build time by the renderer; absent in the raw course model. */
  drawn?: DrawnStructure;
}

export interface DrawnStructure {
  /** The pre-rendered SVG (static, aria-hidden; screen readers get the labels). */
  svg: string;
  viewBox: string;
  /** Hit areas per Tap target id, in the SVG's coordinates. */
  hits?: Record<string, HitShape>;
}

export interface HitShape {
  circles: { x: number; y: number; r: number }[];
  segments: { x1: number; y1: number; x2: number; y2: number }[];
}

/** A multiple-choice option: text, or a structure card with its screen-reader label. */
export interface Option {
  id: string;
  /** Text (Markdown) for a text option; the screen-reader label for a structure card. */
  text: string;
  structure?: StructureView;
}

/** Something a Student can tap on a Tap-to-identify Step. */
export interface TapTarget {
  id: string;
  kind: "atom" | "bond" | "region";
  /** Read to screen readers. */
  label: string;
  /** For a region: the atoms it covers. */
  atoms?: string[];
}

/**
 * A Hint for a graded Step. Every condition given must hold: `match` = the exact chosen set;
 * `includes` = at least one of these was chosen; `misses` = at least one of these was not.
 * The generic fallback has no condition and comes last.
 */
export interface HintRule {
  match?: string[];
  includes?: string[];
  misses?: string[];
  text: string;
}

export interface TapStep {
  id: string;
  phase: Phase;
  type: "tap-to-identify";
  prompt: string;
  structure: StructureView;
  targets: TapTarget[];
  /** The exact set of target ids to pick. */
  answer: string[];
  correct?: string;
  hints?: HintRule[];
  reveal: string;
  /** Shown when the Step sits among Draw-arrows Steps: it is tap-only. */
  tapOnly?: { idle: string; drag: string };
  problemId?: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  goal: string;
  keyIdea: string;
  onRamp: boolean;
  /** Path of the Lesson page; a Step link appends `#<step id>` (ADR 0003). */
  url: string;
  steps: Step[];
}

export interface Unit {
  id: string;
  slug: string;
  title: string;
  status: "available" | "coming-soon";
  lessons: Lesson[];
}

export interface Course {
  slug: string;
  title: string;
  units: Unit[];
}

export interface Subject {
  slug: string;
  title: string;
  courses: Course[];
}

export interface CourseModel {
  subjects: Subject[];
}

export interface BuildResult {
  /** Present only when there are no errors. */
  model?: CourseModel;
  /** Each error reads `<file relative to the content root>: <what is wrong>`. */
  errors: string[];
}
