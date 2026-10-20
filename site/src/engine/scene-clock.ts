// The site's own Scene clock (ADR 0001): a pure state machine for `t`. The
// ScenePlayer island feeds it animation-frame ticks; Scenes only see `t`.
// A Scene autoplays once on entry (nothing loops in the Step player, spec #56); under
// reduced motion it opens paused on its poster frame.
import type { Aspect } from "@astratron/scenes";

/** A Scene frame's CSS aspect ratio (both Scene players). */
export const frameRatio = (aspect: Aspect) => (aspect === "16:9" ? "16 / 9" : "9 / 16");

/** The scrubber's spoken time: "1.5 of 8 seconds". */
export const scrubText = (t: number, duration: number) => `${t.toFixed(1)} of ${duration} seconds`;

export interface Clock {
  /** Seconds into the Scene. */
  t: number;
  playing: boolean;
}

export interface ClockConfig {
  /** Seconds one run lasts (the manifest's `duration`). */
  duration: number;
  /** The poster frame's time (the manifest's `poster.t`). */
  posterT: number;
}

export type ClockAction =
  | { type: "tick"; dt: number }
  | { type: "play" }
  | { type: "pause" }
  /** The scrubber: pauses and moves to `t`. */
  | { type: "seek"; t: number }
  | { type: "replay" };

export function openClock(config: ClockConfig, reducedMotion: boolean): Clock {
  return reducedMotion ? { t: config.posterT, playing: false } : { t: 0, playing: true };
}

export function clockStep(clock: Clock, action: ClockAction, config: ClockConfig): Clock {
  const { duration } = config;
  switch (action.type) {
    case "tick": {
      if (!clock.playing) return clock;
      const t = clock.t + action.dt;
      if (t < duration) return { t, playing: true };
      return { t: duration, playing: false };
    }
    case "play":
      return { t: clock.t >= duration ? 0 : clock.t, playing: true };
    case "pause":
      return { ...clock, playing: false };
    case "seek":
      return { t: Math.min(duration, Math.max(0, action.t)), playing: false };
    case "replay":
      return { t: 0, playing: true };
  }
}
