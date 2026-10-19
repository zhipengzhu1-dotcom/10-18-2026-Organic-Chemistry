// The Arcade Cosmos colour tokens (tokens.css) checked against the spec's rules
// in both themes: text pairs ≥ 4.5:1, lines and fills ≥ 3:1, fills the same in
// both themes, and no red anywhere (feedback is never red).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

/** The `--at-*: #hex` declarations of the first rule whose selector is `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block in tokens.css`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--at-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

const dark = block(":root");
const light = { ...dark, ...block(':root[data-theme="light"]') };
const themes = { dark, light } as const;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** CSS `color-mix(in srgb, a p%, b)`. */
const mix = (a: string, p: number, b: string) => hex(rgb(a).map((v, i) => (v * p + rgb(b)[i] * (100 - p)) / 100));

// WCAG 2.x relative luminance and contrast ratio.
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Hue in degrees and HSL saturation (0–1). */
function hueSat(h: string): [number, number] {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return [0, 0];
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, s];
}

// Pairs are [foreground, background]; a background may be a feedback panel tint.
type T = Record<string, string>;
const bg = {
  space: (t: T) => t.space,
  surface: (t: T) => t.surface,
  raised: (t: T) => t.raised,
  fbOk: (t: T) => mix(t["electron-fill"], 12, t.space),
  fbRetry: (t: T) => mix(t["boss-fill"], 10, t.space),
};
const textPairs: [string, keyof typeof bg | string][] = [
  ["ink", "space"], ["ink", "surface"], ["ink", "raised"],
  ["ink-muted", "space"], ["ink-muted", "surface"], ["ink-muted", "raised"],
  ["electron", "space"], ["electron", "surface"],
  ["ignite", "space"], ["ignite", "surface"],
  ["boss", "space"], ["boss", "surface"],
  ["on-fill", "ignite-fill"], ["on-fill", "electron-fill"], ["on-fill", "boss-fill"],
  ["ink", "fbOk"], ["electron", "fbOk"],
  ["ink", "fbRetry"], ["boss", "fbRetry"],
  ["space", "ink-muted"], // the → icon on the reveal panel
];
const linePairs: [string, string][] = [
  ["line", "space"], ["line", "surface"],
  ["electron", "space"], ["boss", "space"], ["ink-muted", "surface"], // feedback panel borders
];
// A fill's boundary on the page: the fill itself, or its dark edge where the theme sets one.
const fills = ["ignite-fill", "electron-fill", "boss-fill"];
const colour = (t: T, name: string) => (name in bg ? bg[name as keyof typeof bg](t) : t[name]);

describe.each(Object.entries(themes))("%s theme", (_name, t) => {
  it.each(textPairs)("text %s on %s is at least 4.5:1", (fg, back) => {
    expect(ratio(colour(t, fg), colour(t, back))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(linePairs)("line %s on %s is at least 3:1", (fg, back) => {
    expect(ratio(colour(t, fg), colour(t, back))).toBeGreaterThanOrEqual(3);
  });

  it.each(fills)("%s stands out from space by at least 3:1 (fill or its edge)", (fill) => {
    const edge = t["fill-edge"];
    const best = Math.max(ratio(t[fill], t.space), edge ? ratio(edge, t.space) : 0);
    expect(best).toBeGreaterThanOrEqual(3);
  });

  it("has no red token (hue within 20° of pure red)", () => {
    const reds = Object.entries(t).filter(([, h]) => {
      const [hue, sat] = hueSat(h);
      return sat > 0.25 && (hue < 20 || hue > 340);
    });
    expect(reds).toEqual([]);
  });
});

describe("theme rules", () => {
  it("keeps every fill and the ink on fills the same in both themes", () => {
    for (const k of ["electron-fill", "ignite-fill", "boss-fill", "on-fill"]) expect([k, light[k]]).toEqual([k, dark[k]]);
    expect(lum(dark["on-fill"])).toBeLessThan(0.05); // dark ink on every fill
  });

  it("retunes the text-safe inks per theme", () => {
    for (const k of ["ink", "ink-muted", "electron", "ignite", "boss"]) expect(light[k]).not.toBe(dark[k]);
  });

  it("uses violet only for shadows: no text rule reads --at-shadow", () => {
    expect(css).not.toMatch(/(^|[^-])color:\s*var\(--at-shadow\)/m);
  });

  it("sets the motion durations 90 / 180 / 420 ms", () => {
    expect(css).toMatch(/--at-dur-press:\s*90ms/);
    expect(css).toMatch(/--at-dur-ui:\s*180ms/);
    expect(css).toMatch(/--at-dur-card:\s*420ms/);
  });
});
