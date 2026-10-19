// The real Scene registry: every Scene is registered with a complete manifest,
// cites only data that exists, renders as a pure function of its props and
// lays itself out for both aspect ratios.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { find } from "@astratron/content/data";
import { sceneRegistry } from "../src/index.ts";
import { sceneManifests } from "../src/manifests.ts";
import { checkManifests, defaultState, sceneCatalog } from "../src/manifest-check.ts";
import { frameSize } from "../src/frame.ts";
import { layoutTwist } from "../src/sample-twist/layout.ts";
import type { Aspect, SceneProps } from "../src/types.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;

describe("Scene registry", () => {
  it("registers each manifest once, under its own id, with a component", () => {
    expect(Object.keys(sceneRegistry).sort()).toEqual(sceneManifests.map((m) => m.id).sort());
    for (const [id, scene] of Object.entries(sceneRegistry)) {
      expect(scene.manifest.id).toBe(id);
      expect(typeof scene.Component).toBe("function");
    }
  });

  it("every manifest is complete", () => {
    expect(checkManifests(sceneManifests)).toEqual([]);
  });

  it("the real content builds against the registered Scenes", () => {
    expect(buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests) }).errors).toEqual([]);
  });

  it("every data source is in the cited data", () => {
    const missing = sceneManifests.flatMap((m) => m.data.filter((ref) => !find(organic.data, ref)).map((ref) => `${m.id}: ${ref}`));
    expect(missing).toEqual([]);
  });

  it("every Scene renders the same frame for the same (t, state), at both aspect ratios", () => {
    for (const { manifest, Component } of Object.values(sceneRegistry)) {
      const cited = Object.fromEntries(manifest.data.map((ref) => [ref, find(organic.data, ref)!]));
      for (const aspect of ["16:9", "9:16"] as Aspect[]) {
        const props: SceneProps = { t: manifest.poster.t, state: defaultState(manifest), aspect, reducedMotion: false, cited };
        const once = renderToStaticMarkup(createElement(Component, props));
        expect(renderToStaticMarkup(createElement(Component, props))).toBe(once);
        const { width, height } = frameSize(aspect);
        expect(once).toContain(`viewBox="0 0 ${width} ${height}"`);
      }
    }
  });
});

describe("sample-twist layout", () => {
  for (const aspect of ["16:9", "9:16"] as Aspect[]) {
    it(`fits the molecule and the overlap bar inside the ${aspect} frame without overlapping`, () => {
      const { width, height } = frameSize(aspect);
      const { stage, bar } = layoutTwist(aspect);
      for (const box of [stage, bar]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(width);
        expect(box.y + box.h).toBeLessThanOrEqual(height);
      }
      const apart = stage.x + stage.w <= bar.x || bar.y >= stage.y + stage.h;
      expect(apart).toBe(true);
    });
  }

  it("is a landscape row at 16:9 and a portrait column at 9:16", () => {
    expect(layoutTwist("16:9").bar.x).toBeGreaterThan(layoutTwist("16:9").stage.x);
    expect(layoutTwist("9:16").bar.y).toBeGreaterThan(layoutTwist("9:16").stage.y);
  });
});
