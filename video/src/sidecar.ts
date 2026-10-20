// The Remotion side of the `<scene>-<aspect>.sources.json` sidecar (story 111);
// the shape and its text are @astratron/content/sidecar's. On-screen times are
// measured, not declared: the Scene is rendered to markup at every video frame
// (it is a pure function of (t, state), ADR 0001) and each value is looked for in it.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Cited } from "@astratron/content/data";
import { sourcesSidecar as toSidecar, type OnScreen, type Sidecar } from "@astratron/content/sidecar";
import { stateAt, type Aspect, type RegisteredScene } from "@astratron/scenes";
import { aspectTag, FPS } from "./jobs.ts";

const textOf = (markup: string) => markup.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&");

function appears(value: Cited, markup: string): boolean {
  if (value.quantity === "colour") return markup.toLowerCase().includes(String(value.value).toLowerCase());
  const text = textOf(markup);
  return text.includes(value.display) || text.includes(value.display.replace(/\s*[^\d.\-−]+$/, ""));
}

export function sourcesSidecar(scene: RegisteredScene<any>, aspect: Aspect, cited: Record<string, Cited>): Sidecar {
  const { manifest, Component } = scene;
  const frames = Math.round(manifest.video.duration * FPS);
  const video = {
    scene: manifest.id,
    title: manifest.title,
    aspect,
    file: `${manifest.id}-${aspectTag(aspect)}.mp4`,
    fps: FPS,
    duration: frames / FPS,
    refs: manifest.data,
  };
  toSidecar(video, cited, {}); // an unknown ref throws here, before any frame is drawn

  const seen = manifest.data.map(() => [] as number[]);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / FPS;
    const markup = renderToStaticMarkup(
      createElement(Component, { t, state: stateAt(manifest, t), aspect, reducedMotion: false, cited }),
    );
    manifest.data.forEach((ref, i) => appears(cited[ref]!, markup) && seen[i]!.push(frame));
  }
  return toSidecar(video, cited, Object.fromEntries(manifest.data.map((ref, i) => [ref, ranges(seen[i]!)])));
}

/** Runs of consecutive frames as time ranges in seconds. */
function ranges(frames: number[]): OnScreen[] {
  const out: OnScreen[] = [];
  let start = frames[0]!;
  for (let i = 1; i <= frames.length; i++)
    if (i === frames.length || frames[i] !== frames[i - 1]! + 1) {
      out.push({ from: start / FPS, to: (frames[i - 1]! + 1) / FPS });
      start = frames[i]!;
    }
  return out;
}
