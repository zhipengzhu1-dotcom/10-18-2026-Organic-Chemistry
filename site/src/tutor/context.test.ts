// The Tutor context: the only path Step data takes to the model (spec #104, ticket #105).
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot, type MultipleChoiceStep, type Step } from "@astratron/content";
import { secretFields, stepTypes, type StepType } from "@astratron/content/step-types";
import { sceneCatalog } from "@astratron/scenes/check";
import { sceneManifests } from "@astratron/scenes/manifests";
import { watchSceneManifests } from "@astratron/scenes/watch";
import { act, start, type Action, type Screen } from "../engine/player.ts";
import { keyText, splitLesson, splitSteps, withKey, type PageLesson } from "../lib/answer-key.ts";
import { renderLesson, renderStep } from "../lib/content.ts";
import { plain, tutorContext } from "./context.ts";

const mc: MultipleChoiceStep = {
  id: "s01",
  phase: "build",
  type: "multiple-choice",
  prompt: "Which is the <em>nucleophile</em>?",
  options: [
    { id: "a", text: '<span class="data">OH⁻</span> &amp; water' },
    { id: "b", text: "The C&#8211;Br carbon" },
  ],
  answer: ["a"],
  correct: "Right: the lone pairs.",
  hints: [{ match: ["b"], text: "That carbon is the electrophile." }],
  reveal: "Hydroxide is the nucleophile.",
};
const lesson = {
  id: "l1",
  slug: "l1",
  title: "Who attacks whom",
  goal: "Spot the **nucleophile**.",
  keyIdea: "Electrons flow from rich to poor.",
  onRamp: false,
  number: 1,
  capstone: false,
  signature: "multiple-choice",
  phases: { hook: 0, build: 1, check: 0, wrap: 0 },
  url: "/l1",
  steps: [mc],
} as const;
const page: PageLesson = splitLesson({ ...lesson, steps: [mc] }).page;

describe("Tutor context", () => {
  it("carries the Step as the page shows it, in plain text, with the picked choices as their text", () => {
    const context = tutorContext({ lesson: page, screen: start({ steps: [mc] }), draft: ["a"] });
    expect(context).toEqual({
      lesson: { title: "Who attacks whom", goal: "Spot the nucleophile." },
      step: { number: 1, of: 1, type: "multiple-choice", phase: "build", prompt: "Which is the nucleophile?", options: ["OH⁻ & water", "The C–Br carbon"] },
      student: { picked: ["OH⁻ & water"], tries: 0, feedback: null },
      revealed: false,
      stage: { scene: false, control: null, atoms: [] },
    });
  });
});

// Every built Step of every Lesson and of the Practice Bank, as the page carries it (rendered, split).
const { model } = buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) });
const units = model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units));
const played: { where: string; page: PageLesson; key: Record<string, Record<string, unknown>> }[] = [
  ...units.flatMap((u) => u.lessons.map((l) => ({ where: l.id, ...splitLesson(renderLesson(l)) }))),
  ...units.map((u) => {
    const { steps, key } = splitSteps(u.bank.map((p) => renderStep(p.step)));
    return { where: `bank:${u.id}`, page: { ...page, id: `practice-${u.id}`, title: "Practice Set", goal: "", keyIdea: "", steps }, key };
  }),
];

/** Answers that might be wrong, read from the keyed Step (only this test sees the key). */
function guesses(step: Step): Action[] {
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const hintValues = ((step as { hints?: Record<string, unknown>[] }).hints ?? []).flatMap((h) => Object.values(h));
  switch (step.type) {
    case "multiple-choice":
    case "rotate-and-identify":
      return ids(step.options).map((id) => ({ type: "answer", choice: [id] }));
    case "tap-to-identify":
      return ids(step.targets).map((id) => ({ type: "answer", choice: [id] }));
    case "rank": {
      const order = ids(step.items);
      return [order, [...order].reverse(), [...order.slice(1), order[0]]].map((o) => ({ type: "answer", order: o }));
    }
    case "numeric":
      return [...hintValues.filter((v) => typeof v === "number"), step.answer + 1000].map((value) => ({ type: "answer", value }) as Action);
    case "manipulate":
      return [...hintValues.flat(), 0, 1, -1, 10, "a", true, false].map((setting) => ({ type: "answer", setting }) as Action);
    case "draw-arrows": {
      const at = [...step.start.structure.atoms.map((a) => a.id), ...step.start.structure.bonds.map((b) => b.id)];
      return at.flatMap((from) => at.map((to) => ({ type: "answer", push: { from, to } }) as Action));
    }
    case "manipulate-goal":
      return [{ type: "idle" }];
    case "explain":
      return [];
  }
}

/** The first guess that gets a Hint (a wrong try), then a second wrong try on top of it. */
function wrongTries(lesson: ReturnType<typeof withKey>, opened: Screen): Screen[] {
  for (const guess of guesses(lesson.steps[opened.index])) {
    const once = act(lesson, opened, guess);
    if (once.feedback?.kind !== "hint") continue;
    const twice = act(lesson, once, guess);
    return twice === once ? [once] : [once, twice];
  }
  return [];
}

/** Every field name that holds part of the Answer key, in any Step type. */
const KEY_FIELDS = new Set([...Object.keys(stepTypes).flatMap((t) => secretFields(t as StepType)), "answerCitations", "match", "stages"]);
const fieldsOf = (x: unknown): string[] =>
  Array.isArray(x) ? x.flatMap(fieldsOf) : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => [k, ...fieldsOf(v)]) : [];

describe("Tutor context, over every built Step of every Lesson and the Practice Bank", () => {
  it("holds no Answer key field, Hint condition or reveal before the Step can continue, and the reveal after", () => {
    const leaks: string[] = [];
    let revealsSeen = 0;
    let wrongSeen = 0;
    for (const { where, page: lessonPage, key } of played) {
      const lesson = withKey(lessonPage, key);
      lessonPage.steps.forEach((pageStep) => {
        const opened = start(lesson, pageStep.id);
        const tries = wrongTries(lesson, opened);
        wrongSeen += tries.length;
        // Before an answer, after a wrong try (its Hint on screen), after the second try; with a draft picked.
        for (const screen of [opened, ...tries]) {
          const draft = "options" in pageStep ? [pageStep.options[0].id] : undefined;
          const context = tutorContext({ lesson: lessonPage, screen, draft });
          const text = JSON.stringify(context);
          const at = `${where}#${pageStep.id} (tries ${screen.tries}${screen.canContinue ? ", done" : ""})`;
          for (const f of fieldsOf(context)) if (KEY_FIELDS.has(f)) leaks.push(`${at}: field "${f}"`);
          const shownText = screen.feedback && plain(screen.feedback.text);
          for (const words of keyText(key[pageStep.id] ?? {}).map(plain)) {
            const onScreen = words === shownText && (screen.canContinue || screen.feedback?.kind !== "reveal");
            if (words && !onScreen && text.includes(JSON.stringify(words).slice(1, -1))) leaks.push(`${at}: "${words}"`);
          }
          const reveal = plain(String(key[pageStep.id]?.reveal ?? ""));
          if (reveal && screen.feedback?.kind === "reveal") {
            revealsSeen++;
            expect(context.revealed, at).toBe(true);
            expect(context.student.feedback?.text, at).toBe(reveal);
          }
        }
      });
    }
    expect(leaks).toEqual([]);
    // The walk really reached Hints and reveals.
    expect(wrongSeen).toBeGreaterThan(100);
    expect(revealsSeen).toBeGreaterThan(50);
  });
});
