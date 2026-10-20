// Electron-dot (Lewis) drawing pieces for Lesson 0's Scenes: atom letters and
// every outer electron as a cyan dot. A shared pair (a bond) is two dots side
// by side between its atoms; a lone pair is two dots beside one atom.
// Sizes are in frame units (1920×1080 or 1080×1920), scaled by `unit`.
import type { ReactNode } from "react";

export const ink = "var(--at-ink, #f2f0ff)";
export const electron = "var(--at-electron, #35d4ff)";
export const muted = "var(--at-ink-muted, #b9b4d8)";
export const line = "var(--at-line, #6b6890)";
export const boss = "var(--at-boss, #ff4fd8)";
export const panel = "var(--at-panel, #1b1838)";

/** Element symbols, formulas and numbers are set in the data face (design rule); body words in the text face. */
export const DATA_FONT = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";
export const TEXT_FONT = "var(--at-font-text, 'Space Grotesk', system-ui, sans-serif)";

export interface Pt {
  x: number;
  y: number;
}

/** Unit vector for an angle in degrees, y down (0 = right, 90 = down). */
export const dir = (deg: number): Pt => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });

export function Letter({ at, el, size, colour = ink, opacity = 1 }: { at: Pt; el: string; size: number; colour?: string; opacity?: number }) {
  return (
    <text
      x={at.x}
      y={at.y}
      fill={colour}
      opacity={opacity}
      fontSize={size}
      fontWeight={700}
      style={{ fontFamily: DATA_FONT }}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {el}
    </text>
  );
}

/** One electron. `kind` sets the class: "e" for an electron that belongs to the drawing, others for spares. */
export function Dot({ at, r, kind = "e", colour = electron, opacity = 1 }: { at: Pt; r: number; kind?: string; colour?: string; opacity?: number }) {
  return <circle className={kind} cx={at.x} cy={at.y} r={r} fill={colour} opacity={opacity} />;
}

/** Positions of a pair of dots at `at`, side by side across the direction `along` (degrees). */
export function pairAt(at: Pt, along: number, gap: number): [Pt, Pt] {
  const n = dir(along + 90);
  return [
    { x: at.x + (n.x * gap) / 2, y: at.y + (n.y * gap) / 2 },
    { x: at.x - (n.x * gap) / 2, y: at.y - (n.y * gap) / 2 },
  ];
}

/** Two dots midway between atoms `a` and `b`: a shared pair, a bond. */
export function SharedPair({ a, b, r, kind = "e", colour, opacity }: { a: Pt; b: Pt; r: number; kind?: string; colour?: string; opacity?: number }): ReactNode {
  const along = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return pairAt(mid, along, r * 3).map((p, i) => <Dot key={i} at={p} r={r} kind={kind} colour={colour} opacity={opacity} />);
}

/** `count` dots (1 or 2) beside an atom at `at`, at distance `d` in direction `deg`. */
export function DotsBeside({ at, deg, d, r, count, kind = "e", colour, opacity }: { at: Pt; deg: number; d: number; r: number; count: 1 | 2; kind?: string; colour?: string; opacity?: number }): ReactNode {
  const v = dir(deg);
  const spot = { x: at.x + v.x * d, y: at.y + v.y * d };
  const spots = count === 1 ? [spot] : pairAt(spot, deg, r * 3);
  return spots.map((p, i) => <Dot key={i} at={p} r={r} kind={kind} colour={colour} opacity={opacity} />);
}

/**
 * A lone atom with its `n` outer electrons as dots around it, one per side first (N, E, S, W),
 * then paired, as the usual dot drawing has it. Hydrogen's one dot sits on the right.
 */
export function AtomDots({ at, el, n, size, r, opacity = 1 }: { at: Pt; el: string; n: number; size: number; r: number; opacity?: number }) {
  const sides = [-90, 0, 90, 180];
  const perSide = sides.map((_, i) => (n > i ? 1 : 0) + (n > i + 4 ? 1 : 0));
  return (
    <g opacity={opacity}>
      <Letter at={at} el={el} size={size} />
      {sides.map((deg, i) =>
        perSide[i] ? <DotsBeside key={deg} at={at} deg={el === "H" ? 0 : deg} d={size * 0.62} r={r} count={perSide[i] as 1 | 2} /> : null,
      )}
    </g>
  );
}

/** A focusable hit area for an interactive Scene: a handle to pick up or a target to drop on. */
export function Hit({ at, r, role, id, label, live, held }: { at: Pt; r: number; role: "handle" | "target"; id: string; label: string; live: boolean; held?: boolean }) {
  if (!live) return null;
  const data = role === "handle" ? { "data-handle": id } : { "data-target": id };
  return (
    <g role="button" tabIndex={0} aria-label={label} aria-pressed={role === "handle" ? !!held : undefined} {...data} className={`scene-${role}`}>
      <circle cx={at.x} cy={at.y} r={r} fill="transparent" stroke={held ? electron : "none"} strokeWidth={6} strokeDasharray={held ? "18 12" : undefined} />
    </g>
  );
}
