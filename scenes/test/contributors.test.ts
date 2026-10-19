// Lesson 7's Scenes: the structures they draw are the content tree's own files,
// their layouts stay inside the frame at both aspects, and the C–N lengths
// they print are the cited ones (and stay hidden until the Hook is answered).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import * as structures from "../src/contributors/structures.ts";
import { sceneRegistry } from "../src/index.ts";
import { frameSize, type Box } from "../src/frame.ts";
import { layoutPanels } from "../src/amide-cn-lengths/AmideCnLengths.tsx";
import { layoutHybrid } from "../src/amide-hybrid/AmideHybrid.tsx";
import { layoutLadder } from "../src/rule-ladder/RuleLadder.tsx";
import { layoutSites } from "../src/carbonyl-sites/CarbonylSites.tsx";
import type { Aspect } from "../src/types.ts";

const yaml = createRequire(new URL("../../content/package.json", import.meta.url))("yaml") as { parse: (text: string) => unknown };
const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const aspects: Aspect[] = ["16:9", "9:16"];

it("the Scenes draw the content tree's structure files, unchanged", () => {
  for (const s of Object.values(structures)) {
    const file = yaml.parse(readFileSync(new URL(`../../content/subjects/organic/structures/${s.id}.yaml`, import.meta.url), "utf8"));
    expect(s).toEqual(file);
  }
});

describe("layouts stay inside the frame", () => {
  const inside = (aspect: Aspect, boxes: Box[]) => {
    const { width, height } = frameSize(aspect);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(width);
      expect(b.y + b.h).toBeLessThanOrEqual(height);
    }
  };
  for (const aspect of aspects) {
    it(aspect, () => {
      for (const molecule of ["all", "methylamine", "acetamide", "methanimine"] as const)
        inside(aspect, layoutPanels(aspect, molecule).panels.map((p) => p.box));
      const h = layoutHybrid(aspect);
      inside(aspect, [h.major, h.minor, h.bracket, h.hybrid]);
      const l = layoutLadder(aspect);
      inside(aspect, [...l.rungs, ...l.cards]);
      const s = layoutSites(aspect);
      inside(aspect, [s.neutral, s.polar, s.bracket, s.hybrid]);
    });
  }
});

describe("amide-cn-lengths", () => {
  const { manifest, Component } = sceneRegistry["amide-cn-lengths"];
  const cited = Object.fromEntries(manifest.data.map((ref) => [ref, find(data, ref)!]));
  const markup = (labels: string, t: number) =>
    renderToStaticMarkup(createElement(Component, { t, state: { molecule: "all", labels }, aspect: "16:9", reducedMotion: false, cited }));

  it("prints each molecule's cited C–N length, to 2 decimals, once the labels are shown", () => {
    const html = markup("shown", manifest.poster.t);
    expect(manifest.data).toEqual(["methylamine/r.CN", "acetamide/r.CN", "methanimine/r.CN"]);
    for (const ref of manifest.data) expect(html).toContain(find(data, ref)!.display);
    expect(find(data, "acetamide/r.CN")!.display).toMatch(/^\d\.\d\d Å$/);
  });

  it("prints no length while the Hook's question is open", () => {
    expect(markup("hidden", manifest.poster.t)).not.toContain("Å");
  });
});
