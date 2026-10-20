import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { lesson, sampleSteps, validTree, writeTree } from "./tree.ts";

type Steps = ReturnType<typeof sampleSteps>;
const L = "chem/lessons/l1.yaml";

function errorsForLesson(extra: object): string[] {
  const tree = validTree();
  tree[L] = lesson(extra);
  return buildContent(writeTree(tree)).errors;
}

const explain = (id: string) => ({ id, phase: "build", type: "explain", text: id });

/** Inserts Build Explain Steps before the Check phase, numbering on from s20. */
function withExtraBuild(count: number): Steps {
  const steps = sampleSteps();
  const extra = Array.from({ length: count }, (_, i) =>
    i % 2 ? explain(`s${20 + i}`) : { ...steps[2], id: `s${20 + i}` },
  );
  steps.splice(7, 0, ...(extra as Steps));
  return steps;
}

describe("Lesson shape rules", () => {
  it("accepts 10–20 Steps for a core Lesson", () => {
    expect(errorsForLesson({ steps: withExtraBuild(10) })).toEqual([]);
  });

  it("rejects a core Lesson under 10 Steps", () => {
    const steps = sampleSteps();
    steps.splice(3, 1);
    expect(errorsForLesson({ steps })).toEqual([`${L}: has 9 Steps; a Lesson needs 10–15 (hard cap 20)`]);
  });

  it("rejects a Lesson over the hard cap of 20 Steps", () => {
    expect(errorsForLesson({ steps: withExtraBuild(11) })).toEqual([
      `${L}: has 21 Steps; a Lesson needs 10–15 (hard cap 20)`,
    ]);
  });

  it("holds an On-ramp to 6–10 Steps", () => {
    expect(errorsForLesson({ onRamp: true })).toEqual([]);
    expect(errorsForLesson({ onRamp: true, steps: withExtraBuild(1) })).toEqual([
      `${L}: has 11 Steps; an On-ramp needs 6–10`,
    ]);
  });

  it("rejects three Explain Steps in a row", () => {
    const steps = sampleSteps();
    steps[5] = explain("s06") as Steps[number];
    expect(errorsForLesson({ steps })).toEqual([
      `${L}: steps s04, s05, s06, s07 are 4 Explain Steps in a row; the most is 2`,
    ]);
  });

  it("requires Hook → Build → Check → Wrap, one Hook and one Wrap", () => {
    const steps = sampleSteps();
    steps[1].phase = "hook";
    expect(errorsForLesson({ steps })).toEqual([
      `${L}: phases must run Hook (1 Step) → Build → Check (2–4 Problems) → Wrap (1 Step); found hook, hook, build, build, build, build, build, check, check, wrap`,
    ]);
  });

  it("requires 2–4 Check Problems", () => {
    const steps = sampleSteps();
    steps.splice(8, 1);
    steps.splice(2, 0, explain("s11") as Steps[number]);
    expect(errorsForLesson({ steps })).toEqual([
      `${L}: phases must run Hook (1 Step) → Build → Check (2–4 Problems) → Wrap (1 Step); found hook, build, build, build, build, build, build, build, check, wrap`,
    ]);
  });

  it("allows `prediction` only in the Hook", () => {
    const steps = sampleSteps();
    Object.assign(steps[2], { prediction: true });
    expect(errorsForLesson({ steps })).toEqual([`${L}: step s03: prediction is allowed only in the Hook`]);
  });
});

describe("interactive Step rules", () => {
  it("rejects an answer that names no option", () => {
    const steps = sampleSteps();
    Object.assign(steps[2], { answer: ["z"] });
    expect(errorsForLesson({ steps })).toEqual([`${L}: step s03: answer names unknown option "z"`]);
  });

  it("requires a generic fallback Hint, last", () => {
    const steps = sampleSteps();
    Object.assign(steps[2], { hints: [{ match: ["b"], text: "Hint for b." }] });
    expect(errorsForLesson({ steps })).toEqual([
      `${L}: step s03: needs exactly one generic fallback Hint (no match), and it must come last`,
    ]);
  });

  it("grades through the Step type's own act: a Hint no pick can reach is an error", () => {
    const steps = sampleSteps();
    // One right option, so the Student picks one: no single pick is the set [b, c].
    Object.assign(steps[2], { hints: [{ match: ["b", "c"], text: "Both slips." }, { includes: ["b"], text: "Hint for b." }, { text: "Generic hint." }] });
    expect(errorsForLesson({ steps })).toEqual([
      `${L}: step s03: Hint 1 never shows: every answer it matches is right or meets an earlier Hint first`,
    ]);
    // With two right options any set can be picked, so it shows.
    Object.assign(steps[2], { answer: ["a", "c"] });
    expect(errorsForLesson({ steps })).toEqual([]);
  });

  it("requires a Correct line on a graded Step", () => {
    const steps = sampleSteps();
    Object.assign(steps[2], { correct: undefined });
    expect(errorsForLesson({ steps })).toEqual([`${L}: step s03: needs a Correct line`]);
  });

  it("checks Problems by the same rules", () => {
    const tree = validTree();
    Object.assign(tree["chem/problems/p1.yaml"] as object, { hints: [] });
    expect(buildContent(writeTree(tree)).errors).toEqual([
      "chem/problems/p1.yaml: needs exactly one generic fallback Hint (no match), and it must come last",
    ]);
  });
});
