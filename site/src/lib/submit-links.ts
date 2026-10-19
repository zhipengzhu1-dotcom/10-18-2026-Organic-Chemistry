// Links into the submission form (/submit). "Suggest a Problem" belongs on the Practice Set
// summary (#74), the Unit page and the footer, never inside a Lesson; "Report a mistake" goes
// on every Step and Problem, pre-filled with its id.

/** The form page, set for a Submitted Problem (optionally for one Unit). */
export const suggestProblemHref = (unitId?: string) =>
  `/submit?${new URLSearchParams({ kind: "problem", ...(unitId ? { unit: unitId } : {}) })}`;

/** The form page, set for a Mistake report about one Step or Problem. */
export const reportMistakeHref = (unitId: string, targetId: string) =>
  `/submit?${new URLSearchParams({ kind: "mistake", unit: unitId, target: targetId })}`;

/** What a Mistake report names: a Check Step's Problem id, else `<lesson id>#<step id>` (ADR 0003). */
export const mistakeTarget = (lessonId: string, step: { id: string; problemId?: string }) =>
  step.problemId ?? `${lessonId}#${step.id}`;
