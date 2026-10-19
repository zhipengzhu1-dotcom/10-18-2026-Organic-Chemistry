// Lesson 0's other new Scenes: crust-vs-body (s01 reveal), water-push (s04) and
// outer-electrons (s02's dot row). Screen-reader text as the spec words it; numbers
// only from the cited data.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { crustVsBody } from "../src/crust-vs-body/manifest.ts";
import CrustVsBody from "../src/crust-vs-body/CrustVsBody.tsx";
import { waterPush } from "../src/water-push/manifest.ts";
import WaterPush from "../src/water-push/WaterPush.tsx";
import { outerElectrons } from "../src/outer-electrons/manifest.ts";
import OuterElectrons from "../src/outer-electrons/OuterElectrons.tsx";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const citedFor = (refs: string[]) => Object.fromEntries(refs.map((ref) => [ref, find(data, ref)!]));

describe("crust-vs-body", () => {
  const cited = citedFor(crustVsBody.data);

  it("reads the two cited shares", () => {
    expect(crustVsBody.describe({}, 0, cited)).toBe("Two bars. Carbon is 0.02% of Earth's crust and 23% of the human body.");
  });

  it("labels both bars with the cited values and marks the axis break", () => {
    const svg = renderToStaticMarkup(createElement(CrustVsBody, { t: crustVsBody.poster.t, state: {}, aspect: "16:9", reducedMotion: false, cited }));
    expect(svg).toContain("Earth&#x27;s crust");
    expect(svg).toContain("Human body");
    expect(svg).toContain("0.02%");
    expect(svg).toContain("23%");
    expect(svg).toContain('class="axis-break"');
  });

  it("the crust bar is visible: at least a tenth as long as the body bar", () => {
    const svg = renderToStaticMarkup(createElement(CrustVsBody, { t: crustVsBody.poster.t, state: {}, aspect: "16:9", reducedMotion: false, cited }));
    const widths = [...svg.matchAll(/class="bar[^"]*" x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(2);
    expect(widths[0] / widths[1]).toBeGreaterThan(0.1);
  });
});

describe("water-push", () => {
  it("speaks the spec's screen-reader text", () => {
    expect(waterPush.describe({}, 0, {})).toBe(
      "Hydroxide, an oxygen with three lone pairs and one bond to hydrogen, and a hydrogen ion. One lone pair on oxygen swings over to the hydrogen ion and becomes a bond. The result is water: oxygen shares two pairs and keeps two lone pairs, so its shell holds 8. Each hydrogen holds 2.",
    );
  });

  it("starts as OH⁻ + H⁺ (8 dots on O) and ends as water with the new pair highlighted", () => {
    const at = (t: number) => renderToStaticMarkup(createElement(WaterPush, { t, state: {}, aspect: "16:9", reducedMotion: false, cited: {} }));
    expect(at(0)).toContain("H⁺");
    expect(at(0).match(/class="e"/g)).toHaveLength(8);
    expect(at(waterPush.duration)).not.toContain("H⁺");
    expect(at(waterPush.duration)).toContain('class="new-bond"');
    expect(at(waterPush.duration).match(/class="e"/g)).toHaveLength(8);
  });
});

describe("outer-electrons", () => {
  it("speaks the spec's screen-reader text", () => {
    expect(outerElectrons.describe({}, 0, {})).toBe(
      "Hydrogen has 1 outer electron, carbon 4, nitrogen 5, oxygen 6, fluorine 7. Neon has 8, a full shell, and reacts with almost nothing.",
    );
  });

  it("draws every outer electron as a dot: 1 + 4 + 5 + 6 + 7 + 8", () => {
    const svg = renderToStaticMarkup(createElement(OuterElectrons, { t: outerElectrons.poster.t, state: {}, aspect: "9:16", reducedMotion: false, cited: {} }));
    expect(svg.match(/class="e"/g)).toHaveLength(31);
    expect(svg).toContain("already full: neon reacts with almost nothing");
  });
});
