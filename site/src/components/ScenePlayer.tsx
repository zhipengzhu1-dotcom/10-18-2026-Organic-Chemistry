// The Scene frame in a Step: draws a registered Scene at the site clock's `t`,
// with Play/Pause, Replay and a scrubber. Autoplays once on entry (loops in
// Manipulate Steps); under reduced motion it opens paused on the poster frame.
// The clock rules live in engine/scene-clock.ts; Scenes only see (t, state).
// ClockedFrame is the same frame for any pure function of t (push-replay).
import { useEffect, useReducer, useState, type ReactNode } from "react";
import { sceneRegistry, type Aspect, type SceneState } from "@astratron/scenes";
import type { Cited } from "@astratron/content/data";
import { clockStep, openClock, type Clock, type ClockAction, type ClockConfig } from "../engine/scene-clock.ts";

interface Props {
  sceneId: string;
  state: SceneState;
  cited: Record<string, Cited>;
  /** True in Manipulate Steps only. */
  loop?: boolean;
  aspect?: Aspect;
  /** Controls drawn under the Scene (a Manipulate Step's slider). */
  children?: ReactNode;
  /** One frame (the poster), with no Play controls. */
  still?: boolean;
}

/** Reduced motion from the OS setting or the site's switch (`<html data-motion="reduced">`). */
export function useReducedMotion(): boolean | undefined {
  const [reduced, setReduced] = useState<boolean>();
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches || document.documentElement.dataset.motion === "reduced");
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  return reduced;
}

type Action = ClockAction | { type: "open"; reducedMotion: boolean };

export default function ScenePlayer({ sceneId, state, cited, loop = false, aspect = "16:9", children, still = false }: Props) {
  const { manifest, Component } = sceneRegistry[sceneId];
  const stateKey = JSON.stringify(state);
  return (
    <ClockedFrame
      duration={manifest.duration}
      posterT={manifest.poster.t}
      loop={loop}
      aspect={aspect}
      describe={(t) => manifest.describe(state, t)}
      announceKey={stateKey}
      still={still}
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
  loop?: boolean;
  aspect?: Aspect;
  /** Screen-reader text at t; the frame's accessible name. */
  describe: (t: number) => string;
  /** When this changes after entry, the description is read aloud (a Student changed the state). */
  announceKey?: string;
  render: (t: number, reducedMotion: boolean) => ReactNode;
  children?: ReactNode;
  /** Rest on the poster with no Play controls. */
  still?: boolean;
}

/** A frame driven by the site clock: autoplays once on entry, or rests on its poster under reduced motion (Play starts it). */
export function ClockedFrame({ duration, posterT, loop = false, aspect = "16:9", describe, announceKey = "", render, children, still = false }: FrameProps) {
  const config: ClockConfig = { duration, loop, posterT };
  const reducedMotion = useReducedMotion();
  // Until the island knows the motion setting (and on the server) the frame rests on its poster.
  const [clock, dispatch] = useReducer(
    (c: Clock, a: Action) => (a.type === "open" ? openClock(config, a.reducedMotion) : clockStep(c, a, config)),
    { t: posterT, playing: false },
  );

  useEffect(() => {
    if (reducedMotion !== undefined && !still) dispatch({ type: "open", reducedMotion });
  }, [reducedMotion, still]);

  // The site's own clock: animation-frame ticks while playing.
  useEffect(() => {
    if (!clock.playing) return;
    let last: number | undefined;
    let frame = requestAnimationFrame(function tick(now) {
      if (last !== undefined) dispatch({ type: "tick", dt: (now - last) / 1000 });
      last = now;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [clock.playing]);

  const description = describe(clock.t);
  const [said, setSaid] = useState("");
  const [firstKey] = useState(announceKey);
  // Announce what the frame shows when the Student changes its state (not on entry, not every frame).
  useEffect(() => {
    if (announceKey !== firstKey) setSaid(describe(clock.t));
  }, [announceKey]);

  const [w, h] = aspect === "16:9" ? [16, 9] : [9, 16];
  const seconds = (t: number) => `${t.toFixed(1)} of ${duration} seconds`;

  return (
    <figure className={still ? "scene scene-still" : "scene"}>
      <div
        className="scene-frame"
        role="img"
        aria-label={description}
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {render(clock.t, reducedMotion ?? false)}
      </div>
      {!still && (
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
            aria-valuetext={seconds(clock.t)}
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
