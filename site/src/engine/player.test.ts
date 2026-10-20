import { describe, expect, it } from "vitest";
import type { GoalStep, MultipleChoiceStep } from "@astratron/content";
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

// Cross-type engine behaviour: how a Screen follows its Step type's `act`, navigation, Step links,
// resume and Wrap. Each type's own grading is tested through the table (content/test/step-type-rules.test.ts).
describe("Step player engine", () => {
  it("opens on the first Step", () => {
    const screen = start(lesson);
    expect(screen).toMatchObject({ index: 0, total: 5, tries: 0, feedback: null, canContinue: false, done: false });
    expect(screen.step.id).toBe("s01");
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

  it("wrong once shows the first matching Hint and allows another try", () => {
    expect(play(answer("c"), next, next, answer("b"))).toMatchObject({
      tries: 1,
      feedback: { kind: "hint", text: "Hint for b." },
      canContinue: false,
    });
  });

  it("wrong then right shows the Correct line", () => {
    expect(play(answer("c"), next, next, answer("b"), answer("a"))).toMatchObject({
      tries: 2,
      feedback: { kind: "correct", text: "Right, because." },
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

  it("a link past where the Student has got to opens that Step, ahead, without moving their place", () => {
    const linked = start(lesson, "s05");
    expect(linked).toMatchObject({ step: { id: "s05" }, ahead: true, done: false, progress: { step: "s01", done: false } });
  });

  it("reaching Wrap through a Step link does not mark the Lesson done (story 17)", () => {
    const explainToWrap = act(lesson, start(lesson, "s04"), answer("a"));
    const reachedWrap = act(lesson, explainToWrap, next);
    expect(reachedWrap).toMatchObject({ step: { id: "s05" }, ahead: true, done: false, progress: { done: false } });
  });

  it("answers given ahead are not saved, so nothing is unlocked for later", () => {
    const answered = act(lesson, start(lesson, "s03"), answer("a"));
    expect(answered).toMatchObject({ canContinue: true, feedback: { kind: "correct" } });
    expect(answered.progress.answers).toEqual({});
    expect(act(lesson, answered, next)).toMatchObject({ step: { id: "s04" }, ahead: true });
  });

  it("a link back to a Step already reached opens it normally", () => {
    const left = play(answer("c"), next, next, answer("a"), next);
    const linked = start(lesson, "s02", left.progress);
    expect(linked).toMatchObject({ step: { id: "s02" }, ahead: false, progress: { step: "s02", reached: "s04" } });
    expect(act(lesson, act(lesson, linked, next), next)).toMatchObject({ step: { id: "s04" }, ahead: false });
  });

  it("a link to a Step of a Lesson already done opens it normally", () => {
    const linked = start(lesson, "s05", { step: "s02", answers: {}, done: true });
    expect(linked).toMatchObject({ ahead: false, done: true });
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
      reached: "s03",
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

describe("goal-state Manipulate Steps (#78) on the Screen", () => {
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

  it("other Step types ignore idleness", () => {
    const screen = start(lesson, "s03");
    expect(act(lesson, screen, { type: "idle" })).toEqual(screen);
  });

  it("moves are saved and replayed on resume; Hints and idles are not", () => {
    const screen = run(move({ bonded: 4 }), { type: "idle" }, move({ joined: "yes" }));
    expect(screen.progress.answers.s01).toEqual([{ state: { bonded: 4 } }, { state: { joined: "yes" } }]);
    expect(start(goalLesson, "s01", screen.progress)).toMatchObject({ canContinue: true, goal: { stage: 1 } });
  });
});
