// The 3D Step card and Rotate-and-identify 3D in the content build (#68): a Step names a
// molecule (and optionally a named start view from views.yaml); the build resolves it to the
// cited atoms, bonds, colours and radii, and its Source note gains the molecule's numbers.
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { viewMatrix } from "../src/molecule.ts";
import { DEFAULT_VIEW } from "../src/molecule-use.ts";
import { elementsWithRadii as elements, lesson, methane, methaneWithBonds, problem, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const rotateAndIdentify = (extra: object = {}) => ({
  type: "rotate-and-identify",
  prompt: "Turn the molecule. Which atom is nearest the top?",
  molecule: { id: "methane", view: "tilted" },
  options: [
    { id: "a", text: "A hydrogen" },
    { id: "b", text: "The carbon" },
  ],
  answer: ["a"],
  correct: "Right: the carbon sits in the middle.",
  hints: [{ match: ["b"], text: "The carbon is in the middle." }, { text: "Look at the outside." }],
  reveal: "A hydrogen.",
  ...extra,
});

/** The sample Lesson with s02 and s03 replaced. */
function build(s03: object, s02: object = { type: "explain", text: "Turn it.", molecule: { id: "methane", card: true } }, more: Tree = {}) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", ...s02 };
  steps[2] = { id: "s03", phase: "build", ...s03 };
  const tree: Tree = {
    ...validTree(),
    [L]: lesson({ steps }),
    "chem/data/elements.yaml": elements(),
    "chem/data/methane.yaml": methaneWithBonds(),
    "chem/views.yaml": { methane: { tilted: { plane: [1, 0, 2], front: 3, rotate: [20, 30, 0] } } },
    ...more,
  };
  return buildContent(writeTree(tree));
}
const stepsOf = (result: ReturnType<typeof build>) => result.model!.subjects[0].courses[0].units[0].lessons[0].steps;
const atoms = (methane().atoms.list as [string, number, number, number][]).map(([element, x, y, z]) => ({ element, x, y, z }));
const refs = ["methane/r.CH", "methane/a.HCH", "elements/C.colour", "elements/H.colour", "elements/C.vdw", "elements/H.vdw"];

describe("a Step's 3D molecule", () => {
  it("arrives with its cited atoms, bonds, colours and radii, turned off the file's axes by default", () => {
    const result = build(rotateAndIdentify());
    expect(result.errors).toEqual([]);
    const [, explain] = stepsOf(result);
    if (explain.type !== "explain") throw new Error("s02 is an Explain Step");
    const { cited, ...rest } = explain.molecule!;
    expect(rest).toEqual({
      id: "methane",
      title: "Methane",
      tier: "experimental",
      atoms,
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 0, b: 2, order: 1 },
        { a: 0, b: 3, order: 1 },
        { a: 0, b: 4, order: 1 },
      ],
      // CCCBDB lays planar molecules in the yz plane: the default view turns them off edge-on.
      orientation: viewMatrix(atoms, DEFAULT_VIEW),
      elements: { C: { colour: "#909090", vdw: 1.7 }, H: { colour: "#FFFFFF", vdw: 1.2 } },
      card: true,
    });
    expect(cited.map((c) => c.ref)).toEqual(refs);
  });

  it("a card Step's Source note covers the molecule's geometry and the colour and radius tables", () => {
    const [, explain] = stepsOf(build(rotateAndIdentify()));
    expect(explain.citations?.map((c) => c.ref)).toEqual(refs);
  });

  it("a Step that only names a molecule offers Explore in 3D, with no inline card and no extra Source note", () => {
    const [, explain] = stepsOf(build(rotateAndIdentify(), { type: "explain", text: "Turn it.", molecule: "methane" }));
    expect(explain.type === "explain" && explain.molecule?.card).toBe(false);
    expect(explain.citations).toBeUndefined();
  });

  it("a named start view comes from views.yaml, with the Step's Describe words", () => {
    const result = build(rotateAndIdentify({ molecule: { id: "methane", view: "tilted", describe: "A carbon with four hydrogens." } }));
    const [, , step] = stepsOf(result);
    expect(step.type).toBe("rotate-and-identify");
    if (step.type !== "rotate-and-identify") return;
    expect(step.molecule.card).toBe(true);
    expect(step.molecule.view).toBe("tilted");
    expect(step.molecule.describe).toBe("A carbon with four hydrogens.");
    expect(step.molecule.orientation).toEqual(viewMatrix(atoms, { plane: [1, 0, 2], front: 3, rotate: [20, 30, 0] }));
  });

  it("rejects an unknown view", () => {
    const errors = build(rotateAndIdentify({ molecule: { id: "methane", view: "end-on" } })).errors;
    expect(errors).toEqual([`${L}: step s03: molecule "methane" has no view "end-on" in views.yaml`]);
  });

  it("checks every view in views.yaml against its molecule", () => {
    const result = build(rotateAndIdentify(), undefined, {
      "chem/views.yaml": { methane: { tilted: { look: [0, 9] } }, ethyne: { side: {} } },
    });
    expect(result.errors).toEqual([
      'chem/views.yaml: methane view "tilted": look: atom 9 is not in the molecule (0–4)',
      'chem/views.yaml: "ethyne" is not a molecule in the cited data',
    ]);
  });
});

describe("Rotate-and-identify 3D", () => {
  it("must show a molecule", () => {
    const { molecule: _m, ...noMolecule } = rotateAndIdentify();
    expect(build(noMolecule).errors.join("\n")).toContain("molecule");
  });

  it("follows the Multiple choice rules", () => {
    const errors = build(rotateAndIdentify({ answer: ["z"], hints: [{ match: ["y"], text: "?" }] })).errors;
    expect(errors).toEqual([
      `${L}: step s03: answer names unknown option "z"`,
      `${L}: step s03: a Hint matches unknown option "y"`,
      `${L}: step s03: needs exactly one generic fallback Hint (no match), and it must come last`,
    ]);
  });

  it("can be a Problem, played as a Check Step", () => {
    const { prompt, molecule, options, answer, correct, hints, reveal } = rotateAndIdentify();
    const result = build(rotateAndIdentify(), undefined, {
      "chem/problems/p1.yaml": problem("p1", { type: "rotate-and-identify", prompt, molecule, options, answer, correct, hints, reveal }),
    });
    expect(result.errors).toEqual([]);
    const check = stepsOf(result).find((s) => s.id === "s08")!;
    expect(check.type).toBe("rotate-and-identify");
    if (check.type !== "rotate-and-identify") return;
    expect(check.problemId).toBe("p1");
    expect(check.molecule.view).toBe("tilted");
    expect(check.citations?.map((c) => c.ref)).toContain("methane/r.CH");
  });
});
