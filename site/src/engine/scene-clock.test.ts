import { describe, expect, it } from "vitest";
import { clockStep, frameRatio, openClock, scrubText, sceneFrame, snapToFrame, type ClockAction, type ClockConfig } from "./scene-clock.ts";

const once: ClockConfig = { duration: 4, posterT: 1 };
const run = (config: ClockConfig, reducedMotion: boolean, ...actions: ClockAction[]) =>
  actions.reduce((c, a) => clockStep(c, a, config), openClock(config, reducedMotion));
const tick = (dt: number): ClockAction => ({ type: "tick", dt });

describe("Scene frame words", () => {
  it("gives a frame's CSS aspect ratio", () => {
    expect(frameRatio("16:9")).toBe("16 / 9");
    expect(frameRatio("9:16")).toBe("9 / 16");
  });

  it("reads the scrubber's time as seconds of the whole, to a tenth", () => {
    expect(scrubText(1.25, 8)).toBe("1.3 of 8 seconds");
    expect(scrubText(0, 10)).toBe("0.0 of 10 seconds");
  });
});

describe("Scene clock", () => {
  it("autoplays from the start on entry", () => {
    expect(openClock(once, false)).toEqual({ t: 0, playing: true });
    expect(run(once, false, tick(1.5))).toEqual({ t: 1.5, playing: true });
  });

  it("plays once and stops on the last frame: nothing loops in the Step player, Manipulate Steps included", () => {
    expect(run(once, false, tick(3), tick(3))).toEqual({ t: 4, playing: false });
  });

  it("under reduced motion opens paused on the poster frame, and Play starts it", () => {
    expect(openClock(once, true)).toEqual({ t: 1, playing: false });
    expect(run(once, true, tick(1))).toEqual({ t: 1, playing: false });
    expect(run(once, true, { type: "play" }, tick(1))).toEqual({ t: 2, playing: true });
  });

  it("replay starts again from the beginning; Play on the last frame does too", () => {
    expect(run(once, false, tick(9), { type: "replay" })).toEqual({ t: 0, playing: true });
    expect(run(once, false, tick(9), { type: "play" })).toEqual({ t: 0, playing: true });
  });

  it("the scrubber pauses and moves to any moment within the Scene", () => {
    expect(run(once, false, { type: "seek", t: 2.5 })).toEqual({ t: 2.5, playing: false });
    expect(run(once, false, { type: "seek", t: 9 })).toEqual({ t: 4, playing: false });
    expect(run(once, false, { type: "seek", t: -1 })).toEqual({ t: 0, playing: false });
  });

  it("pause holds the frame", () => {
    expect(run(once, false, tick(1), { type: "pause" }, tick(1))).toEqual({ t: 1, playing: false });
  });
});

describe("the 20 fps frame grid", () => {
  it("floors t to the 1/20 s grid", () => {
    expect(snapToFrame(0)).toBe(0);
    expect(snapToFrame(0.049)).toBe(0);
    expect(snapToFrame(0.05)).toBe(0.05);
    expect(snapToFrame(1.234)).toBe(1.2);
    expect(snapToFrame(0.999)).toBe(0.95);
  });

  it("holds a frame on the grid where it is (float error never drops a frame)", () => {
    for (let k = 0; k <= 400; k++) expect(snapToFrame(k / 20), `frame ${k}`).toBe(k / 20);
  });

  it("is idempotent", () => {
    for (const t of [0.01, 0.37, 1.2, 2.999, 7.123]) expect(snapToFrame(snapToFrame(t))).toBe(snapToFrame(t));
  });

  it("takes another frame rate", () => {
    expect(snapToFrame(0.3, 8)).toBe(0.25);
  });

  it("draws a Scene on the grid, with its last frame at duration even off the grid", () => {
    expect(sceneFrame(1.234, 3.37)).toEqual({ t: 1.2, frame: 24 });
    expect(sceneFrame(3.37, 3.37)).toEqual({ t: 3.37, frame: 68 });
    expect(sceneFrame(3.36, 3.37)).toEqual({ t: 3.35, frame: 67 });
    expect(sceneFrame(4, 4)).toEqual({ t: 4, frame: 80 });
  });
});
