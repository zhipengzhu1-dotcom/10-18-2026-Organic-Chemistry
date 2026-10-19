import { describe, expect, it } from "vitest";
import { buildContent, type Lesson } from "../src/index.ts";
import { lesson, problem, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

/** Formaldehyde, H₂C=O, full Lewis (as the layout tool writes it). */
const formaldehyde = {
  id: "formaldehyde",
  style: "full",
  smiles: "C=O",
  source: "PubChem CID 712",
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

const methoxide = {
  id: "methoxide",
  style: "line-angle",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "O", x: 1.5, y: 0, charge: -1, lp: 3 },
  ],
  bonds: [{ id: "b1", a: "a1", b: "a2", order: 1 }],
};

const cardStep = (extra: object = {}) => ({
  id: "s03",
  phase: "build",
  type: "multiple-choice",
  prompt: "Pick formaldehyde.",
  options: [
    { id: "a", text: "Formaldehyde: carbon double-bonded to oxygen.", structure: "formaldehyde" },
    { id: "b", text: "Methoxide: CH₃ bonded to O⁻.", structure: "methoxide" },
  ],
  answer: ["a"],
  correct: "C=O.",
  hints: [{ text: "Look for the double bond." }],
  reveal: "Formaldehyde has the C=O.",
  ...extra,
});

const tapStep = (extra: object = {}) => ({
  id: "s06",
  phase: "build",
  type: "tap-to-identify",
  prompt: "Tap every atom with a lone pair.",
  structure: "formaldehyde",
  tappable: { atoms: "all", bonds: ["b1"] },
  answer: ["a2"],
  correct: "Only O has lone pairs.",
  hints: [
    { includes: ["a3", "a4"], text: "Each H has one bond and no lone pairs." },
    { misses: ["a2"], text: "Look at the oxygen." },
    { text: "Find the dots." },
  ],
  reveal: "The O carries two lone pairs.",
  ...extra,
});

function treeWith(steps: Record<number, object>, extra: (tree: Tree) => void = () => {}): Tree {
  const tree = validTree();
  tree["chem/structures/formaldehyde.yaml"] = formaldehyde;
  tree["chem/structures/methoxide.yaml"] = methoxide;
  const all = sampleSteps() as object[];
  for (const [i, step] of Object.entries(steps)) all[Number(i)] = step;
  tree[L] = lesson({ steps: all });
  extra(tree);
  return tree;
}

function build(tree: Tree): { lesson?: Lesson; errors: string[] } {
  const { model, errors } = buildContent(writeTree(tree));
  return { lesson: model?.subjects[0].courses[0].units[0].lessons[0], errors };
}

describe("structure cards in Multiple choice", () => {
  it("resolves each card to its structure, with the text as its screen-reader label", () => {
    const { lesson, errors } = build(treeWith({ 2: cardStep() }));
    expect(errors).toEqual([]);
    const step = lesson!.steps[2];
    expect(step.type).toBe("multiple-choice");
    if (step.type !== "multiple-choice") return;
    expect(step.options[0]).toMatchObject({
      id: "a",
      text: "Formaldehyde: carbon double-bonded to oxygen.",
      structure: { hide: [], structure: { id: "formaldehyde", style: "full" } },
    });
  });

  it("accepts several correct cards", () => {
    expect(build(treeWith({ 2: cardStep({ answer: ["a", "b"] }) })).errors).toEqual([]);
  });

  it("rejects a card whose structure has no file", () => {
    const step = cardStep({ options: [{ id: "a", text: "x", structure: "nope" }, { id: "b", text: "y" }] });
    expect(build(treeWith({ 2: step })).errors).toEqual([`${L}: step s03: structure "nope" not found`]);
  });
});

