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

export type Step = ExplainStep | MultipleChoiceStep;

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
