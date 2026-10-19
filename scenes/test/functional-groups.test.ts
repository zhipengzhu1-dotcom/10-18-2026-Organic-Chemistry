// Lesson 5's Scenes (#83): group-spotlight, group-cards, carbonyl-neighbours.
// Screen-reader text is the spec's, word for word; the poster frame shows the
// whole picture; every frame stays inside both aspects; the structures they
// draw are the content's own structure files.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contentRoot, readStructure } from "@astratron/content";
import { sceneRegistry } from "../src/index.ts";
import { stateAt } from "../src/timeline.ts";
import { fgStructures } from "../src/functional-groups/structures.ts";
import { groupSpotlight, spotlightViews } from "../src/group-spotlight/manifest.ts";
import { chipBoxes } from "../src/group-spotlight/GroupSpotlight.tsx";
import { groupCards } from "../src/group-cards/manifest.ts";
import { carbonylNeighbours } from "../src/carbonyl-neighbours/manifest.ts";
import { frameSize } from "../src/frame.ts";
import type { Aspect, SceneManifest, SceneState } from "../src/types.ts";

const aspects: Aspect[] = ["16:9", "9:16"];
const frame = (manifest: SceneManifest<any>, t: number, state: SceneState, aspect: Aspect = "16:9", reducedMotion = false) =>
  renderToStaticMarkup(createElement(sceneRegistry[manifest.id].Component, { t, state, aspect, reducedMotion, cited: {} }));
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ");

describe("the Scenes' own copy of the structures", () => {
  it("matches the committed structure files (run `pnpm --filter @astratron/scenes run sync:structures` after editing one)", () => {
    for (const [id, structure] of Object.entries(fgStructures)) expect(structure).toEqual(readStructure(contentRoot, "organic", id));
  });
});

describe("group-spotlight", () => {
  const says = (view: string) => groupSpotlight.describe({ view, labels: "on" }, groupSpotlight.poster.t, {});

  it("tells screen readers what each Step's reveal shows, as the spec words it", () => {
    expect(says("acid-pair")).toBe(
      "Acetic acid and amoxicillin side by side. Everything dims except one piece on each: a carbon double-bonded to O and single-bonded to OH. Both are labelled carboxylic acid.",
    );
    expect(says("ethinylestradiol")).toBe(
      "Ethinylestradiol. Skeleton dimmed. Lit: the left ring with its OH, labelled phenol; the carbon–carbon triple bond at top right, labelled alkyne; the OH beside it, labelled alcohol.",
    );
    expect(says("aspartame")).toBe(
      "Aspartame. Lit: at the left, C=O with O–CH₃, ester; in the middle, C=O with NH, amide; at the right, C=O with OH, carboxylic acid. Also outlined: NH₂, amine, and the benzene ring, arene, neither with a C=O.",
    );
    expect(says("capsaicin")).toBe(
      "Capsaicin. Lit: a C=C in the left-hand tail, alkene; C=O with NH in the middle, amide; on the ring, OH, phenol, and O–CH₃, ether.",
    );
    expect(says("amoxicillin")).toBe(
      "Amoxicillin. Skeleton dimmed. Lit, left to right: the benzene ring with its OH, phenol; NH₂, amine; C=O and NH in the middle, amide; inside the four-membered ring, C=O and N, a second amide called the beta-lactam; S in the five-membered ring, sulfide; C=O with OH at the bottom right, carboxylic acid.",
    );
  });

  it("lights the regions one by one: none at the start, every label on the poster frame", () => {
    const state = { view: "amoxicillin", labels: "on" };
    const labels = ["phenol", "amine", "amide", "amide (β-lactam)", "sulfide", "carboxylic acid"];
    expect(text(frame(groupSpotlight, 0, state))).not.toContain("sulfide");
    const poster = text(frame(groupSpotlight, groupSpotlight.poster.t, state));
    for (const label of labels) expect(poster).toContain(label);
  });

  it("under reduced motion every region is lit at once", () => {
    expect(text(frame(groupSpotlight, 0, { view: "amoxicillin", labels: "on" }, "16:9", true))).toContain("sulfide");
  });

  it("with labels off, it draws the rings but no chips", () => {
    expect(text(frame(groupSpotlight, groupSpotlight.poster.t, { view: "amoxicillin", labels: "off" }))).not.toContain("sulfide");
  });

  for (const aspect of aspects)
    it(`keeps every label chip inside the ${aspect} frame, none overlapping`, () => {
      const { width, height } = frameSize(aspect);
      for (const view of spotlightViews) {
        const boxes = chipBoxes(view, aspect);
        for (const b of boxes) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(width);
          expect(b.y + b.h).toBeLessThanOrEqual(height);
        }
        for (const [i, p] of boxes.entries())
          for (const q of boxes.slice(i + 1)) {
            const apart = p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y;
            expect(apart, `${view}: chips overlap`).toBe(true);
          }
      }
    });
});

