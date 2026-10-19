// In-repo motion helpers for Scenes (ADR 0001): use these, never Remotion's
// interpolate/spring, timers or Math.random. Every helper is a pure function.

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** How far `t` is through [start, end], clamped to 0–1. */
export const progress = (t: number, start: number, end: number) => (end <= start ? (t >= end ? 1 : 0) : clamp((t - start) / (end - start)));

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** A smooth 0 → 1 → 0 wave with the given period in seconds; 0 at t = 0, so a looping Scene meets itself. */
export const pulse = (t: number, period: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);

/** A seeded random generator (mulberry32): the same seed gives the same sequence on the site and in video. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
