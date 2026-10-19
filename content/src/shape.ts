// Lesson shape rules and interactive-Step rules (GLOSSARY: Lesson;
// docs/specs/lesson-spec-template.md, "Shape checks").
import type { LessonFile, ProblemFile } from "./schema.ts";
import { sameValue } from "./scenes.ts";

type GradedStepFile = Exclude<LessonFile["steps"][number], { type: "explain" } | { type: "check" }>;
/** A graded Step or a Problem: anything the Student answers. */
type Interaction = GradedStepFile | ProblemFile;

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
    if (step.type === "explain" || step.type === "check") continue;
    if (step.type === "multiple-choice" && step.prediction && step.phase !== "hook")
      errors.push(`step ${step.id}: prediction is allowed only in the Hook`);
    for (const message of checkInteraction(step)) errors.push(`step ${step.id}: ${message}`);
  }

  if (lesson.signature && !steps.some((s) => s.id === lesson.signature))
    errors.push(`signature Step "${lesson.signature}" is not one of its Steps`);
  return errors;
}

/** Rules every graded Step and Problem shares, then the rules of its Step type. */
export function checkInteraction(item: Interaction): string[] {
  const errors = answerRules(item);
  if (isPrediction(item)) return errors;

  const hints: Condition[] = item.hints ?? [];
  const fallbacks = hints.filter(isFallback);
  if (fallbacks.length !== 1 || fallbacks[0] !== hints.at(-1))
    errors.push("needs exactly one generic fallback Hint (no match), and it must come last");
  if (!item.correct) errors.push("needs a Correct line");
  return errors;
}

type Condition = { match?: unknown; includes?: string[]; misses?: string[]; from?: string[]; to?: string[] };
/** The generic fallback Hint has no condition. */
const isFallback = (h: Condition) => h.match === undefined && !h.includes && !h.misses && !h.from && !h.to;

/** Every id a set Hint names: its exact `match`, and its `includes` / `misses` conditions. */
export const hintIds = (h: { match?: string[]; includes?: string[]; misses?: string[] }) => [
  ...(h.match ?? []),
  ...(h.includes ?? []),
  ...(h.misses ?? []),
];

/** A Hook prediction (Steps only; Problems never predict) is ungraded. */
const isPrediction = (item: Interaction) => "prediction" in item && item.prediction === true;

function answerRules(item: Interaction): string[] {
  const errors: string[] = [];
  switch (item.type) {
    case "multiple-choice": {
      const optionIds = new Set(item.options.map((o) => o.id));
      for (const id of item.answer) if (!optionIds.has(id)) errors.push(`answer names unknown option "${id}"`);
      if (isPrediction(item)) return errors;
      for (const hint of item.hints ?? [])
        for (const id of hintIds(hint)) if (!optionIds.has(id)) errors.push(`a Hint matches unknown option "${id}"`);
      break;
    }
    case "numeric":
      for (const { match } of item.hints ?? [])
        if (match !== undefined && Math.abs(match - item.answer) <= item.tolerance)
          errors.push(`a Hint matches ${match}, which is within the tolerance of the answer`);
      break;
    case "rank": {
      const itemIds = item.items.map((i) => i.id);
      const wholeOrder = (order: string[]) =>
        order.length === itemIds.length && new Set(order).size === order.length && itemIds.every((id) => order.includes(id));
      if (!wholeOrder(item.answer)) errors.push("answer must list every item exactly once");
      else if (item.answer.every((id, i) => id === itemIds[i]))
        errors.push("the items start in the answer order; list them in a different order");
      if (item.hints?.some((h) => h.match && !wholeOrder(h.match)))
        errors.push("a Hint's match must list every item exactly once");
      break;
    }
    case "manipulate":
      // Values are checked against the Scene's settable states in scenes.ts.
      if (item.hints?.some((h) => h.match?.some((v) => sameValue(v, item.answer))))
        errors.push(`a Hint matches the answer ${item.answer}`);
      break;
    // tap-to-identify: answer and Hint ids are checked against the structure's targets (structures.ts).
    // draw-arrows: pushes, Hint ids, starts and results are checked against the structures (structures.ts).
  }
  return errors;
}
