// Scenes in Steps and the Manipulate a Scene Step type (#64). The content build
// checks every Scene a Step uses against the Scene catalog (ids, settable
// states, cited data) that the scenes module hands it.
import { describe, expect, it } from "vitest";
import { buildContent, type SceneCatalog } from "../src/index.ts";
import { elements, lesson, problem, sampleSteps, validTree, writeTree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const catalog: SceneCatalog = {
  twist: {
    states: {
      twist: { kind: "range", label: "Twist", min: 0, max: 180, step: 15, default: 0, unitSymbol: "°" },
      view: {
        kind: "choice",
        label: "View",
        options: [
          { id: "side", label: "Side" },
          { id: "end", label: "End-on" },
        ],
        default: "side",
      },
    },
    data: ["elements/C.colour"],
  },
};

const manipulate = (extra: object = {}) => ({
  type: "manipulate",
  prompt: "Twist until the overlap is gone, then press Check.",
  scene: { id: "twist" },
  control: "twist",
  answer: 90,
  correct: "At 90° the p orbitals are at right angles.",
  hints: [
    { match: [0], text: "That's flat: full overlap." },
    { match: [15, 30, 45, 60, 75], text: "Keep twisting." },
    { text: "Watch the overlap bar." },
  ],
  reveal: "90°: no side-on overlap.",
  ...extra,
});

/** The sample Lesson with s02 an Explain Step showing a Scene and s03 a Manipulate Step. */
function build(s03: object, s02: object = { type: "explain", text: "Watch.", scene: { id: "twist" } }, scenes = catalog) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", ...s02 };
  steps[2] = { id: "s03", phase: "build", ...s03 };
  const tree = validTree();
  tree[L] = lesson({ steps });
  tree["chem/data/elements.yaml"] = elements();
  return buildContent(writeTree(tree), { scenes });
}
const stepsOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;

describe("Scenes in Steps", () => {
  it("a Step's Scene arrives with every settable state filled and its cited data", () => {
    const result = build(manipulate({ scene: { id: "twist", state: { view: "end" } } }));
    expect(result.errors).toEqual([]);
    const [, explain, manip] = stepsOf(result);
    expect(explain.scene).toMatchObject({ id: "twist", state: { twist: 0, view: "side" } });
    expect(manip.scene?.state).toEqual({ twist: 0, view: "end" });
    expect(Object.keys(manip.scene!.cited)).toEqual(["elements/C.colour"]);
    expect(manip.scene!.cited["elements/C.colour"].value).toBe("#909090");
    // The Scene's numbers join the Step's Source note.
    expect(manip.citations?.map((c) => c.ref)).toEqual(["elements/C.colour"]);
  });

  it("the Scene shorthand `scene: <id>` uses the default state", () => {
    const result = build(manipulate(), { type: "explain", text: "Watch.", scene: "twist" });
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[1].scene?.state).toEqual({ twist: 0, view: "side" });
  });

  it("rejects a Scene that isn't registered, an unknown state and a value out of range", () => {
    expect(
      build(manipulate({ scene: { id: "twist", state: { spin: 1, twist: 200, view: "top" } } }), {
        type: "explain",
        text: "Watch.",
        scene: "nope",
      }).errors,
    ).toEqual([
      `${L}: step s02: Scene "nope" is not in the Scene registry`,
      `${L}: step s03: Scene "twist" has no settable state "spin"`,
      `${L}: step s03: Scene "twist" state "twist" must be a number from 0 to 180 in steps of 15`,
      `${L}: step s03: Scene "twist" state "view" must be one of side, end`,
    ]);
  });

  it("rejects a Scene whose manifest cites data the Subject doesn't have", () => {
    const scenes = { twist: { ...catalog.twist, data: ["elements/Xx.colour"] } };
    expect(build(manipulate(), undefined, scenes).errors).toEqual([
      `${L}: step s02: Scene "twist" cites "elements/Xx.colour", which is not in the cited data`,
      `${L}: step s03: Scene "twist" cites "elements/Xx.colour", which is not in the cited data`,
    ]);
  });
});

describe("Manipulate a Scene Steps", () => {
  it("build with the control, answer and Hints", () => {
    const result = build(manipulate());
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2]).toMatchObject({ type: "manipulate", control: "twist", answer: 90 });
  });

  it("need a Scene, a control and an answer", () => {
    expect(build(manipulate({ scene: undefined, control: undefined, answer: undefined })).errors).toEqual([
      `${L}: steps.2.scene: Invalid input: expected object, received undefined`,
      `${L}: steps.2.control: Invalid input: expected string, received undefined`,
      `${L}: steps.2.answer: Invalid input`,
    ]);
  });

  it("the control is one of the Scene's settable states, and answer and Hints are values it can take", () => {
    expect(build(manipulate({ control: "spin" })).errors).toEqual([
      `${L}: step s03: control "spin" is not a settable state of Scene "twist"`,
    ]);
    const hints = [{ match: [7], text: "Off grid." }, { text: "Watch the bar." }];
    expect(build(manipulate({ answer: 95, hints })).errors).toEqual([
      `${L}: step s03: answer: Scene "twist" state "twist" must be a number from 0 to 180 in steps of 15`,
      `${L}: step s03: a Hint matches: Scene "twist" state "twist" must be a number from 0 to 180 in steps of 15`,
    ]);
  });

  it("a Hint can't match the answer, and the control can't start on it", () => {
    const hints = [{ match: [90], text: "Hm." }, { text: "Watch the bar." }];
    expect(build(manipulate({ hints, scene: { id: "twist", state: { twist: 90 } } })).errors).toEqual([
      `${L}: step s03: a Hint matches the answer 90`,
      `${L}: step s03: the control starts on the answer; start it somewhere else`,
    ]);
  });

  it("need a fallback Hint and a Correct line, like every graded Step", () => {
    expect(build(manipulate({ hints: [{ match: [0], text: "Flat." }], correct: undefined })).errors).toEqual([
      `${L}: step s03: needs exactly one generic fallback Hint (no match), and it must come last`,
      `${L}: step s03: needs a Correct line`,
    ]);
  });
});

