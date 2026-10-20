// A watch-only Scene in a Step (#66): the committed Manim video, with the
// same frame, controls and rules as ScenePlayer. It autoplays once on entry
// (muted; the videos are silent); under reduced motion it opens paused on its
// poster frame. The clock rules come from engine/scene-clock.ts; the video
// element follows them and reports its own time back.
import { useEffect, useRef, useState } from "react";
import type { Aspect } from "@astratron/scenes";
import { watchScene, watchSceneFiles } from "@astratron/scenes/watch";
import type { Cited } from "@astratron/content/data";
import { clockStep, frameRatio, openClock, scrubText, type Clock, type ClockAction, type ClockConfig } from "../engine/scene-clock.ts";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface Props {
  sceneId: string;
  cited: Record<string, Cited>;
  aspect?: Aspect;
  /**
   * In a graded Step (e.g. a Hook question under the video): whenever the video isn't playing
   * (it has played, was paused, or rests on its last frame under reduced motion) the frame
   * shrinks to a card at the top so the question fits one screen. Play brings it back.
   */
  shrinkWhenDone?: boolean;
  /** Told each time the video starts or stops playing. */
  onPlaying?: (playing: boolean) => void;
}

/** The shipped files live under site/public, served from the site root. */
const url = (file: string) => `/${file}`;

export default function WatchScenePlayer({ sceneId, cited, aspect = "16:9", shrinkWhenDone = false, onPlaying }: Props) {
  const manifest = watchScene(sceneId)!;
  const files = watchSceneFiles(sceneId, aspect);
  const config: ClockConfig = { duration: manifest.duration, posterT: manifest.poster };
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

  useEffect(() => onPlaying?.(clock.playing), [clock.playing]);

  return (
    <figure className={shrinkWhenDone && !clock.playing ? "scene scene-watch shrunk" : "scene scene-watch"}>
      <div
        className="scene-frame"
        role="img"
        aria-label={manifest.describe(cited)}
        style={{ aspectRatio: frameRatio(aspect) }}
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
      <div className="scene-controls">
        <button
          type="button"
          aria-label={clock.playing ? "Pause" : "Play"}
          className="scene-btn"
          onClick={() => act({ type: clock.playing ? "pause" : "play" })}
        >
          {clock.playing ? "❚❚" : "▶"}
        </button>
        <button type="button" aria-label="Replay" className="scene-btn" onClick={() => act({ type: "replay" })}>
          ↺
        </button>
        <input
          type="range"
          aria-label="Scrub"
          min={0}
          max={manifest.duration}
          step={0.01}
          value={clock.t}
          aria-valuetext={scrubText(clock.t, manifest.duration)}
          className="scene-range"
          onChange={(e) => act({ type: "seek", t: Number(e.target.value) })}
        />
      </div>
    </figure>
  );
}
