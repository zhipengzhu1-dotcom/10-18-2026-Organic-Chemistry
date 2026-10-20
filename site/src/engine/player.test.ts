import { describe, expect, it } from "vitest";
import type { GoalStep, ManipulateStep, MultipleChoiceStep, NumericStep, RankStep, RotateAndIdentifyStep } from "@astratron/content";
import { act, start, type Action, type PlayableLesson, type Screen } from "./player.ts";

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

const lesson: PlayableLesson = {
  deletedSteps: { s06: "s03" },
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

describe("Step links (ADR 0003)", () => {
  it("a link to a Step id opens that Step", () => {
    expect(start(lesson, "s04")).toMatchObject({ index: 3, step: { id: "s04" }, tries: 0, feedback: null });
  });

  it("a link to a deleted Step's id opens the Step its old links now point at", () => {
    expect(start(lesson, "s06")).toMatchObject({ index: 2, step: { id: "s03" } });
  });

  it("a link to an unknown id opens the first Step", () => {
    expect(start(lesson, "s99")).toMatchObject({ index: 0, step: { id: "s01" } });
  });
});

describe("Navigation and resume", () => {
  const back: Action = { type: "back" };

  it("back opens the previous Step, and an answered Step stays locked with its feedback", () => {
    const screen = play(answer("c"), next, next, answer("b"), answer("a"), next, back);
    expect(screen).toMatchObject({
      step: { id: "s03" },
      tries: 2,
      feedback: { kind: "correct", text: "Right, because." },
      canContinue: true,
    });
    expect(act(lesson, screen, answer("c"))).toEqual(screen);
  });

  it("back on the first Step does nothing", () => {
    const first = start(lesson);
    expect(act(lesson, first, back)).toEqual(first);
  });

  it("after going back, Continue walks forward again but never past an unanswered Step", () => {
    const screen = play(answer("c"), next, next, back, back, next, next, next, next);
    expect(screen).toMatchObject({ step: { id: "s03" }, canContinue: false, feedback: null });
  });

  it("the progress record keeps each answer under its Step id and where the Student is", () => {
    expect(play(answer("c"), next, next, answer("b")).progress).toEqual({
      step: "s03",
      answers: { s01: [{ choice: ["c"] }], s03: [{ choice: ["b"] }] },
      done: false,
    });
  });

  it("resumes mid-Lesson at the same Step, in the same state", () => {
    const left = play(answer("c"), next, next, answer("b"));
    const resumed = start(lesson, undefined, left.progress);
    expect(resumed).toEqual(left);
  });

  it("a resumed Lesson keeps earlier answers locked", () => {
    const left = play(answer("c"), next, next, answer("a"), next);
    const resumed = act(lesson, start(lesson, undefined, left.progress), back);
    expect(resumed).toMatchObject({ step: { id: "s03" }, canContinue: true, feedback: { kind: "correct" } });
  });

  it("a saved Step id that was deleted resumes at the Step its old links point at", () => {
    const resumed = start(lesson, undefined, { step: "s06", answers: {}, done: false });
    expect(resumed.step.id).toBe("s03");
  });

  it("a Lesson is done on reaching Wrap, whatever was answered, and stays done after going back", () => {
    const wrap = play(answer("c"), next, next, answer("c"), answer("c"), next, answer("b"), answer("b"), next);
    expect(wrap).toMatchObject({ done: true, progress: { done: true } });
    expect(act(lesson, wrap, back)).toMatchObject({ done: false, progress: { step: "s04", done: true } });
  });
});

const wrapStep = { id: "s09", phase: "wrap", type: "explain", text: "Wrap." } as const;

describe("Numeric input Steps", () => {
  const numeric: NumericStep = {
    id: "s01",
    phase: "build",
    type: "numeric",
    prompt: "What is the H–C–H angle in methane?",
    unitSymbol: "°",
    answer: 109.5,
    tolerance: 0.5,
    correct: "Tetrahedral: 109.5°.",
    hints: [
      { match: 120, text: "120° is trigonal planar." },
      { match: 90, text: "90° is a square on paper, not in 3D." },
      { text: "Four groups spread out in 3D." },
    ],
    reveal: "109.5°, the tetrahedral angle.",
  };
  const numLesson: PlayableLesson = { ...lesson, steps: [numeric, wrapStep] };
  const run = (...values: number[]) =>
    values.reduce((s, value) => act(numLesson, s, { type: "answer", value }), start(numLesson));

  it("right within the absolute tolerance shows the Correct line", () => {
    expect(run(109.5)).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "Tetrahedral: 109.5°." },
      canContinue: true,
    });
    expect(run(110)).toMatchObject({ feedback: { kind: "correct" } });
    expect(run(109)).toMatchObject({ feedback: { kind: "correct" } });
  });

  it("outside the tolerance is wrong and falls back to the generic Hint", () => {
    expect(run(110.1)).toMatchObject({
      tries: 1,
      feedback: { kind: "hint", text: "Four groups spread out in 3D." },
      canContinue: false,
    });
  });

  it("each wrong value can carry its own Hint, matched within the tolerance", () => {
    expect(run(120)).toMatchObject({ feedback: { kind: "hint", text: "120° is trigonal planar." } });
    expect(run(90.4)).toMatchObject({ feedback: { kind: "hint", text: "90° is a square on paper, not in 3D." } });
  });

  it("wrong then right shows the Correct line", () => {
    expect(run(120, 109.5)).toMatchObject({ tries: 2, feedback: { kind: "correct" }, canContinue: true });
  });

  it("wrong twice shows the reveal with the answer", () => {
    expect(run(120, 100)).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "109.5°, the tetrahedral angle.", answer: 109.5 },
      canContinue: true,
    });
  });

  it("an answered Numeric Step is locked", () => {
    const answered = run(109.5);
    expect(act(numLesson, answered, { type: "answer", value: 1 })).toEqual(answered);
  });

  it("ignores an answer that is not a number", () => {
    const screen = start(numLesson);
    expect(act(numLesson, screen, { type: "answer", value: Number.NaN })).toEqual(screen);
    expect(act(numLesson, screen, { type: "answer", choice: ["a"] })).toEqual(screen);
  });
});

