// Scenes in Steps and the Manipulate a Scene Step type (#64). The content build
// checks every Scene a Step uses against the Scene catalog (ids, settable
// states, cited data) that the scenes module hands it.
import { describe, expect, it } from "vitest";
import { buildContent, type SceneCatalog } from "../src/index.ts";
import { elements, lesson, sampleSteps, validTree, writeTree } from "./tree.ts";

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

  it("a Scene can change state once the Step is answered (a Hook's reveal) or open on its poster (a Wrap's final frame)", () => {
    const hook = {
      type: "multiple-choice",
      prompt: "Guess.",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      answer: ["a"],
      correct: "A.",
      hints: [{ text: "Not B." }],
      reveal: "Here it is.",
      scene: { id: "twist", state: { view: "end" }, onAnswer: { twist: 90 } },
    };
    const result = build(hook, { type: "explain", text: "Watch.", scene: { id: "twist", still: true } });
    expect(result.errors).toEqual([]);
    const [, explain, mc] = stepsOf(result);
    expect(explain.scene).toMatchObject({ id: "twist", still: true });
    expect(mc.scene).toMatchObject({ state: { twist: 0, view: "end" }, onAnswer: { twist: 90 } });
  });

  it("checks the onAnswer states like any other", () => {
    const explain = { type: "explain", text: "x", scene: { id: "twist", onAnswer: { twist: 200 } } };
    expect(build(manipulate(), explain).errors).toEqual([
      `${L}: step s02: Scene "twist" state "twist" must be a number from 0 to 180 in steps of 15`,
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
