// The 3D molecule module (#68): what a Student measures by tapping atoms, how picks behave,
// the named start views and what Describe reads. Expected values come from the methane
// geometry (CCCBDB: C–H 1.087 Å, tetrahedral 109.47°) and plain trigonometry, not from the code.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
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
  type Vec3,
  type ViewSpec,
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

describe("Unit 1 start views (views.yaml) put the atoms where each Step's drawing says", () => {
  // Lesson 3 spec: "each startView puts the atoms where the Step's drawing says (checked by projecting the coordinates)".
  const views = parse(readFileSync(join(contentRoot, "organic", "views.yaml"), "utf8")) as Record<string, Record<string, ViewSpec>>;
  const shown = (id: string, view: string) => project(data[id].atoms!.list, viewMatrix(data[id].atoms!.list, views[id][view]));
  const screenAngle = (c: Vec3, a: Vec3, b: Vec3) => {
    const [u, v] = [a, b].map((p) => [p[0] - c[0], p[1] - c[1]]);
    return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1])) ) * 180) / Math.PI;
  };

  it("methane tilted: no two H's in an obvious line with the C, none hidden behind it", () => {
    const p = shown("methane", "tilted");
    for (let i = 1; i <= 4; i++) {
      expect(Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1])).toBeGreaterThan(0.4);
      for (let j = i + 1; j <= 4; j++) {
        const a = screenAngle(p[0], p[i], p[j]);
        expect(a).toBeGreaterThan(20);
        expect(a).toBeLessThan(160);
      }
    }
  });

  it("water end-on: the two H's line up, so the bend is hidden", () => {
    const p = shown("water", "end-on");
    expect(Math.hypot(p[1][0] - p[2][0], p[1][1] - p[2][1])).toBeLessThan(0.01);
  });

  it("BF₃ and NH₃ face-on: down the threefold axis, the outer atoms 120° apart around the centre", () => {
    for (const id of ["boron-trifluoride", "ammonia"]) {
      const p = shown(id, "face-on");
      expect(screenAngle(p[0], p[1], p[2])).toBeCloseTo(120, 0);
      expect(screenAngle(p[0], p[2], p[3])).toBeCloseTo(120, 0);
      expect(p[1][2]).toBeCloseTo(p[2][2], 6);
      expect(p[2][2]).toBeCloseTo(p[3][2], 6);
    }
  });

  it("ethylene edge-on (orbital sample, Lesson 4 poster): C=C level across the screen, the molecular plane seen edge-on", () => {
    const p = shown("ethylene", "edge-on");
    expect(p[0][1]).toBeCloseTo(p[1][1], 6); // the two carbons level
    expect(Math.abs(p[0][0] - p[1][0])).toBeGreaterThan(1);
    for (const a of p) expect(a[1]).toBeCloseTo(0, 6); // every atom on the horizontal line: the plane is edge-on
    // The file's +x side (where the π orbital's solid lobe sits) faces up: "solid lobe above the plane".
    const r = viewMatrix(data.ethylene.atoms!.list, views.ethylene["edge-on"]);
    expect(r[1][0]).toBeCloseTo(1, 6);
  });

  it("ethanol off-page: the O–C–C plane is turned well away (over 45°) from the screen plane", () => {
    const [c1, c2, o] = [0, 1, 2].map((i) => shown("ethanol", "off-page")[i]);
    const u: Vec3 = [o[0] - c2[0], o[1] - c2[1], o[2] - c2[2]];
    const v: Vec3 = [c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const tilt = (Math.acos(Math.abs(n[2]) / Math.hypot(...n)) * 180) / Math.PI;
    expect(tilt).toBeGreaterThan(45);
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
