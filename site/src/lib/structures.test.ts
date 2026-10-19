import { expect, it } from "vitest";
import type { Structure } from "@astratron/content";
import { drawView } from "./structures.ts";

const propane: Structure = {
  id: "propane",
  style: "line-angle",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.299, y: -0.75 },
    { id: "a3", el: "C", x: 2.598, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
  ],
};

it("a one-atom region (a methyl) gets a wider hit circle than an atom, so it stays 48 px when a wide drawing shrinks", () => {
  const { drawn } = drawView({ structure: propane, hide: [] }, [
    { id: "a1", kind: "atom", label: "C" },
    { id: "methyl", kind: "region", label: "The CH₃", atoms: ["a3"] },
    { id: "pair", kind: "region", label: "Two", atoms: ["a1", "a2"] },
  ]);
  expect(drawn!.hits!.a1.circles[0].r).toBe(24);
  expect(drawn!.hits!.methyl.circles[0].r).toBe(34);
  expect(drawn!.hits!.pair.circles.map((c) => c.r)).toEqual([24, 24]);
});
