// Watch-only Scenes (#66): videos rendered offline (Manim CE), played in Steps
// like any Scene. Each is registered with screen-reader text, a poster frame,
// reduced-motion behaviour and its cited data, and Steps name it by id.
import { describe, expect, it } from "vitest";
import { buildContent, contentRoot } from "@astratron/content";
import { cite } from "@astratron/content/data";
import { checkWatchManifests, sceneCatalog } from "../src/manifest-check.ts";
import { sceneManifests } from "../src/manifests.ts";
import { watchSceneManifests, watchSceneFiles } from "../src/watch.ts";
import type { WatchSceneManifest } from "../src/types.ts";

const organic = buildContent(contentRoot).model!.subjects.find((s) => s.slug === "organic")!;

const watch = (extra: Partial<WatchSceneManifest> = {}): WatchSceneManifest => ({
  id: "glow",
  title: "Glow",
  render: { engine: "manim", script: "glow.py", sceneClass: "Glow" },
  describe: () => "A glow.",
  reducedMotion: "Opens paused on the poster frame; Play starts the video.",
  data: [],
  text: {},
  duration: 4,
  poster: 4,
  aspects: ["16:9", "9:16"],
  ...extra,
});

describe("watch-only Scene manifests", () => {
  it("accepts a complete manifest", () => {
    expect(checkWatchManifests([watch()], [])).toEqual([]);
  });

  it("rejects one without screen-reader text, reduced-motion behaviour, a poster in range or both aspects", () => {
    const errors = checkWatchManifests(
      [watch({ describe: () => " ", reducedMotion: "", poster: 5, aspects: ["16:9"] })],
      [],
    );
    expect(errors).toEqual([
      "scenes/glow: reducedMotion: Too small: expected string to have >=1 characters",
      "scenes/glow: aspects: must render at both 16:9 and 9:16",
    ]);
    expect(checkWatchManifests([watch({ describe: () => " " })], [])).toEqual([
      "scenes/glow: describe: screen-reader text is empty",
    ]);
    expect(checkWatchManifests([watch({ poster: 5 })], [])).toEqual(["scenes/glow: poster: 5 is past the video's 4 s"]);
  });

  it("rejects an id an interactive Scene already uses", () => {
    expect(checkWatchManifests([watch({ id: sceneManifests[0].id })], sceneManifests)).toEqual([
      `scenes/${sceneManifests[0].id}: id "${sceneManifests[0].id}" is registered twice`,
    ]);
  });

  it("joins the Scene catalog with no settable states, so a Step can show it", () => {
    expect(sceneCatalog([], [watch({ data: ["nuclides/C-12.A"] })])).toEqual({ glow: { states: {}, data: ["nuclides/C-12.A"] } });
  });
});

describe("the registered watch-only Scenes", () => {
  it("are complete, with ids of their own", () => {
    expect(watchSceneManifests.map((m) => m.id)).toContain("star-forge");
    expect(checkWatchManifests(watchSceneManifests, sceneManifests)).toEqual([]);
  });

  it("the real content builds with them in the catalog", () => {
    expect(buildContent(contentRoot, { scenes: sceneCatalog(sceneManifests, watchSceneManifests) }).errors).toEqual([]);
  });

  it("star-forge's screen-reader text (Lesson 0 spec, s01) reads its mass numbers from the cited data", () => {
    const starForge = watchSceneManifests.find((m) => m.id === "star-forge")!;
    const cited = Object.fromEntries(starForge.data.map((ref) => [ref, cite(organic.data, ref)]));
    expect(starForge.describe(cited)).toBe(
      "A star's core. Three helium nuclei fuse into one carbon nucleus: three helium-4 make carbon-12. " +
        "The carbon drifts out through a nebula and into a living cell, then becomes a letter C with four electrons around it. " +
        "Text: Every carbon atom in you was forged in a star. Organic chemistry is what that carbon learned to do next.",
    );
  });

  it("ship one video, poster and sources sidecar per aspect, under the site's /scenes/<id>/", () => {
    expect(watchSceneFiles("star-forge", "9:16")).toEqual({
      video: "scenes/star-forge/star-forge-9x16.mp4",
      poster: "scenes/star-forge/star-forge-9x16.poster.jpg",
      sources: "scenes/star-forge/star-forge-9x16.sources.json",
    });
  });
});
