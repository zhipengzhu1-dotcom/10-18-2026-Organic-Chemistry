// Hit areas of Tap targets (drawView). A region (a fixed atom set, e.g. one S)
// gets a hit circle larger than an atom's, invisibly, so it stays a 48 px
// target when a wide molecule is scaled down to fit the player (Lesson 5 spec,
// amoxicillin); neighbouring regions' circles still never overlap.
import { describe, expect, it } from "vitest";
import type { Structure, TapTarget } from "@astratron/content";
import { drawView } from "./structures.ts";

/** Propane-like zigzag, one link per 1.5 units: C–S–C. */
const sulfide: Structure = {
  id: "sulfide",
  style: "line-angle",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "S", x: 1.3, y: -0.75 },
    { id: "a3", el: "C", x: 2.6, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
  ],
};

describe("Tap hit areas", () => {
  it("an atom target keeps its 48 px circle", () => {
    const targets: TapTarget[] = [{ id: "a2", kind: "atom", label: "S" }];
    const hit = drawView({ structure: sulfide, hide: [] }, targets).drawn!.hits!.a2;
    expect(hit.circles[0].r * 2).toBe(48);
  });

  it("a region's circles are enlarged to 56 px, and neighbouring regions' circles stay apart", () => {
    const targets: TapTarget[] = [
      { id: "left", kind: "region", label: "C", atoms: ["a1"] },
      { id: "s", kind: "region", label: "S", atoms: ["a2"] },
    ];
    const hits = drawView({ structure: sulfide, hide: [] }, targets).drawn!.hits!;
    const [p, q] = [hits.left.circles[0], hits.s.circles[0]];
    expect(q.r * 2).toBe(56);
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeGreaterThan(p.r + q.r);
  });
});
