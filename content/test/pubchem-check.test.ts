// Lesson 2's build sanity checks: a drawing that names a PubChem compound must
// have that compound's hydrogen count, and every lone pair it draws must follow
// from valence (spec: lesson-02-drawing-molecules.md, Data notes).
import { describe, expect, it } from "vitest";
import { buildContent, type Structure } from "../src/index.ts";
import { hydrogenCount, impliedHydrogens } from "../src/valence.ts";
import { validTree, writeTree } from "./tree.ts";

/** Cyclohexanone, line-angle (PubChem CID 7967, C₆H₁₀O): a hexagon with =O on a1. */
const cyclohexanone = (extra: Partial<Structure> = {}) => ({
  id: "cyclohexanone",
  style: "line-angle",
  smiles: "O=C1CCCCC1",
  source: "PubChem CID 7967",
  atoms: [
    { id: "a1", el: "O", x: 0, y: -3, lp: 2 },
    { id: "a2", el: "C", x: 0, y: -1.5 },
    { id: "a3", el: "C", x: 1.3, y: -0.75 },
    { id: "a4", el: "C", x: 1.3, y: 0.75 },
    { id: "a5", el: "C", x: 0, y: 1.5 },
    { id: "a6", el: "C", x: -1.3, y: 0.75 },
    { id: "a7", el: "C", x: -1.3, y: -0.75 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
    { id: "b3", a: "a3", b: "a4", order: 1 },
    { id: "b4", a: "a4", b: "a5", order: 1 },
    { id: "b5", a: "a5", b: "a6", order: 1 },
    { id: "b6", a: "a6", b: "a7", order: 1 },
    { id: "b7", a: "a7", b: "a2", order: 1 },
  ],
  ...extra,
});

const pubchem = (cid: number, formula: string) =>
  JSON.stringify({ PropertyTable: { Properties: [{ CID: cid, MolecularFormula: formula, Title: "x" }] } });

describe("hydrogens a drawing implies", () => {
  it("gives each line-angle corner enough H's to make four bonds", () => {
    const s = cyclohexanone() as Structure;
    expect(impliedHydrogens(s)).toMatchObject({ a2: 0, a3: 2, a4: 2, a5: 2, a6: 2, a7: 2 });
    expect(hydrogenCount(s)).toBe(10);
  });

  it("counts H's written with a letter and H atoms drawn out, and none on a carbon whose letter is written", () => {
    const ethanolWrong: Structure = {
      id: "x",
      style: "line-angle",
      atoms: [
        { id: "a1", el: "O", x: 0, y: 0, h: 1, lp: 2 },
        { id: "a2", el: "C", x: 1.3, y: 0.75, letter: true },
        { id: "a3", el: "C", x: 2.6, y: 0, letter: true, h: 3 },
      ],
      bonds: [
        { id: "b1", a: "a1", b: "a2", order: 1 },
        { id: "b2", a: "a2", b: "a3", order: 1 },
      ],
    };
    // HO–C–CH₃ with a bare C: the written C carries only the H's written with it.
    expect(hydrogenCount(ethanolWrong)).toBe(4);
  });
});

describe("PubChem sanity checks in the build", () => {
  const tree = (structure: object, formula = "C6H10O") => ({
    ...validTree(),
    "chem/structures/cyclohexanone.yaml": structure,
    "chem/data/pubchem/7967.json": pubchem(7967, formula),
  });

  it("passes a drawing whose H count matches the PubChem formula", () => {
    expect(buildContent(writeTree(tree(cyclohexanone()))).errors).toEqual([]);
  });

  it("fails a drawing whose H count disagrees with the formula", () => {
    expect(buildContent(writeTree(tree(cyclohexanone(), "C6H12O")))).toMatchObject({
      errors: ["chem/structures/cyclohexanone.yaml: the drawing has 10 H, but PubChem CID 7967 (C6H12O) has 12"],
    });
  });

  it("fails a drawing whose lone pairs don't follow from valence", () => {
    const s = cyclohexanone();
    s.atoms[0] = { ...s.atoms[0], lp: 3 };
    expect(buildContent(writeTree(tree(s))).errors).toEqual([
      "chem/structures/cyclohexanone.yaml: a1 (O) draws 3 lone pairs; its bonds and charge give 2",
    ]);
  });

  it("checks only drawings whose PubChem record is cached (add data/pubchem/<cid>.json to opt in)", () => {
    const s = cyclohexanone();
    s.atoms[0] = { ...s.atoms[0], lp: 3 };
    expect(buildContent(writeTree({ ...validTree(), "chem/structures/cyclohexanone.yaml": s })).errors).toEqual([]);
  });

  it("leaves a drawing that names no PubChem compound alone (a card drawn wrong on purpose)", () => {
    const s = cyclohexanone({ source: "Drawn wrong on purpose" });
    s.atoms[0] = { ...s.atoms[0], lp: 0 };
    expect(buildContent(writeTree({ ...validTree(), "chem/structures/cyclohexanone.yaml": s })).errors).toEqual([]);
  });
});
