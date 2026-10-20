// Build-time side of the Practice Set: where its page lives, what can be drawn,
// and the page/answer-key split (answers stay out of the page's HTML, story 99).
import type { Step, Unit } from "@astratron/content";
import { drawable, SET_SIZE, type BankEntry } from "../engine/practice-set.ts";
import { splitSteps, type AnswerKey, type PageStep } from "./answer-key.ts";

/** The Practice Set page: `<unit url>/practice` (the content build reserves that slug). */
export const practiceUrl = (unit: Pick<Unit, "url">) => `${unit.url}/practice`;

/** Where a Unit's Practice Set answer key is built. */
export const practiceKeyUrl = (subject: string, unitId: string) => `/answers/${subject}/practice/${unitId}.json`;

/** The Unit's core Lesson ids in order: what a Practice Set covers. */
export const coreLessons = (unit: Pick<Unit, "lessons">) => unit.lessons.filter((l) => !l.onRamp).map((l) => l.id);

/** The Problems a Practice Set may ever draw: approved, from a core Lesson. Drafts never leave the build. */
export const drawableBank = (unit: Pick<Unit, "lessons" | "bank">) => {
  const core = coreLessons(unit);
  return unit.bank.filter((p) => drawable(p, core));
};

/** Problems in one Practice Set of this Unit: 10, or fewer while the Bank is small. */
export const setSize = (unit: Pick<Unit, "lessons" | "bank">) => Math.min(SET_SIZE, drawableBank(unit).length);

/**
 * Where the Lesson-end screen's primary button goes: the Unit's capstone (Lesson 8) leads to the
 * Unit's Practice Set when it has one; every other Lesson to the next Lesson, if any.
 */
export function lessonNext(unit: Pick<Unit, "url" | "number" | "lessons" | "bank">, index: number): { href: string; label: string } | undefined {
  if (unit.lessons[index]?.capstone && setSize(unit) > 0) return { href: practiceUrl(unit), label: `Unit ${unit.number} Practice Set` };
  const next = unit.lessons[index + 1];
  return next && { href: next.url, label: "Next Lesson" };
}

/** A drawable Problem as the Practice Set page carries it: its Step without secrets, plus what the draw needs. */
export interface PageProblem {
  entry: BankEntry;
  step: PageStep;
}

/**
 * Splits a Unit's drawable Problems into what the page carries and the answer key file
 * (keyed by Problem id). `render` turns a Step's Markdown into HTML (renderStep at build time).
 */
export function splitPractice(
  unit: Pick<Unit, "lessons" | "bank">,
  render: (step: Step) => Step = (s) => s,
): { problems: PageProblem[]; key: AnswerKey } {
  const bank = drawableBank(unit);
  const { steps, key } = splitSteps(bank.map((p) => render(p.step)));
  const problems = bank.map(({ id, lesson, difficulty, status, check, onRamp }, i) => ({
    entry: { id, lesson, difficulty, status, check, onRamp },
    step: steps[i],
  }));
  return { problems, key };
}
