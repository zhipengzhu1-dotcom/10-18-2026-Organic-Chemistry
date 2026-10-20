// The Scene additions the Unit 1 Practice Problems spec lists (#87): new examples and molecules on
// Lesson Scenes, each with the spec's screen-reader text and a frame at both aspects.
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
  return manifest.describe({ ...defaultState(manifest), ...state }, t ?? manifest.duration, citedFor(manifest.data));
};
/** The Scene's text at time t (default: its poster frame), tags stripped. */
const shows = (id: string, state: SceneState = {}, t?: number, aspect: Aspect = "16:9") => {
  const { manifest, Component } = scene(id);
  const markup = renderToStaticMarkup(
    createElement(Component, {
      t: t ?? manifest.poster.t,
      state: { ...defaultState(manifest), ...state },
      aspect,
      reducedMotion: false,
      cited: citedFor(manifest.data),
    }),
  );
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
};

describe("dots-and-sticks: the PS1 Q1 bromine and boron fragments", () => {
  it("counts bromine with two bonds", () => {
    expect(say("dots-and-sticks", { example: "bromine-two-bonds" })).toBe(
      "Bromine: 7 valence electrons, minus 4 in two lone pairs, minus 2 bonds, equals plus 1.",
    );
    for (const aspect of ["16:9", "9:16"] as const) expect(shows("dots-and-sticks", { example: "bromine-two-bonds" }, undefined, aspect)).toContain("= +1");
  });

  it("counts boron with two single bonds and a double bond", () => {
    expect(say("dots-and-sticks", { example: "boron-four-bonds" })).toBe(
      "Boron: 3 valence electrons, no lone pairs, 4 bonds. 3 minus 0 minus 4 equals minus 1.",
    );
    for (const aspect of ["16:9", "9:16"] as const) expect(shows("dots-and-sticks", { example: "boron-four-bonds" }, undefined, aspect)).toContain("= −1");
  });
});

describe("en-strip: the δ− Problem's elements", () => {
  it("lights H, B, C, N and O", () => {
    expect(say("en-strip", { highlight: "h-b-c-n-o" })).toBe(
      "Electronegativity values: hydrogen 2.20, boron 2.04, carbon 2.55, nitrogen 3.04, oxygen 3.44. Values rise across a row and up a group.",
    );
  });
});

describe("dipole-sum: chloroform, HCN and methane (u1-3d-polar-hcn reveal)", () => {
  it("reads the spec's four sentences once added: chloroform and HCN polar, BF₃ and methane net zero", () => {
    expect(say("dipole-sum", { molecule: "polar-hcn", added: 1 })).toBe(
      [
        "Chloroform: tetrahedral. Three C–Cl arrows point toward the chlorines and a small C–H arrow points toward carbon; added, they leave a net arrow toward the chlorines. Polar.",
        "Boron trifluoride: flat. Three equal arrows; they cancel, net zero. Nonpolar.",
        "Hydrogen cyanide: a straight line. The C–H arrow points toward carbon and the C≡N arrow toward nitrogen, the same direction; added, a net arrow toward nitrogen. Polar.",
        "Methane: tetrahedral. Four equal arrows; they cancel, net zero. Nonpolar.",
      ].join(" "),
    );
  });

  it("works each answer out from the cited geometry and electronegativities", () => {
    for (const [molecule, polar] of [["chcl3", true], ["hcn", true], ["ch4", false]] as const) {
      const text = say("dipole-sum", { molecule, added: 1 });
      expect(text).toContain(polar ? "Polar." : "Nonpolar.");
    }
    for (const aspect of ["16:9", "9:16"] as const) expect(shows("dipole-sum", { molecule: "polar-hcn", added: 1 }, undefined, aspect)).toContain("net: zero");
  });
});

