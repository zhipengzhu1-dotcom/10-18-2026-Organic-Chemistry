import { describe, expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { hydrogenCount, impliedHydrogens } from "@astratron/content/valence";
import { withHydrogens } from "./hydrogens.ts";

/** Cyclohexanone, line-angle, =O up (as Lesson 2 draws it). */
const hexagon = [0, 1, 2, 3, 4, 5].map((i) => {
  const t = -Math.PI / 2 + (Math.PI / 3) * i;
  return { x: 1.5 * Math.cos(t), y: 1.5 * Math.sin(t) };
});
const cyclohexanone: Structure = {
  id: "cyclohexanone",
  style: "line-angle",
  atoms: [{ id: "a1", el: "O", x: 0, y: -3, lp: 2 }, ...hexagon.map((p, i) => ({ id: `a${i + 2}`, el: "C", ...p }))],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    ...[2, 3, 4, 5, 6, 7].map((n, i) => ({ id: `b${i + 2}`, a: `a${n}`, b: `a${n === 7 ? 2 : n + 1}`, order: 1 as const })),
  ],
};

const carbons = ["a2", "a3", "a4", "a5", "a6", "a7"];

describe("withHydrogens: a line-angle drawing with chosen carbons written out", () => {
  it("writes each chosen carbon's letter and draws its implied H's as atoms, so the count is unchanged", () => {
    const full = withHydrogens(cyclohexanone, carbons);
    expect(full.atoms.filter((a) => a.el === "H")).toHaveLength(10);
    expect(full.atoms.filter((a) => a.el === "C").every((a) => a.letter)).toBe(true);
    expect(hydrogenCount(full)).toBe(hydrogenCount(cyclohexanone));
    expect(Object.values(impliedHydrogens(full)).every((n) => n === 0)).toBe(true);
  });

  it("leaves the other carbons as corners", () => {
    const some = withHydrogens(cyclohexanone, ["a3"]);
    expect(some.atoms.filter((a) => a.el === "H")).toHaveLength(2);
    expect(some.atoms.find((a) => a.id === "a4")!.letter).toBeFalsy();
    expect(hydrogenCount(some)).toBe(10);
  });

  it("puts each H one bond from its carbon, clear of the carbon's other bonds", () => {
    const full = withHydrogens(cyclohexanone, carbons);
    const at = new Map(full.atoms.map((a) => [a.id, a]));
    for (const bond of full.bonds.filter((b) => at.get(b.b)!.el === "H")) {
      const [c, h] = [at.get(bond.a)!, at.get(bond.b)!];
      expect(Math.hypot(h.x - c.x, h.y - c.y)).toBeCloseTo(1.5 * 0.8, 1);
      const dir = Math.atan2(h.y - c.y, h.x - c.x);
      for (const other of full.bonds.filter((b) => b !== bond && (b.a === c.id || b.b === c.id))) {
        const n = at.get(other.a === c.id ? other.b : other.a)!;
        const d = Math.abs(((Math.atan2(n.y - c.y, n.x - c.x) - dir + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        expect(d).toBeGreaterThan(0.5);
      }
    }
  });

  it("names new atoms and bonds after their carbon, so a Scene can fade them in", () => {
    const some = withHydrogens(cyclohexanone, ["a3"]);
    expect(some.atoms.map((a) => a.id)).toContain("a3-h1");
    expect(some.bonds.map((b) => b.id)).toContain("a3-hb1");
  });
});