describe("goal-state Manipulate Steps (#78)", () => {
  const goal = (extra: object = {}) => ({
    type: "manipulate-goal",
    scene: { id: "twist" },
    idleSeconds: 30,
    stages: [
      {
        prompt: "Twist it a quarter turn.",
        goal: { twist: 90 },
        correct: "A quarter turn.",
        blocked: "Twist it first.",
        idle: "Drag the end round.",
      },
      {
        prompt: "Now look end-on.",
        start: { twist: 0 },
        goal: { view: "end" },
        correct: "End-on.",
        blocked: "Turn the view first.",
        idle: "Pick the end-on view.",
      },
    ],
    ...extra,
  });

  it("build with their stages; the Step's prompt is the first stage's", () => {
    const result = build(goal());
    expect(result.errors).toEqual([]);
    expect(stepsOf(result)[2]).toMatchObject({
      type: "manipulate-goal",
      prompt: "Twist it a quarter turn.",
      scene: { id: "twist", state: { twist: 0, view: "side" } },
      idleSeconds: 30,
      stages: [{ goal: { twist: 90 } }, { start: { twist: 0 }, goal: { view: "end" } }],
    });
  });

  it("each stage's goal and start are states the Scene can take, and no stage opens already done", () => {
    const stages = [
      { prompt: "a", goal: { spin: 1, twist: 95 }, correct: "c", blocked: "b", idle: "i" },
      { prompt: "b", start: { view: "end" }, goal: { view: "end" }, correct: "c", blocked: "b", idle: "i" },
    ];
    expect(build(goal({ stages })).errors).toEqual([
      `${L}: step s03: stage 1 goal: Scene "twist" has no settable state "spin"`,
      `${L}: step s03: stage 1 goal: Scene "twist" state "twist" must be a number from 0 to 180 in steps of 15`,
      `${L}: step s03: stage 2 opens with its goal already reached`,
    ]);
  });

  it("need a Scene and at least one stage", () => {
    expect(build(goal({ scene: undefined, stages: [] })).errors).toEqual([
      `${L}: steps.2.scene: Invalid input: expected object, received undefined`,
      `${L}: steps.2.stages: Too small: expected array to have >=1 items`,
    ]);
  });
});

describe("Scenes on reveal and in Problems (#78)", () => {
  /** The sample Lesson with its s03 Multiple choice Step and Check Problem p1 edited. */
  function buildWith(s03: object, p1: object = {}, scenes = catalog) {
    const steps: object[] = sampleSteps();
    steps[2] = { ...(steps[2] as object), ...s03 };
    const tree = validTree();
    tree[L] = lesson({ steps });
    tree["chem/problems/p1.yaml"] = problem("p1", p1);
    tree["chem/data/elements.yaml"] = elements();
    return buildContent(writeTree(tree), { scenes });
  }

  it("a graded Step may name a Scene shown once it is answered, resolved like its own Scene", () => {
    const result = buildWith({ scene: "twist", revealScene: { id: "twist", state: { view: "end" } } });
    expect(result.errors).toEqual([]);
    const s03 = stepsOf(result)[2];
    expect(s03.scene?.state).toEqual({ twist: 0, view: "side" });
    expect(s03).toMatchObject({ revealScene: { id: "twist", state: { twist: 0, view: "end" } } });
    expect(Object.keys((s03 as unknown as { revealScene: { cited: object } }).revealScene.cited)).toEqual(["elements/C.colour"]);
  });

  it("a Problem may show a Scene and a reveal Scene; its Check Step gets them resolved", () => {
    const result = buildWith({}, { scene: { id: "twist", state: { twist: 30 } }, revealScene: "twist" });
    expect(result.errors).toEqual([]);
    const check = stepsOf(result)[7];
    expect(check).toMatchObject({
      problemId: "p1",
      scene: { id: "twist", state: { twist: 30, view: "side" } },
      revealScene: { id: "twist", state: { twist: 0, view: "side" } },
    });
    expect(check.citations?.map((c) => c.ref)).toEqual(["elements/C.colour"]);
  });

  it("checks reveal Scenes and Problem Scenes against the registry", () => {
    expect(buildWith({ revealScene: "nope" }, { scene: { id: "twist", state: { spin: 1 } } }).errors).toEqual([
      `${L}: step s03: Scene "nope" is not in the Scene registry`,
      `chem/problems/p1.yaml: Scene "twist" has no settable state "spin"`,
    ]);
  });
});
