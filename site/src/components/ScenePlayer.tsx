// The Scene frame in a Step: draws a registered Scene at the site clock's `t`,
// with Play/Pause, Replay and a scrubber. Autoplays once on entry (nothing loops,
// Manipulate Steps included: Replay plays it again); under reduced motion it opens paused on the poster frame.
// The clock rules live in engine/scene-clock.ts; Scenes only see (t, state), with t snapped to the
// 20 fps frame grid. While it plays, the drawing's pen lines boil (an SVG filter from Base.astro on
// the wrapper, one of three seeds per frame); stopped, they rest on the static `rough` wobble.
// ClockedFrame is the same frame for any pure function of t (push-replay).
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { sceneRegistry, type Aspect, type SceneState } from "@astratron/scenes";
import type { Cited } from "@astratron/content/data";
import { clockStep, frameRatio, openClock, sceneFrame, scrubText, type Clock, type ClockAction, type ClockConfig } from "../engine/scene-clock.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface Props {
  sceneId: string;
  state: SceneState;
  cited: Record<string, Cited>;
  aspect?: Aspect;
  /** A still picture: the poster frame, no playback controls. */
  still?: boolean;
  /** Controls drawn under the Scene (a Manipulate Step's slider). */
  children?: ReactNode;
}

type Action = ClockAction | { type: "open"; reducedMotion: boolean };

export default function ScenePlayer({ sceneId, state, cited, still = false, aspect = "16:9", children }: Props) {
  const { manifest, Component } = sceneRegistry[sceneId];
  const stateKey = JSON.stringify(state);
  return (
    <ClockedFrame
      duration={manifest.duration}
      posterT={manifest.poster.t}
      aspect={aspect}
      still={still}
      bare={manifest.controls === false}
      describe={(t) => manifest.describe(state, t, cited)}
      announceKey={stateKey}
      render={(t, reducedMotion) => (
        <Component t={t} state={state} aspect={aspect} reducedMotion={reducedMotion} cited={cited} />
      )}
    >
      {children}
    </ClockedFrame>
  );
}

interface FrameProps {
  /** Seconds in one run. */
  duration: number;
  /** The reduced-motion still. */
  posterT: number;
  aspect?: Aspect;
  /** Screen-reader text at t; the frame's accessible name. */
  describe: (t: number) => string;
  /** When this changes after entry, the description is read aloud (a Student changed the state). */
  announceKey?: string;
  render: (t: number, reducedMotion: boolean) => ReactNode;
  /** A still picture: rests on the poster, drawn as under reduced motion, with no controls. */
  still?: boolean;
  /** Plays once with no Play/Replay/Scrub row (a Scene whose manifest says `controls: false`: 5 s or less). */
  bare?: boolean;
  children?: ReactNode;
}

/** A frame driven by the site clock: autoplays once on entry, or rests on its poster under reduced motion (Play starts it). */
export function ClockedFrame({ duration, posterT, aspect = "16:9", describe, announceKey = "", render, still = false, bare = false, children }: FrameProps) {
  const config: ClockConfig = { duration, posterT };
  const reducedMotion = useReducedMotion();
  // Until the island knows the motion setting (and on the server) the frame rests on its poster.
  const [clock, dispatch] = useReducer(
    (c: Clock, a: Action) => (a.type === "open" ? openClock(config, a.reducedMotion) : clockStep(c, a, config)),
    { t: posterT, playing: false },
  );

  useEffect(() => {
    if (reducedMotion !== undefined) dispatch({ type: "open", reducedMotion: reducedMotion || still });
  }, [reducedMotion, still]);

  // The site's own clock: animation-frame ticks while playing, handed on only when they reach a
  // new 20 fps frame, so the frame re-renders 20 times a second and holds each drawing between.
  const shownT = useRef(clock.t);
  shownT.current = clock.t;
  useEffect(() => {
    if (!clock.playing) return;
    let last: number | undefined;
    let pending = 0;
    let raf = requestAnimationFrame(function tick(now) {
      if (last !== undefined) {
        pending += (now - last) / 1000;
        const t = shownT.current;
        if (sceneFrame(t + pending, duration).frame !== sceneFrame(t, duration).frame) {
          dispatch({ type: "tick", dt: pending });
          shownT.current = t + pending;
          pending = 0;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [clock.playing]);

  // Scenes see t on the frame grid (ADR 0001 holds: the snap lives here, not in the Scene).
  const shown = sceneFrame(clock.t, duration);
  // Pen lines boil while the Scene plays (one of three seeds per frame) and rest on a static wobble
  // when it stops; under reduced motion (and until the island knows the setting) there is none.
  const ink = reducedMotion !== false ? undefined : clock.playing ? `url(#boil-${shown.frame % 3})` : "url(#rough)";
  const description = describe(shown.t);
  const [said, setSaid] = useState("");
  const [firstKey] = useState(announceKey);
  // Announce what the frame shows when the Student changes its state (not on entry, not every frame).
  useEffect(() => {
    if (announceKey !== firstKey) setSaid(description);
  }, [announceKey]);

  return (
    <figure className={still ? "scene scene-bare scene-still" : bare ? "scene scene-bare" : "scene"}>
      <div
        className="scene-frame"
        role="img"
        aria-label={description}
        style={{ aspectRatio: frameRatio(aspect) }}
      >
        {/* The frame's description says what it shows; the drawing's own labels would be read twice. */}
        <div aria-hidden="true" className="scene-ink" style={{ filter: ink }}>
          {render(shown.t, still || (reducedMotion ?? false))}
        </div>
      </div>
      {!still && !bare && (
      <div className="scene-controls">
        <button
          type="button"
          aria-label={clock.playing ? "Pause" : "Play"}
          className="scene-btn"
          onClick={() => dispatch({ type: clock.playing ? "pause" : "play" })}
        >
          {clock.playing ? "❚❚" : "▶"}
        </button>
        <button type="button" aria-label="Replay" className="scene-btn" onClick={() => dispatch({ type: "replay" })}>
          ↺
        </button>
        <input
          type="range"
          aria-label="Scrub"
          min={0}
          max={duration}
          step={0.01}
          value={clock.t}
          aria-valuetext={scrubText(shown.t, duration)}
          className="scene-range"
          onChange={(e) => dispatch({ type: "seek", t: Number(e.target.value) })}
        />
      </div>
      )}
      {children}
      <p aria-live="polite" className="sr">
        {said}
      </p>
    </figure>
  );
}
