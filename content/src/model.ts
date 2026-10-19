// The resolved course model: what the content build hands to the site and the
// video renderer. Check Steps arrive with their Problem inlined.
import type { Cited, CitedData } from "./data.ts";

export type Phase = "hook" | "build" | "check" | "wrap";

export interface Hint {
  /** The exact set of chosen option ids this Hint answers; absent on the generic fallback. */
  match?: string[];
  text: string;
}

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
}

export interface ExplainStep {
  id: string;
  phase: Phase;
  type: "explain";
  text: string;
  scene?: SceneUse;
  citations?: Cited[];
}

export interface MultipleChoiceStep {
  id: string;
  phase: Phase;
  type: "multiple-choice";
  prompt: string;
  options: { id: string; text: string }[];
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
export interface NumericStep {
  id: string;
  phase: Phase;
  type: "numeric";
  prompt: string;
  /** The unit of measure shown beside the box, e.g. "°" or "Å". */
  unitSymbol: string;
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
export interface RankStep {
  id: string;
  phase: Phase;
  type: "rank";
  prompt: string;
  /** In the order the cards start in. */
  items: { id: string; text: string }[];
  /** The one correct order of item ids, first to last. */
  answer: string[];
  correct?: string;
  /** A Hint's `match` is one whole wrong order. */
  hints?: Hint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
}

export interface ManipulateHint {
  /** The wrong control values this Hint answers; absent on the generic fallback. */
  match?: SceneValue[];
  text: string;
}

/** Manipulate a Scene: the Student works a slider (one settable state of the Scene) and presses Check on a value. */
export interface ManipulateStep {
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

/** A Step the Student answers and the engine grades. */
export type GradedStep = MultipleChoiceStep | NumericStep | RankStep | ManipulateStep;

export type Step = ExplainStep | GradedStep;

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
