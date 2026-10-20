// Lesson 8's React Scenes (#86): mo-filler (the s04 signature Manipulate) and frontier-ladder
// (s07 reveal, s10). Expected text comes from the Lesson spec
// (docs/specs/unit-1/lesson-08-molecular-orbitals.md); expected numbers from the cited data.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { fill, moFiller } from "../src/mo-filler/manifest.ts";
import MoFiller from "../src/mo-filler/MoFiller.tsx";
import { frontierLadder, ladders } from "../src/frontier-ladder/manifest.ts";
import FrontierLadder from "../src/frontier-ladder/FrontierLadder.tsx";
import { stateAt } from "../src/timeline.ts";

const data = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!.data;
const cited = Object.fromEntries(frontierLadder.data.map((ref) => [ref, find(data, ref)!]));
const shown = (ref: string) => cited[ref].display.replace(/\s*eV$/, "");

describe("mo-filler: electrons fill the lowest level with room, two per level", () => {
  it("counts bonding, antibonding and the bond order for 1 to 4 electrons", () => {
    expect([1, 2, 3, 4].map((n) => fill(n))).toEqual([
      { bonding: 1, antibonding: 0, order: "½" },
      { bonding: 2, antibonding: 0, order: "1" },
      { bonding: 2, antibonding: 1, order: "½" },
      { bonding: 2, antibonding: 2, order: "0" },
    ]);
  });

  it("announces each count as the spec words it, naming H₂ at 2 and He₂ at 4", () => {
    const say = (electrons: number) => moFiller.describe({ electrons, show: "one" }, 0, {});
    expect(say(3)).toMatch(/^3 electrons\. Bonding 2, antibonding 1\. Bond order one half\./);
    expect(say(2)).toMatch(/^2 electrons\. Bonding 2, antibonding 0\. Bond order 1\. This is H₂\./);
    expect(say(4)).toMatch(/^4 electrons\. Bonding 2, antibonding 2\. Bond order 0\. This is He₂\./);
    expect(say(1)).toContain("Two 1s levels at the sides. In the middle, sigma below and sigma star above. Not to scale.");
  });

  it("is a stepper the Student works with + and −, starting at 1", () => {
    expect(moFiller.states.electrons).toMatchObject({ kind: "range", min: 1, max: 4, step: 1, default: 1, stepper: true });
  });

  it("draws the live counter, the half-arrow electrons and the not-to-scale label", () => {
    const svg = renderToStaticMarkup(createElement(MoFiller, { t: 0, state: { electrons: 3, show: "one" }, aspect: "16:9", reducedMotion: false, cited: {} }));
    expect(svg.replace(/<[^>]+>/g, " ")).toMatch(/bonding 2 · antibonding 1\s+bond order \(2 − 1\) ÷ 2 = ½/);
    expect(svg).toContain("not to scale");
    expect(svg.match(/class="electron /g)).toHaveLength(3);
  });

  it("the Rank Problem's reveal shows H₂, He₂⁺ and He₂ side by side with bond orders 1, ½, 0", () => {
    const svg = renderToStaticMarkup(createElement(MoFiller, { t: 0, state: { electrons: 4, show: "three" }, aspect: "9:16", reducedMotion: false, cited: {} }));
    for (const text of ["H₂", "He₂⁺", "He₂", "bond order 1", "bond order ½", "bond order 0"]) expect(svg).toContain(text);
    expect(moFiller.describe({ electrons: 4, show: "three" }, 0, {})).toBe(
      "H₂: two bonding, none antibonding, bond order 1. He₂ plus: two bonding, one antibonding, one half. He₂: two and two, zero.",
    );
  });

  it("its video counts up to He₂ and rests there on the poster frame", () => {
    expect(stateAt(moFiller, moFiller.video.poster).electrons).toBe(4);
  });
});

describe("frontier-ladder: computed levels on one shared axis", () => {
  it("reads the spec's s07 screen-reader text from the cited energies", () => {
    const text = frontierLadder.describe({ molecules: "ethane-ethylene", flow: "none", ring: "none" }, 0, cited);
    expect(text).toBe(
      `Two energy ladders, computed. Ethane: HOMO ${shown("ethane-b3lyp-orbitals/homo")}, LUMO ${shown("ethane-b3lyp-orbitals/lumo")} electron-volts, gap ${shown("ethane-b3lyp-orbitals/gap")}. ` +
        `Ethylene: HOMO ${shown("ethylene-b3lyp-orbitals/homo")}, LUMO ${shown("ethylene-b3lyp-orbitals/lumo")}, gap ${shown("ethylene-b3lyp-orbitals/gap")}. Ethylene's HOMO is higher and its gap smaller.`,
    );
  });

  it("reads the spec's s10 screen-reader text, with both flows", () => {
    const text = frontierLadder.describe({ molecules: "nh3-bf3", flow: "none", ring: "none" }, 0, cited);
    expect(text).toBe(
      `Two energy ladders, computed. Ammonia: HOMO ${shown("ammonia-b3lyp-orbitals/homo")}, LUMO ${shown("ammonia-b3lyp-orbitals/lumo")} electron-volts. ` +
        `Boron trifluoride: HOMO ${shown("boron-trifluoride-b3lyp-orbitals/homo")}, LUMO ${shown("boron-trifluoride-b3lyp-orbitals/lumo")}. ` +
        `From ammonia's HOMO up to boron trifluoride's LUMO: ${shown("frontier-flow/nh3_bf3")}. From boron trifluoride's HOMO up to ammonia's LUMO: ${shown("frontier-flow/bf3_nh3")}.`,
    );
  });

  it("places every level to scale: higher energy, higher on the frame, on one axis for both panels", () => {
    const [nh3, bf3] = ladders("nh3-bf3", cited, { top: 100, bottom: 900 });
    expect(nh3.lumo.y).toBeLessThan(nh3.homo.y);
    expect(bf3.lumo.y).toBeLessThan(nh3.homo.y);
    expect(bf3.homo.y).toBeGreaterThan(nh3.homo.y);
    const perEv = (nh3.homo.y - nh3.lumo.y) / (Number(cited["ammonia-b3lyp-orbitals/lumo"].value) - Number(cited["ammonia-b3lyp-orbitals/homo"].value));
    const bf3PerEv = (bf3.homo.y - bf3.lumo.y) / (Number(cited["boron-trifluoride-b3lyp-orbitals/lumo"].value) - Number(cited["boron-trifluoride-b3lyp-orbitals/homo"].value));
    expect(perEv).toBeCloseTo(bf3PerEv, 6);
  });

  it("labels each level and gap, with a Computed chip on each panel", () => {
    const svg = renderToStaticMarkup(
      createElement(FrontierLadder, { t: 0, state: { molecules: "ethane-ethylene", flow: "none", ring: "none" }, aspect: "16:9", reducedMotion: false, cited }),
    );
    for (const ref of ["ethane-b3lyp-orbitals/homo", "ethylene-b3lyp-orbitals/lumo", "ethylene-b3lyp-orbitals/gap"]) expect(svg).toContain(cited[ref].display);
    expect(svg.match(/>Computed</g)).toHaveLength(2);
  });

  it("with both flows, the smaller gap is the solid arrow and the larger dashed, each bracket labelled", () => {
    const svg = renderToStaticMarkup(
      createElement(FrontierLadder, { t: 0, state: { molecules: "nh3-bf3", flow: "both", ring: "none" }, aspect: "9:16", reducedMotion: false, cited }),
    );
    expect(svg).toMatch(/class="flow flow-nh3-bf3 solid"/);
    expect(svg).toMatch(/class="flow flow-bf3-nh3 dashed"/);
    expect(svg).toContain(cited["frontier-flow/nh3_bf3"].display);
    expect(svg).toContain(cited["frontier-flow/bf3_nh3"].display);
  });

  it("draws no flow arrow when flow is none", () => {
    const svg = renderToStaticMarkup(
      createElement(FrontierLadder, { t: 0, state: { molecules: "nh3-bf3", flow: "none", ring: "none" }, aspect: "16:9", reducedMotion: false, cited }),
    );
    expect(svg).not.toContain('class="flow ');
  });
});
