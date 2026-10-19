// Numeric input and Rank / order Steps and Problems (#63).
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { lesson, problem, sampleSteps, validTree, writeTree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const numeric = (extra: object = {}) => ({
  type: "numeric",
  prompt: "What is the H–C–H angle in methane?",
  unitSymbol: "°",
  answer: 109.5,
  tolerance: 0.5,
  correct: "Tetrahedral.",
  hints: [{ match: 120, text: "That is trigonal planar." }, { text: "Think in 3D." }],
  reveal: "109.5°.",
  ...extra,
});

const rank = (extra: object = {}) => ({
  type: "rank",
  prompt: "Shortest bond first.",
  items: [
    { id: "single", text: "C–C" },
    { id: "double", text: "C=C" },
    { id: "triple", text: "C≡C" },
  ],
  answer: ["triple", "double", "single"],
  correct: "More pairs, shorter bond.",
  hints: [{ match: ["single", "double", "triple"], text: "Backwards." }, { text: "Count shared pairs." }],
  reveal: "C≡C < C=C < C–C.",
  ...extra,
});

/** The sample Lesson with s03 swapped for a Numeric Step and s06 for a Rank Step. */
function treeWith(s03: object, s06: object) {
  const steps: object[] = sampleSteps();
  steps[2] = { id: "s03", phase: "build", ...s03 };
  steps[5] = { id: "s06", phase: "build", ...s06 };
  const tree = validTree();
  tree[L] = lesson({ steps });
  return tree;
}
const build = (s03: object, s06: object) => buildContent(writeTree(treeWith(s03, s06)));

describe("Numeric input and Rank / order Steps", () => {
  it("build into the model with their unit, tolerance and order", () => {
    const { model, errors } = build(numeric(), rank());
    expect(errors).toEqual([]);
    const steps = model!.subjects[0].courses[0].units[0].lessons[0].steps;
    expect(steps[2]).toEqual({ id: "s03", phase: "build", ...numeric() });
    expect(steps[5]).toEqual({ id: "s06", phase: "build", ...rank() });
  });

  it("a Check Step plays a Numeric or Rank Problem", () => {
    const tree = validTree();
    tree["chem/problems/p1.yaml"] = { ...problem("p1"), ...numeric(), options: undefined };
    tree["chem/problems/p2.yaml"] = { ...problem("p2"), ...rank(), options: undefined };
    const { model, errors } = buildContent(writeTree(tree));
    expect(errors).toEqual([]);
    const steps = model!.subjects[0].courses[0].units[0].lessons[0].steps;
    expect(steps[7]).toEqual({ id: "s08", phase: "check", problemId: "p1", ...numeric() });
    expect(steps[8]).toEqual({ id: "s09", phase: "check", problemId: "p2", ...rank() });
  });

  it("the unit is fixed by the file and the tolerance can't be negative", () => {
    expect(build(numeric({ unitSymbol: undefined, tolerance: -1 }), rank()).errors).toEqual([
      `${L}: steps.2.unitSymbol: Invalid input: expected string, received undefined`,
      `${L}: steps.2.tolerance: Too small: expected number to be >=0`,
    ]);
  });

  it("a Numeric Hint can't match a value that would be marked right", () => {
    const hints = [{ match: 109.8, text: "Close." }, { text: "Think in 3D." }];
    expect(build(numeric({ hints }), rank()).errors).toEqual([
      `${L}: step s03: a Hint matches 109.8, which is within the tolerance of the answer`,
    ]);
  });

  it("Numeric and Rank Steps need a fallback Hint and a Correct line", () => {
    expect(build(numeric({ hints: [], correct: undefined }), rank({ hints: [{ text: "x" }, { text: "y" }] })).errors).toEqual([
      `${L}: step s03: needs exactly one generic fallback Hint (no match), and it must come last`,
      `${L}: step s03: needs a Correct line`,
      `${L}: step s06: needs exactly one generic fallback Hint (no match), and it must come last`,
    ]);
  });

  it("a Rank answer and its Hints are each one whole order of the items", () => {
    const hints = [{ match: ["single", "triple"], text: "Short." }, { text: "Count shared pairs." }];
    expect(build(numeric(), rank({ answer: ["triple", "double", "double"], hints })).errors).toEqual([
      `${L}: step s06: answer must list every item exactly once`,
      `${L}: step s06: a Hint's match must list every item exactly once`,
    ]);
  });

  it("a Rank Hint can match any order with one card above another (Lesson 7: “`b` or `c` above `a`”)", () => {
    const hints = [
      { above: [["single", "triple"], ["double", "triple"]], text: "C≡C is shortest." },
      { above: [["single", "double"]], text: "C=C before C–C." },
      { text: "Count shared pairs." },
    ];
    const { model, errors } = build(numeric(), rank({ hints }));
    expect(errors).toEqual([]);
    expect(model!.subjects[0].courses[0].units[0].lessons[0].steps[5]).toMatchObject({ hints });
  });

  it("a Rank Hint's pairs name items, and can't hold in the right order", () => {
    const hints = [
      { above: [["single", "quadruple"]], text: "No such card." },
      { above: [["triple", "single"]], text: "That's the right way round." },
      { text: "Count shared pairs." },
    ];
    expect(build(numeric(), rank({ hints })).errors).toEqual([
      `${L}: step s06: a Hint names unknown item "quadruple"`,
      `${L}: step s06: a Hint's "above" pair triple above single holds in the answer order`,
    ]);
  });

  it("a Rank Step can tag each card with why it sits there, shown once answered (Lesson 7 s09)", () => {
    const revealTags = { triple: "three pairs", double: "two pairs", single: "one pair" };
    const { model, errors } = build(numeric(), rank({ revealTags }));
    expect(errors).toEqual([]);
    expect(model!.subjects[0].courses[0].units[0].lessons[0].steps[5]).toMatchObject({ revealTags });
    expect(build(numeric(), rank({ revealTags: { quadruple: "four" } })).errors).toEqual([
      `${L}: step s06: a reveal tag names unknown item "quadruple"`,
    ]);
  });

  it("a Rank Step can't start in the right order", () => {
    const items = [
      { id: "triple", text: "C≡C" },
      { id: "double", text: "C=C" },
      { id: "single", text: "C–C" },
    ];
    expect(build(numeric(), rank({ items })).errors).toEqual([
      `${L}: step s06: the items start in the answer order; list them in a different order`,
    ]);
  });
});
