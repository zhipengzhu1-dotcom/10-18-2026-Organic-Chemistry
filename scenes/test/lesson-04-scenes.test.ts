// Lesson 4's Scenes (#82): what each says to a screen reader and shows. The orbitals are the
// labelled "model" (scenes/src/hybrid-model); the only measured numbers are methane's, cited.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { sceneRegistry } from "../src/index.ts";
import { defaultState } from "../src/state.ts";
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
  return manifest.describe({ ...defaultState(manifest), ...state }, t ?? manifest.poster.t, citedFor(manifest.data));
};
const markup = (id: string, state: SceneState = {}, t?: number, aspect: Aspect = "16:9") => {
  const { manifest, Component } = scene(id);
  return renderToStaticMarkup(
    createElement(Component, {
      t: t ?? manifest.poster.t,
      state: { ...defaultState(manifest), ...state },
      aspect,
      reducedMotion: false,
      cited: citedFor(manifest.data),
    }),
  );
};
/** The Scene's words at time t (default: its poster frame), tags stripped. */
const shows = (id: string, state: SceneState = {}, t?: number, aspect: Aspect = "16:9") =>
  markup(id, state, t, aspect)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

describe("hybrid-sets", () => {
  const sp3 = "sp3: four orange hybrid lobes to the corners of a tetrahedron, model angle 109.5 degrees.";
  const sp2 =
    "sp2: three orange lobes in a flat triangle, model angle 120 degrees, and one cyan p orbital standing straight up through the plane.";
  const sp =
    "sp: two orange lobes in a straight line, model angle 180 degrees, and two cyan p orbitals at right angles to the line and to each other.";

  it("reads the spec's screen-reader line for the three sets", () => {
    expect(say("hybrid-sets", { set: "all" })).toBe(`${sp3} ${sp2} ${sp}`);
    expect(say("hybrid-sets", { set: "sp2" })).toBe(sp2);
  });

  it("tours sp3, then sp2, then sp, then all three, in time with s04's text", () => {
    expect(say("hybrid-sets", { set: "tour" }, 0)).toBe(sp3);
    expect(say("hybrid-sets", { set: "tour" }, 5)).toBe(sp2);
    expect(say("hybrid-sets", { set: "tour" }, 9)).toBe(sp);
    expect(say("hybrid-sets", { set: "tour" }, 14)).toBe(`${sp3} ${sp2} ${sp}`);
  });

  it("labels every orbital with a chip and each set with the model's angle, and says it is a model", () => {
    for (const aspect of ["16:9", "9:16"] as const) {
      const text = shows("hybrid-sets", { set: "all" }, undefined, aspect);
      expect(text).toContain("model");
      for (const words of ["sp³", "sp²", "sp", "2p", "model: 109.5°", "model: 120°", "model: 180°"]) expect(text).toContain(words);
    }
  });

  it("shows carbon's unmixed 2s and three 2p orbitals for the Hook", () => {
    const text = shows("hybrid-sets", { set: "unmixed" });
    expect(text).toContain("2s");
    expect(text.match(/2p/g)).toHaveLength(3);
    expect(say("hybrid-sets", { set: "unmixed" })).toMatch(/one round 2s orbital and three 2p orbitals/);
  });

  it("draws the − lobes hatched and a plane for sp²", () => {
    const svg = markup("hybrid-sets", { set: "sp2" });
    expect(svg).toContain("url(#hatch-");
    expect(svg).toContain('data-plane="sp2"');
  });
});

