// Lesson 3 (#81) additions to the 3D molecule module: the page sheet (is a plane of atoms in the
// page? which side of it is each other atom on?) and bond dipoles added tip to tail. Expected
// values come from the cited geometry and plain trigonometry: water is bent, so its two O–H pulls
// add up; CO₂ and CCl₄ are symmetric, so theirs cancel.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "../src/index.ts";
import { bondDipoles, netDipole, pageSides, pageTilt, pageView, turn, type Molecule } from "../src/molecule.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const fromData = (id: string): Molecule => ({ title: data[id].title, atoms: data[id].atoms!.list, bonds: data[id].bonds! });
const en = Object.fromEntries(
  ["H", "B", "C", "N", "O", "F", "Cl"].map((el) => [el, Number(data["electronegativity-pauling"].values[el].value)]),
);
const ethanol = fromData("ethanol");
/** Ethanol's O, the CH₂ carbon (C1 in the Lesson) and the CH₃ carbon. */
const PLANE: [number, number, number] = [2, 1, 0];

describe("the page sheet", () => {
  it("snapping lays the three atoms in the page: no tilt", () => {
    expect(pageTilt(ethanol.atoms, pageView(ethanol.atoms, PLANE), PLANE)).toBeCloseTo(0, 6);
  });

  it("measures how far the plane is turned out of the page, either way round", () => {
    const flat = pageView(ethanol.atoms, PLANE);
    expect(pageTilt(ethanol.atoms, turn(flat, "x", 30), PLANE)).toBeCloseTo(30, 6);
    expect(pageTilt(ethanol.atoms, turn(flat, "y", -8), PLANE)).toBeCloseTo(8, 6);
    expect(pageTilt(ethanol.atoms, turn(flat, "y", 180), PLANE)).toBeCloseTo(0, 6);
  });

  it("with the O–C–C plane in the page, C1's two H's straddle it: one toward you, one away", () => {
    const sides = pageSides(ethanol, pageView(ethanol.atoms, PLANE), PLANE);
    // Atoms 7 and 8 are the H's on the CH₂ carbon (atom 1).
    expect(sides.map((s) => s.atom).sort()).toEqual([7, 8]);
    expect(sides.map((s) => s.side).sort()).toEqual(["away", "toward"]);
  });
});

describe("bond dipoles", () => {
  it("point from the δ+ atom to the δ− atom, sized by the electronegativity difference", () => {
    const water = fromData("water");
    const arrows = bondDipoles(water, en);
    expect(arrows).toHaveLength(2);
    for (const a of arrows) {
      expect(water.atoms[a.from].element).toBe("H");
      expect(water.atoms[a.to].element).toBe("O");
      expect(a.size).toBeCloseTo(3.44 - 2.2, 6);
    }
  });

  it("water's add up to a net pull toward O; CO₂'s, CCl₄'s and BF₃'s cancel", () => {
    const net = (id: string) => netDipole(fromData(id), bondDipoles(fromData(id), en));
    const water = net("water");
    expect(water.zero).toBe(false);
    // The net pull lies along the bisector of the H–O–H angle, toward O: 2 × 1.24 × cos(104.48° / 2).
    expect(water.size).toBeCloseTo(2 * 1.24 * Math.cos(((104.4776 / 2) * Math.PI) / 180), 3);
    for (const id of ["carbon-dioxide", "carbon-tetrachloride", "boron-trifluoride"]) expect(net(id).zero, id).toBe(true);
    for (const id of ["dichloromethane", "ammonia"]) expect(net(id).zero, id).toBe(false);
  });

  it("C–H counts as a (small) dipole toward C, so CH₂Cl₂'s net still points toward the Cl side", () => {
    const m = fromData("dichloromethane");
    const { vector } = netDipole(m, bondDipoles(m, en));
    const c = m.atoms[0];
    const clSide = [3, 4].map((i) => [m.atoms[i].x - c.x, m.atoms[i].y - c.y, m.atoms[i].z - c.z]);
    const towardCl = clSide[0].map((v, k) => v + clSide[1][k]);
    expect(vector[0] * towardCl[0] + vector[1] * towardCl[1] + vector[2] * towardCl[2]).toBeGreaterThan(0);
  });
});