describe("Rank / order Steps", () => {
  const rank: RankStep = {
    id: "s01",
    phase: "check",
    problemId: "p9",
    type: "rank",
    prompt: "Rank the C–C bonds from shortest to longest.",
    items: [
      { id: "single", text: "C–C" },
      { id: "double", text: "C=C" },
      { id: "triple", text: "C≡C" },
    ],
    answer: ["triple", "double", "single"],
    correct: "More shared pairs pull the carbons closer.",
    hints: [
      { match: ["single", "double", "triple"], text: "That is longest to shortest." },
      { text: "More bonds between two atoms make the bond shorter." },
    ],
    reveal: "C≡C < C=C < C–C.",
  };
  const rankLesson: PlayableLesson = { ...lesson, steps: [rank, wrapStep] };
  const run = (...orders: string[][]) =>
    orders.reduce((s, order) => act(rankLesson, s, { type: "answer", order }), start(rankLesson));
  const right = ["triple", "double", "single"];

  it("the one strict order is right", () => {
    expect(run(right)).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "More shared pairs pull the carbons closer." },
      canContinue: true,
    });
  });

  it("a Hint can answer a pattern: an item not first, not last, or one item placed before another", () => {
    const patterned: RankStep = {
      ...rank,
      hints: [
        { notLast: "single", text: "C–C is the longest." },
        { notFirst: "triple", text: "C≡C is the shortest." },
        { before: ["single", "double"], text: "C=C is shorter than C–C." },
        { text: "Fallback." },
      ],
    };
    const play = (order: string[]) =>
      act({ ...lesson, steps: [patterned, wrapStep] }, start({ ...lesson, steps: [patterned, wrapStep] }), { type: "answer", order });
    expect(play(["triple", "single", "double"]).feedback?.text).toBe("C–C is the longest.");
    expect(play(["double", "triple", "single"]).feedback?.text).toBe("C≡C is the shortest.");
    expect(play(["triple", "double", "single"]).feedback?.kind).toBe("correct");
    const swapped: RankStep = { ...rank, hints: [{ before: ["single", "double"], text: "Swapped." }, { text: "Fallback." }] };
    const steps = [swapped, wrapStep];
    expect(act({ ...lesson, steps }, start({ ...lesson, steps }), { type: "answer", order: ["triple", "single", "double"] }).feedback?.text).toBe(
      "Swapped.",
    );
    expect(act({ ...lesson, steps }, start({ ...lesson, steps }), { type: "answer", order: ["double", "triple", "single"] }).feedback?.text).toBe(
      "Fallback.",
    );
  });

  it("each wrong order can carry its own Hint", () => {
    expect(run(["single", "double", "triple"])).toMatchObject({
      tries: 1,
      feedback: { kind: "hint", text: "That is longest to shortest." },
      canContinue: false,
    });
  });

  it("an `above` Hint fits any order with one of its pairs the wrong way up; first fit wins", () => {
    const hints = [
      { above: [["single", "triple"], ["double", "triple"]] as [string, string][], text: "C≡C is shortest." },
      { above: [["single", "double"]] as [string, string][], text: "C=C before C–C." },
      { text: "Count shared pairs." },
    ];
    const above: PlayableLesson = { ...lesson, steps: [{ ...rank, hints }, wrapStep] };
    const once = (order: string[]) => act(above, start(above), { type: "answer", order });
    expect(once(["double", "triple", "single"]).feedback).toMatchObject({ text: "C≡C is shortest." });
    expect(once(["single", "double", "triple"]).feedback).toMatchObject({ text: "C≡C is shortest." });
    expect(once(["triple", "single", "double"]).feedback).toMatchObject({ text: "C=C before C–C." });
  });

  it("any other wrong order gets the generic fallback", () => {
    expect(run(["double", "triple", "single"])).toMatchObject({
      feedback: { kind: "hint", text: "More bonds between two atoms make the bond shorter." },
    });
  });

  it("wrong then right shows the Correct line", () => {
    expect(run(["single", "double", "triple"], right)).toMatchObject({
      tries: 2,
      feedback: { kind: "correct" },
      canContinue: true,
    });
  });

  it("wrong twice shows the reveal with the order", () => {
    expect(run(["single", "double", "triple"], ["double", "triple", "single"])).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "C≡C < C=C < C–C.", answer: right },
      canContinue: true,
    });
  });
});