describe("methane-unmixed-vs-real", () => {
  it("reads the spec's screen-reader line with methane's cited numbers", () => {
    expect(say("methane-unmixed-vs-real")).toBe(
      "Left, a model that is not a real molecule: three hydrogens sit on three p orbitals at right angles, and a fourth sits on the round s orbital with a question mark. Right, real methane, measured: four identical C–H bonds of 1.09 Å, and all six H–C–H angles 109.5°.",
    );
  });

  it("labels the left panel a model and the right panel measured, with every C–H length and the angle", () => {
    for (const aspect of ["16:9", "9:16"] as const) {
      const text = shows("methane-unmixed-vs-real", {}, undefined, aspect);
      expect(text).toContain("model: if carbon used its orbitals unmixed (not a real molecule)");
      expect(text).toContain("measured");
      expect(text.match(/1\.09 Å/g)).toHaveLength(4);
      expect(text).toContain("109.5°");
      expect(text).toContain("?");
    }
  });

  it("can show one panel alone", () => {
    expect(shows("methane-unmixed-vs-real", { panel: "unmixed" })).not.toContain("measured");
    expect(shows("methane-unmixed-vs-real", { panel: "real" })).not.toContain("unmixed");
    expect(say("methane-unmixed-vs-real", { panel: "real" })).toBe(
      "Real methane, measured: four identical C–H bonds of 1.09 Å, and all six H–C–H angles 109.5°.",
    );
  });
});

describe("pi-twist", () => {
  it("reads the twist and the overlap at every stop, as the spec's live region does", () => {
    expect(say("pi-twist", { twist: 0 })).toBe("Twist 0 degrees. π overlap: full.");
    expect(say("pi-twist", { twist: 45 })).toBe("Twist 45 degrees. π overlap: partial.");
    expect(say("pi-twist", { twist: 90 })).toBe("Twist 90 degrees. The two p orbitals are at right angles. π overlap: none.");
    expect(say("pi-twist", { twist: 150 })).toBe("Twist 150 degrees. π overlap: partial.");
    expect(say("pi-twist", { twist: 180 })).toBe("Twist 180 degrees. π overlap: full.");
  });

  it("is a Manipulate Scene with a 0–180° slider in 15° stops", () => {
    const { manifest } = scene("pi-twist");
    expect(manifest.states.twist).toMatchObject({ kind: "range", min: 0, max: 180, step: 15, default: 0 });
  });

  it("draws an overlap bar with no numbers, a model label, and says when the p orbitals are flipped or crossed", () => {
    const at = (twist: number) => shows("pi-twist", { twist });
    expect(at(0)).toContain("π overlap (model)");
    expect(at(0)).not.toMatch(/\d/);
    expect(at(90)).toContain("no π bond");
    expect(at(180)).toContain("flipped: solid meets hatched");
    expect(at(30)).not.toMatch(/no π bond|flipped/);
    const bar = (twist: number) => Number(markup("pi-twist", { twist }).match(/data-overlap="([\d.]+)"/)![1]);
    expect(bar(0)).toBeCloseTo(1, 6);
    expect(bar(90)).toBeCloseTo(0, 6);
    expect(bar(180)).toBeCloseTo(1, 6);
    expect(bar(45)).toBeGreaterThan(bar(60));
  });
});

describe("orbital-sum", () => {
  it("asks how many hybrids come out of 2s + 2p + 2p, with the third 2p set aside", () => {
    expect(say("orbital-sum", { filled: "no" })).toBe(
      "Model: one 2s orbital and two 2p orbitals go into the mix, and a third 2p orbital waits to one side, dimmed. How many hybrid orbitals come out?",
    );
    const text = shows("orbital-sum", { filled: "no" });
    expect(text).toContain("?");
    expect(text.match(/2p/g)).toHaveLength(3);
    expect(text).not.toContain("sp²");
  });

  it("fills in three sp² hybrids, with one 2p left over", () => {
    expect(say("orbital-sum", { filled: "yes" })).toBe(
      "Model: one 2s orbital and two 2p orbitals mix into three sp2 hybrid orbitals. The third 2p orbital is left over, unchanged.",
    );
    for (const aspect of ["16:9", "9:16"] as const) {
      const text = shows("orbital-sum", { filled: "yes" }, undefined, aspect);
      expect(text.match(/sp²/g)).toHaveLength(3);
      expect(text).not.toContain("?");
    }
  });
});
