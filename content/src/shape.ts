// Lesson shape rules and interactive-Step rules (GLOSSARY: Lesson;
// docs/specs/lesson-spec-template.md, "Shape checks").
import type { LessonFile, ProblemFile } from "./schema.ts";

type MultipleChoice = Extract<ProblemFile, { type: "multiple-choice" }>;
type Interaction = Pick<MultipleChoice, "options" | "answer" | "correct" | "hints"> & { prediction?: boolean };
type Graded = Pick<ProblemFile, "answer" | "correct" | "hints"> & { prediction?: boolean };

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
  return errors;
}

/** The Multiple choice rules: answers and Hints name options. */
export function checkInteraction(item: Interaction): string[] {
  const optionIds = new Set(item.options.map((o) => o.id));
  return checkGraded(item, optionIds, {
    answer: (id) => `answer names unknown option "${id}"`,
    hint: (id) => `a Hint matches unknown option "${id}"`,
  });
}

/** Rules every graded Step and Problem shares, whatever its answers name (options, atoms, bonds…). */
export function checkGraded(
  item: Graded,
  ids: Set<string>,
  unknown: { answer: (id: string) => string; hint: (id: string) => string },
): string[] {
  const errors: string[] = [];
  for (const id of item.answer) if (!ids.has(id)) errors.push(unknown.answer(id));
  if (item.prediction) return errors;

  const hints = item.hints ?? [];
  for (const hint of hints)
    for (const id of [...(hint.match ?? []), ...(hint.includes ?? []), ...(hint.misses ?? [])])
      if (!ids.has(id)) errors.push(unknown.hint(id));
  const fallbacks = hints.filter((h) => !h.match && !h.includes && !h.misses);
  if (fallbacks.length !== 1 || fallbacks[0] !== hints.at(-1))
    errors.push("needs exactly one generic fallback Hint (no match), and it must come last");
  if (!item.correct) errors.push("needs a Correct line");
  return errors;
}
