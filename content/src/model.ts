// The resolved course model: what the content build hands to the site and the
// video renderer. Check Steps arrive with their Problem inlined.
import type { Cited, CitedData } from "./data.ts";

export type Phase = "hook" | "build" | "check" | "wrap";

/** A Hint; see HintRule. */
export type Hint = HintRule;

/** A value a Scene's settable state takes: a number (range state) or an option id (choice state). */
export type SceneValue = number | string;

/** One settable state of a Scene, as its manifest declares it. */
export type SceneStateSpec =
  | {
      kind: "range";
      /** Names the slider, e.g. "Twist". */
      label: string;
      min: number;
      max: number;
      /** The slider's stops: min, min + step, … max. */
      step: number;
      default: number;
      /** Shown after the value, e.g. "°". */
      unitSymbol?: string;
    }
  | { kind: "choice"; label: string; options: { id: string; label: string }[]; default: string };

/** What the content build needs to know of each registered Scene (the scenes module builds it from the manifests). */
export interface SceneCatalogEntry {
  states: Record<string, SceneStateSpec>;
  /** Cited-data refs (`file/key`) whose numbers the Scene shows. */
  data: string[];
}
export type SceneCatalog = Record<string, SceneCatalogEntry>;

/** The Scene a Step shows, resolved: every settable state has a value, and its cited data is attached. */
export interface SceneUse {
  id: string;
  state: Record<string, SceneValue>;
  /** The Scene's cited values by ref; the Scene reads its numbers from here (ADR 0002). */
  cited: Record<string, Cited>;
  /** Shown on its poster frame only, with no playback controls (a still picture). */
  still?: boolean;
}

/** A structure drawn with a Step, static. */
export interface Figure {
  view: StructureView;
  /** Shown under the drawing (Markdown). */
  caption?: string;
  /** Screen-reader text for the drawing. */
  alt: string;
}

/** Something one tap away from a Step: a Scene, or a reference table of drawings. */
export interface Aside {
  /** Names the button that opens it. */
  label: string;
  scene?: SceneUse;
  table?: { columns: string[]; rows: { head: string; cells: (Figure | null)[] }[]; caption?: string };
}

/** What any Step may show besides its interaction. */
export interface Visuals {
  figures?: Figure[];
  aside?: Aside;
  /** A written Source note (Markdown) for what isn't a cited number: structures, wording, ideas. */
  sourceNote?: string;
}

/** A graded Step's visuals, plus the Scene that plays once it is answered (it may show the answer). */
export interface GradedVisuals extends Visuals {
  revealScene?: SceneUse;
}

export interface ExplainStep extends Visuals {
  id: string;
  phase: Phase;
  type: "explain";
  text: string;
  scene?: SceneUse;
  citations?: Cited[];
}

export interface MultipleChoiceStep extends GradedVisuals {
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
  scene?: SceneUse;
  /** The cited values this Step's text shows (`{{file/key}}`); its Source note is generated from them. */
  citations?: Cited[];
}

export interface NumericHint {
  /** A common wrong value this Hint answers, matched within the Step's tolerance; absent on the generic fallback. */
  match?: number;
  text: string;
}

/** Numeric input: the Student types a number; the unit is fixed and shown beside the box, never typed. */
export interface NumericStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "numeric";
  prompt: string;
  /** The unit of measure shown beside the box, e.g. "°" or "Å". */
  unitSymbol: string;
  /** A ± key beside the box flips the sign of what is typed. */
  signKey?: boolean;
  answer: number;
  /** Absolute: a value within answer ± tolerance is right. */
  tolerance: number;
  correct?: string;
  hints?: NumericHint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

/** Rank / order: the Student puts the items into one strict order (the prompt names which end is first). */
export interface RankStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "rank";
  prompt: string;
  /** In the order the cards start in. */
  items: { id: string; text: string }[];
  /** The one correct order of item ids, first to last. */
  answer: string[];
  correct?: string;
  /** A Hint's `match` is one whole wrong order; or it names a pattern (see RankHint). */
  hints?: RankHint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

/**
 * A Rank Hint. Every condition given must hold: `match` = this whole order; `notFirst` /
 * `notLast` = that item isn't at that end; `before: [x, y]` = x is placed before y.
 * The generic fallback has no condition.
 */
export interface RankHint {
  match?: string[];
  notFirst?: string;
  notLast?: string;
  before?: [string, string];
  text: string;
}

export interface ManipulateHint {
  /** The wrong control values this Hint answers; absent on the generic fallback. */
  match?: SceneValue[];
  text: string;
}

/** Manipulate a Scene: the Student works a slider (one settable state of the Scene) and presses Check on a value. */
export interface ManipulateStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "manipulate";
  prompt: string;
  scene: SceneUse;
  /** The settable state the slider drives; it starts at `scene.state[control]`. */
  control: string;
  answer: SceneValue;
  correct?: string;
  hints?: ManipulateHint[];
  reveal: string;
  problemId?: string;
  citations?: Cited[];
}

