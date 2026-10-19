// Lesson 3's Scenes (#81). The shapes they draw are rebuilt from the cited bond lengths and angles
// (a Scene gets cited values, not coordinate files), so the first check is that each rebuilt
// shape is the molecule in its data file: every interatomic distance agrees. Then what each Scene
// says to a screen reader and shows at its poster frame.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { sceneRegistry } from "../src/index.ts";
import { defaultState } from "../src/state.ts";
import { SHAPES, shapeRefs, buildShape } from "../src/shapes-3d/shapes.ts";
import { frameSize } from "../src/frame.ts";
import type { Aspect, SceneState } from "../src/types.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;
const citedFor = (refs: string[]) => Object.fromEntries(refs.map((ref) => [ref, find(organic.data, ref)!]));
const scene = (id: string) => {
  const registered = sceneRegistry[id];
  if (!registered) throw new Error(`Scene ${id} is not registered`);
  return registered;
};
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
const shows = (id: string, state: SceneState = {}, t?: number, aspect: Aspect = "16:9") =>
  markup(id, state, t, aspect).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const distances = (points: { x: number; y: number; z: number }[]) =>
  points.flatMap((p, i) => points.slice(i + 1).map((q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z))).sort((a, b) => a - b);

describe("shapes rebuilt from cited bond lengths and angles", () => {
  for (const [key, file] of Object.entries(SHAPES))
    it(`${key} is ${file}'s geometry: every interatomic distance within 0.005 Å`, () => {
      const shape = buildShape(key, citedFor(shapeRefs(key)));
      const atoms = organic.data[file].atoms!.list;
      expect(shape.atoms.map((a) => a.element).sort()).toEqual(atoms.map((a) => a.element).sort());
      const mine = distances(shape.atoms.map((a) => ({ x: a.pos[0], y: a.pos[1], z: a.pos[2] })));
      const theirs = distances(atoms);
      mine.forEach((d, i) => expect(d).toBeCloseTo(theirs[i], 2));
    });
});

describe("four-domain-family (s05, s15)", () => {
  it("reads the three shapes with their measured angles and the model's prediction", () => {
    expect(say("four-domain-family")).toBe(
      "Three molecules side by side. Methane: four hydrogens, tetrahedral, H–C–H 109.5 degrees. " +
        "Ammonia: three hydrogens below the nitrogen and one lone pair above, trigonal pyramidal, H–N–H 106.7 degrees. " +
        "Water: two hydrogens and two lone pairs, bent, H–O–H 104.5 degrees. The tetrahedron model predicts 109.5 degrees for all three.",
    );
  });

  it("shows the names, the measured angles, the sketched lone pairs and the model line", () => {
    const text = shows("four-domain-family");
    for (const words of ["tetrahedral", "trigonal pyramidal", "bent", "109.5°", "106.7°", "104.5°", "lone pair (sketch)", "model: 109.5°"])
      expect(text).toContain(words);
  });

  it("draws every atom in its cited Jmol colour", () => {
    const svg = markup("four-domain-family");
    for (const el of ["C", "N", "O", "H"]) expect(svg).toContain(String(find(organic.data, `elements/${el}.colour`)!.value));
  });
});

describe("dipole-sum (s11 and u1-3d-polar-molecules)", () => {
  it("water, added: one net arrow toward oxygen, polar", () => {
    expect(say("dipole-sum", { molecule: "water", added: 1 })).toBe(
      "Water, bent. Two bond-dipole arrows point from each hydrogen toward oxygen. Added tip to tail, they give one net arrow pointing toward oxygen: water is polar.",
    );
    expect(shows("dipole-sum", { molecule: "water", added: 1 })).toContain("polar");
  });

  it("CO₂, added: the two arrows cancel, net zero", () => {
    expect(say("dipole-sum", { molecule: "co2", added: 1 })).toBe(
      "Carbon dioxide, a straight line. Two equal bond-dipole arrows point from carbon toward each oxygen, in opposite directions. Added, they cancel: net zero, nonpolar.",
    );
    const text = shows("dipole-sum", { molecule: "co2", added: 1 });
    expect(text).toContain("net: zero");
    expect(text).toContain("nonpolar");
  });

  it("before Add, the arrows sit on their bonds and nothing is summed", () => {
    expect(shows("dipole-sum", { molecule: "co2", added: 0 })).not.toContain("net: zero");
    expect(say("dipole-sum", { molecule: "water", added: 0 })).toBe(
      "Water, bent. Two bond-dipole arrows point from each hydrogen toward oxygen. Press Add to put them tip to tail.",
    );
  });

  it("the Check Problem's five: three polar, two nonpolar", () => {
    const text = say("dipole-sum", { molecule: "polar-check", added: 1 });
    expect(text).toContain("Water: bent. 2 bond-dipole arrows, added tip to tail: a net arrow pointing toward oxygen. Polar.");
    expect(text).toContain("Carbon dioxide: linear. 2 bond-dipole arrows, added tip to tail: they cancel, net zero. Nonpolar.");
    expect(text).toContain("Carbon tetrachloride: tetrahedral. 4 bond-dipole arrows, added tip to tail: they cancel, net zero. Nonpolar.");
    expect(text).toContain("Dichloromethane: tetrahedral. 4 bond-dipole arrows, added tip to tail: a net arrow pointing toward the chlorines. Polar.");
    expect(text).toContain("Ammonia: trigonal pyramidal. 3 bond-dipole arrows, added tip to tail: a net arrow pointing toward nitrogen. Polar.");
  });

  it("labels arrow lengths as a rough guide, keeps the 1 Å scale bar, and shows no dipole-moment values", () => {
    const text = shows("dipole-sum", { molecule: "water", added: 1 });
    expect(text).toContain("length: a rough guide, not to scale");
    expect(text).toContain("1 Å");
    expect(text).not.toMatch(/\bD\b|debye/i);
  });

  it("every molecule and set lays out inside both frames", () => {
    for (const molecule of ["water", "co2", "ccl4", "ch2cl2", "nh3", "bf3", "water-co2", "polar-check"])
      for (const aspect of ["16:9", "9:16"] as Aspect[]) {
        const { width, height } = frameSize(aspect);
        const svg = markup("dipole-sum", { molecule, added: 1 }, 10, aspect);
        for (const m of svg.matchAll(/<(?:circle|text)[^>]*?\b(?:cx|x)="([-\d.]+)"[^>]*?\b(?:cy|y)="([-\d.]+)"/g)) {
          const [x, y] = [Number(m[1]), Number(m[2])];
          expect(x, `${molecule} ${aspect}`).toBeGreaterThanOrEqual(0);
          expect(x, `${molecule} ${aspect}`).toBeLessThanOrEqual(width);
          expect(y, `${molecule} ${aspect}`).toBeGreaterThanOrEqual(0);
          expect(y, `${molecule} ${aspect}`).toBeLessThanOrEqual(height);
        }
      }
  });
});
