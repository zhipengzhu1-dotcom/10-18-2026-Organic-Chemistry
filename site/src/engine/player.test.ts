import { describe, expect, it } from "vitest";
import type { Lesson, MultipleChoiceStep } from "@astratron/content";
import { act, start, type Action, type Screen } from "./player.ts";

const choice = (id: string, extra: Partial<MultipleChoiceStep> = {}): MultipleChoiceStep => ({
  id,
  phase: "build",
  type: "multiple-choice",
  prompt: `Question ${id}`,
  options: [
    { id: "a", text: "Right" },
    { id: "b", text: "Common slip" },
    { id: "c", text: "Other" },
  ],
  answer: ["a"],
  correct: "Right, because.",
  hints: [
    { match: ["b"], text: "Hint for b." },
    { text: "Generic hint." },
  ],
  reveal: "It is a, because.",
  ...extra,
});

const lesson: Lesson = {
  id: "l1",
  slug: "first",
  title: "First",
  goal: "Goal.",
  keyIdea: "Key idea.",
  onRamp: false,
  url: "/chem/c/u/first",
  steps: [
    choice("s01", { phase: "hook", prediction: true, correct: undefined, hints: undefined }),
    { id: "s02", phase: "build", type: "explain", text: "Explain." },
    choice("s03"),
    choice("s04", { phase: "check", problemId: "p1" }),
    { id: "s05", phase: "wrap", type: "explain", text: "Wrap." },
  ],
};

function play(...actions: Action[]): Screen {
  return actions.reduce((screen, action) => act(lesson, screen, action), start(lesson));
}
const answer = (...choice: string[]): Action => ({ type: "answer", choice });
const next: Action = { type: "continue" };

describe("Step player engine", () => {
  it("opens on the first Step", () => {
    const screen = start(lesson);
    expect(screen).toMatchObject({ index: 0, total: 5, tries: 0, feedback: null, canContinue: false, done: false });
    expect(screen.step.id).toBe("s01");
  });

  it("a Hook prediction accepts every choice and reveals at once", () => {
    for (const pick of ["a", "b", "c"]) {
      expect(play(answer(pick))).toMatchObject({
        tries: 0,
        feedback: { kind: "reveal", text: "It is a, because.", answer: ["a"] },
        canContinue: true,
      });
    }
  });

  it("an Explain Step can be continued straight away", () => {
    const screen = play(answer("c"), next);
    expect(screen.step.id).toBe("s02");
    expect(screen.canContinue).toBe(true);
  });

  it("a graded Step can't be continued before it is answered", () => {
    const screen = play(answer("c"), next, next, next);
    expect(screen.step.id).toBe("s03");
  });

  it("right shows the Correct line", () => {
    expect(play(answer("c"), next, next, answer("a"))).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "Right, because." },
      canContinue: true,
    });
  });

  it("wrong once shows the first matching Hint and allows another try", () => {
    expect(play(answer("c"), next, next, answer("b"))).toMatchObject({
      tries: 1,
      feedback: { kind: "hint", text: "Hint for b." },
      canContinue: false,
    });
  });

  it("wrong once with no matching Hint shows the generic fallback", () => {
    expect(play(answer("c"), next, next, answer("c"))).toMatchObject({
      feedback: { kind: "hint", text: "Generic hint." },
    });
  });

  it("a Hint matches the exact chosen set only", () => {
    expect(play(answer("c"), next, next, answer("a", "b"))).toMatchObject({
      feedback: { kind: "hint", text: "Generic hint." },
    });
  });

  it("wrong then right shows the Correct line", () => {
    expect(play(answer("c"), next, next, answer("b"), answer("a"))).toMatchObject({
      tries: 2,
      feedback: { kind: "correct", text: "Right, because." },
      canContinue: true,
    });
  });

  it("wrong twice shows the reveal", () => {
    expect(play(answer("c"), next, next, answer("b"), answer("c"))).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "It is a, because.", answer: ["a"] },
      canContinue: true,
    });
  });

  it("an answered Step is locked", () => {
    const answered = play(answer("c"), next, next, answer("a"));
    expect(act(lesson, answered, answer("b"))).toEqual(answered);
  });

  it("a Check Step plays its Problem the same way", () => {
    const screen = play(answer("c"), next, next, answer("a"), next, answer("b"), answer("b"));
    expect(screen.step.id).toBe("s04");
    expect(screen.feedback).toMatchObject({ kind: "reveal" });
  });

  it("the Lesson is done on reaching Wrap", () => {
    const beforeWrap = play(answer("c"), next, next, answer("a"), next, answer("a"));
    expect(beforeWrap.done).toBe(false);
    const wrap = act(lesson, beforeWrap, next);
    expect(wrap).toMatchObject({ index: 4, done: true });
    expect(act(lesson, wrap, next)).toEqual(wrap);
  });
});
