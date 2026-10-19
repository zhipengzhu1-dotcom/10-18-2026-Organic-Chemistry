// Lesson 1's Scenes (#79): what each one says to a screen reader and shows at
// its poster frame. Numbers come from the cited electronegativity table; the
// formal-charge counts are counts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { sceneRegistry } from "../src/index.ts";
import { defaultState } from "../src/state.ts";
import { rank } from "../src/bond-dipoles/manifest.ts";
import type { Aspect, SceneState } from "../src/types.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const scene = (id: string) => {
  const registered = sceneRegistry[id];
  if (!registered) throw new Error(`Scene ${id} is not registered`);
  return registered;
};
const citedFor = (refs: string[]) => Object.fromEntries(refs.map((ref) => [ref, find(organic.data, ref)!]));
const say = (id: string, state: SceneState = {}, t?: number) => {
  const { manifest } = scene(id);
  return manifest.describe({ ...defaultState(manifest), ...state }, t ?? manifest.duration, citedFor(manifest.data));
};
/** The Scene's text at time t (default: its poster frame), tags stripped. */
const shows = (id: string, state: SceneState = {}, t?: number, aspect: Aspect = "16:9") => {
  const { manifest, Component } = scene(id);
  const cited = citedFor(manifest.data);
  const markup = renderToStaticMarkup(
    createElement(Component, {
      t: t ?? manifest.poster.t,
      state: { ...defaultState(manifest), ...state },
      aspect,
      reducedMotion: false,
      cited,
    }),
  );
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
};

describe("stream-bend", () => {
  it("shows only the observation: water curves toward the rod, hexane falls straight", () => {
    expect(say("stream-bend")).toBe(
      "A charged rod is held beside two falling streams. The water stream curves toward the rod. The hexane stream falls straight down.",
    );
    expect(shows("stream-bend")).toMatch(/water.*hexane/);
    expect(shows("stream-bend")).not.toMatch(/dipole|δ/);
  });

  it("can hold the rod away, for the Hook's question", () => {
    expect(say("stream-bend", { rod: "away" })).toBe(
      "Two thin streams fall side by side, one of water and one of hexane. A charged rod is held away from them.",
    );
  });
});

describe("en-strip", () => {
  it("reads every cited value, rising across a row and up a group", () => {
    expect(say("en-strip")).toBe(
      "Electronegativity values: hydrogen 2.20, boron 2.04, carbon 2.55, nitrogen 3.04, oxygen 3.44, fluorine 3.98, chlorine 3.16, bromine 2.96. Values rise across a row and up a group.",
    );
    const text = shows("en-strip");
    for (const v of ["2.20", "2.04", "2.55", "3.04", "3.44", "3.98", "3.16", "2.96"]) expect(text).toContain(v);
    expect(text).toContain("increases");
  });

  it("names only the highlighted elements' values when a Step lights a few", () => {
    expect(say("en-strip", { highlight: "h-c-o-cl" })).toBe(
      "Electronegativity values: hydrogen 2.20, carbon 2.55, oxygen 3.44, chlorine 3.16. Values rise across a row and up a group.",
    );
  });
});

describe("bond-dipoles", () => {
  it("ranks the s04 bonds with their electronegativity differences, never as dipole moments", () => {
    expect(say("bond-dipoles")).toBe(
      "Four bonds from least to most polar. C–H, difference 0.35, nearly nonpolar. N–H, 0.84, δ− on nitrogen. O–H, 1.24, δ− on oxygen. C–F, 1.43, δ− on fluorine. Each has an arrow pointing at its negative end.",
    );
    const text = shows("bond-dipoles");
    for (const label of ["ΔEN 0.35", "ΔEN 0.84", "ΔEN 1.24", "ΔEN 1.43"]) expect(text).toContain(label);
    expect(text).not.toMatch(/moment|Debye/);
  });

  it("ranks the Check Problem's bonds too", () => {
    expect(say("bond-dipoles", { bonds: "ch-ccl-co-oh" })).toBe(
      "Four bonds from least to most polar. C–H, difference 0.35, nearly nonpolar. C–Cl, 0.61, δ− on chlorine. C–O, 0.89, δ− on oxygen. O–H, 1.24, δ− on oxygen. Each has an arrow pointing at its negative end.",
    );
  });

  it("puts the δ− on carbon in C–H, so its arrow points at carbon", () => {
    const [ch] = rank("ch-nh-oh-cf", citedFor(scene("bond-dipoles").manifest.data));
    expect(ch).toMatchObject({ label: "C–H", minus: "C" });
  });
});

describe("dots-and-sticks", () => {
  it("counts oxygen in hydronium, then in hydroxide", () => {
    expect(say("dots-and-sticks")).toBe(
      "Hydronium. Oxygen: 6 valence electrons, minus 2 in its one lone pair, minus 3 bonds, equals plus 1. Hydroxide. Oxygen: 6, minus 6 in three lone pairs, minus 1 bond, equals minus 1.",
    );
    const text = shows("dots-and-sticks");
    expect(text).toContain("= +1");
    expect(text).toContain("= −1");
  });

  it("counts nitrogen in ammonium and the PS1 oxygen", () => {
    expect(say("dots-and-sticks", { example: "ammonium" })).toBe(
      "Nitrogen: 5 valence electrons, no lone pairs, 4 bonds. 5 minus 0 minus 4 is plus 1.",
    );
    expect(say("dots-and-sticks", { example: "oxygen-three-bonds" })).toBe(
      "Oxygen: 6 valence electrons, minus 2 in one lone pair, minus 3 bonds, equals plus 1.",
    );
  });

  it("builds the count line by line: nothing is totalled before the end", () => {
    const early = shows("dots-and-sticks", { example: "ammonium" }, 0.5);
    expect(early).toContain("valence");
    expect(early).not.toContain("= +1");
  });
});

describe("bf3-sextet", () => {
  it("stops boron's count at 6 and shows the empty slot", () => {
    expect(say("bf3-sextet")).toBe(
      "Boron trifluoride. Boron has three bonds to fluorine and no lone pairs: six electrons, formal charge zero. An empty slot on boron shows room for one more pair.",
    );
    const text = shows("bf3-sextet");
    expect(text).toContain("room for one more pair");
    expect(text).toMatch(/\b6\b/);
    expect(text).not.toMatch(/\b8\b/);
  });
});