describe("group-cards", () => {
  const says = (family: string) => groupCards.describe({ family, start: "deal" }, groupCards.poster.t, {});

  it("tells screen readers every card of the family, as the spec words it", () => {
    expect(says("hydrocarbon")).toBe(
      "Four cards. Alkene: two carbons joined by a double bond. Alkyne: two carbons joined by a triple bond. Arene: a benzene ring with alternating double bonds. Alkyl halide: a carbon single-bonded to a halogen, X, which is F, Cl, Br or I.",
    );
    expect(says("single-bond")).toBe(
      "Five cards. Alcohol: a skeleton carbon with OH. Phenol: an OH on a benzene ring. Ether: an oxygen between two carbons. Sulfide: a sulfur between two carbons. Amine: a carbon bonded to nitrogen, which also carries hydrogens or carbons.",
    );
    expect(says("all")).toBe(
      "All fourteen group cards in three families: alkene, alkyne, arene, alkyl halide; alcohol, phenol, ether, sulfide, amine; aldehyde, ketone, carboxylic acid, ester, amide.",
    );
  });

  it("deals the cards in one by one; the poster frame has them all", () => {
    const first = text(frame(groupCards, 0, { family: "carbonyl", start: "deal" }));
    expect(first).not.toContain("amide");
    const poster = text(frame(groupCards, groupCards.poster.t, { family: "carbonyl", start: "deal" }));
    for (const name of ["aldehyde", "ketone", "carboxylic acid", "ester", "amide"]) expect(poster).toContain(name);
  });

  it("starting dealt, it shows its final frame at once (the Wrap's card)", () => {
    const shown = text(frame(groupCards, 0, { family: "all", start: "dealt" }, "9:16"));
    for (const name of ["alkene", "alkyl halide", "sulfide", "amine", "ester", "amide"]) expect(shown).toContain(name);
  });
});

describe("carbonyl-neighbours", () => {
  it("tells screen readers the swap, as the spec words it", () => {
    expect(carbonylNeighbours.describe({}, 0, {})).toBe(
      "One C=O stays put. Its neighbour changes: H, aldehyde. Carbon, ketone. OH, carboxylic acid. Oxygen then carbon, ester. Nitrogen, amide.",
    );
  });

  it("swaps one neighbour at a time, then ends on the five-row ladder", () => {
    const early = text(frame(carbonylNeighbours, 0.5, {}));
    expect(early).toContain("aldehyde");
    expect(early).not.toContain("amide");
    const poster = text(frame(carbonylNeighbours, carbonylNeighbours.poster.t, {}));
    for (const name of ["aldehyde", "ketone", "carboxylic acid", "ester", "amide"]) expect(poster).toContain(name);
  });
});

describe("Lesson 5 Scenes through the video path", () => {
  for (const manifest of [groupSpotlight, groupCards, carbonylNeighbours] as SceneManifest<any>[])
    for (const aspect of aspects)
      it(`${manifest.id} renders its video poster frame at ${aspect}`, () => {
        const { width, height } = frameSize(aspect);
        const markup = frame(manifest, manifest.video.poster, stateAt(manifest, manifest.video.poster), aspect);
        expect(markup).toContain(`viewBox="0 0 ${width} ${height}"`);
      });
});
