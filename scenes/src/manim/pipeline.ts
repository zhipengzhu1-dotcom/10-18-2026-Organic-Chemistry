// The Manim render pipeline for watch-only Scenes (#66), Node only (never in a
// browser bundle). The render command (render-cli.ts) feeds each Manim script
// a props file built here from the cited-data lookup, then writes the shipped
// video, poster and sources sidecar and a render record. The record holds a
// hash of every input, so CI can tell a stale render without running Manim
// (byte-identical MP4s across machines are not guaranteed; inputs are).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Cited, CitedData } from "@astratron/content/data";
import { citedFor, sourcesSidecar as toSidecar, type Sidecar } from "@astratron/content/sidecar";
import type { Aspect, WatchSceneManifest } from "../types.ts";
import { frameSize } from "../frame.ts";
import { aspectSlug, watchSceneFiles } from "../watch.ts";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
/** Every watch-only Scene renders at 60 fps (owner decision, 2026-10-19). */
export const FPS = 60;
export const MANIM_VERSION = "0.22.0";
export const manimDir = "scenes/manim";
export const recordPath = (id: string) => `${manimDir}/renders/${id}.json`;
export const publicPath = (file: string) => `site/public/${file}`;

/**
 * The Arcade Cosmos colours the committed Manim and Blender renders were drawn with (#59's dark
 * `:root`), frozen here when the site moved to Paper Notebook (#118) so those renders stay current.
 * #123 re-renders them on paper and moves these keys to the new token names.
 */
export const ARCADE_VIDEO_PALETTE: Readonly<Record<string, string>> = {
  "at-space": "#0d0626",
  "at-neb-1": "#ff4fd8",
  "at-neb-2": "#b44dff",
  "at-neb-3": "#2340ff",
  "at-electron": "#3ee8ff",
  "at-ignite": "#ff9a1f",
  "at-ink": "#ffffff", // cited-data: ok, the Arcade ink colour, not hydrogen's
  "at-ink-muted": "#b9a8e8",
  "star-core": "#ffe2a8", // the star's pale-gold core (the prototype's glow centre), not a UI token
};

/** Colours for the Manim and Blender renderers (frozen: see ARCADE_VIDEO_PALETTE). */
export function videoPalette(): Record<string, string> {
  return { ...ARCADE_VIDEO_PALETTE };
}

export interface ManimProps {
  scene: string;
  aspect: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  /** Cited values by ref: the only numbers the script may show. */
  values: Record<string, number | string>;
  text: Record<string, string[]>;
  palette: Record<string, string>;
}

/** What one Manim render of `aspect` is given (written to a JSON file the script reads). */
export function manimProps(m: WatchSceneManifest, cited: Record<string, Cited>, aspect: Aspect, root = repoRoot): ManimProps {
  const { width, height } = frameSize(aspect);
  return {
    scene: m.id,
    aspect: aspectSlug(aspect),
    fps: FPS,
    width,
    height,
    duration: m.duration,
    values: Object.fromEntries(m.data.map((ref) => [ref, cited[ref].value])),
    text: m.text,
    palette: videoPalette(),
  };
}

/** Seconds [from, to] a ref's number is on screen. */
export type Timings = Record<string, [number, number][]>;

/** `<scene>-<aspect>.sources.json` (@astratron/content/sidecar), with on-screen times from the script's timings. */
export function sourcesSidecar(m: WatchSceneManifest, cited: Record<string, Cited>, aspect: Aspect, timings: Timings): Sidecar {
  const file = watchSceneFiles(m.id, aspect).video.split("/").pop()!;
  const video = { scene: m.id, title: m.title, aspect, file, fps: FPS, duration: m.duration, refs: m.data };
  const measured = Object.fromEntries(Object.entries(timings).map(([ref, r]) => [ref, r.map(([from, to]) => ({ from, to }))]));
  return toSidecar(video, cited, measured);
}

/** sha256 over everything a render depends on: script, fonts, props of each aspect, Manim version, fps. */
export function inputsHash(m: WatchSceneManifest, cited: Record<string, Cited>, root = repoRoot): string {
  const hash = createHash("sha256");
  hash.update(`manim ${MANIM_VERSION} fps ${FPS}\n`);
  const files = [m.render.script, ...readdirSync(join(root, manimDir, "fonts")).sort().map((f) => `fonts/${f}`)];
  for (const file of files) hash.update(`${file}\n`).update(readFileSync(join(root, manimDir, file)));
  for (const aspect of m.aspects) hash.update(JSON.stringify(manimProps(m, cited, aspect, root)));
  return hash.digest("hex");
}

/** What the render command records next to the scripts (scenes/manim/renders/<id>.json). */
export interface RenderRecord {
  scene: string;
  manim: string;
  fps: number;
  inputs: string;
  aspects: Partial<Record<Aspect, { frames: number; timings: Timings }>>;
}

/**
 * Messages for every watch-only Scene whose committed render is missing,
 * incomplete or older than its inputs; empty when all are current.
 */
export function checkWatchRenders(manifests: readonly WatchSceneManifest[], data: CitedData, root = repoRoot): string[] {
  const errors: string[] = [];
  for (const m of manifests) {
    const at = (message: string) => errors.push(`scenes/${m.id}: ${message}; run \`pnpm scenes:render ${m.id}\``);
    const cited = citedFor(m.id, m.data, data);
    const recordFile = join(root, recordPath(m.id));
    if (!existsSync(recordFile)) {
      at(`${recordPath(m.id)} is missing`);
      continue;
    }
    const record = JSON.parse(readFileSync(recordFile, "utf8")) as RenderRecord;
    if (record.inputs !== inputsHash(m, cited, root)) at("its inputs changed since the committed render");
    if (record.fps !== FPS) at(`it was rendered at ${record.fps} fps, not ${FPS}`);
    for (const aspect of m.aspects) {
      const rendered = record.aspects[aspect];
      if (!rendered) {
        at(`no ${aspect} render`);
        continue;
      }
      if (Math.abs(rendered.frames / FPS - m.duration) > 2 / FPS)
        at(`the ${aspect} video runs ${(rendered.frames / FPS).toFixed(2)} s, not the manifest's ${m.duration} s`);
      const files = watchSceneFiles(m.id, aspect);
      for (const file of [files.video, files.poster, files.sources]) {
        if (!existsSync(join(root, publicPath(file)))) at(`${publicPath(file)} is missing`);
      }
      const sidecarFile = join(root, publicPath(files.sources));
      if (existsSync(sidecarFile)) {
        const expected = sourcesSidecar(m, cited, aspect, rendered.timings);
        if (JSON.stringify(JSON.parse(readFileSync(sidecarFile, "utf8"))) !== JSON.stringify(expected))
          at(`${publicPath(files.sources)} is out of date with the cited data`);
      }
    }
  }
  return errors;
}
