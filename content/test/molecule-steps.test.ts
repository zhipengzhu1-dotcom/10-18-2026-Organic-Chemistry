// The 3D Step card and Rotate-and-identify 3D in the content build (#68): a Step names a
// molecule (and optionally a named start view from views.yaml); the build resolves it to the
// cited atoms, bonds, colours and radii, and its Source note gains the molecule's numbers.
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { viewMatrix } from "../src/molecule.ts";
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
function build(s03: object, s02: object = { type: "explain", text: "Turn it.", molecule: "methane" }, more: Tree = {}) {
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

describe("a Step's 3D molecule", () => {
  it("arrives with its cited atoms, bonds, colours and radii, facing the file's axes by default", () => {
    const result = build(rotateAndIdentify());
    expect(result.errors).toEqual([]);
    const [, explain] = stepsOf(result);
    expect(explain.type === "explain" && explain.molecule).toEqual({
      id: "methane",
      title: "Methane",
      atoms,
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 0, b: 2, order: 1 },
        { a: 0, b: 3, order: 1 },
        { a: 0, b: 4, order: 1 },
      ],
      orientation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      elements: { C: { colour: "#909090", vdw: 1.7 }, H: { colour: "#FFFFFF", vdw: 1.2 } },
    });
  });

  it("its Source note covers the molecule's geometry and the colour and radius tables", () => {
    const [, explain] = stepsOf(build(rotateAndIdentify()));
    expect(explain.citations?.map((c) => c.ref)).toEqual([
      "methane/r.CH",
      "methane/a.HCH",
      "elements/C.colour",
      "elements/C.vdw",
      "elements/H.colour",
      "elements/H.vdw",
    ]);
  });

  it("a named start view comes from views.yaml, with the Step's Describe words", () => {
    const result = build(rotateAndIdentify({ molecule: { id: "methane", view: "tilted", describe: "A carbon with four hydrogens." } }));
    const [, , step] = stepsOf(result);
    expect(step.type).toBe("rotate-and-identify");
    if (step.type !== "rotate-and-identify") return;
    expect(step.molecule.view).toBe("tilted");
    expect(step.molecule.describe).toBe("A carbon with four hydrogens.");
    expect(step.molecule.orientation).toEqual(viewMatrix(atoms, { plane: [1, 0, 2], front: 3, rotate: [20, 30, 0] }));
  });

  it("rejects an unknown molecule, a data table, an unknown view and a missing colour or radius", () => {
    const at = (m: object) => build(rotateAndIdentify({ molecule: m })).errors;
    expect(at({ id: "ethyne" })).toEqual([`${L}: step s03: molecule "ethyne" is not in the cited data`]);
    expect(at({ id: "elements" })).toEqual([`${L}: step s03: "elements" has no atoms to show in 3D`]);
    expect(at({ id: "methane", view: "end-on" })).toEqual([`${L}: step s03: methane has no view "end-on" in views.yaml`]);
    const noRadius = elements();
    delete (noRadius.values as Record<string, unknown>)["H.vdw"];
    expect(build(rotateAndIdentify(), undefined, { "chem/data/elements.yaml": noRadius }).errors).toEqual([
      `${L}: step s02: molecule "methane" needs "elements/H.vdw" in the cited data`,
      `${L}: step s03: molecule "methane" needs "elements/H.vdw" in the cited data`,
    ]);
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
