// Lesson 2's Scenes: h-fill, ethanol-three-ways, lone-pair-fill. Counts are
// checked against the Lesson spec's worked numbers (an independent source).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sceneRegistry } from "../src/index.ts";
import { frameSize, type Box } from "../src/frame.ts";
import { layoutHFill } from "../src/h-fill/HFill.tsx";
import { layoutEthanol } from "../src/ethanol-three-ways/EthanolThreeWays.tsx";
import { layoutLonePairs } from "../src/lone-pair-fill/LonePairFill.tsx";
import type { Aspect, SceneState } from "../src/types.ts";

const frame = (id: string, state: SceneState, t: number, aspect: Aspect = "16:9") => {
  const { manifest, Component } = sceneRegistry[id];
  const full = { ...Object.fromEntries(Object.entries(manifest.states).map(([k, s]) => [k, s.default])), ...state };
  return renderToStaticMarkup(createElement(Component, { t, state: full, aspect, reducedMotion: false, cited: {} }));
};
const inside = (box: Box, aspect: Aspect) => {
  const { width, height } = frameSize(aspect);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.w).toBeLessThanOrEqual(width + 1e-6);
  expect(box.y + box.h).toBeLessThanOrEqual(height + 1e-6);
};

describe("h-fill", () => {
  it.each([
    ["estradiol", 24],
    ["cyclohexanone", 10],
    ["limonene", 16],
  ])("%s's counter ends at the spec's %i H's, every carbon written out", (molecule, total) => {
    const end = frame("h-fill", { molecule }, sceneRegistry["h-fill"].manifest.poster.t);
    expect(end).toContain(`H: ${total}`);
    expect(end).not.toContain("bonds →");
  });

  it("starts from the H's the drawing already shows (estradiol: two OH and three stereo H's)", () => {
    expect(frame("h-fill", { molecule: "estradiol" }, 0)).toContain("H: 5");
    expect(frame("h-fill", { molecule: "cyclohexanone" }, 0)).toContain("H: 0");
  });

  it("labels the carbon it is filling with its bonds and H's", () => {
    // Cyclohexanone fills in structure-file order; its first carbon is the C=O carbon.
    expect(frame("h-fill", { molecule: "cyclohexanone" }, 1.6)).toContain("4 bonds → 0 H");
  });

  it("shows the final drawing at any time when asked (the Wrap)", () => {
    expect(frame("h-fill", { molecule: "estradiol", show: "final" }, 0)).toContain("H: 24");
  });

  it("describes the count for a screen reader", () => {
    expect(sceneRegistry["h-fill"].manifest.describe({ molecule: "limonene", show: "fill" }, 0, {})).toContain("ends at 16");
  });

  for (const aspect of ["16:9", "9:16"] as Aspect[])
    it(`lays out inside the ${aspect} frame`, () => Object.values(layoutHFill(aspect)).forEach((b) => inside(b, aspect)));
});

describe("ethanol-three-ways", () => {
  it("stage 1 starts as dots and ends as lines with O's lone pairs kept", () => {
    const start = frame("ethanol-three-ways", { stage: "1" }, 0);
    const end = frame("ethanol-three-ways", { stage: "1" }, 6);
    expect(start).toContain("Lewis");
    expect(start).toMatch(/class="bond-dot"(?![^>]*opacity="0")/);
    expect(end).toContain("Kekulé");
    expect([...end.matchAll(/class="lone-pair-dot"/g)]).toHaveLength(4);
  });

  it("stage 2 ends as the line-angle zigzag ending in OH", () => {
    const end = frame("ethanol-three-ways", { stage: "2" }, 6);
    expect(end).toContain("line-angle");
    expect(end).toMatch(/>OH</);
  });

  it("all ends on the three drawings in a row, labelled", () => {
    const end = frame("ethanol-three-ways", { stage: "all" }, 6);
    for (const name of ["Lewis", "Kekulé", "line-angle"]) expect(end).toContain(`>${name}<`);
  });

  for (const aspect of ["16:9", "9:16"] as Aspect[])
    it(`lays out inside the ${aspect} frame`, () => {
      const { main, caption, row } = layoutEthanol(aspect);
      [main, caption, ...row.flatMap((r) => [r.box, r.caption])].forEach((b) => inside(b, aspect));
    });
});

describe("lone-pair-fill", () => {
  it.each([
    ["acetamide", 3],
    ["acetaminophen", 5],
  ])("%s ends with the spec's %i lone pairs drawn and the chip saying so", (molecule, pairs) => {
    const end = frame("lone-pair-fill", { molecule }, 6);
    expect([...end.matchAll(/class="lone-pair-dot"(?![^>]*opacity="0")/g)]).toHaveLength(pairs * 2);
    expect(end).toContain("Lone pairs shown");
  });

  it("starts with every lone pair hidden", () => {
    const start = frame("lone-pair-fill", { molecule: "pattern-strip" }, 0);
    expect(start).toContain("Lone pairs hidden");
    expect([...start.matchAll(/class="lone-pair-dot"(?![^>]*opacity="0")/g)]).toHaveLength(0);
  });

  it("reads each atom's pattern", () => {
    const end = frame("lone-pair-fill", { molecule: "pattern-strip" }, 6);
    for (const label of ["O, 2 bonds → 2 lone pairs", "N, 3 bonds → 1 lone pair", "Cl, 1 bond → 3 lone pairs"]) expect(end).toContain(label);
  });

  for (const aspect of ["16:9", "9:16"] as Aspect[])
    it(`lays out inside the ${aspect} frame`, () => {
      const { chip, boxes } = layoutLonePairs(aspect, 3);
      [chip, ...boxes].forEach((b) => inside(b, aspect));
    });
});
