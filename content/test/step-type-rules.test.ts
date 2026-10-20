// Each Step type's rules through the table's interface (#97): a Step file builds, splits into the
// page and its key, rejoins, and plays through `act`, the same grading the build validates with.
import { describe, expect, it } from "vitest";
import { buildContent, type Step } from "../src/index.ts";
import {
  act,
  ANSWER_ORDER,
  joinStep,
  splitStep,
  startStep,
  stepTypes,
  type Answer,
  type GoalState,
  type Nudge,
  type PlayState,
  type Played,
  type StepOfType,
} from "../src/step-types/index.ts";
import { stepSchemas } from "../src/step-types/schemas.ts";
import { validTree, writeTree } from "./tree.ts";

/** Plays answers in turn from the Step's start; each result's state feeds the next. */
function play(step: Step, ...inputs: (Answer | Nudge)[]): (Played<PlayState> | undefined)[] {
  let state: PlayState = startStep(step);
  return inputs.map((input) => {
    const played = act(step, state as never, input) as Played<PlayState> | undefined;
    if (played) state = played.state;
    return played;
  });
}
const feedback = (results: (Played<PlayState> | undefined)[]) => results.map((r) => r && r.feedback && [r.feedback.kind, r.feedback.text]);

const built = () => buildContent(writeTree(validTree())).model!.subjects[0].courses[0].units[0].lessons[0];

describe("the table", () => {
  it("has a rules entry and a schema entry for every Step type, and nothing else", () => {
    expect(Object.keys(stepSchemas).sort()).toEqual(Object.keys(stepTypes).sort());
  });

  it("lists each type's secret fields in the answer key's order, so the built key stays byte-stable", () => {
    for (const [type, rules] of Object.entries(stepTypes)) {
      const at = rules.secret.map((f) => ANSWER_ORDER.indexOf(f));
      expect(at, type).toEqual([...at].sort((a, b) => a - b));
    }
  });

  it("takes no answer once a Step is done, and none of another type's shape", () => {
    const mc = built().steps[2];
    const [right, after] = play(mc, { choice: ["a"] }, { choice: ["b"] });
    expect(right?.state.done).toBe(true);
    expect(after).toBeUndefined();
    expect(play(mc, { value: 3 }, { idle: true }, { early: true })).toEqual([undefined, undefined, undefined]);
  });
});

describe("Multiple choice", () => {
  it("builds, splits, rejoins and grades: Hint, then the reveal", () => {
    const step = built().steps[2];
    const { shown, secrets } = splitStep(step);
    expect(shown).toMatchObject({ select: "one" });
    expect(shown).not.toHaveProperty("answer");
    const playable = joinStep(JSON.parse(JSON.stringify(shown)), JSON.parse(JSON.stringify(secrets)));
    expect(feedback(play(playable, { choice: ["b"] }, { choice: ["c"] }))).toEqual([
      ["hint", "Hint for b."],
      ["reveal", "It is a, because."],
    ]);
    expect(feedback(play(playable, { choice: ["a"] }))).toEqual([["correct", "Right, because."]]);
  });

  it("a Hint matches the exact chosen set only, else the generic fallback; wrong then right is the second try", () => {
    const step = built().steps[2];
    expect(feedback(play(step, { choice: ["a", "b"] }))).toEqual([["hint", "Generic hint."]]);
    expect(feedback(play(step, { choice: ["c"] }))).toEqual([["hint", "Generic hint."]]);
    const [, right] = play(step, { choice: ["b"] }, { choice: ["a"] });
    expect(right).toMatchObject({ state: { tries: 2, done: true }, feedback: { kind: "correct" } });
  });

  it("without its key it grades nothing right", () => {
    const step = joinStep(splitStep(built().steps[2]).shown);
    expect(play(step, { choice: ["a"] })[0]?.feedback?.kind).toBe("hint");
  });

  it("a Hook prediction accepts any choice and reveals at once, spending no try", () => {
    const step = { ...built().steps[2], prediction: true } as Step;
    const [played] = play(step, { choice: ["c"] });
    expect(played).toEqual({ state: { tries: 0, done: true }, feedback: { kind: "reveal", text: "It is a, because.", answer: ["a"] } });
  });
});

const graded = { id: "s01", phase: "build", prompt: "?", correct: "Yes.", reveal: "This." } as const;

describe("Numeric", () => {
  const step = { ...graded, type: "numeric", unitSymbol: "°", answer: 109.5, tolerance: 0.5, hints: [{ match: 120, text: "Planar." }, { text: "3D." }] } as StepOfType<"numeric">;
  it("is right within the tolerance, matches Hints within it too, and ignores what isn't a number", () => {
    expect(feedback(play(step, { value: 109.9 }))).toEqual([["correct", "Yes."]]);
    expect(feedback(play(step, { value: 120.4 }))).toEqual([["hint", "Planar."]]);
    expect(play(step, { value: Number.NaN })).toEqual([undefined]);
    expect(feedback(play(step, { value: 110.1 }))).toEqual([["hint", "3D."]]);
  });

  it("wrong twice reveals the number", () => {
    expect(play(step, { value: 120 }, { value: 100 })[1]?.feedback).toEqual({ kind: "reveal", text: "This.", answer: 109.5 });
  });
});

