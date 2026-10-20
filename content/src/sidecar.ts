// The `<scene>-<aspect>.sources.json` sidecar every video render writes
// (story 111), for both video paths: Remotion (video/src/sidecar.ts) and Manim
// (scenes/src/manim/pipeline.ts). It lists each cited value the Scene names,
// with its citation from the same lookup as the site (ADR 0002), and when it is
// on screen. Each path only measures the on-screen ranges; the shape, rounding
// and description text live here.
import { find, sourceNote, type Cited, type CitedData } from "./data.ts";

/** Seconds into the video, `from` inclusive, `to` exclusive. */
export type OnScreen = { from: number; to: number };

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
   * `drawn` (cited by the Scene but never measured on screen, e.g. a length
   * that sets a drawing's scale), which counts as on screen for the whole video.
   */
  shown: "text" | "colour" | "drawn";
  onScreen: OnScreen[];
}

export interface Sidecar {
  scene: string;
  title: string;
  aspect: string;
  /** The video file this sidecar describes. */
  file: string;
  fps: number;
  /** Seconds. */
  duration: number;
  numbers: SidecarNumber[];
  /** Paste-ready text for a video description. */
  description: string;
}

/** The video a sidecar describes, and the refs its Scene cites (in manifest order). */
export type SidecarVideo = Omit<Sidecar, "numbers" | "description"> & { refs: readonly string[] };

/**
 * The cited values a Scene names, looked up in each data set in turn (first
 * hit wins). Throws on a ref none of them holds, naming the Scene and the ref.
 */
export function citedFor(scene: string, refs: readonly string[], ...data: CitedData[]): Record<string, Cited> {
  const out: Record<string, Cited> = {};
  for (const ref of refs) {
    const hit = data.map((d) => find(d, ref)).find(Boolean);
    if (!hit) throw missing(scene, ref);
    out[ref] = hit;
  }
  return out;
}

const missing = (scene: string, ref: string) => new Error(`Scene "${scene}" cites "${ref}", which is not in the cited data`);

/**
 * The sidecar for one render, from the Scene's cited values and the seconds
 * each ref was measured on screen. A ref with no ranges is `drawn` for the
 * whole video; a measured colour is `colour`, anything else measured `text`.
 */
export function sourcesSidecar(video: SidecarVideo, cited: Record<string, Cited>, measured: Record<string, readonly OnScreen[]>): Sidecar {
  const { scene, title, aspect, file, fps, duration, refs } = video;
  const values = refs.map((ref) => {
    const value = cited[ref];
    if (!value) throw missing(scene, ref);
    return value;
  });
  const numbers = values.map((v): SidecarNumber => {
    const ranges = measured[v.ref] ?? [];
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
      shown: !ranges.length ? "drawn" : v.quantity === "colour" ? "colour" : "text",
      onScreen: ranges.length ? ranges.map((r) => ({ from: round(r.from), to: round(r.to) })) : [{ from: 0, to: duration }],
    };
  });
  return { scene, title, aspect, file, fps, duration, numbers, description: describe(title, numbers, values) };
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
  return [title, "", "Numbers on screen:", ...lines, "", "Sources:", ...note].join("\n");
}
