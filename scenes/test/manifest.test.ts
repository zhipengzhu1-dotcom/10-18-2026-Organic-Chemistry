// Scene manifests (#64): every Scene declares its id, settable states,
// screen-reader text, reduced-motion behaviour, data sources, poster frame and
// a video block. The check rejects a manifest missing any of them.
import { describe, expect, it } from "vitest";
import { checkManifests, sceneCatalog } from "../src/manifest-check.ts";
import { stateAt } from "../src/timeline.ts";
import type { SceneManifest } from "../src/types.ts";

type TwistState = { twist: number; view: string };

const manifest = (extra: Partial<SceneManifest<TwistState>> = {}): SceneManifest<TwistState> => ({
  id: "twist",
  title: "Twist",
  states: {
    twist: { kind: "range", label: "Twist", min: 0, max: 180, step: 15, default: 0, unitSymbol: "°" },
    view: {
      kind: "choice",
      label: "View",
      options: [
        { id: "side", label: "Side" },
        { id: "end", label: "End-on" },
      ],
      default: "side",
    },
  },
  describe: (s) => `Twisted ${s.twist} degrees, seen from the ${s.view}.`,
  reducedMotion: "Opens paused on the poster frame; the slider still sets the twist.",
  data: ["elements/C.colour"],
  duration: 3,
  poster: { t: 3 },
  video: {
    duration: 6,
    timeline: [
      { at: 0, state: { twist: 0, view: "side" } },
      { at: 2, state: { twist: 90 } },
      { at: 4, state: { twist: 180, view: "end" } },
    ],
    poster: 2,
    aspects: ["16:9", "9:16"],
  },
  ...extra,
});

describe("Scene manifest check", () => {
  it("accepts a complete manifest", () => {
    expect(checkManifests([manifest()])).toEqual([]);
  });

  it("rejects a manifest missing any required field", () => {
    const bare = { id: "bare", title: "Bare" } as unknown as SceneManifest;
    expect(checkManifests([bare])).toEqual([
      "scenes/bare: states: Invalid input: expected record, received undefined",
      "scenes/bare: describe: needs screen-reader text: a function (state, t) => string",
      "scenes/bare: reducedMotion: Invalid input: expected string, received undefined",
      "scenes/bare: data: Invalid input: expected array, received undefined",
      "scenes/bare: duration: Invalid input: expected number, received undefined",
      "scenes/bare: poster: Invalid input: expected object, received undefined",
      "scenes/bare: video: Invalid input: expected object, received undefined",
    ]);
  });

  it("the video block needs a timeline, a poster time and both aspect ratios", () => {
    const video = { duration: 6, timeline: [], poster: 9, aspects: ["16:9"] };
    expect(checkManifests([manifest({ video } as never)])).toEqual([
      "scenes/twist: video.timeline: Too small: expected array to have >=1 items",
      "scenes/twist: video.aspects: must render at both 16:9 and 9:16",
    ]);
  });

  it("checks defaults, the poster frame, screen-reader text and the timeline against the declared states", () => {
    const states = { ...manifest().states, twist: { ...manifest().states.twist, default: 7 } };
    const timeline = [
      { at: 0, state: { spin: 1 } },
      { at: 3, state: { view: "top" } },
      { at: 2, state: {} },
      { at: 7, state: {} },
    ];
    expect(
      checkManifests([
        manifest({ states, poster: { t: 4 }, describe: () => "", video: { ...manifest().video, timeline, poster: 6.5 } } as never),
      ]),
    ).toEqual([
      'scenes/twist: states.twist: default must be a number from 0 to 180 in steps of 15',
      "scenes/twist: poster: t 4 is outside the Scene's 3 s",
      "scenes/twist: describe: screen-reader text for the default state is empty",
      'scenes/twist: video.timeline.0: no settable state "spin"',
      'scenes/twist: video.timeline.1: state "view" must be one of side, end',
      "scenes/twist: video.timeline.2: times must not go backwards",
      "scenes/twist: video.timeline.3: at 7 is past the video's 6 s",
      "scenes/twist: video.poster: 6.5 is past the video's 6 s",
    ]);
  });

  it("rejects duplicate ids and data refs that aren't `file/key`", () => {
    expect(checkManifests([manifest(), manifest({ data: ["carbon"] })])).toEqual([
      "scenes/twist: data.0: must be a cited-data ref like methane/r.CH",
      'scenes/twist: id "twist" is registered twice',
    ]);
  });

  it("hands the content build a catalog of states and data refs", () => {
    expect(sceneCatalog([manifest()])).toEqual({ twist: { states: manifest().states, data: ["elements/C.colour"] } });
  });
});

describe("Video state timeline", () => {
  it("starts from the defaults and the first keyframe", () => {
    expect(stateAt(manifest(), 0)).toEqual({ twist: 0, view: "side" });
  });

  it("eases range states linearly between keyframes and holds choice states until the next keyframe", () => {
    expect(stateAt(manifest(), 1)).toEqual({ twist: 45, view: "side" });
    expect(stateAt(manifest(), 3)).toEqual({ twist: 135, view: "side" });
    expect(stateAt(manifest(), 4)).toEqual({ twist: 180, view: "end" });
  });

  it("holds the last keyframe to the end", () => {
    expect(stateAt(manifest(), 6)).toEqual({ twist: 180, view: "end" });
  });
});
