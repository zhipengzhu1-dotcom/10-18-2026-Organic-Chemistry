// Lesson shape rules and interactive-Step rules (GLOSSARY: Lesson;
// docs/specs/lesson-spec-template.md, "Shape checks").
import type { LessonFile, ProblemFile } from "./schema.ts";

type Interaction = Pick<ProblemFile, "options" | "answer" | "correct" | "hints"> & { prediction?: boolean };

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
    if (step.type !== "multiple-choice") continue;
    if (step.prediction && step.phase !== "hook") errors.push(`step ${step.id}: prediction is allowed only in the Hook`);
    for (const message of checkInteraction(step)) errors.push(`step ${step.id}: ${message}`);
  }

  if (lesson.signature && !steps.some((s) => s.id === lesson.signature))
    errors.push(`signature Step "${lesson.signature}" is not one of its Steps`);
  return errors;
}

/** Rules every graded Step and Problem shares. */
export function checkInteraction(item: Interaction): string[] {
  const errors: string[] = [];
  const optionIds = new Set(item.options.map((o) => o.id));
  for (const id of item.answer) if (!optionIds.has(id)) errors.push(`answer names unknown option "${id}"`);
  if (item.prediction) return errors;

  const hints = item.hints ?? [];
  for (const hint of hints)
    for (const id of hint.match ?? []) if (!optionIds.has(id)) errors.push(`a Hint matches unknown option "${id}"`);
  const fallbacks = hints.filter((h) => !h.match);
  if (fallbacks.length !== 1 || hints.at(-1)?.match)
    errors.push("needs exactly one generic fallback Hint (no match), and it must come last");
  if (!item.correct) errors.push("needs a Correct line");
  return errors;
}
