// Lesson 6's Scenes (#84): acetate-bond-lengths, formaldehyde-pi-shift,
// three-moves and acetate-hybrid, plus the bracketed-contributors drawing
// they share. Expected text and numbers come from the Lesson 6 spec and from
// the computed geometry files (#67), written out here as known-good literals.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { buildContent, contentRoot, type Structure } from "@astratron/content";
import { find } from "@astratron/content/data";
import { sceneRegistry } from "../src/index.ts";
import { drawContributors } from "../src/structure/contributors.ts";
import { drawStructure } from "../src/structure/render.ts";
import { lesson6Structures } from "../src/lesson-06/structures.ts";
import { panelBoxes } from "../src/lesson-06/layout.ts";
import { frameSize } from "../src/frame.ts";
import type { Aspect } from "../src/types.ts";

// yaml is the content package's dependency, not this one's.
const { parse } = createRequire(join(contentRoot, "../package.json"))("yaml") as { parse: (text: string) => unknown };
const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const aspects: Aspect[] = ["16:9", "9:16"];

function frame(id: string, t: number, state: Record<string, string> = {}, aspect: Aspect = "16:9", reducedMotion = false) {
  const { manifest, Component } = sceneRegistry[id];
  const cited = Object.fromEntries(manifest.data.map((ref) => [ref, find(organic.data, ref)!]));
  const full = { ...Object.fromEntries(Object.entries(manifest.states).map(([k, s]) => [k, s.default])), ...state };
  return renderToStaticMarkup(createElement(Component, { t, state: full, aspect, reducedMotion, cited }));
}
const count = (text: string, part: string) => text.split(part).length - 1;
const poster = (id: string) => sceneRegistry[id].manifest.poster.t;

describe("bracketed contributors", () => {
  const formaldehyde = lesson6Structures.formaldehyde;
  const acetate = lesson6Structures.acetate;

  it("draws each contributor once, joined by ↔ and closed in one pair of brackets", () => {
    const drawn = drawContributors([drawStructure(formaldehyde), drawStructure(acetate)]);
    expect(count(drawn.svg, "↔")).toBe(1);
    expect(count(drawn.svg, 'class="contributor-bracket"')).toBe(2);
    expect(count(drawn.svg, 'class="contributor"')).toBe(2);
    expect(drawn.offsets).toHaveLength(2);
    expect(drawn.offsets[1].x).toBeGreaterThan(drawn.offsets[0].x + drawStructure(formaldehyde).width);
    expect(drawn.width).toBeGreaterThan(drawStructure(formaldehyde).width + drawStructure(acetate).width);
  });

  it("three contributors get two ↔", () => {
    const d = drawStructure(formaldehyde);
    expect(count(drawContributors([d, d, d]).svg, "↔")).toBe(2);
  });
});

describe("Lesson 6 Scene structures", () => {
  it("are the content structure files, unchanged", () => {
    for (const [id, structure] of Object.entries(lesson6Structures)) {
      const file = parse(readFileSync(join(contentRoot, "organic/structures", `${id}.yaml`), "utf8")) as Structure;
      expect(structure, id).toEqual({ ...file, bonds: file.bonds ?? [] });
    }
  });
});

describe("Lesson 6 Scene layout", () => {
  for (const aspect of aspects)
    for (const n of [1, 2, 3])
      it(`${n} panel(s) sit inside the ${aspect} frame without overlapping`, () => {
        const { width, height } = frameSize(aspect);
        const boxes = panelBoxes(aspect, n);
        expect(boxes).toHaveLength(n);
        for (const b of boxes) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(width);
          expect(b.y + b.h).toBeLessThanOrEqual(height);
        }
        for (let i = 1; i < n; i++) {
          const [p, q] = [boxes[i - 1], boxes[i]];
          expect(p.x + p.w <= q.x || p.y + p.h <= q.y).toBe(true);
        }
      });

  it("panels run in a row at 16:9 and a column at 9:16", () => {
    expect(panelBoxes("16:9", 3)[1].x).toBeGreaterThan(panelBoxes("16:9", 3)[0].x);
    expect(panelBoxes("9:16", 3)[1].y).toBeGreaterThan(panelBoxes("9:16", 3)[0].y);
  });
});

describe("acetate-bond-lengths", () => {
  const scene = sceneRegistry["acetate-bond-lengths"];

  it("reads its lengths from the two computed geometry files", () => {
    expect(scene.manifest.data.sort()).toEqual(
      ["acetate/r.CO.a", "acetate/r.CO.b", "acetic-acid/r.CO.double", "acetic-acid/r.CO.single"].sort(),
    );
  });

  it("the poster shows both molecules with every C–O length to 2 decimals, labelled computed", () => {
    for (const aspect of aspects) {
      const svg = frame("acetate-bond-lengths", poster("acetate-bond-lengths"), { molecule: "both" }, aspect);
      expect(svg).toContain("1.20 Å");
      expect(svg).toContain("1.36 Å");
      expect(count(svg, "1.25 Å")).toBe(2);
      expect(svg).toContain("Acetic acid");
      expect(svg).toContain("Acetate");
      expect(svg.toLowerCase()).toContain("computed");
    }
  });

  it("molecule: acid shows only acetic acid; anion only acetate", () => {
    const acid = frame("acetate-bond-lengths", poster("acetate-bond-lengths"), { molecule: "acid" });
    expect(acid).toContain("1.20 Å");
    expect(acid).not.toContain("1.25 Å");
    const anion = frame("acetate-bond-lengths", poster("acetate-bond-lengths"), { molecule: "anion" });
    expect(anion).toContain("1.25 Å");
    expect(anion).not.toContain("1.36 Å");
  });

  it("the screen-reader text is the spec's", () => {
    expect(scene.manifest.describe({ molecule: "both" }, 0)).toBe(
      "Acetic acid: one C–O bond is clearly shorter than the other. Acetate: both C–O bonds are the same length, and that length sits between acetic acid's two.",
    );
  });
});