describe("Manipulate a Scene Steps", () => {
  const manipulate: ManipulateStep = {
    id: "s01",
    phase: "build",
    type: "manipulate",
    prompt: "Twist until the overlap is gone, then press Check.",
    scene: { id: "pi-twist", state: { twist: 0 }, cited: {} },
    control: "twist",
    answer: 90,
    correct: "At 90° the p orbitals are at right angles.",
    hints: [
      { match: [0], text: "That's flat: full overlap." },
      { match: [15, 30, 45, 60, 75], text: "Keep twisting." },
      { text: "Watch the overlap bar." },
    ],
    reveal: "90°: no side-on overlap.",
  };
  const manLesson: PlayableLesson = { ...lesson, steps: [manipulate, wrapStep] };
  const run = (...settings: (number | string)[]) =>
    settings.reduce((s, setting) => act(manLesson, s, { type: "answer", setting }), start(manLesson));

  it("Check on the answer value shows the Correct line", () => {
    expect(run(90)).toMatchObject({
      tries: 1,
      feedback: { kind: "correct", text: "At 90° the p orbitals are at right angles." },
      canContinue: true,
    });
  });

  it("a wrong value gets the first Hint whose list holds it, else the fallback", () => {
    expect(run(0)).toMatchObject({ feedback: { kind: "hint", text: "That's flat: full overlap." }, canContinue: false });
    expect(run(45)).toMatchObject({ feedback: { kind: "hint", text: "Keep twisting." } });
    expect(run(135)).toMatchObject({ feedback: { kind: "hint", text: "Watch the overlap bar." } });
  });

  it("wrong twice reveals the answer value", () => {
    expect(run(45, 135)).toMatchObject({
      tries: 2,
      feedback: { kind: "reveal", text: "90°: no side-on overlap.", answer: 90 },
      canContinue: true,
    });
  });

  it("choice states compare by option id, and other answer shapes are ignored", () => {
    const choiceLesson: PlayableLesson = {
      ...lesson,
      steps: [{ ...manipulate, control: "view", answer: "end", hints: [{ text: "Look end-on." }] }, wrapStep],
    };
    const screen = start(choiceLesson);
    expect(act(choiceLesson, screen, { type: "answer", setting: "end" })).toMatchObject({ feedback: { kind: "correct" } });
    expect(act(choiceLesson, screen, { type: "answer", setting: "side" })).toMatchObject({
      feedback: { kind: "hint", text: "Look end-on." },
    });
    expect(act(choiceLesson, screen, { type: "answer", value: 90 })).toEqual(screen);
  });
});

describe("Rotate-and-identify 3D Steps", () => {
  // Graded exactly like Multiple choice: the exact set of option ids, Hints first to last, two tries.
  const { prediction: _p, ...mc } = choice("s01");
  const rotate: RotateAndIdentifyStep = {
    ...mc,
    type: "rotate-and-identify",
    molecule: {
      id: "water",
      title: "Water",
      tier: "experimental",
      cited: [],
      card: true,
      atoms: [],
      bonds: [],
      orientation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      elements: {},
    },
  };
  const rotLesson: PlayableLesson = { ...lesson, steps: [rotate, wrapStep] };
  const run = (...choices: string[][]) =>
    choices.reduce((s, choice) => act(rotLesson, s, { type: "answer", choice }), start(rotLesson));

  it("the right choice shows the Correct line", () => {
    expect(run(["a"])).toMatchObject({ tries: 1, feedback: { kind: "correct", text: "Right, because." }, canContinue: true });
  });

  it("a wrong choice gets its Hint, then the reveal", () => {
    expect(run(["b"])).toMatchObject({ feedback: { kind: "hint", text: "Hint for b." }, canContinue: false });
    expect(run(["c"])).toMatchObject({ feedback: { kind: "hint", text: "Generic hint." } });
    expect(run(["b"], ["c"])).toMatchObject({ feedback: { kind: "reveal", text: "It is a, because.", answer: ["a"] } });
  });

  it("ignores answers of another shape", () => {
    const screen = start(rotLesson);
    expect(act(rotLesson, screen, { type: "answer", value: 1 })).toEqual(screen);
  });
});

