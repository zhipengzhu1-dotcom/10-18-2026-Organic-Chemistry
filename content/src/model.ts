// The resolved course model: what the content build hands to the site and the
// video renderer. Check Steps arrive with their Problem inlined.
import type { Atom, Bond, Cited, CitedData, Tier } from "./data.ts";
import type { BondDipole, Matrix3, Vec3 } from "./molecule.ts";
import type { GradedStep, HintRule, Push, PushHint, Step } from "./step-types/index.ts";

// Each Step type's resolved shape lives in its module (content/src/step-types/<type>/rules.ts);
// the unions are worked out from the Step type table.
export type {
  DrawArrowsStep, ExplainStep, GoalStage, GoalStep, GradedStep, HintRule, ManipulateHint, ManipulateStep, MultipleChoiceStep,
  NumericHint, NumericStep, Push, PushHint, RankHint, RankStep, RotateAndIdentifyStep, Step, StepType, TapStep,
} from "./step-types/index.ts";

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
      /** A Manipulate Step works it with − / + buttons (and the − / + keys) instead of a slider (Lesson 8's mo-filler). */
      stepper?: true;
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

/**
 * The molecule a Step or Problem names (`molecule:` in its file), resolved from its cited data file:
 * atoms (Å) and bonds, the start orientation, and each element's Jmol colour and Bondi radius
 * (ADR 0002). Every Step that names one offers Explore in 3D (#71); the 3D Step card (#68) shows it
 * inline when `card` is set (always on Rotate-and-identify 3D), and the Step's `citations` then
 * carry `cited` too, so its own Source note covers the molecule.
 */
export interface MoleculeUse {
  /** The data file id, e.g. "methane". */
  id: string;
  title: string;
  /** Geometry tier of the coordinates. */
  tier: Tier;
  atoms: Atom[];
  bonds: Bond[];
  /** The named start view (views.yaml), when the Step gives one. */
  view?: string;
  /** The start rotation: rows are the screen's right, up and toward-the-viewer axes (molecule.ts). */
  orientation: Matrix3;
  /** Per element present: colour "#RRGGBB" and van der Waals radius in Å, from the cited elements table. */
  elements: Record<string, { colour: string; vdw: number }>;
  /** Everything a Source note for the molecule names: its geometry values, then each element's colour, then radius. */
  cited: Cited[];
  /** Licence notice for third-party data (the NIST acknowledgement on CCCBDB-derived geometry). */
  notice?: string;
  /** True when the Step shows the 3D card inline. */
  card: boolean;
  /** The Step's own words, read first by the Describe button. */
  describe?: string;
  /** Lesson 3 (#81): the molecule's name on a segmented toggle. */
  label?: string;
  /** Atom names the Step uses, by atom index; they replace the per-element names in readouts and are drawn beside the letters. */
  labels?: Record<number, string>;
  /** The page sheet: the plane of these three atoms is "in the page" when it faces the viewer (within 10°). */
  pageSheet?: [number, number, number];
  /** Bond-dipole arrows (from the cited electronegativities, a rough guide) and their sum, in the molecule's frame. */
  dipoles?: { arrows: BondDipole[]; net: { vector: Vec3; size: number; zero: boolean } };
  /** The other molecules of a segmented toggle (this one is first). */
  toggle?: MoleculeUse[];
  /** Lesson 8 (#86): orbitals named only by the molecule's label (A, B…), shown side by side on wide screens. */
  orbitalLabels?: "hide";
  /** Lesson 8 (#86): false = no tap-measuring on this card. */
  tapMeasure?: false;
  /** Lesson 4 (#82): the toggle group's name (default "Molecule"). */
  toggleLabel?: string;
  /** Lesson 4 (#82): step through the toggle once on entry, ending on the last. */
  autoplay?: boolean;
  /** Lesson 4 (#82): a translucent sheet through three atoms that turns with the molecule; `on` = shown at the start. */
  plane?: { through: [number, number, number]; label: string; on: boolean };
  /** Practice u1-hyb-allene-planes (#87): several plane sheets, each with its own button (instead of `plane`). */
  planes?: { through: [number, number, number]; label: string; on: boolean }[];
  /** Lesson 4 (#82): atoms measured on load (two: a length; three: the angle at the middle one). */
  measure?: number[];
  /** Lesson 4 (#82): the start zoom (1 fits the whole true-scale molecule in any rotation). */
  zoom?: number;
  /** Computed orbitals drawn as translucent lobes over the atoms (#70), in the order the Step lists them. */
  orbitals?: OrbitalUse[];
}

/** One computed orbital on the 3D card, resolved from an orbital data file (pipelines/orbitals). */
export interface OrbitalUse {
  /** `<orbital data file>/<orbital id>`, e.g. "ethylene-orbitals/pi". */
  ref: string;
  label: string;
  /** The text chip that names it on screen ("π", "σ*", "LUMO"). */
  chip: string;
  /** "sigma" / "pi": colour says the kind and the pattern the sign; "phase": + solid cyan, − hatched orange. */
  style: "sigma" | "pi" | "phase";
  /** A summed density: one sign, drawn solid. */
  density?: boolean;
  /** Site URL of the GLB; nodes "plus-solid" and "minus-hatched" hold the lobes (Å, the molecule file's frame). */
  mesh: string;
  /** Each sign's label point: the centre of its largest lobe (Å, the molecule file's frame). */
  lobes: { sign: "+" | "-"; at: [number, number, number] }[];
  /** Canonical MOs: the orbital energy (eV, shown to 1 decimal). */
  energy?: Cited;
}


/** A structure drawn with a Step, static. */
export interface Figure {
  view: StructureView;
  /** Shown under the drawing (Markdown). */
  caption?: string;
  /** Screen-reader text for the drawing. */
  alt: string;
  /** Drawn at a size to read, not as a thumbnail. */
  large?: boolean;
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
  /**
   * Values cited only in the answer fields (correct, Hints, reveal, a reveal Scene): secret like
   * them, so the Source note adds them once the Step is answered (story 99).
   */
  answerCitations?: Cited[];
}

/** What the Source note cites once the Step is answered: its own citations, then its answer-only ones. */
export function answeredCitations(step: { citations?: Cited[]; answerCitations?: Cited[] }): Cited[] {
  const shown = step.citations ?? [];
  return [...shown, ...(step.answerCitations ?? []).filter((c) => !shown.some((s) => s.ref === c.ref))];
}

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
  /** A short visible tag drawn small beside the atom, e.g. "1" to number carbons (#82). */
  tag?: string;
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
  /** lewis = every atom a letter and each shared pair two dots between its atoms (no lines). */
  style: "full" | "lewis" | "line-angle";
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
/** A drawing aid on a structure (Lesson 8 s11): a lone pair labelled, or an empty p orbital outlined and labelled. */
export interface OrbitalMark {
  atom: string;
  kind: "lone-pair" | "empty-p";
  text: string;
}

export interface StructureView {
  structure: Structure;
  hide: Hidden[];
  /** Atoms ringed and bonds outlined to point the Student at them. */
  highlight?: { ring: string[]; outline: string[]; corner?: [string, string, string]; marks?: OrbitalMark[] };
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
  /** The homepage Push hero, ready for `@astratron/content/arrows` (`arrowsStart`/`arrowsAct`/`arrowsView`). */
  hero?: HeroPush;
}

/** One live push with its accepted results; the shape of `ArrowsTask`. */
export interface HeroPush {
  start: Structure;
  results: Structure[];
  answer: Push[];
  hints?: PushHint[];
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
