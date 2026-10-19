// Engine paths for Multiple choice with structure cards and for Tap-to-identify.
import { describe, expect, it } from "vitest";
import type { Lesson, MultipleChoiceStep, Structure, TapStep } from "@astratron/content";
import { act, start, type Action } from "./player.ts";

const formaldehyde: Structure = {
  id: "formaldehyde",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "O", x: 1.5, y: 0, lp: 2 },
    { id: "a3", el: "H", x: -0.75, y: -1.3 },
    { id: "a4", el: "H", x: -0.75, y: 1.3 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
    { id: "b3", a: "a1", b: "a4", order: 1 },
  ],
};
const card = (id: string, text: string) => ({ id, text, structure: { structure: formaldehyde, hide: [] } });

const cards: MultipleChoiceStep = {
  id: "s01",
  phase: "build",
  type: "multiple-choice",
  prompt: "Pick every card that can exist.",
  options: [card("a", "Real A"), card("b", "Real B"), card("c", "Impossible C"), card("d", "Impossible D")],
  answer: ["a", "b"],
  correct: "A and B are real ions.",
  hints: [
    { includes: ["c", "d"], text: "An impossible card is in your pick." },
    { misses: ["b"], text: "B is real too." },
    { text: "Check each card." },
  ],
  reveal: "A and B.",
};

const tap: TapStep = {
  id: "s02",
  phase: "build",
  type: "tap-to-identify",
  prompt: "Tap every source of electrons.",
  structure: { structure: formaldehyde, hide: [] },
  targets: [
    { id: "a1", kind: "atom", label: "Carbon" },
    { id: "a2", kind: "atom", label: "Oxygen" },
    { id: "b1", kind: "bond", label: "C=O" },
  ],
  answer: ["a2", "b1"],
  correct: "The O lone pairs and the π bond.",
  hints: [
    { includes: ["a1"], text: "Carbon has no lone pair." },
    { match: ["a2"], text: "One more: the double bond." },
    { text: "Sources are lone pairs and π bonds." },
  ],
  reveal: "O and the C=O π bond.",
};

const lesson: Lesson = {
  id: "l1",
  slug: "first",
  title: "First",
  goal: "Goal.",
  keyIdea: "Key idea.",
  onRamp: false,
  url: "/chem/c/u/first",
  steps: [cards, tap, { id: "s03", phase: "wrap", type: "explain", text: "Wrap." }],
};

const play = (...actions: Action[]) => actions.reduce((s, a) => act(lesson, s, a), start(lesson));
const answer = (...choice: string[]): Action => ({ type: "answer", choice });
const next: Action = { type: "continue" };

describe("Multiple choice with structure cards", () => {
  it("right needs the exact set of correct cards, in any order", () => {
    expect(play(answer("b", "a"))).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "A and B are real ions." },
      canContinue: true,
    });
  });

  it("wrong then right: the Hint for an anticipated wrong pick, then the Correct line", () => {
    expect(play(answer("a", "c"))).toMatchObject({ tries: 1, feedback: { kind: "hint", text: "An impossible card is in your pick." } });
    expect(play(answer("a", "c"), answer("a", "b"))).toMatchObject({ tries: 2, feedback: { kind: "correct" }, canContinue: true });
  });

  it("a Hint can fire on a missed card", () => {
    expect(play(answer("a"))).toMatchObject({ feedback: { kind: "hint", text: "B is real too." } });
  });

  it("wrong twice reveals the correct cards", () => {
    expect(play(answer("a"), answer("d"))).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "A and B.", answer: ["a", "b"] },
      canContinue: true,
    });
  });
});

describe("Tap-to-identify", () => {
  const onTap = (...actions: Action[]) => play(answer("a", "b"), next, ...actions);

  it("can't be continued before it is answered", () => {
    expect(onTap(next)).toMatchObject({ index: 1, canContinue: false });
  });

  it("right: the exact set of atoms and bonds, in any order", () => {
    expect(onTap(answer("b1", "a2"))).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "The O lone pairs and the π bond." },
      canContinue: true,
    });
  });

  it("wrong then right: the Hint for that wrong tap, then the Correct line", () => {
    expect(onTap(answer("a1", "a2", "b1"))).toMatchObject({ feedback: { kind: "hint", text: "Carbon has no lone pair." } });
    expect(onTap(answer("a2"))).toMatchObject({ feedback: { kind: "hint", text: "One more: the double bond." } });
    expect(onTap(answer("a2"), answer("a2", "b1"))).toMatchObject({ tries: 2, feedback: { kind: "correct" }, canContinue: true });
  });

  it("an unanticipated wrong tap gets the generic fallback", () => {
    expect(onTap(answer("b1"))).toMatchObject({ feedback: { kind: "hint", text: "Sources are lone pairs and π bonds." } });
  });

  it("wrong twice reveals the answer set", () => {
    expect(onTap(answer("a1"), answer("b1"))).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "O and the C=O π bond.", answer: ["a2", "b1"] },
      canContinue: true,
    });
  });

  it("is locked once answered", () => {
    const answered = onTap(answer("a2", "b1"));
    expect(act(lesson, answered, answer("a1"))).toEqual(answered);
  });
});
