// Lesson 3 (Molecules in 3D, #81): the build-time checks its spec asks for beyond the geometry
// files' own (geometry-data.test.ts): each start view puts the atoms where the Step's drawing
// says, the Check Problems' answers follow from the cited geometry, and the Lesson is built as
// the spec lays it out. If a check fails, the Step is rewritten, never the data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { bondDipoles, netDipole, project, viewMatrix, type Molecule, type Vec3, type ViewSpec } from "../src/molecule.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const data = organic.data;
const views = parse(readFileSync(join(contentRoot, "organic", "views.yaml"), "utf8")) as Record<string, Record<string, ViewSpec>>;
/** Screen positions (x right, y up, z toward you) of each atom, relative to `centre`, in a named view. */
const shown = (id: string, view: string, centre: number) => {
  const p = project(data[id].atoms!.list, viewMatrix(data[id].atoms!.list, views[id][view]));
  return p.map((q) => q.map((v, k) => v - p[centre][k]) as Vec3);
};
const fromData = (id: string): Molecule => ({ title: data[id].title, atoms: data[id].atoms!.list, bonds: data[id].bonds! });

// 2-fluorobutane atoms (computed file, SMILES order C[C@@H](F)CC then H's): 0 CH₃, 1 the central C,
// 2 F, 3 the CH₂ of the ethyl group, 8 the H on the central C.
const [CH3, F, ETHYL, H] = [0, 2, 3, 8];

describe("Lesson 3 start views match the drawings (u1-3d-perspective)", () => {
  it("as-left-drawing: CH₂CH₃ up and CH₃ lower left in the page; F to the right going away; H toward you", () => {
    const p = shown("2-fluorobutane-r", "as-left-drawing", 1);
    expect(p[ETHYL][2]).toBeCloseTo(0, 6);
    expect(p[CH3][2]).toBeCloseTo(0, 6);
    expect(p[ETHYL][0]).toBeCloseTo(0, 6);
    expect(p[ETHYL][1]).toBeGreaterThan(1);
    expect(p[CH3][0]).toBeLessThan(-1);
    expect(p[CH3][1]).toBeLessThan(0);
    expect(p[F][0]).toBeGreaterThan(0.5);
    expect(p[F][2]).toBeLessThan(-0.5);
    expect(p[H][1]).toBeLessThan(0);
    expect(p[H][2]).toBeGreaterThan(0.5);
  });

  it("as-right-drawing: F upper right and H down, both in the page; then CH₃ goes away (dash) and CH₂CH₃ comes toward you (wedge)", () => {
    const p = shown("2-fluorobutane-r", "as-right-drawing", 1);
    for (const i of [F, H]) expect(p[i][2]).toBeCloseTo(0, 6);
    expect(p[F][0]).toBeGreaterThan(0.5);
    expect(p[F][1]).toBeGreaterThan(0.5);
    expect(p[H][1]).toBeLessThan(-0.9);
    // The answer of u1-3d-perspective (a: CH₃ on the dash, CH₂CH₃ on the wedge) follows from the (R) geometry.
    expect(p[CH3][2]).toBeLessThan(-0.5);
    expect(p[ETHYL][2]).toBeGreaterThan(0.5);
  });
});

describe("Lesson 3 dipole answers follow from the cited geometry and electronegativities", () => {
  const en = Object.fromEntries(Object.values(data["electronegativity-pauling"].values).map((v) => [v.ref.split("/")[1], Number(v.value)]));
  const polar = (id: string) => !netDipole(fromData(id), bondDipoles(fromData(id), en)).zero;

  it("s11: water is polar, CO₂ is not", () => {
    expect([polar("water"), polar("carbon-dioxide")]).toEqual([true, false]);
  });

  it("u1-3d-polar-molecules: H₂O, CH₂Cl₂ and NH₃ are polar; CO₂ and CCl₄ are not", () => {
    const ids = ["water", "carbon-dioxide", "carbon-tetrachloride", "dichloromethane", "ammonia"];
    expect(ids.filter(polar)).toEqual(["water", "dichloromethane", "ammonia"]);
  });
});
