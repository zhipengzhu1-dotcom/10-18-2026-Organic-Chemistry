// Explore in 3D (#71): a Step or Problem that names a molecule (`molecule: <data file id>`)
// carries that molecule's atoms, bonds and cited colours and radii into the course model.
import { describe, expect, it } from "vitest";
import { buildContent } from "../src/index.ts";
import type { ExplainStep, MultipleChoiceStep } from "../src/model.ts";
import { problem, validTree, writeTree, methane, type Tree } from "./tree.ts";

/** Cited element table for H and C: Jmol colours, Bondi radii (real values). */
const elementTable = (only: string[] = ["H", "C"]) => {
  const rows: Record<string, object> = {
    "H.colour": { label: "H colour", quantity: "colour", value: "#FFFFFF", source: "jmol" },
    "C.colour": { label: "C colour", quantity: "colour", value: "#909090", source: "jmol" },
    "H.vdw": { label: "H van der Waals radius", quantity: "radius", value: 1.2, unit: "Å", source: "bondi" },
    "C.vdw": { label: "C van der Waals radius", quantity: "radius", value: 1.7, unit: "Å", source: "bondi" },
  };
  return {
    id: "elements",
    kind: "table",
    title: "Elements",
    sources: {
      jmol: { kind: "reference", citation: "the Jmol CPK colour table", licence: "LGPL 2.1 (Jmol)" },
      bondi: { kind: "reference", citation: "Bondi, J. Phys. Chem. 68, 441 (1964)", licence: "Published values" },
    },
    values: Object.fromEntries(Object.entries(rows).filter(([k]) => only.includes(k.split(".")[0]))),
  };
};

const methaneWithBonds = () => ({
  ...methane(),
  bonds: [
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 1],
    [0, 4, 1],
  ],
  notice: "Data derived from NIST CCCBDB.",
});

function build(edit: (tree: Tree) => void) {
  const tree = validTree();
  tree["chem/data/methane.json"] = JSON.stringify(methaneWithBonds());
  tree["chem/data/elements.yaml"] = elementTable();
  edit(tree);
  return buildContent(writeTree(tree));
}

const steps = (t: Tree) => (t["chem/lessons/l1.yaml"] as { steps: Record<string, unknown>[] }).steps;

describe("Explore in 3D: molecule on a Step or Problem", () => {
  it("a Step that names a molecule carries its atoms, bonds, cited colours and radii", () => {
    const result = build((t) => (steps(t)[1].molecule = "methane"));
    expect(result.errors).toEqual([]);
    const step = result.model!.subjects[0].courses[0].units[0].lessons[0].steps[1] as ExplainStep;
    const m = step.molecule!;
    expect(m.id).toBe("methane");
    expect(m.title).toBe("Methane");
    expect(m.tier).toBe("experimental");
    expect(m.atoms).toHaveLength(5);
    expect(m.atoms[0]).toEqual({ element: "C", x: 0, y: 0, z: 0 });
    expect(m.bonds).toHaveLength(4);
    expect(m.elements.H.colour).toBe("#FFFFFF");
    expect(m.elements.C.vdw).toBe(1.7);
    expect(m.notice).toBe("Data derived from NIST CCCBDB.");
    // What its Source note names: the molecule's geometry values, then the element colours, then their radii.
    expect(m.cited.map((c) => c.ref)).toEqual([
      "methane/r.CH",
      "methane/a.HCH",
      "elements/C.colour",
      "elements/H.colour",
      "elements/C.vdw",
      "elements/H.vdw",
    ]);
  });

  it("a Step without a molecule has no Explore view", () => {
    const step = build(() => {}).model!.subjects[0].courses[0].units[0].lessons[0].steps[1];
    expect("molecule" in step && step.molecule).toBeFalsy();
  });

  it("a Problem's molecule reaches its Check Step and its Bank entry", () => {
    const result = build((t) => (t["chem/problems/p1.yaml"] = problem("p1", { molecule: "methane" })));
    expect(result.errors).toEqual([]);
    const unit = result.model!.subjects[0].courses[0].units[0];
    const check = unit.lessons[0].steps.find((s) => s.type !== "explain" && s.problemId === "p1") as MultipleChoiceStep;
    expect(check.molecule?.id).toBe("methane");
    expect(unit.bank.find((p) => p.id === "p1")!.step.molecule?.id).toBe("methane");
  });

  it("rejects a molecule that has no data file, a table, and a molecule without atoms or bonds", () => {
    const result = build((t) => {
      steps(t)[1].molecule = "ethyne";
      steps(t)[3].molecule = "elements";
      const noBonds = { ...methane(), id: "bare" };
      t["chem/data/bare.yaml"] = noBonds;
      steps(t)[4].molecule = "bare";
    });
    expect(result.errors).toEqual([
      'chem/lessons/l1.yaml: step s02: molecule "ethyne" is not a data file',
      'chem/lessons/l1.yaml: step s04: molecule "elements" is not a molecule data file',
      'chem/lessons/l1.yaml: step s05: molecule "bare" has no bonds',
    ]);
  });

  it("rejects a molecule whose elements have no cited colour or radius", () => {
    const result = build((t) => {
      t["chem/data/elements.yaml"] = elementTable(["C"]);
      t["chem/problems/p2.yaml"] = problem("p2", { molecule: "methane" });
    });
    expect(result.errors).toEqual([
      'chem/problems/p2.yaml: molecule "methane": no cited colour for H (elements/H.colour)',
      'chem/problems/p2.yaml: molecule "methane": no cited van der Waals radius for H (elements/H.vdw)',
    ]);
  });
});
