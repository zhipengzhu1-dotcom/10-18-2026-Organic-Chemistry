// Orbital marks (Lesson 8 s11): N's lone pair labelled "HOMO", and boron's empty p orbital drawn as a
// faint dashed two-lobe outline labelled "LUMO (empty)". Drawing aids, not computed surfaces.
import { describe, expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { drawStructure } from "./render.ts";

const s = 0.866 * 1.5;
const nh3Bf3: Structure = {
  id: "nh3-bf3",
  style: "full",
  atoms: [
    { id: "a1", el: "N", x: 3, y: 0, lp: 1 },
    { id: "a2", el: "B", x: 0, y: 0 },
    { id: "a3", el: "F", x: -1.5, y: 0, lp: 3 },
    { id: "a4", el: "F", x: -0.75, y: -s, lp: 3 },
    { id: "a5", el: "F", x: -0.75, y: s, lp: 3 },
    { id: "a6", el: "H", x: 3.75, y: -s },
    { id: "a7", el: "H", x: 3.75, y: s },
    { id: "a8", el: "H", x: 4.5, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a2", b: "a3", order: 1 },
    { id: "b2", a: "a2", b: "a4", order: 1 },
    { id: "b3", a: "a2", b: "a5", order: 1 },
    { id: "b4", a: "a1", b: "a6", order: 1 },
    { id: "b5", a: "a1", b: "a7", order: 1 },
    { id: "b6", a: "a1", b: "a8", order: 1 },
  ],
};
const marks = [
  { atom: "a1", kind: "lone-pair" as const, text: "HOMO" },
  { atom: "a2", kind: "empty-p" as const, text: "LUMO (empty)" },
];

describe("orbital marks on a structure", () => {
  const d = drawStructure(nh3Bf3, [], { marks });

  it("label N's lone pair HOMO, just below the pair", () => {
    const [label] = [...d.svg.matchAll(/<text class="orbital-mark" x="([\d.]+)" y="([\d.]+)"[^>]*>HOMO<\/text>/g)];
    expect(label).toBeDefined();
    const lp = d.lonePairs.find((p) => p.atom === "a1")!;
    expect(Number(label[1])).toBeCloseTo(lp.x, 0);
    expect(Number(label[2])).toBeGreaterThan(lp.y);
  });

  it("draw boron's empty p orbital as two dashed lobes, one each side of B, clear of its bonds, labelled LUMO (empty)", () => {
    const lobes = [...d.svg.matchAll(/<ellipse class="empty-p" cx="([-\d.]+)" cy="([-\d.]+)"[^>]*stroke-dasharray/g)];
    expect(lobes).toHaveLength(2);
    const b = d.atoms.a2;
    const [l1, l2] = lobes.map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    // Opposite sides of B, on one line through it.
    expect((l1.x - b.x) * (l2.x - b.x) + (l1.y - b.y) * (l2.y - b.y)).toBeLessThan(0);
    // Here the F's point left, so the lobes stand up and down.
    expect(Math.abs(l1.y - b.y)).toBeGreaterThan(Math.abs(l1.x - b.x));
    expect(d.svg).toContain(">LUMO (empty)</text>");
  });

  it("draws no marks unless asked", () => {
    const plain = drawStructure(nh3Bf3);
    expect(plain.svg).not.toContain("orbital-mark");
    expect(plain.svg).not.toContain("empty-p");
  });
});