describe("Tap-to-identify Steps", () => {
  it("resolves the structure and every tappable atom and bond with a screen-reader label, in reading order", () => {
    const { lesson, errors } = build(treeWith({ 5: tapStep() }));
    expect(errors).toEqual([]);
    const step = lesson!.steps[5];
    expect(step.type).toBe("tap-to-identify");
    if (step.type !== "tap-to-identify") return;
    expect(step.structure.structure.id).toBe("formaldehyde");
    expect(step.targets).toEqual([
      { id: "a3", kind: "atom", label: "Hydrogen: single bond to C (1 of 2)." },
      { id: "a1", kind: "atom", label: "Carbon: double bond to O, single bonds to H and H." },
      { id: "b1", kind: "bond", label: "Double bond, C to O." },
      { id: "a2", kind: "atom", label: "Oxygen: double bond to C; 2 lone pairs." },
      { id: "a4", kind: "atom", label: "Hydrogen: single bond to C (2 of 2)." },
    ]);
  });

  it("names a charge in the label unless the Step hides charges", () => {
    const step = tapStep({ structure: "methoxide", tappable: { atoms: ["a2"] }, answer: ["a2"], hints: [{ text: "x" }] });
    const shown = build(treeWith({ 5: step })).lesson!.steps[5];
    const hidden = build(treeWith({ 5: { ...step, hide: ["charges"] } })).lesson!.steps[5];
    expect(shown.type === "tap-to-identify" && shown.targets[0].label).toBe(
      "Oxygen: single bond to C; 3 lone pairs; charge −1.",
    );
    expect(hidden.type === "tap-to-identify" && hidden.targets[0].label).toBe("Oxygen: single bond to C; 3 lone pairs.");
  });

  it("uses an author's label and accepts regions", () => {
    const tree = treeWith(
      {
        5: tapStep({
          tappable: { regions: [{ id: "carbonyl", atoms: ["a1", "a2"], label: "The C=O group" }] },
          answer: ["carbonyl"],
          hints: [{ text: "x" }],
        }),
      },
      (t) => {
        (t["chem/structures/formaldehyde.yaml"] as typeof formaldehyde).atoms[1] = {
          ...formaldehyde.atoms[1],
          label: "The oxygen",
        } as never;
      },
    );
    const { lesson, errors } = build(tree);
    expect(errors).toEqual([]);
    const step = lesson!.steps[5];
    expect(step.type === "tap-to-identify" && step.targets).toEqual([
      { id: "carbonyl", kind: "region", label: "The C=O group", atoms: ["a1", "a2"] },
    ]);
  });

  it("rejects answers and Hints that name something that can't be tapped", () => {
    const step = tapStep({ tappable: { atoms: ["a1", "a2"] }, answer: ["a2", "b9"] });
    expect(build(treeWith({ 5: step })).errors).toEqual([
      `${L}: step s06: answer names "b9", which can't be tapped`,
      `${L}: step s06: a Hint names "a3", which can't be tapped`,
      `${L}: step s06: a Hint names "a4", which can't be tapped`,
    ]);
  });

  it("rejects tappable ids the structure doesn't have", () => {
    const step = tapStep({ tappable: { atoms: ["a1", "a9"], bonds: ["b7"], regions: [{ id: "r", atoms: ["a8"], label: "R" }] }, answer: ["a1"], hints: [{ text: "x" }] });
    expect(build(treeWith({ 5: step })).errors).toEqual([
      `${L}: step s06: structure "formaldehyde" has no atom "a9"`,
      `${L}: step s06: structure "formaldehyde" has no bond "b7"`,
      `${L}: step s06: structure "formaldehyde" has no atom "a8"`,
    ]);
  });

  it("needs a Correct line and one generic fallback Hint, last", () => {
    const step = tapStep({ correct: undefined, hints: [{ text: "x" }, { misses: ["a2"], text: "y" }] });
    expect(build(treeWith({ 5: step })).errors).toEqual([
      `${L}: step s06: needs exactly one generic fallback Hint (no match), and it must come last`,
      `${L}: step s06: needs a Correct line`,
    ]);
  });

  it("may draw a second structure to compare against, untappable (#78)", () => {
    const { lesson, errors } = build(treeWith({ 5: tapStep({ compare: "methoxide" }) }));
    expect(errors).toEqual([]);
    expect(lesson!.steps[5]).toMatchObject({ compare: { hide: [], structure: { id: "methoxide" } } });
    expect(build(treeWith({ 5: tapStep({ compare: "nope" }) })).errors).toEqual([`${L}: step s06: structure "nope" not found`]);
  });

  it("carries its tap-only cue", () => {
    const cue = { idle: "Just tap, no pushing on this Step.", drag: "No pushing yet: tap each source." };
    const step = build(treeWith({ 5: tapStep({ tapOnly: cue }) })).lesson!.steps[5];
    expect(step).toMatchObject({ tapOnly: cue });
  });

  it("can be a Check Problem", () => {
    const { phase: _p, id: _i, ...interaction } = tapStep();
    const tree = treeWith({}, (t) => {
      t["chem/problems/p1.yaml"] = { ...problem("p1"), ...interaction, options: undefined };
    });
    const { lesson, errors } = build(tree);
    expect(errors).toEqual([]);
    expect(lesson!.steps[7]).toMatchObject({ id: "s08", phase: "check", problemId: "p1", type: "tap-to-identify", answer: ["a2"] });
  });
});

describe("structure files", () => {
  it("rejects a bond to a missing atom and a duplicate id", () => {
    const broken = {
      ...methoxide,
      atoms: [...methoxide.atoms, { id: "a2", el: "H", x: 0, y: 1 }],
      bonds: [{ id: "b1", a: "a1", b: "a5", order: 1 }],
    };
    const { errors } = build(treeWith({}, (t) => (t["chem/structures/methoxide.yaml"] = broken)));
    expect(errors).toEqual([
      'chem/structures/methoxide.yaml: id "a2" is used twice',
      'chem/structures/methoxide.yaml: bond b1 joins "a5", which is not an atom',
    ]);
  });
});
