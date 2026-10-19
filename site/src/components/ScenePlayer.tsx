// The Scene frame in a Step: draws a registered Scene at the site clock's `t`,
// with Play/Pause, Replay and a scrubber. Autoplays once on entry (loops in
// Manipulate Steps); under reduced motion it opens paused on the poster frame.
// The clock rules live in engine/scene-clock.ts; Scenes only see (t, state).
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
  /** A still picture: the poster frame, no playback controls. */
  still?: boolean;
  /** Controls drawn under the Scene (a Manipulate Step's slider). */
  children?: ReactNode;
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

export default function ScenePlayer({ sceneId, state, cited, loop = false, still = false, aspect = "16:9", children }: Props) {
  const { manifest, Component } = sceneRegistry[sceneId];
  const config: ClockConfig = { duration: manifest.duration, loop, posterT: manifest.poster.t };
  const reducedMotion = useReducedMotion();
  // Until the island knows the motion setting (and on the server) the Scene rests on its poster frame.
  const [clock, dispatch] = useReducer(
    (c: Clock, a: Action) => (a.type === "open" ? openClock(config, a.reducedMotion) : clockStep(c, a, config)),
    { t: manifest.poster.t, playing: false },
  );

  useEffect(() => {
    if (reducedMotion !== undefined) dispatch({ type: "open", reducedMotion: reducedMotion || still });
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

  const description = manifest.describe(state, clock.t, cited);
  const [said, setSaid] = useState("");
  const stateKey = JSON.stringify(state);
  const [firstKey] = useState(stateKey);
  // Announce what the Scene shows when the Student changes its state (not on entry, not every frame).
  useEffect(() => {
    if (stateKey !== firstKey) setSaid(manifest.describe(state, clock.t, cited));
  }, [stateKey]);

  const [w, h] = aspect === "16:9" ? [16, 9] : [9, 16];
  const seconds = (t: number) => `${t.toFixed(1)} of ${manifest.duration} seconds`;

  return (
    <figure className="scene">
      <div
        className="scene-frame"
        role="img"
        aria-label={description}
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        <Component t={clock.t} state={state} aspect={aspect} reducedMotion={still || (reducedMotion ?? false)} cited={cited} />
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
          max={manifest.duration}
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
