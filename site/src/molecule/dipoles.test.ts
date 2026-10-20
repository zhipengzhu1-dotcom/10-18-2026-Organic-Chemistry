// Where the 3D card draws bond-dipole arrows (Lesson 3 s11): on their bonds, or added tip to tail
// about the molecule's centre, with the net arrow from the chain's start to its end. Expected
// directions come from the geometry: water's net arrow points from between the H's toward O;
// CO₂'s chain closes on itself.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { viewMatrix } from "@astratron/content/molecule";
import { dipoleArrows, placeAtoms } from "./layout.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const lesson = organic.courses[0].units[0].lessons.find((l) => l.id === "u1-l03")!;
const s11 = lesson.steps.find((s) => s.id === "s11")!;
if (s11.type !== "rotate-and-identify") throw new Error("s11 is Rotate-and-identify");
const water = s11.molecule;
const co2 = s11.molecule.toggle![0];
const frame = { width: 400, height: 300, scale: 60, trueScale: false };

describe("bond-dipole arrows on the 3D card", () => {
  it("before Add, each arrow lies along its bond, from H toward O", () => {
    const R = viewMatrix(water.atoms, { plane: [1, 0, 2] });
    const { arrows, net } = dipoleArrows(water, R, frame, false);
    expect(arrows).toHaveLength(2);
    expect(net).toBeUndefined();
    const o = { x: 200, y: 150 }; // the centroid sits mid-frame; O is near it
    for (const a of arrows) {
      // The head is nearer O than the tail is.
      const d = (p: { x: number; y: number }) => Math.hypot(p.x - o.x, p.y - o.y);
      expect(d(a.to)).toBeLessThan(d(a.from) + 1e-9);
    }
  });

  it("added, water's chain gives a net arrow pointing toward O", () => {
    // All three atoms in the screen plane.
    const R = viewMatrix(water.atoms, { plane: [1, 0, 2] });
    const { net, zero } = dipoleArrows(water, R, frame, true);
    expect(zero).toBe(false);
    const placed = placeAtoms(water, R, frame);
    const between = { x: (placed[1].x + placed[2].x) / 2, y: (placed[1].y + placed[2].y) / 2 };
    const towardO = { x: placed[0].x - between.x, y: placed[0].y - between.y };
    const along = { x: net!.to.x - net!.from.x, y: net!.to.y - net!.from.y };
    // Parallel to the H-midpoint → O line, and the same way round.
    expect(along.x * towardO.x + along.y * towardO.y).toBeGreaterThan(0);
    expect(Math.abs(along.x * towardO.y - along.y * towardO.x)).toBeLessThan(1e-6 * Math.hypot(along.x, along.y) * Math.hypot(towardO.x, towardO.y));
  });

  it("added, CO₂'s two arrows end where the chain began: net zero", () => {
    const R = viewMatrix(co2.atoms);
    const { arrows, zero } = dipoleArrows(co2, R, frame, true);
    expect(zero).toBe(true);
    expect(arrows[1].to.x).toBeCloseTo(arrows[0].from.x, 6);
    expect(arrows[1].to.y).toBeCloseTo(arrows[0].from.y, 6);
  });
});
