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
  /**
   * Set only when the Student can work the Scene itself (a goal-state Manipulate Step): the Scene
   * then draws its handles and drop targets as focusable buttons (`data-handle` / `data-target`,
   * each with an aria-label) and shows the Student's hold. The site's player owns this state.
   */
  input?: SceneInput;
}

/** A Student's hold on an interactive Scene, as the player tracks it. */
export interface SceneInput {
  /** The handle picked up (by Enter, or by pressing on it), if any. */
  held?: string;
  /** While a handle is dragged: the pointer, in frame coordinates. */
  pointer?: { x: number; y: number };
  /** The next move, drawn ghosted as a nudge after the Student has been idle twice. */
  nudge?: SceneMove;
}

/** Moving one handle onto one target. */
export interface SceneMove {
  handle: string;
  target: string;
}

/**
 * The rules of an interactive Scene (pure, no React): what a drop does. `state` = the settable
 * states the move changes, `say` = what a screen reader hears. `refused` = the move can't be made
 * (the Scene is unchanged and the Student is told why). Null = nothing there: the handle slides back.
 */
export type DropResult<S> = { state: Partial<S>; say: string } | { refused: string } | null;

export interface SceneInteraction<S extends SceneState = SceneState> {
  drop: (state: S, move: SceneMove) => DropResult<S>;
  /** A move that the Scene accepts from this state, for the idle nudge; undefined when none is left. */
  next: (state: S) => SceneMove | undefined;
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
  /**
   * Screen-reader text for what the Scene shows at this state and time. Never empty. `cited` is
   * the Scene's cited values (absent in the manifest check, so the text must not need them).
   */
  describe: (state: S, t: number, cited?: Record<string, Cited>) => string;
  /** Interactive Scenes only: the rules for moving their handles (goal-state Manipulate Steps). */
  interact?: SceneInteraction<S>;
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

/**
 * A watch-only Scene (#66): a video rendered offline by Manim CE, silent, at
 * 60 fps, with no editing pass. It plays in a Step like any Scene but has no
 * settable states and no React component; the site plays the committed video.
 */
export interface WatchSceneManifest {
  /** Kebab-case, unique across every Scene; Lesson files name the Scene by it. */
  id: string;
  title: string;
  /** The renderer script (under scenes/manim/) and its Scene class. */
  render: { engine: "manim"; script: string; sceneClass: string };
  /** Screen-reader text for the whole video, from its cited values. Never empty. */
  describe: (cited: Record<string, Cited>) => string;
  /** What the Scene does under reduced motion, in a sentence (it always opens paused on its poster frame). */
  reducedMotion: string;
  /** Cited-data refs (`file/key`) of every number the video shows; the renderer reads them from here (ADR 0002). */
  data: string[];
  /** On-screen words, handed to the renderer as they are (the screen-reader text repeats them). */
  text: Record<string, string[]>;
  /** Seconds; the render must come out this long. */
  duration: number;
  /** Seconds into the video for the poster frame (reduced motion, still). */
  poster: number;
  /** Must hold both "16:9" and "9:16". */
  aspects: Aspect[];
}

export interface RegisteredScene<S extends SceneState = SceneState> {
  manifest: SceneManifest<S>;
  Component: ComponentType<SceneProps<S>>;
}