describe("formaldehyde-pi-shift", () => {
  const { manifest } = sceneRegistry["formaldehyde-pi-shift"];

  it("opens on formaldehyde with the arrow, no charges yet", () => {
    const svg = frame("formaldehyde-pi-shift", 0.2);
    expect(svg).not.toContain("↔");
    expect(svg).not.toContain('class="charge"');
  });

  it("the poster is the bracketed pair H₂C=O ↔ H₂C⁺–O⁻", () => {
    const svg = frame("formaldehyde-pi-shift", manifest.poster.t);
    expect(count(svg, "↔")).toBe(1);
    expect(count(svg, 'class="contributor-bracket"')).toBe(2);
    expect(svg).toContain(">+</text>");
    expect(svg).toContain(">−</text>");
  });

  it("the screen-reader text is the spec's", () => {
    expect(manifest.describe({}, manifest.poster.t)).toBe(
      "Formaldehyde, H₂C double-bonded to O. A curved arrow starts on the C=O π bond and ends on oxygen. The pair becomes a lone pair on O: oxygen is now negative, carbon positive. No atom moves.",
    );
  });
});

describe("three-moves", () => {
  const { manifest } = sceneRegistry["three-moves"];

  it("the poster shows all three panels, each with its arrow and its move", () => {
    for (const aspect of aspects) {
      const svg = frame("three-moves", manifest.poster.t, { panel: "all" }, aspect);
      expect(count(svg, 'class="push-arrow"')).toBe(3);
      for (const label of ["Lone pair → bond", "Bond → atom", "Bond → next bond"]) expect(svg).toContain(label);
    }
  });

  it("panel 2 lights only the formaldehyde panel", () => {
    const svg = frame("three-moves", manifest.poster.t, { panel: "2" });
    expect(count(svg, 'data-lit="true"')).toBe(1);
    expect(svg).toContain('data-panel="2" data-lit="true"');
  });

  it("with panel all, the panels light in turn and then all together", () => {
    expect(count(frame("three-moves", 0.5, { panel: "all" }), 'data-lit="true"')).toBe(1);
    expect(frame("three-moves", 0.5, { panel: "all" })).toContain('data-panel="1" data-lit="true"');
    expect(count(frame("three-moves", manifest.duration, { panel: "all" }), 'data-lit="true"')).toBe(3);
  });

  it("the screen-reader text is the spec's", () => {
    expect(manifest.describe({ panel: "all" }, manifest.poster.t)).toBe(
      "Move one: the negative oxygen of acetate sends a lone pair into the bond to carbon. Move two: formaldehyde's π pair lands on oxygen. Move three: in the allyl cation, the C=C π pair slides one position toward the positive carbon.",
    );
  });
});

describe("acetate-hybrid", () => {
  const { manifest } = sceneRegistry["acetate-hybrid"];

  it("opens on the two contributors in brackets", () => {
    const svg = frame("acetate-hybrid", 0);
    expect(count(svg, "↔")).toBe(1);
  });

  it("the poster is the hybrid: dashed C–O bonds, δ− on each O, no lone pairs, equal lengths labelled", () => {
    for (const aspect of aspects) {
      const svg = frame("acetate-hybrid", manifest.poster.t, {}, aspect);
      expect(svg).not.toContain("↔");
      expect(count(svg, "δ−")).toBe(2);
      expect(count(svg, 'class="partial-bond"')).toBe(2);
      expect(svg).not.toContain("lone-pair-dot");
      expect(count(svg, "1.25 Å")).toBe(2);
    }
  });

  it("stage: hybrid holds the final frame from the start (the Wrap shows it)", () => {
    expect(frame("acetate-hybrid", 0, { stage: "hybrid" })).toBe(frame("acetate-hybrid", manifest.poster.t, { stage: "hybrid" }));
    expect(frame("acetate-hybrid", 0, { stage: "hybrid" })).toContain("δ−");
  });

  it("the screen-reader text is the spec's, and the Wrap's for the hybrid stage", () => {
    expect(manifest.describe({ stage: "blend" }, 0)).toBe(
      "The two acetate drawings merge into one: both C–O bonds dashed, each oxygen δ−, and both bonds labelled with the same length.",
    );
    expect(manifest.describe({ stage: "hybrid" }, 0)).toBe("Acetate's hybrid: charge shared by both oxygens.");
  });
});
