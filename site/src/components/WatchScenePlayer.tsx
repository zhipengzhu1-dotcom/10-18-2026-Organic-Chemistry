// A watch-only Scene in a Step (#66): the committed Manim video, with the
// same frame, controls and rules as ScenePlayer. It autoplays once on entry
// (muted; the videos are silent); under reduced motion it opens paused on its
// poster frame. The clock rules come from engine/scene-clock.ts; the video
// element follows them and reports its own time back.
import { useEffect, useRef, useState } from "react";
import type { Aspect } from "@astratron/scenes";
import { watchScene, watchSceneFiles } from "@astratron/scenes/watch";
import type { Cited } from "@astratron/content/data";
import { clockStep, openClock, type Clock, type ClockAction, type ClockConfig } from "../engine/scene-clock.ts";
import { useReducedMotion } from "./ScenePlayer.tsx";

interface Props {
  sceneId: string;
  cited: Record<string, Cited>;
  aspect?: Aspect;
}

/** The shipped files live under site/public, served from the site root. */
const url = (file: string) => `/${file}`;

export default function WatchScenePlayer({ sceneId, cited, aspect = "16:9" }: Props) {
  const manifest = watchScene(sceneId)!;
  const files = watchSceneFiles(sceneId, aspect);
  const config: ClockConfig = { duration: manifest.duration, loop: false, posterT: manifest.poster };
  const reducedMotion = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  // Until the island knows the motion setting (and on the server) the Scene rests on its poster frame.
  const [clock, setClock] = useState<Clock>({ t: manifest.poster, playing: false });

  /** Apply a clock change to the video element (the clock decides; the video follows). */
  const apply = (next: Clock, seek: boolean) => {
    const v = video.current;
    setClock(next);
    if (!v) return;
    if (seek) v.currentTime = Math.min(next.t, manifest.duration);
    if (next.playing) void v.play().catch(() => setClock((c) => ({ ...c, playing: false })));
    else v.pause();
  };
  const act = (action: ClockAction) => {
    const next = clockStep(clock, action, config);
    apply(next, action.type !== "pause" && (action.type !== "play" || next.t !== clock.t));
  };

  useEffect(() => {
    if (video.current) video.current.muted = true;
    if (reducedMotion !== undefined) apply(openClock(config, reducedMotion), true);
  }, [reducedMotion]);

  // While playing, the scrubber follows the video's own clock.
  useEffect(() => {
    if (!clock.playing) return;
    let frame = requestAnimationFrame(function follow() {
      const v = video.current;
      if (v) setClock((c) => (c.playing ? { ...c, t: v.currentTime } : c));
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [clock.playing]);

  const [w, h] = aspect === "16:9" ? [16, 9] : [9, 16];
  const seconds = (t: number) => `${t.toFixed(1)} of ${manifest.duration} seconds`;

  return (
    <figure className="scene scene-watch" style={{ margin: "1rem 0" }}>
      <div
        className="scene-frame"
        role="img"
        aria-label={manifest.describe(cited)}
        style={{ aspectRatio: `${w} / ${h}`, width: "100%", maxHeight: "60vh", overflow: "hidden" }}
      >
        <video
          ref={video}
          src={url(files.video)}
          poster={url(files.poster)}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onEnded={() => setClock({ t: manifest.duration, playing: false })}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>
      <div className="scene-controls" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button
          type="button"
          aria-label={clock.playing ? "Pause" : "Play"}
          onClick={() => act({ type: clock.playing ? "pause" : "play" })}
          style={{ minWidth: 44, minHeight: 44 }}
        >
          {clock.playing ? "❚❚" : "▶"}
        </button>
        <button type="button" aria-label="Replay" onClick={() => act({ type: "replay" })} style={{ minWidth: 44, minHeight: 44 }}>
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
          onChange={(e) => act({ type: "seek", t: Number(e.target.value) })}
          style={{ flex: 1 }}
        />
      </div>
    </figure>
  );
}
