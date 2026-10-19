// The 3D molecule module (#68): what a Student measures by tapping atoms, how picks behave,
// the named start views and what Describe reads. Expected values come from the methane
// geometry (CCCBDB: C–H 1.087 Å, tetrahedral 109.47°) and plain trigonometry, not from the code.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import {
  atomNames,
  describeMolecule,
  measure,
  project,
  readout,
  togglePick,
  turn,
  viewErrors,
  viewMatrix,
  type Molecule,
} from "../src/molecule.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const fromData = (id: string): Molecule => ({ title: data[id].title, atoms: data[id].atoms!.list, bonds: data[id].bonds! });
const methane = fromData("methane");
const water = fromData("water");

describe("atom names", () => {
  it("number atoms per element, in file order", () => {
    expect(atomNames(methane.atoms)).toEqual(["C1", "H1", "H2", "H3", "H4"]);
  });
});

describe("tap to measure", () => {
  it("two bonded atoms give the bond length", () => {
    const m = measure(methane, [0, 1])!;
    expect(m.kind).toBe("distance");
    expect(m.value).toBeCloseTo(1.087, 3);
    expect(m.kind === "distance" && m.bonded).toBe(true);
  });

  it("two atoms that aren't bonded give the straight-line distance, marked non-bonded", () => {
    // H···H across a tetrahedron: 2 × 1.087 × sin(109.47° / 2) = 1.775 Å.
    const m = measure(methane, [1, 2])!;
    expect(m.value).toBeCloseTo(1.775, 2);
    expect(m.kind === "distance" && m.bonded).toBe(false);
  });

  it("three atoms give the angle at the middle atom", () => {
    const m = measure(methane, [1, 0, 2])!;
    expect(m.kind).toBe("angle");
    expect(m.value).toBeCloseTo(109.47, 1);
    // The middle atom is the vertex: H–H–C is a different (35.3°) angle.
    expect(measure(methane, [1, 2, 0])!.value).toBeCloseTo(35.26, 1);
  });

  it("one atom or none measures nothing", () => {
    expect(measure(methane, [])).toBeUndefined();
    expect(measure(methane, [3])).toBeUndefined();
  });

  it("the readout is drawn and spoken: 2 decimals in Å, 1 decimal in degrees", () => {
    const names = atomNames(methane.atoms);
    expect(readout(measure(methane, [0, 1])!, names)).toEqual({
      value: "1.09 Å",
      what: "C1–H1 bond",
      spoken: "C1 to H1: 1.09 ångströms, a bond.",
    });
    expect(readout(measure(methane, [1, 2])!, names)).toEqual({
      value: "1.78 Å",
      what: "H1···H2 not bonded",
      spoken: "H1 to H2: 1.78 ångströms, not bonded.",
    });
    expect(readout(measure(methane, [1, 0, 2])!, names)).toEqual({
      value: "109.5°",
      what: "H1–C1–H2 angle at C1",
      spoken: "Angle H1, C1, H2: 109.5 degrees, at C1.",
    });
  });
});

describe("picking atoms", () => {
  it("adds atoms up to three", () => {
    expect(togglePick([], 1)).toEqual([1]);
    expect(togglePick([1], 0)).toEqual([1, 0]);
    expect(togglePick([1, 0], 2)).toEqual([1, 0, 2]);
  });
  it("a fourth tap starts again from that atom", () => {
    expect(togglePick([1, 0, 2], 3)).toEqual([3]);
  });
  it("tapping a picked atom un-picks it", () => {
    expect(togglePick([1, 0, 2], 0)).toEqual([1, 2]);
    expect(togglePick([4], 4)).toEqual([]);
  });
});

