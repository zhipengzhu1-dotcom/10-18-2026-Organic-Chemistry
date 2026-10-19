import { describe, expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { drawStructure } from "./render.ts";

// Hand-checked fixtures: what a Student should see is known from the chemistry.

/** Methoxide, CH₃–O⁻, full Lewis: every atom a letter, O⁻ with three lone pairs. */
const methoxide: Structure = {
  id: "methoxide",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "O", x: 1.5, y: 0, charge: -1, lp: 3 },
    { id: "a3", el: "H", x: -1.5, y: 0 },
    { id: "a4", el: "H", x: 0, y: -1.5 },
    { id: "a5", el: "H", x: 0, y: 1.5 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
    { id: "b3", a: "a1", b: "a4", order: 1 },
    { id: "b4", a: "a1", b: "a5", order: 1 },
  ],
};

/** Line-angle: the 2-propyl cation next to an alcohol, CH₃–C⁺H–CH₂–OH (made up to exercise each rule). */
const lineAngle: Structure = {
  id: "cation",
  style: "line-angle",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.3, y: -0.75, charge: 1 },
    { id: "a3", el: "C", x: 2.6, y: 0 },
    { id: "a4", el: "O", x: 3.9, y: -0.75, h: 1, lp: 2 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
    { id: "b3", a: "a3", b: "a4", order: 1, stereo: "wedge" },
  ],
};

const letters = (svg: string) => [...svg.matchAll(/<text[^>]*class="atom"[^>]*>(.*?)<\/text>/g)].map((m) => m[1]);
const count = (svg: string, cls: string) => [...svg.matchAll(new RegExp(`class="${cls}"`, "g"))].length;

describe("2D structure renderer", () => {
  it("draws every atom as a letter in a full Lewis structure", () => {
    expect(letters(drawStructure(methoxide).svg).sort()).toEqual(["C", "H", "H", "H", "O"]);
  });

  it("draws every lone pair as two dots", () => {
    expect(count(drawStructure(methoxide).svg, "lone-pair-dot")).toBe(6);
  });

  it("marks a charged atom with its sign", () => {
    expect(drawStructure(methoxide).svg).toMatch(/class="charge"[^>]*>−</);
  });

  it("in line-angle, neutral carbons are corners but a charged carbon is a letter", () => {
    const { svg } = drawStructure(lineAngle);
    expect(letters(svg)).toEqual(["C", "OH"]);
    expect(svg).toMatch(/class="charge"[^>]*>\+</);
  });

  it("can hide charges or lone pairs when a Step asks for it", () => {
    expect(drawStructure(methoxide, ["charges"]).svg).not.toContain('class="charge"');
    expect(count(drawStructure(methoxide, ["lone-pairs"]).svg, "lone-pair-dot")).toBe(0);
  });

  it("draws a bond line per bond order and a wedge as a filled triangle", () => {
    const double: Structure = {
      id: "formaldehyde",
      style: "full",
      atoms: [
        { id: "a1", el: "C", x: 0, y: 0 },
        { id: "a2", el: "O", x: 1.5, y: 0, lp: 2 },
      ],
      bonds: [{ id: "b1", a: "a1", b: "a2", order: 2 }],
    };
    expect(count(drawStructure(double).svg, "bond-line")).toBe(2);
    expect(count(drawStructure(lineAngle).svg, "bond-wedge")).toBe(1);
  });

  it("gives each atom and bond a position for hit areas, scaled so a bond is 60 px", () => {
    const { atoms, bonds } = drawStructure(methoxide);
    expect(Math.hypot(atoms.a2.x - atoms.a1.x, atoms.a2.y - atoms.a1.y)).toBeCloseTo(60);
    expect(bonds.b1).toEqual({ x1: atoms.a1.x, y1: atoms.a1.y, x2: atoms.a2.x, y2: atoms.a2.y });
  });

  it("draws a dangling bond line to a `*` end, which gets no letter (a fragment, as in a problem set)", () => {
    // Oxygen with one single and one double bond to the rest of a molecule, one lone pair: O⁺ in PS1 Q1.
    const fragment: Structure = {
      id: "o-three-bonds",
      style: "full",
      atoms: [
        { id: "a1", el: "O", x: 0, y: 0, lp: 1, charge: 1 },
        { id: "a2", el: "*", x: -1.5, y: 0 },
        { id: "a3", el: "*", x: 1.5, y: 0 },
      ],
      bonds: [
        { id: "b1", a: "a1", b: "a2", order: 1 },
        { id: "b2", a: "a1", b: "a3", order: 2 },
      ],
    };
    const { svg, atoms } = drawStructure(fragment);
    expect(letters(svg)).toEqual(["O"]);
    expect(count(svg, "bond-line")).toBe(3);
    // The single bond runs all the way to its loose end.
    expect(svg).toContain(`x2="${atoms.a2.x}" y2="${atoms.a2.y}"`);
    // Loose ends carry no letter, so the drawing keeps no letter margin past them: it stays legible when small.
    expect(drawStructure(fragment).width).toBeLessThan(2 * 60 + 20);
  });

  it("rings an atom and outlines a bond a Step points at (shape, not colour alone)", () => {
    const { svg, atoms } = drawStructure(methoxide, [], { ring: ["a2"], outline: ["b1"] });
    expect(svg).toMatch(new RegExp(`<circle class="atom-ring" cx="${atoms.a2.x}" cy="${atoms.a2.y}"`));
    expect(count(svg, "bond-outline")).toBe(1);
    expect(drawStructure(methoxide).svg).not.toContain("atom-ring");
  });

  it("says where each lone pair is drawn, for Scenes that point at them", () => {
    const { lonePairs, atoms } = drawStructure(methoxide);
    expect(lonePairs.map((p) => p.atom)).toEqual(["a2", "a2", "a2"]);
    for (const p of lonePairs) expect(Math.hypot(p.x - atoms.a2.x, p.y - atoms.a2.y)).toBeGreaterThan(10);
    expect(drawStructure(methoxide, ["lone-pairs"]).lonePairs).toEqual([]);
  });
});
