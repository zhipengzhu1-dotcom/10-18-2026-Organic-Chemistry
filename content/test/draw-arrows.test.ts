// Draw-arrows Steps and Problems in the content build: shape, resolution of
// start/results, the checks on starts, results and the authored pushes, and the
// tap-only cue rule for Tap Steps among Draw-arrows Steps.
import { describe, expect, it } from "vitest";
import { buildContent, type DrawArrowsStep, type Lesson } from "../src/index.ts";
import { lesson, problem, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

/** Formaldehyde, H₂C=O, full Lewis; atom ids are the map numbers (a1 = C, a2 = O). */
const formaldehyde = {
  id: "formaldehyde",
  style: "full",
  smiles: "[CH2:1]=[O:2]",
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

/** Its other contributor, H₂C⁺–O⁻, laid out on its own (bond ids need not match the start's). */
const polar = {
  ...formaldehyde,
  id: "formaldehyde-polar",
  smiles: "[CH2+:1]-[O-:2]",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0, charge: 1 },
    { id: "a2", el: "O", x: 1.5, y: 0, charge: -1, lp: 3 },
    { id: "a3", el: "H", x: -0.75, y: -1.3 },
    { id: "a4", el: "H", x: -0.75, y: 1.3 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a3", order: 1 },
    { id: "b2", a: "a1", b: "a4", order: 1 },
    { id: "b3", a: "a1", b: "a2", order: 1 },
  ],
};

const arrows = (extra: object = {}) => ({
  type: "draw-arrows",
  prompt: "Push the electrons to turn formaldehyde into its other contributor.",
  start: "formaldehyde",
  results: ["formaldehyde-polar"],
  answer: [{ from: "b1", to: "a2" }],
  correct: "The π pair is now a lone pair on O.",
  hints: [
    { from: ["b1"], to: ["a1"], text: "Electrons flow to the sink." },
    { from: ["sigma"], text: "σ bonds never move in resonance." },
    { text: "Which atom is the sink?" },
  ],
  reveal: "The C=O π pair moves onto O.",
  ...extra,
});

const arrowsStep = (extra: object = {}) => ({ id: "s06", phase: "build", ...arrows(extra) });

const tapStep = (extra: object = {}) => ({
  id: "s03",
  phase: "build",
  type: "tap-to-identify",
  prompt: "Tap the atom with lone pairs.",
  structure: "formaldehyde",
  tappable: { atoms: "all" },
  answer: ["a2"],
  correct: "Only O.",
  hints: [{ text: "Find the dots." }],
  reveal: "O.",
  ...extra,
});

/** A Problem file of another Step type: the meta fields of `problem()` with this interaction. */
function problemOf(id: string, interaction: object) {
  const { type: _t, prompt: _p, options: _o, answer: _a, correct: _c, hints: _h, reveal: _r, ...meta } = problem(id);
  return { ...meta, ...interaction };
}
const arrowsProblem = (id: string) => problemOf(id, arrows());
const tapProblem = (id: string) => {
  const { id: _id, phase: _phase, ...tap } = tapStep();
  return problemOf(id, tap);
};

function treeWith(steps: Record<number, object>, extra: (tree: Tree) => void = () => {}): Tree {
  const tree = validTree();
  tree["chem/structures/formaldehyde.yaml"] = formaldehyde;
  tree["chem/structures/formaldehyde-polar.yaml"] = polar;
  const all = sampleSteps() as object[];
  for (const [i, step] of Object.entries(steps)) all[Number(i)] = step;
  tree[L] = lesson({ steps: all });
  extra(tree);
  return tree;
}

const build = (tree: Tree) => buildContent(writeTree(tree));
const lessonOf = (tree: Tree): Lesson => build(tree).model!.subjects[0].courses[0].units[0].lessons[0];

describe("Draw-arrows Steps in the content build", () => {
  it("resolves the start, the target drawn beside it and the accepted results", () => {
    const tree = treeWith({ 5: arrowsStep() });
    expect(build(tree).errors).toEqual([]);
    const step = lessonOf(tree).steps[5] as DrawArrowsStep;
    expect(step.type).toBe("draw-arrows");
    expect(step.start.structure.id).toBe("formaldehyde");
    expect(step.target?.structure.id).toBe("formaldehyde-polar");
    expect(step.results.map((r) => r.id)).toEqual(["formaldehyde-polar"]);
    expect(step.answer).toEqual([{ from: "b1", to: "a2" }]);
  });

  it("hides the target when asked (open Problems, 'no target this time')", () => {
    const step = lessonOf(treeWith({ 5: arrowsStep({ hideTarget: true }) })).steps[5] as DrawArrowsStep;
    expect(step.target).toBeUndefined();
    expect(step.results).toHaveLength(1);
  });

  it("plays a Draw-arrows Problem as a Check Step", () => {
    const tree = treeWith({}, (t) => {
      t["chem/problems/p2.yaml"] = arrowsProblem("p2");
    });
    expect(build(tree).errors).toEqual([]);
    const step = lessonOf(tree).steps[8] as DrawArrowsStep;
    expect(step).toMatchObject({ type: "draw-arrows", problemId: "p2", phase: "check" });
    expect(step.start.structure.id).toBe("formaldehyde");
  });

  it("rejects an unknown structure", () => {
    expect(build(treeWith({ 5: arrowsStep({ results: ["nope"] }) })).errors).toEqual([
      `${L}: step s06: structure "nope" not found`,
    ]);
  });

  it("rejects a result that adds or moves an atom, or changes the total charge", () => {
    const errors = build(
      treeWith({ 5: arrowsStep() }, (t) => {
        t["chem/structures/formaldehyde-polar.yaml"] = {
          ...polar,
          atoms: polar.atoms.map((a) => (a.id === "a2" ? { ...a, el: "S" } : a)),
        };
      }),
    ).errors;
    expect(errors).toContain(`${L}: step s06: result "formaldehyde-polar" must have the start's atoms: a2 is O in the start, S here`);
  });

  it("rejects a result with an atom past its octet (a sextet, like H₂C⁺ here, is a real contributor)", () => {
    const errors = build(
      treeWith({ 5: arrowsStep() }, (t) => {
        t["chem/structures/formaldehyde-polar.yaml"] = {
          ...polar,
          atoms: polar.atoms.map((a) => (a.id === "a2" ? { ...a, lp: 4, charge: -3 } : a)),
        };
      }),
    ).errors;
    expect(errors).toContain(`${L}: step s06: result "formaldehyde-polar": O2 has 10 e⁻, past its octet`);
  });

  it("rejects a structure whose drawn charges don't match its lone pairs and bonds", () => {
    const errors = build(
      treeWith({ 5: arrowsStep() }, (t) => {
        t["chem/structures/formaldehyde.yaml"] = {
          ...formaldehyde,
          atoms: formaldehyde.atoms.map((a) => (a.id === "a2" ? { ...a, lp: 3 } : a)),
        };
      }),
    ).errors;
    expect(errors).toContain(`${L}: step s06: structure "formaldehyde": O2 is drawn with charge 0, but its lone pairs and bonds give −2`);
  });

  it("rejects authored pushes that don't reach an accepted result", () => {
    const errors = build(treeWith({ 5: arrowsStep({ answer: [{ from: "b1", to: "a1" }] }) })).errors;
    expect(errors).toEqual([`${L}: step s06: push 1 (π bond C1=O2 → C1) is not a step toward an accepted result`]);
    const short = build(treeWith({ 5: arrowsStep({ answer: [] }) })).errors;
    expect(short.some((e) => e.includes("answer"))).toBe(true);
  });

  it("rejects a Hint or push that names an atom or bond the start doesn't have", () => {
    const errors = build(
      treeWith({ 5: arrowsStep({ hints: [{ from: ["b9"], text: "No." }, { to: ["a7"], text: "No." }, { text: "Fallback." }] }) }),
    ).errors;
    expect(errors).toEqual([
      `${L}: step s06: a Hint names "b9", which the start structure doesn't have`,
      `${L}: step s06: a Hint names "a7", which the start structure doesn't have`,
    ]);
  });

  it("shares the fallback Hint and Correct line rules", () => {
    const errors = build(treeWith({ 5: arrowsStep({ hints: [{ from: ["b1"], text: "Only." }], correct: undefined }) })).errors;
    expect(errors).toEqual([
      `${L}: step s06: needs exactly one generic fallback Hint (no match), and it must come last`,
      `${L}: step s06: needs a Correct line`,
    ]);
  });
});

describe("The tap-only cue among Draw-arrows Steps", () => {
  it("a Tap Step in a Lesson with Draw-arrows Steps must say it is tap-only", () => {
    expect(build(treeWith({ 2: tapStep(), 5: arrowsStep() })).errors).toEqual([
      `${L}: step s03: a Tap Step in a Lesson with Draw-arrows Steps needs a tapOnly cue`,
    ]);
    const cue = { tapOnly: { idle: "Just tap, no pushing on this Step.", drag: "No pushing yet." } };
    expect(build(treeWith({ 2: tapStep(cue), 5: arrowsStep() })).errors).toEqual([]);
  });

  it("a Draw-arrows Check Problem counts, and Tap Problems of that Lesson need the cue too", () => {
    const errors = build(
      treeWith({}, (t) => {
        t["chem/problems/p1.yaml"] = tapProblem("p1");
        t["chem/problems/p2.yaml"] = arrowsProblem("p2");
      }),
    ).errors;
    expect(errors).toEqual([`chem/problems/p1.yaml: a Tap Problem of a Lesson with Draw-arrows Steps needs a tapOnly cue`]);
  });

  it("a Lesson without Draw-arrows Steps needs no cue", () => {
    expect(build(treeWith({ 2: tapStep() })).errors).toEqual([]);
  });
});
