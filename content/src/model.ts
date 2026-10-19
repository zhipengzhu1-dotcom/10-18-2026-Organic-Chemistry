// The resolved course model: what the content build hands to the site and the
// video renderer. Check Steps arrive with their Problem inlined.

export type Phase = "hook" | "build" | "check" | "wrap";

export interface Hint {
  /** The exact set of chosen option ids this Hint answers; absent on the generic fallback. */
  match?: string[];
  text: string;
}

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
  options: { id: string; text: string }[];
  answer: string[];
  correct?: string;
  hints?: Hint[];
  reveal: string;
  prediction?: boolean;
  /** Set on Check Steps: the Bank Problem this Step plays. */
  problemId?: string;
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
}

/** A Step the Student answers and the engine grades. */
export type GradedStep = MultipleChoiceStep | NumericStep | RankStep;

export type Step = ExplainStep | GradedStep;

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
