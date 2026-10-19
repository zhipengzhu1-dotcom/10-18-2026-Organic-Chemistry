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
});

/** Formaldehyde as a Lewis structure: H:C::O with two lone pairs on O, all dots, no lines. */
const formaldehydeLewis: Structure = {
  id: "formaldehyde-lewis",
  style: "lewis",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "O", x: 1.5, y: 0, lp: 2 },
    { id: "a3", el: "H", x: -0.75, y: -1.3 },
    { id: "a4", el: "H", x: -0.75, y: 1.3 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
    { id: "b3", a: "a1", b: "a4", order: 1 },
  ],
};

/** Cyclohexene-like ring (one ring double bond, a1=a2) with an exocyclic C=O on a4: a hexagon of side 1.5. */
const hexagon = [0, 1, 2, 3, 4, 5].map((i) => {
  const t = (Math.PI / 3) * i;
  return { x: 1.5 * Math.cos(t), y: 1.5 * Math.sin(t) };
});
const ringDouble: Structure = {
  id: "ring",
  style: "line-angle",
  atoms: [
    ...hexagon.map((p, i) => ({ id: `a${i + 1}`, el: "C", ...p })),
    { id: "a7", el: "O", x: -3, y: 0, lp: 2 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
    { id: "b3", a: "a3", b: "a4", order: 1 },
    { id: "b4", a: "a4", b: "a5", order: 1 },
    { id: "b5", a: "a5", b: "a6", order: 1 },
    { id: "b6", a: "a6", b: "a1", order: 1 },
    { id: "b7", a: "a4", b: "a7", order: 2 },
  ],
};

/** The bond-line elements of the drawing as segments, in drawing order. */
const lines = (svg: string) =>
  [...svg.matchAll(/<line class="bond-line" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)].map((m) =>
    m.slice(1).map(Number),
  );
/** Distance from point (px, py) to the infinite line through two points. */
const offAxis = (px: number, py: number, [x1, y1]: number[], [x2, y2]: number[]) =>
  Math.abs((x2 - x1) * (y1 - py) - (x1 - px) * (y2 - y1)) / Math.hypot(x2 - x1, y2 - y1);

describe("double bonds in rings", () => {
  it("draws a ring double bond as one line on the axis and a shorter one inside the ring", () => {
    const d = drawStructure(ringDouble);
    const [p, q] = [d.atoms.a1, d.atoms.a2];
    const centre = { x: (d.atoms.a1.x + d.atoms.a4.x) / 2, y: (d.atoms.a1.y + d.atoms.a4.y) / 2 };
    const [first, second] = lines(d.svg);
    const onAxis = [first, second].find((l) => offAxis(l[0], l[1], [p.x, p.y], [q.x, q.y]) < 0.2)!;
    const inner = [first, second].find((l) => l !== onAxis)!;
    expect(onAxis).toBeDefined();
    const mid = { x: (inner[0] + inner[2]) / 2, y: (inner[1] + inner[3]) / 2 };
    const axisMid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    expect(Math.hypot(mid.x - centre.x, mid.y - centre.y)).toBeLessThan(Math.hypot(axisMid.x - centre.x, axisMid.y - centre.y));
    expect(Math.hypot(inner[2] - inner[0], inner[3] - inner[1])).toBeLessThan(Math.hypot(q.x - p.x, q.y - p.y));
  });

  it("keeps a double bond out of a ring centred on its axis", () => {
    const d = drawStructure(ringDouble);
    const exo = lines(d.svg).slice(-2);
    const [p, q] = [d.atoms.a4, d.atoms.a7];
    for (const l of exo) expect(offAxis(l[0], l[1], [p.x, p.y], [q.x, q.y])).toBeGreaterThan(2);
  });
});

describe("fading parts (for Scenes)", () => {
  it("draws an atom's letter, sign and lone pairs, or a bond's lines, at the opacity asked for", () => {
    const { svg } = drawStructure(methoxide, [], { fade: { a2: 0.25, b2: 0 } });
    expect(svg).toMatch(/<text class="atom"[^>]*opacity="0.25"[^>]*>O</);
    expect(svg).toMatch(/<text class="charge"[^>]*opacity="0.25"/);
    expect([...svg.matchAll(/class="lone-pair-dot"[^>]*opacity="0.25"/g)]).toHaveLength(6);
    expect([...svg.matchAll(/class="bond-line"[^>]*opacity="0"/g)]).toHaveLength(1);
    expect(svg).toMatch(/<text class="atom"(?![^>]*opacity)[^>]*>C</);
  });
});

describe("Lewis style", () => {
  it("draws every atom as a letter and each shared pair as two dots between its atoms, with no lines", () => {
    const { svg } = drawStructure(formaldehydeLewis);
    expect(letters(svg).sort()).toEqual(["C", "H", "H", "O"]);
    expect(count(svg, "bond-line")).toBe(0);
    // C::O is two pairs, each C:H one pair: 4 shared pairs, 8 dots.
    expect(count(svg, "bond-dot")).toBe(8);
    expect(count(svg, "lone-pair-dot")).toBe(4);
  });
});
