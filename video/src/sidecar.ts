// The `<scene>-<aspect>.sources.json` sidecar every render writes (story 111).
// It lists each cited value the Scene shows, with its citation from the same
// lookup as the site, and when it is on screen. On-screen times are measured,
// not declared: the Scene is rendered to markup at every video frame (it is a
// pure function of (t, state), ADR 0001) and each value is looked for in it.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sourceNote, type Cited } from "@astratron/content/data";
import { stateAt, type Aspect, type RegisteredScene } from "@astratron/scenes";
import { aspectTag, FPS } from "./jobs.ts";

export interface SidecarNumber {
  ref: string;
  label: string;
  quantity: Cited["quantity"];
  value: number | string;
  unit?: string;
  /** As the Scene and the site show it. */
  display: string;
  /** The full stored value, as in the Source note. */
  full: string;
  tier?: Cited["tier"];
  citation: string;
  /** The database the value was taken from, if any. */
  via?: string;
  licence: string;
  /**
   * How it was found on screen: printed as `text`, used as a `colour`, or
   * `drawn` (cited by the Scene but never printed, e.g. a length that sets a
   * drawing's scale), which counts as on screen for the whole video.
   */
  shown: "text" | "colour" | "drawn";
  /** Seconds into the video, `from` inclusive, `to` exclusive. */
  onScreen: { from: number; to: number }[];
}

export interface Sidecar {
  scene: string;
  title: string;
  aspect: Aspect;
  /** The video file this sidecar describes. */
  file: string;
  fps: number;
  duration: number;
  numbers: SidecarNumber[];
  /** Paste-ready text for a video description. */
  description: string;
}

const textOf = (markup: string) => markup.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&");

function appears(value: Cited, markup: string): boolean {
  if (value.quantity === "colour") return markup.toLowerCase().includes(String(value.value).toLowerCase());
  const text = textOf(markup);
  return text.includes(value.display) || text.includes(value.display.replace(/\s*[^\d.\-−]+$/, ""));
}

export function sourcesSidecar(scene: RegisteredScene<any>, aspect: Aspect, cited: Record<string, Cited>): Sidecar {
  const { manifest, Component } = scene;
  const frames = Math.round(manifest.video.duration * FPS);
  const duration = frames / FPS;
  const values = manifest.data.map((ref) => {
    const value = cited[ref];
    if (!value) throw new Error(`${manifest.id}: no cited value for "${ref}"`);
    return value;
  });

  const seen = values.map(() => [] as number[]);
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / FPS;
    const markup = renderToStaticMarkup(
      createElement(Component, { t, state: stateAt(manifest, t), aspect, reducedMotion: false, cited }),
    );
    values.forEach((v, i) => appears(v, markup) && seen[i]!.push(frame));
  }

  const numbers = values.map((v, i): SidecarNumber => {
    const found = seen[i]!;
    const shown = !found.length ? "drawn" : v.quantity === "colour" ? "colour" : "text";
    return {
      ref: v.ref,
      label: v.label,
      quantity: v.quantity,
      value: v.value,
      ...(v.unit ? { unit: v.unit } : {}),
      display: v.display,
      full: v.full,
      ...(v.tier ? { tier: v.tier } : {}),
      citation: v.source.citation,
      ...(v.source.via ? { via: v.source.via.citation } : {}),
      licence: v.licence,
      shown,
      onScreen: found.length ? ranges(found) : [{ from: 0, to: duration }],
    };
  });

  return {
    scene: manifest.id,
    title: manifest.title,
    aspect,
    file: `${manifest.id}-${aspectTag(aspect)}.mp4`,
    fps: FPS,
    duration,
    numbers,
    description: describe(manifest.title, numbers, values),
  };
}

/** Runs of consecutive frames as time ranges in seconds. */
function ranges(frames: number[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let start = frames[0]!;
  for (let i = 1; i <= frames.length; i++)
    if (i === frames.length || frames[i] !== frames[i - 1]! + 1) {
      out.push({ from: round(start / FPS), to: round((frames[i - 1]! + 1) / FPS) });
      start = frames[i]!;
    }
  return out;
}

const round = (s: number) => Math.round(s * 1000) / 1000;

/** m:ss, rounded down for a start and up for an end so the range covers the value. */
function clock(s: number, up: boolean): string {
  const whole = up ? Math.ceil(s - 1e-9) : Math.floor(s + 1e-9);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function describe(title: string, numbers: SidecarNumber[], values: Cited[]): string {
  if (!numbers.length) return `${title}\nThis video shows no cited numbers.`;
  const lines = numbers.flatMap((n) =>
    n.onScreen.map((r) => `${clock(r.from, false)}–${clock(r.to, true)}  ${n.label} ${n.display}`),
  );
  const note = sourceNote(values).map((p) => (p.lead ? `${p.lead} ${p.text}` : p.text));
  return [`${title}`, "", "Numbers on screen:", ...lines, "", "Sources:", ...note].join("\n");
}
