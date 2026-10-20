// Atom tags (#82): a structure file may number its atoms for the Student ("1" … "5" on
// pent-1-en-4-yne's carbons, Lesson 4's u1-hyb-tap-sp2), drawn small beside each letter.
import { describe, expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { drawStructure } from "../src/structure/render.ts";

const ethane: Structure = {
  id: "ethane",
  style: "full",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0, tag: "1" },
    { id: "a2", el: "C", x: 1.5, y: 0, tag: "2" },
  ],
  bonds: [{ id: "b1", a: "a1", b: "a2", order: 1 }],
};

describe("atom tags", () => {
  it("draws each tag beside its atom, smaller than the letter, and never over a bond", () => {
    const d = drawStructure(ethane);
    const tags = [...d.svg.matchAll(/<text class="atom-tag" x="([\d.-]+)" y="([\d.-]+)"[^>]*>(\d)<\/text>/g)];
    expect(tags.map((t) => t[3])).toEqual(["1", "2"]);
    for (const [, x, y, label] of tags) {
      const at = d.atoms[`a${label}`];
      const dist = Math.hypot(Number(x) - at.x, Number(y) - at.y);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(30);
      // Not along the bond: the tag's direction from its atom is far from the bond's.
      const other = d.atoms[label === "1" ? "a2" : "a1"];
      const toTag = Math.atan2(Number(y) - at.y, Number(x) - at.x);
      const toBond = Math.atan2(other.y - at.y, other.x - at.x);
      const turn = Math.abs(((toTag - toBond + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      expect(turn).toBeGreaterThan(Math.PI / 4);
    }
  });

  it("draws nothing extra for atoms without a tag", () => {
    const plain = { ...ethane, atoms: ethane.atoms.map(({ tag: _, ...a }) => a) };
    expect(drawStructure(plain).svg).not.toContain("atom-tag");
  });
});
