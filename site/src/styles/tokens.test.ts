// The Paper Notebook colour tokens (tokens.css) checked against the spec's rules (#117):
// one theme, every pen ink readable on paper, pen ink readable on every marker fill,
// and no red anywhere (feedback is never red; "not quite" is pink).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

/** The `--at-*: #hex` declarations of the `:root` block. */
function rootBlock(): Record<string, string> {
  const start = css.indexOf(":root {");
  if (start < 0) throw new Error("no :root block in tokens.css");
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--at-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}
const t = rootBlock();

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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

const PEN_INKS = ["ink", "ink-muted", "blue", "green", "pink", "violet", "orange"];
const FILLS = ["blue-fill", "green-fill", "pink-fill", "violet-fill", "orange-fill", "yellow-fill"];

describe("Paper Notebook tokens", () => {
  it("has exactly one rule block, :root (no theme blocks)", () => {
    expect(css.match(/\{/g)).toHaveLength(1);
    expect(css).toMatch(/:root\s*\{/);
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("names every surface, pen ink and marker fill", () => {
    for (const k of ["paper", "rule", "margin", ...PEN_INKS, ...FILLS]) expect(t, k).toHaveProperty(k);
  });

  it.each(PEN_INKS)("pen ink %s on paper is at least 4.5:1", (ink) => {
    expect(ratio(t[ink], t.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(FILLS)("pen ink on %s is at least 4.5:1", (fill) => {
    expect(ratio(t.ink, t[fill])).toBeGreaterThanOrEqual(4.5);
  });

  it("has no red token (hue within 20° of pure red)", () => {
    const reds = Object.entries(t).filter(([, h]) => {
      const [hue, sat] = hueSat(h);
      return sat > 0.25 && (hue < 20 || hue > 340);
    });
    expect(reds).toEqual([]);
  });

});

// Motion at 20 fps (#119): every duration is whole 50 ms frames, and each `--at-step-*` easing holds
// one sample of ease-out per frame. The strings are committed; this regenerates and compares.
const FRAME_MS = 50;
const MOTION = { press: 2, ui: 4, card: 8, exit: 3 };

/** The prototype's cubic-bezier, solved for y at x by bisection. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const c = (a: number, b: number) => (s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const bx = c(x1, x2);
  const by = c(y1, y2);
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (bx(m) < x) lo = m;
      else hi = m;
    }
    return by((lo + hi) / 2);
  };
}
const easeOut = bezier(0.23, 1, 0.32, 1);

/** The prototype's `stepped()`: frame k of n holds ease(k/n) from (k−1)/n to k/n. */
function stepped(n: number, ease: (x: number) => number) {
  const r = (v: number) => +v.toFixed(4);
  const pc = (v: number) => `${r(v * 100)}%`;
  const stops: string[] = [];
  for (let k = 1; k <= n; k++) {
    const v = r(ease(k / n));
    stops.push(`${v} ${pc((k - 1) / n)}`, `${v} ${pc(k / n)}`);
  }
  return `linear(${stops.join(", ")})`;
}

const decl = (name: string) => css.match(new RegExp(`--at-${name}:\\s*([^;]+);`))?.[1].trim();

describe("motion on the 20 fps frame grid", () => {
  it("the stepped curve lands its first drawing at once and ends at rest", () => {
    // A single frame is the whole curve held from the first instant.
    expect(stepped(1, easeOut)).toBe("linear(1 0%, 1 100%)");
    expect(stepped(2, easeOut)).toMatch(/^linear\(0\.\d+ 0%, 0\.\d+ 50%, 1 50%, 1 100%\)$/);
  });

  it.each(Object.entries(MOTION))("%s lasts %i whole frames", (name, frames) => {
    const ms = decl(`dur-${name}`);
    expect(ms).toBe(`${frames * FRAME_MS}ms`);
  });

  it("every duration token is whole 50 ms frames", () => {
    const durs = [...css.matchAll(/--at-dur-[\w-]+:\s*(\d+)ms/g)].map((m) => Number(m[1]));
    expect(durs.length).toBeGreaterThanOrEqual(Object.keys(MOTION).length);
    for (const d of durs) expect(d % FRAME_MS).toBe(0);
  });

  it.each(Object.entries(MOTION))("--at-step-%s is ease-out stepped over %i frames", (name, frames) => {
    expect(decl(`step-${name}`)).toBe(stepped(frames, easeOut));
  });

  it("keeps no smooth or steps() easing beside the stepped ones", () => {
    expect(css).not.toMatch(/--at-ease-/);
    expect(css).not.toMatch(/steps\(/);
  });
});

// The Arcade Cosmos names are deleted, not aliased: no reader may still ask for one.
const OLD = /--at-(space|surface|raised|line|electron|ignite|boss|shadow|neb-\d|font-pixel|font-label|on-fill|fill-edge)\b/;
const repo = fileURLToPath(new URL("../../../", import.meta.url));
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (["node_modules", "dist", ".astro", "out", "renders"].includes(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|css|astro|mjs|py)$/.test(name) && path !== fileURLToPath(import.meta.url) ? [path] : [];
  });
}

describe("old Arcade Cosmos token names", () => {
  it("are gone from site/, scenes/src and video/", () => {
    const left = ["site/src", "site/e2e", "scenes/src", "video"]
      .flatMap((d) => files(join(repo, d)))
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .flatMap((line, i) => (OLD.test(line) ? [`${f.slice(repo.length)}:${i + 1}: ${line.trim()}`] : [])),
      );
    expect(left).toEqual([]);
  });
});