/**
 * One curved arrow, as the Student draws it. `from` is an atom id (a lone pair on that atom) or a
 * bond id (that bond's electrons); `to` is an atom id or a bond id (where the arrowhead lands).
 */
export interface Push {
  from: string;
  to: string;
}

/**
 * A Draw-arrows Hint, matched on the wrong push. Every condition given must hold: `from` = the push
 * starts at one of these (atom ids = their lone pair, bond ids, or `sigma` = any single bond);
 * `to` = it lands on one of these (an atom drop and the bond it makes count as the same).
 * The generic fallback has neither and comes last.
 */
export interface PushHint {
  from?: string[];
  to?: string[];
  text: string;
}

/**
 * Draw arrows: the Student pushes electrons on the atom-mapped start, one arrow at a time. Each push
 * is applied to our own molecule graph and accepted when it moves toward an accepted result
 * (`@astratron/content/arrows`). Two tries per push; the Step is done when the drawing is a result.
 */
export interface DrawArrowsStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "draw-arrows";
  prompt: string;
  /** The atom-mapped start the Student pushes on (atom ids are the map). */
  start: StructureView;
  /** The target drawn dimmed beside (or above) the start; absent when the Step hides it (open or "no target"). */
  target?: StructureView;
  /** Every accepted result (same atom ids as the start). */
  results: Structure[];
  /** The correct pushes, in an order that works: shown on a second wrong try and in the reveal. */
  answer: Push[];
  /** Copy for in-between states; `{atom}` and `{electrons}` are filled in. Defaults apply when absent. */
  inBetween?: { over?: string; short?: string };
  correct?: string;
  hints?: PushHint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

/** A Step the Student answers and the engine grades. */
export type GradedStep = MultipleChoiceStep | NumericStep | RankStep | TapStep | ManipulateStep | DrawArrowsStep;

export type Step = ExplainStep | GradedStep;

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
  /** Atoms ringed and bonds outlined to point the Student at them. */
  highlight?: { ring: string[]; outline: string[] };
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

export interface TapStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "tap-to-identify";
  prompt: string;
  structure: StructureView;
  /** Screen-reader text for the whole drawing. */
  alt?: string;
  targets: TapTarget[];
  /** The exact set of target ids to pick. */
  answer: string[];
  correct?: string;
  hints?: HintRule[];
  reveal: string;
  /** Shown when the Step sits among Draw-arrows Steps: it is tap-only. */
  tapOnly?: { idle: string; drag: string };
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  goal: string;
  keyIdea: string;
  onRamp: boolean;
  /** Lesson number in its Unit: the On-ramp is 0, core Lessons count from 1. */
  number: number;
  /** The act this Lesson sits in on the Level select page. */
  act?: string;
  /** The Unit's capstone, styled as a boss level. */
  capstone: boolean;
  /** The Lesson's signature Step type. */
  signature: Step["type"];
  /** Step count per phase, for the Hook/Build/Check/Wrap bar. */
  phases: Record<Phase, number>;
  /** Path of the Lesson page; a Step link appends `#<step id>` (ADR 0003). */
  url: string;
  steps: Step[];
  /** Deleted Step id → the live Step id its old links now open (ADR 0003). */
  deletedSteps?: Record<string, string>;
}

/**
 * A Problem in the Problem Bank (GLOSSARY), as the Practice Set draws it. Drafts are listed
 * too; only approved Problems are ever drawn.
 */
export interface Problem {
  id: string;
  /** The Lesson tag: the Lesson whose content the Problem tests. */
  lesson: string;
  difficulty: 1 | 2 | 3;
  status: "draft" | "approved";
  /** Where it comes from, e.g. "Original" or "Adapted from MIT 5.12 PS1 Q1". */
  source: string;
  /** "Suggested by …" for a Submitted Problem. */
  credit?: string;
  /** True when some Lesson plays it as a Check Step. */
  check: boolean;
  /** True when its Lesson is the Unit's On-ramp (never drawn). */
  onRamp: boolean;
  /** The Problem as a playable Step: Step id = Problem id, phase "check", `problemId` set. */
  step: GradedStep;
}

export interface Unit {
  id: string;
  slug: string;
  /** Position in the Subject, counted continuously across its Courses (Orgo II starts at Unit 11). */
  number: number;
  title: string;
  /** One-line scope shown on the Unit tile. */
  summary?: string;
  status: "available" | "coming-soon";
  /** Path of the Unit page (Level select); only `available` Units have one. */
  url: string;
  lessons: Lesson[];
  /** The Unit's Problem Bank: every Problem tagged with this Unit, by id. */
  bank: Problem[];
}

export interface Course {
  slug: string;
  title: string;
  units: Unit[];
}

export interface Subject {
  slug: string;
  title: string;
  /** Path of the Subject's Course map page. */
  url: string;
  courses: Course[];
  /** The Subject's cited data files, by id; read numbers from it with `cite` (ADR 0002). */
  data: CitedData;
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
