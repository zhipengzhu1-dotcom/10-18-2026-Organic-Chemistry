// Lesson 3 (Molecules in 3D, #81): the build-time checks its spec asks for beyond the geometry
// files' own (geometry-data.test.ts): each start view puts the atoms where the Step's drawing
// says, the Check Problems' answers follow from the cited geometry, and the Lesson is built as
// the spec lays it out. If a check fails, the Step is rewritten, never the data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { answeredCitations } from "../src/model.ts";
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

describe("Lesson 3 content", () => {
  const lesson = organic.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)).find((l) => l.id === "u1-l03")!;
  const step = (id: string) => lesson.steps.find((s) => s.id === id)!;

  it("has 15 Steps: Hook 1, Build 10, Check 3, Wrap 1, with ethanol's page as its signature Rotate-and-identify Step", () => {
    expect(lesson.phases).toEqual({ hook: 1, build: 10, check: 3, wrap: 1 });
    expect(lesson.signature).toBe("rotate-and-identify");
    expect(lesson.steps.filter((s) => s.phase === "check").map((s) => "problemId" in s && s.problemId)).toEqual([
      "u1-3d-flat-or-pyramid",
      "u1-3d-perspective",
      "u1-3d-polar-molecules",
    ]);
  });

  it("follows Lesson 2 in Unit 1", () => {
    const ids = organic.courses[0].units[0].lessons.map((l) => l.id);
    expect(ids.indexOf("u1-l03")).toBe(ids.indexOf("u1-l02") + 1);
  });

  it("puts every measured angle through the cited data, with its Source note", () => {
    const s01 = step("s01");
    expect(s01.type !== "explain" && s01.reveal).toContain("Bigger: 109.5°");
    expect(answeredCitations(s01).map((c) => c.ref)).toContain("methane/a.HCH");
    expect(answeredCitations(step("s05")).map((c) => c.ref)).toEqual(expect.arrayContaining(["methane/a.HCH", "ammonia/a.HNH", "water/a.HOH"]));
    const s09 = step("s09");
    if (s09.type !== "rotate-and-identify") throw new Error("s09 is Rotate-and-identify");
    expect(s09.molecule.describe).toContain("The H–C1–H angle is 107.6°");
    expect(s09.molecule.pageSheet).toEqual([2, 1, 0]);
    expect(s09.molecule.labels).toEqual({ 0: "C2", 1: "C1" });
  });

  it("never shows a geometry answer's 3D model on the Step that asks for it", () => {
    // s07 asks for formaldehyde's shape; its numbers come only in the reveal, with no 3D card or Explore.
    const s07 = step("s07");
    expect("molecule" in s07 && s07.molecule).toBeFalsy();
  });

  it("s11 switches water and CO₂ in one card, each with its bond dipoles; the Source note cites the electronegativities", () => {
    const s11 = step("s11");
    if (s11.type !== "rotate-and-identify") throw new Error("s11 is Rotate-and-identify");
    expect([s11.molecule.label, ...s11.molecule.toggle!.map((m) => m.label)]).toEqual(["H₂O", "CO₂"]);
    expect(s11.molecule.dipoles!.net.zero).toBe(false);
    expect(s11.molecule.toggle![0].dipoles!.net.zero).toBe(true);
    expect(answeredCitations(s11).map((c) => c.ref)).toEqual(expect.arrayContaining(["electronegativity-pauling/O", "carbon-dioxide/r.CO"]));
  });
});
