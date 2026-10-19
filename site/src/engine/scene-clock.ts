// The site's own Scene clock (ADR 0001): a pure state machine for `t`. The
// ScenePlayer island feeds it animation-frame ticks; Scenes only see `t`.
// A Scene autoplays once on entry (loops only in Manipulate Steps); under
// reduced motion it opens paused on its poster frame.

export interface Clock {
  /** Seconds into the Scene. */
  t: number;
  playing: boolean;
}

export interface ClockConfig {
  /** Seconds one run lasts (the manifest's `duration`). */
  duration: number;
  /** True in Manipulate Steps only. */
  loop: boolean;
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
  const { duration, loop } = config;
  switch (action.type) {
    case "tick": {
      if (!clock.playing) return clock;
      const t = clock.t + action.dt;
      if (t < duration) return { t, playing: true };
      return loop ? { t: t % duration, playing: true } : { t: duration, playing: false };
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