describe("Rank", () => {
  const step = {
    ...graded,
    type: "rank",
    items: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
    answer: ["c", "b", "a"],
    hints: [{ notFirst: "c", text: "C first." }, { above: [["a", "b"]], text: "A above B?" }, { text: "Again." }],
  } as StepOfType<"rank">;
  it("matches the first Hint whose pattern holds", () => {
    expect(feedback(play(step, { order: ["a", "b", "c"] }))).toEqual([["hint", "C first."]]);
    expect(feedback(play(step, { order: ["c", "a", "b"] }))).toEqual([["hint", "A above B?"]]);
    expect(feedback(play(step, { order: ["c", "b", "a"] }))).toEqual([["correct", "Yes."]]);
  });

  it("a Hint can answer an exact order, an item not last, or one item placed before another", () => {
    const hinted = (hints: StepOfType<"rank">["hints"]) => ({ ...step, hints }) as StepOfType<"rank">;
    const patterned = hinted([
      { match: ["a", "b", "c"], text: "Reversed." },
      { notLast: "a", text: "A last." },
      { before: ["a", "b"], text: "B before A." },
      { text: "Again." },
    ]);
    expect(feedback(play(patterned, { order: ["a", "b", "c"] }))).toEqual([["hint", "Reversed."]]);
    expect(feedback(play(patterned, { order: ["c", "a", "b"] }))).toEqual([["hint", "A last."]]);
    expect(feedback(play(hinted([{ before: ["a", "b"], text: "B before A." }, { text: "Again." }]), { order: ["c", "a", "b"] }))).toEqual([
      ["hint", "B before A."],
    ]);
    expect(feedback(play(patterned, { order: ["b", "c", "a"] }))).toEqual([["hint", "Again."]]);
  });
});

describe("Manipulate", () => {
  const step = { ...graded, type: "manipulate", control: "twist", answer: 90, hints: [{ match: [0], text: "Flat." }, { text: "Turn." }] } as unknown as StepOfType<"manipulate">;
  it("compares values like the Scene does (numbers within rounding)", () => {
    expect(feedback(play(step, { setting: 90 + 1e-12 }))).toEqual([["correct", "Yes."]]);
    expect(feedback(play(step, { setting: 0 }, { setting: 45 }))).toEqual([["hint", "Flat."], ["reveal", "This."]]);
  });

  it("choice states compare by option id", () => {
    const view = { ...step, control: "view", answer: "end", hints: [{ text: "Look end-on." }] } as StepOfType<"manipulate">;
    expect(feedback(play(view, { setting: "end" }))).toEqual([["correct", "Yes."]]);
    expect(feedback(play(view, { setting: "side" }))).toEqual([["hint", "Look end-on."]]);
  });
});

describe("Rotate-and-identify", () => {
  it("grades like Multiple choice: the exact set of option ids, Hints first to last, two tries", () => {
    const mc = built().steps[2] as StepOfType<"multiple-choice">;
    const step = { ...mc, type: "rotate-and-identify" } as unknown as StepOfType<"rotate-and-identify">;
    expect(feedback(play(step, { choice: ["a"] }))).toEqual([["correct", "Right, because."]]);
    expect(feedback(play(step, { choice: ["b"] }, { choice: ["c"] }))).toEqual([
      ["hint", "Hint for b."],
      ["reveal", "It is a, because."],
    ]);
    expect(play(step, { value: 1 })).toEqual([undefined]);
  });
});

describe("Goal-state Manipulate", () => {
  const step = {
    id: "s01",
    phase: "build",
    type: "manipulate-goal",
    prompt: "Bond it.",
    scene: { id: "x", state: { bonded: 0, h: "off" }, cited: {} },
    idleSeconds: 30,
    stages: [
      { prompt: "Bond it.", goal: { bonded: 4 }, correct: "Four.", blocked: "Not yet.", idle: "Drag an H." },
      { prompt: "Now show it.", start: { h: "on" }, goal: { h: "off" }, correct: "Done.", blocked: "Hide them.", idle: "Tap hide." },
    ],
  } as unknown as StepOfType<"manipulate-goal">;

  it("answers early Continue and idleness with its stage's Hints, and moves through the stages", () => {
    const results = play(step, { early: true }, { idle: true }, { idle: true }, { state: { bonded: 4 } }, { state: { h: "off" } });
    expect(feedback(results)).toEqual([["hint", "Not yet."], ["hint", "Drag an H."], ["hint", "Drag an H."], ["correct", "Four."], ["correct", "Done."]]);
    const goal = (n: number) => (results[n]!.state as GoalState).goal;
    expect(goal(2).idle).toBe(2);
    expect(goal(3).state).toEqual({ bonded: 4, h: "on" });
    expect(results[4]?.state.done).toBe(true);
  });

  it("a move short of the goal clears the Hint", () => {
    expect(play(step, { idle: true }, { state: { bonded: 2 } })[1]?.feedback).toBeNull();
  });
});

describe("Explain", () => {
  it("opens done, ships whole and takes nothing", () => {
    const step = built().steps.find((s) => s.type === "explain")!;
    expect(step.type).toBe("explain");
    expect(startStep(step)).toEqual({ tries: 0, done: true });
    expect(splitStep(step)).toEqual({ shown: step });
  });
});