describe("start views", () => {
  it("with no view, the file's own axes face the screen", () => {
    expect(viewMatrix(methane.atoms)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it("look: [a, b] looks along a → b, so b hides behind a", () => {
    // Water end-on: look down the H···H line; both H's land on the same screen spot.
    const r = viewMatrix(water.atoms, { look: [1, 2], up: 0 });
    const [h1, h2] = [project(water.atoms, r)[1], project(water.atoms, r)[2]];
    expect(h1[0]).toBeCloseTo(h2[0], 6);
    expect(h1[1]).toBeCloseTo(h2[1], 6);
    expect(h1[2]).toBeGreaterThan(h2[2]); // a is nearer the viewer
  });

  it("up: puts that atom straight above the centre", () => {
    const r = viewMatrix(water.atoms, { look: [1, 2], up: 0 });
    const o = project(water.atoms, r)[0];
    expect(o[0]).toBeCloseTo(0, 6);
    expect(o[1]).toBeGreaterThan(0);
  });

  it("plane: [a, b, c] lays those atoms in the screen plane; front: picks the side facing the viewer", () => {
    // Methane: H1, C1, H2 in the page; H3 toward the viewer.
    const r = viewMatrix(methane.atoms, { plane: [1, 0, 2], front: 3 });
    const p = project(methane.atoms, r);
    expect(p[1][2]).toBeCloseTo(p[0][2], 6);
    expect(p[2][2]).toBeCloseTo(p[0][2], 6);
    expect(p[3][2]).toBeGreaterThan(p[0][2]);
    expect(p[4][2]).toBeLessThan(p[0][2]);
  });

  it("rotate: turns about the screen axes after the rest (degrees)", () => {
    const r = viewMatrix(methane.atoms, { rotate: [0, 90, 0] });
    // A quarter turn about the vertical axis swings the file's x axis to point along the line of sight.
    const x = project([{ element: "C", x: -1, y: 0, z: 0 }, { element: "C", x: 1, y: 0, z: 0 }], r)[1];
    expect(Math.abs(x[2])).toBeCloseTo(1, 6);
    expect(x[0]).toBeCloseTo(0, 6);
  });

  it("reports views that can't be built", () => {
    expect(viewErrors(water.atoms, { look: [1, 1] })).toEqual(["look: needs two different atoms"]);
    expect(viewErrors(water.atoms, { look: [0, 9] })).toEqual(["look: atom 9 is not in the molecule (0–2)"]);
    expect(viewErrors(water.atoms, { look: [1, 2], up: 1 })).toEqual(["up: atom 1 lies on the line of sight"]);
    expect(viewErrors(water.atoms, { look: [1, 2], plane: [0, 1, 2] })).toEqual(["give look or plane, not both"]);
    expect(viewErrors(water.atoms, { look: [1, 2], up: 0 })).toEqual([]);
  });
});

describe("turning", () => {
  it("turns about a screen axis, keeping the matrix a rotation", () => {
    const r = turn(viewMatrix(methane.atoms), "y", 90);
    const x = project([{ element: "C", x: -1, y: 0, z: 0 }, { element: "C", x: 1, y: 0, z: 0 }], r)[1];
    expect(x[0]).toBeCloseTo(0, 6);
    expect(Math.abs(x[2])).toBeCloseTo(1, 6);
    const back = turn(r, "y", -90);
    expect(back[0][0]).toBeCloseTo(1, 9);
    expect(back[2][2]).toBeCloseTo(1, 9);
  });
});

describe("Describe", () => {
  it("names the molecule, every atom's bonds and what faces the viewer", () => {
    const text = describeMolecule(methane, viewMatrix(methane.atoms, { plane: [1, 0, 2], front: 3 }));
    expect(text).toContain("Methane: 5 atoms.");
    expect(text).toContain("C1 is bonded to H1, H2, H3 and H4.");
    expect(text).toContain("C1, H1 and H2 lie in the screen plane.");
    expect(text).toContain("Nearest you: H3. Farthest: H4.");
  });

  it("starts with the Step's own description when it gives one", () => {
    const text = describeMolecule({ ...water, describe: "A bent molecule." }, viewMatrix(water.atoms));
    expect(text.startsWith("A bent molecule. Water: 3 atoms.")).toBe(true);
    expect(text).toContain("O1 is bonded to H1 and H2.");
  });
});
