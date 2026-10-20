// Lesson shape rules (GLOSSARY: Lesson; docs/specs/lesson-spec-template.md,
// "Shape checks"), and each Step's and Problem's own rules from its Step type.
import type { LessonFile, ProblemFile } from "./schema.ts";
import { schemaOf } from "./step-types/schemas.ts";

type StepFile = Exclude<LessonFile["steps"][number], { type: "check" }>;

/** Returns one message per broken rule; empty when the Lesson is well shaped. */
export function checkLessonShape(lesson: LessonFile): string[] {
  const errors: string[] = [];
  const { steps } = lesson;

  const [min, max, rule] = lesson.onRamp ? [6, 10, "an On-ramp needs 6–10"] : [10, 20, "a Lesson needs 10–15 (hard cap 20)"];
  if (steps.length < min || steps.length > max) errors.push(`has ${steps.length} Steps; ${rule}`);

  const phases = steps.map((s) => s.phase);
  if (!/^hook(,build)+(,check){2,4},wrap$/.test(phases.join(","))) {
    errors.push(
      `phases must run Hook (1 Step) → Build → Check (2–4 Problems) → Wrap (1 Step); found ${phases.join(", ")}`,
    );
  }

  let run: string[] = [];
  for (const step of [...steps, undefined]) {
    if (step?.type === "explain") {
      run.push(step.id);
      continue;
    }
    if (run.length > 2) errors.push(`steps ${run.join(", ")} are ${run.length} Explain Steps in a row; the most is 2`);
    run = [];
  }

  for (const step of steps) {
    if (step.type === "check") continue;
    for (const message of checkInteraction(step)) errors.push(`step ${step.id}: ${message}`);
  }

  if (lesson.signature && !steps.some((s) => s.id === lesson.signature))
    errors.push(`signature Step "${lesson.signature}" is not one of its Steps`);
  return errors;
}

/** The rules of a Step's or Problem's Step type (step-types/<type>/schema.ts), its grading checked through its own `act`. */
export const checkInteraction = (item: StepFile | ProblemFile): string[] => schemaOf(item.type).check(item);