describe("goal-state Manipulate Steps (#78)", () => {
  const build: GoalStep = {
    id: "s01",
    phase: "build",
    type: "manipulate-goal",
    prompt: "Give carbon a full shell.",
    scene: { id: "build-by-sharing", state: { stage: "1", bonded: 0, joined: "no" }, cited: {} },
    idleSeconds: 30,
    stages: [
      { prompt: "Give carbon a full shell.", goal: { bonded: 4 }, correct: "CH₄, methane.", blocked: "Count the dots.", idle: "Drop each H on a dot." },
      { prompt: "Join these two pieces.", start: { stage: "2" }, goal: { joined: "yes" }, correct: "C₂H₆, ethane.", blocked: "Join the pieces first.", idle: "Drag one CH₃ on." },
    ],
  };
  const goalLesson: PlayableLesson = { ...lesson, steps: [build, wrapStep] };
  const move = (state: Record<string, number | string>): Action => ({ type: "answer", state });
  const run = (...actions: Action[]) => actions.reduce((s, a) => act(goalLesson, s, a), start(goalLesson));

  it("opens on stage 1 with the Scene's state, locked until the last goal", () => {
    expect(start(goalLesson)).toMatchObject({
      canContinue: false,
      feedback: null,
      goal: { stage: 0, state: { stage: "1", bonded: 0, joined: "no" }, idle: 0, prompt: "Give carbon a full shell." },
    });
  });

  it("a move that doesn't reach the goal just updates the state", () => {
    expect(run(move({ bonded: 1 }))).toMatchObject({ canContinue: false, feedback: null, goal: { stage: 0, state: { bonded: 1 } } });
  });

  it("reaching a stage's goal shows its Correct line and opens the next stage from its start", () => {
    const screen = run(move({ bonded: 1 }), move({ bonded: 2 }), move({ bonded: 3 }), move({ bonded: 4 }));
    expect(screen).toMatchObject({
      canContinue: false,
      feedback: { kind: "correct", text: "CH₄, methane." },
      goal: { stage: 1, state: { stage: "2", bonded: 4 }, prompt: "Join these two pieces." },
    });
  });

  it("the last goal opens Continue with its Correct line", () => {
    const screen = run(move({ bonded: 4 }), move({ joined: "yes" }));
    expect(screen).toMatchObject({ canContinue: true, feedback: { kind: "correct", text: "C₂H₆, ethane." } });
    expect(act(goalLesson, screen, { type: "continue" }).step.id).toBe("s09");
  });

  it("Continue before the stage is done shows that stage's Hint and stays", () => {
    expect(run({ type: "continue" })).toMatchObject({ index: 0, feedback: { kind: "hint", text: "Count the dots." } });
    expect(run(move({ bonded: 4 }), { type: "continue" })).toMatchObject({
      index: 0,
      feedback: { kind: "hint", text: "Join the pieces first." },
    });
  });

  it("idle shows the stage's idle Hint; a second idle also asks for the nudge; a move resets it", () => {
    expect(run({ type: "idle" })).toMatchObject({ feedback: { kind: "hint", text: "Drop each H on a dot." }, goal: { idle: 1 } });
    expect(run({ type: "idle" }, { type: "idle" })).toMatchObject({ goal: { idle: 2 } });
    expect(run({ type: "idle" }, { type: "idle" }, move({ bonded: 1 }))).toMatchObject({ goal: { idle: 0 }, feedback: null });
  });

  it("moves are saved and replayed on resume; Hints and idles are not", () => {
    const screen = run(move({ bonded: 4 }), { type: "idle" }, move({ joined: "yes" }));
    expect(screen.progress.answers.s01).toEqual([{ state: { bonded: 4 } }, { state: { joined: "yes" } }]);
    expect(start(goalLesson, "s01", screen.progress)).toMatchObject({ canContinue: true, goal: { stage: 1 } });
  });

  it("ignores answers of other shapes", () => {
    const screen = start(goalLesson);
    expect(act(goalLesson, screen, { type: "answer", choice: ["a"] })).toEqual(screen);
  });
});