describe("group-spotlight: aspirin and Met-enkephalin (Lesson 5 Practice reveals)", () => {
  it("lights aspirin's arene, carboxylic acid and ester, with the spec's screen-reader text", () => {
    expect(say("group-spotlight", { view: "aspirin" })).toBe(
      "Aspirin. Lit: the benzene ring, arene; on one ring carbon, C=O with OH, carboxylic acid; on the next, O bonded to a C=O carbon carrying CH₃, ester.",
    );
    for (const aspect of ["16:9", "9:16"] as const) {
      const text = shows("group-spotlight", { view: "aspirin" }, undefined, aspect);
      for (const label of ["arene", "carboxylic acid", "ester"]) expect(text).toContain(label);
    }
  });

  it("lights Met-enkephalin's four amides and outlines its other groups", () => {
    expect(say("group-spotlight", { view: "metenkephalin" })).toBe(
      "Met-enkephalin. Lit, left to right: four C=O groups along the backbone, each with NH beside it, all labelled amide. Also outlined: NH₂, amine; the left ring with OH, phenol; the upper ring, arene; S, sulfide; C=O with OH at the right end, carboxylic acid.",
    );
    const text = shows("group-spotlight", { view: "metenkephalin" });
    expect(text.match(/amide/g)).toHaveLength(4);
    for (const label of ["amine", "phenol", "arene", "sulfide", "carboxylic acid"]) expect(text).toContain(label);
  });
});

describe("mo-filler: H₂⁺ (u1-mo-h2-cation)", () => {
  it("shows the empty mini diagram as the Problem's visual: the formula and its count, no electrons, no bond order", () => {
    for (const aspect of ["16:9", "9:16"] as const) {
      const text = shows("mo-filler", { show: "h2-plus-empty" }, undefined, aspect);
      expect(text).toContain("H₂⁺: 1 e⁻");
      expect(text).toContain("not to scale");
      expect(text).not.toContain("bond order");
    }
    expect(say("mo-filler", { show: "h2-plus-empty" })).toBe(
      "H₂ plus, one electron. Two 1s levels at the sides. In the middle, sigma below and sigma star above. Not to scale.",
    );
  });

  it("fills it on reveal: one electron in σ, bond order ½, with the spec's screen-reader text", () => {
    const text = shows("mo-filler", { show: "h2-plus" });
    expect(text).toContain("H₂⁺: 1 e⁻");
    expect(text).toContain("bond order (1 − 0) ÷ 2 = ½");
    expect(say("mo-filler", { show: "h2-plus" })).toBe("H₂ plus: one electron in sigma, none in sigma star. Bond order one half.");
  });
});

describe("h-fill: furan (u1-draw-furan-h reveal)", () => {
  it("fills each of furan's four carbons with one H, ending at 4, with the spec's screen-reader text", () => {
    for (const aspect of ["16:9", "9:16"] as const) expect(shows("h-fill", { molecule: "furan" }, undefined, aspect)).toContain("H: 4");
    expect(say("h-fill", { molecule: "furan" })).toBe(
      "Furan fills in. Each of the four carbons has a double bond and a single bond in the ring, and gains one hydrogen. Total: 4 hydrogens.",
    );
  });
});

describe("lone-pair-fill: caffeine (u1-draw-caffeine-lone-pairs reveal)", () => {
  it("ends with caffeine's 8 lone pairs drawn, with the spec's screen-reader text", () => {
    for (const aspect of ["16:9", "9:16"] as const) {
      const { manifest, Component } = scene("lone-pair-fill");
      const end = renderToStaticMarkup(
        createElement(Component, { t: manifest.duration, state: { molecule: "caffeine" }, aspect, reducedMotion: false, cited: {} }),
      );
      expect([...end.matchAll(/class="lone-pair-dot"(?![^>]*opacity="0")/g)]).toHaveLength(16);
    }
    expect(say("lone-pair-fill", { molecule: "caffeine" })).toBe(
      "Each oxygen, two bonds, gains two lone pairs. Each of the four nitrogens, three bonds, gains one. Eight lone pairs in all.",
    );
  });
});
