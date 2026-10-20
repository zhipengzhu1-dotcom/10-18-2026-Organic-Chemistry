// The right-angle mark (Lesson 3 s01: the flat Lewis CH₄ "with a right-angle mark between the top
// H and the right H"): a drawing mark at the middle atom, between its bonds to the other two.
import { describe, expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { drawStructure } from "./render.ts";

const flatMethane: Structure = {
  id: "methane",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "H", x: 1.5, y: 0 },
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

describe("right-angle mark", () => {
  it("draws one mark in the corner between the top H and the right H", () => {
    const d = drawStructure(flatMethane, [], { corner: ["a4", "a1", "a2"] });
    const marks = [...d.svg.matchAll(/<polyline class="corner-mark" points="([^"]+)"/g)];
    expect(marks).toHaveLength(1);
    const pts = marks[0][1].split(" ").map((p) => p.split(",").map(Number));
    const c = d.atoms.a1;
    // Every point of the mark is up and to the right of the C (y grows downward in SVG).
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(c.x);
      expect(y).toBeLessThanOrEqual(c.y);
    }
  });

  it("draws nothing without a corner", () => {
    expect(drawStructure(flatMethane).svg).not.toContain("corner-mark");
  });
});
