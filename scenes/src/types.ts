// The Scene contract (ADR 0001). A Scene is a pure React component of
// (t, state): everything it draws is computed from its props. No timers,
// frame hooks, CSS transitions or unseeded randomness (`pnpm lint:scenes`).
import type { ComponentType } from "react";
import type { SceneStateSpec, SceneValue } from "@astratron/content";
import type { Cited } from "@astratron/content/data";

export type { SceneStateSpec, SceneValue };

/** The two frames every Scene lays itself out for, without cropping. */
export type Aspect = "16:9" | "9:16";

/** A Scene's settable states, by name. */
export type SceneState = Record<string, SceneValue>;

export interface SceneProps<S extends SceneState = SceneState> {
  /** Seconds since the Scene started playing; the site clock or the video frame sets it. */
  t: number;
  state: S;
  aspect: Aspect;
  /** True when the Student asked for reduced motion: draw no idle motion, keep changes to short fades. */
  reducedMotion: boolean;
  /** The cited values the manifest's `data` names, by ref; the only way a number reaches the Scene (ADR 0002). */
  cited: Record<string, Cited>;
}

export interface TimelineKey<S extends SceneState = SceneState> {
  /** Seconds into the video. */
  at: number;
  /** The states this keyframe sets; range states ease linearly to the next keyframe that sets them. */
  state: Partial<S>;
}

export interface SceneManifest<S extends SceneState = SceneState> {
  /** Kebab-case, unique; Lesson files name the Scene by it. */
  id: string;
  title: string;
  /** Settable states: what a Step, a slider or the video timeline can set. May be empty. */
  states: { [K in keyof S]: SceneStateSpec };
  /** Screen-reader text for what the Scene shows at this state and time (its cited values passed in, as to the Scene). Never empty. */
  describe: (state: S, t: number, cited: Record<string, Cited>) => string;
  /** What the Scene does under reduced motion, in a sentence (it always opens paused on its poster frame). */
  reducedMotion: string;
  /** Cited-data refs (`file/key`) of every number or element colour the Scene shows. May be empty. */
  data: string[];
  /** Seconds one autoplay run lasts on the site (a Manipulate Step loops it). */
  duration: number;
  /** The frame shown paused under reduced motion and as the still: a time within `duration`. */
  poster: { t: number };
  /** How the video module renders the Scene with no input (#65). */
  video: {
    /** Seconds. */
    duration: number;
    /** Keyframes, first at 0, in time order. */
    timeline: TimelineKey<S>[];
    /** Seconds into the video for the poster frame / thumbnail. */
    poster: number;
    /** Must hold both "16:9" and "9:16". */
    aspects: Aspect[];
  };
}

export interface RegisteredScene<S extends SceneState = SceneState> {
  manifest: SceneManifest<S>;
  Component: ComponentType<SceneProps<S>>;
}
