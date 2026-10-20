// Lesson 3's options for the 3D Step card (#81), resolved by the content build:
// - `labels`: atom names the Step uses (e.g. "C1" for ethanol's CH₂); letters always stay.
// - `pageSheet: [a, b, c]`: the page sheet through b, with the In-the-page badge for that plane.
// - `dipoles: true`: bond-dipole arrows from the cited Pauling electronegativities, and their sum.
// - `toggle`: more molecules the Student switches between with a segmented toggle (each `label`led).
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import { elementsWithRadii as elements, lesson, methaneWithBonds, sampleSteps, validTree, writeTree, type Tree } from "./tree.ts";

const L = "chem/lessons/l1.yaml";

const en = () => ({
  id: "electronegativity-pauling",
  kind: "table",
  title: "Electronegativity (Pauling scale)",
  sources: { allred1961: { kind: "reference", citation: "Allred 1961, doi:10.1016/0022-1902(61)80142-5", licence: "Published values" } },
  values: {
    H: { label: "H electronegativity (Pauling)", quantity: "electronegativity", value: 2.2, source: "allred1961" },
    C: { label: "C electronegativity (Pauling)", quantity: "electronegativity", value: 2.55, source: "allred1961" },
  },
});

function build(molecule: object, more: Tree = {}) {
  const steps: object[] = sampleSteps();
  steps[1] = { id: "s02", phase: "build", type: "explain", text: "Turn it.", molecule };
  const tree: Tree = {
    ...validTree(),
    [L]: lesson({ steps }),
    "chem/data/elements.yaml": elements(),
    "chem/data/methane.yaml": methaneWithBonds(),
    "chem/data/electronegativity-pauling.yaml": en(),
    ...more,
  };
  return buildContent(writeTree(tree));
}
const s02 = (result: ReturnType<typeof build>) => {
  const step = result.model!.subjects[0].courses[0].units[0].lessons[0].steps[1];
  if (step.type !== "explain") throw new Error("s02 is an Explain Step");
  return step;
};

describe("3D card options", () => {
  it("labels name atoms by index", () => {
    const result = build({ id: "methane", card: true, labels: { 0: "centre C" } });
    expect(result.errors).toEqual([]);
    expect(s02(result).molecule!.labels).toEqual({ 0: "centre C" });
  });

  it("rejects a label or page-sheet atom that isn't in the molecule, and a page sheet in a line", () => {
    expect(build({ id: "methane", card: true, labels: { 7: "X" } }).errors).toEqual([
      `${L}: step s02: molecule "methane": labels: atom 7 is not in the molecule (0–4)`,
    ]);
    expect(build({ id: "methane", card: true, pageSheet: [1, 0, 9] }).errors).toEqual([
      `${L}: step s02: molecule "methane": pageSheet: atom 9 is not in the molecule (0–4)`,
    ]);
    expect(build({ id: "methane", card: true, pageSheet: [1, 0, 1] }).errors).toEqual([
      `${L}: step s02: molecule "methane": pageSheet: the three atoms are in a line`,
    ]);
  });

  it("the page sheet is kept for the card", () => {
    expect(s02(build({ id: "methane", card: true, pageSheet: [1, 0, 2] })).molecule!.pageSheet).toEqual([1, 0, 2]);
  });

  it("dipoles: C–H arrows point at C, sized by the electronegativity difference, and the Source note cites the table", () => {
    const step = s02(build({ id: "methane", card: true, dipoles: true }));
    const { arrows, net } = step.molecule!.dipoles!;
    expect(arrows).toHaveLength(4);
    expect(arrows.every((a) => a.to === 0)).toBe(true);
    expect(arrows[0].size).toBeCloseTo(0.35, 6);
    expect(net.zero).toBe(true);
    expect(step.citations!.map((c) => c.ref)).toEqual(expect.arrayContaining(["electronegativity-pauling/C", "electronegativity-pauling/H"]));
  });

  it("dipoles need every element's cited electronegativity", () => {
    const errors = build({ id: "methane", card: true, dipoles: true }, { "chem/data/electronegativity-pauling.yaml": { ...en(), values: { C: en().values.C } } }).errors;
    expect(errors).toEqual([`${L}: step s02: molecule "methane": no cited electronegativity for H (electronegativity-pauling/H)`]);
  });

  it("toggle: every molecule gets a label, resolves on its own, and joins the Source note", () => {
    const result = build({ id: "methane", card: true, label: "CH₄", toggle: [{ id: "methane", label: "CH₄ again", view: "tilted" }] }, {
      "chem/views.yaml": { methane: { tilted: { rotate: [20, 30, 0] } } },
    });
    expect(result.errors).toEqual([]);
    const m = s02(result).molecule!;
    expect(m.label).toBe("CH₄");
    expect(m.toggle!.map((t) => [t.label, t.view, t.card])).toEqual([["CH₄ again", "tilted", true]]);
  });

  it("toggle needs labels on every molecule", () => {
    expect(build({ id: "methane", card: true, toggle: [{ id: "methane" }] }).errors).toEqual([
      `${L}: step s02: molecule "methane": a toggle needs a label on every molecule`,
    ]);
  });
});
