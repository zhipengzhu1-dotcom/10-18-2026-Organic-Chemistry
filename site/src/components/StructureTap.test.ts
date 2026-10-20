// A Tap drawing too wide for the player column to keep every hit area at 48 px (Met-enkephalin, #87)
// stays at the width where its smallest hit is 48 px and scrolls sideways inside its own box; a
// drawing that fits that way (amoxicillin's regions) shrinks into the column as before.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TapStep } from "@astratron/content";
import StructureTap from "./StructureTap.tsx";

/** A drawing `width` units wide whose one region hit is a circle of radius `r`. */
const step = (width: number, r: number) =>
  ({
    id: "s01",
    phase: "build",
    type: "tap-to-identify",
    prompt: "Tap it.",
    structure: {
      structure: { id: "x", style: "full", atoms: [], bonds: [] },
      hide: [],
      drawn: { svg: "<svg></svg>", viewBox: `0 0 ${width} 300`, hits: { g: { circles: [{ x: 10, y: 10, r }], segments: [] } } },
    },
    targets: [{ id: "g", kind: "region", label: "A group.", atoms: ["a1"] }],
    answer: ["g"],
    reveal: "It.",
  }) as unknown as TapStep;
const html = (width: number, r: number) =>
  renderToStaticMarkup(createElement(StructureTap, { step: step(width, r), picked: [], answer: [], locked: false, onToggle: () => {} }));

describe("Tap drawing width", () => {
  it("a drawing whose 48 px hits need more than the 640 px column scrolls sideways at that width", () => {
    // 1110 units with 56-unit hits: 48 px needs 1110 × 48 / 56 ≈ 952 px.
    const wide = html(1110, 28);
    expect(wide).toContain('class="tap-scroll"');
    expect(wide).toMatch(/class="tap-structure"[^>]*min-width:952px/);
  });

  it("a drawing that keeps 48 px hits inside the column has no scroller", () => {
    for (const fits of [html(692, 28), html(540, 24)]) {
      expect(fits).not.toContain("tap-scroll");
      expect(fits).not.toContain("min-width");
    }
  });
});
