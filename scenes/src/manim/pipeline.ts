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
import { find, type Cited, type CitedData } from "@astratron/content/data";
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

export const tokensPath = "site/src/styles/tokens.css";
/** The design tokens the videos draw with, from #59's dark `:root` theme (the videos are always dark). */
const tokenNames = ["at-space", "at-neb-1", "at-neb-2", "at-neb-3", "at-electron", "at-ignite", "at-ink", "at-ink-muted"];

/** Arcade Cosmos colours for the renderer, read from the site's tokens.css, plus the star's hot core. */
export function videoPalette(root = repoRoot): Record<string, string> {
  const css = readFileSync(join(root, tokensPath), "utf8");
  const start = css.indexOf(":root {");
  const body = css.slice(start, css.indexOf("}", start));
  const palette: Record<string, string> = {};
  for (const name of tokenNames) {
    const m = body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
    if (start < 0 || !m) throw new Error(`${tokensPath} has no --${name} colour in :root`);
    palette[name] = m[1].toLowerCase();
  }
  palette["star-core"] = "#ffe2a8"; // the star's pale-gold core (the prototype's glow centre), not a UI token
  return palette;
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
    palette: videoPalette(root),
  };
}

/** Seconds [from, to] a ref's number is on screen. */
export type Timings = Record<string, [number, number][]>;

export interface SourcesSidecar {
  scene: string;
  title: string;
  aspect: Aspect;
  fps: number;
  duration: number;
  video: string;
  numbers: {
    ref: string;
    label: string;
    value: number | string;
    display: string;
    citation: string;
    licence: string;
    shown: [number, number][];
  }[];
  /** Paste-ready text for a video description. */
  description: string;
}

const round = (s: number) => Math.round(s * 100) / 100;

/** `<scene>-<aspect>.sources.json`: each number the video uses, its citation and when it is on screen. */
export function sourcesSidecar(m: WatchSceneManifest, cited: Record<string, Cited>, aspect: Aspect, timings: Timings): SourcesSidecar {
  const numbers = m.data.map((ref) => {
    const c = cited[ref];
    return {
      ref,
      label: c.label,
      value: c.value,
      display: c.display,
      citation: c.source.citation,
      licence: c.licence,
      shown: (timings[ref] ?? []).map(([a, b]) => [round(a), round(b)] as [number, number]),
    };
  });
  // One line per source, listing the values it gave.
  const bySource = new Map<string, string[]>();
  for (const n of numbers) {
    const key = `${n.citation}. ${n.licence}.`;
    bySource.set(key, [...(bySource.get(key) ?? []), `${n.label} (${n.display})`]);
  }
  const description = [
    m.title,
    "",
    m.describe(cited),
    ...(numbers.length ? ["", "Sources:", ...[...bySource].map(([source, values]) => `- ${values.join(", ")}: ${source}`)] : []),
  ].join("\n");
  const video = watchSceneFiles(m.id, aspect).video.split("/").pop()!;
  return { scene: m.id, title: m.title, aspect, fps: FPS, duration: m.duration, video, numbers, description };
}

/** The cited values a watch-only Scene names, from a Subject's data. */
export function citedFor(m: WatchSceneManifest, data: CitedData): { cited: Record<string, Cited>; missing: string[] } {
  const cited: Record<string, Cited> = {};
  const missing: string[] = [];
  for (const ref of m.data) {
    const c = find(data, ref);
    if (c) cited[ref] = c;
    else missing.push(ref);
  }
  return { cited, missing };
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
    const { cited, missing } = citedFor(m, data);
    if (missing.length) {
      errors.push(`scenes/${m.id}: cites ${missing.join(", ")}, not in the cited data`);
      continue;
    }
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
