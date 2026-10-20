// Drawing Lesson 4's model orbitals in SVG (#82), shared by its "model" Scenes. Colour says what
// an orbital is (orange: hybrids and σ; cyan: p and π), the pattern says its sign (+ solid,
// − hatched), and a chip names it, so nothing is colour alone (Lesson 4's orbital drawing rule).
import type { ReactElement } from "react";
import { flatOutline, lobeProfile, project, silhouette, type OrbitalKind, type Sign, type Vec3, type ViewTurn } from "./model.ts";

export type Ink = "ignite" | "electron";

export const ink = (which: Ink | "ink" | "muted" | "line" | "surface") =>
  ({
    ignite: "var(--at-ignite, #ff9a1f)",
    electron: "var(--at-electron, #3ee8ff)",
    ink: "var(--at-ink, #ffffff)",
    muted: "var(--at-ink-muted, #b9a8e8)",
    line: "var(--at-line, #6a4bd1)",
    surface: "var(--at-surface, #1a0f3d)",
  })[which];

/** How opaque a lobe's inside is: solid (+), hatched (− , under its stripes) and empty. */
const BODY = { solid: 0.5, hatched: 0.1, empty: 0 } as const;

/**
 * What every model Scene puts once in its <defs>: the stripes the − lobes are hatched with (a
 * mask), and a filter per colour and look that draws a lobe see-through with a solid edge around
 * the union of its cross-sections, so overlapping lobes stay readable.
 */
export function OrbitalDefs({ scale = 1 }: { scale?: number }) {
  const gap = 26 * scale;
  const edge = 3 * scale; // px of solid edge round each lobe
  return (
    <>
      <pattern id="hatch-stripes" patternUnits="userSpaceOnUse" width={gap} height={gap} patternTransform="rotate(45)">
        <rect width={gap * 0.45} height={gap} fill="white" />
      </pattern>
      <mask id="hatch-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={4000} height={4000}>
        <rect width={4000} height={4000} fill="url(#hatch-stripes)" />
      </mask>
      {(["ignite", "electron"] as const).flatMap((c) =>
        (Object.keys(BODY) as (keyof typeof BODY)[]).map((look) => (
          <filter key={`${c}-${look}`} id={`lobe-${c}-${look}`} x="-10%" y="-10%" width="120%" height="120%">
            <feComponentTransfer in="SourceAlpha" result="shape">
              <feFuncA type="linear" slope={1000} />
            </feComponentTransfer>
            <feMorphology in="shape" operator="dilate" radius={edge} result="grown" />
            <feComposite in="grown" in2="shape" operator="out" result="ring" />
            <feFlood style={{ floodColor: ink(c) }} result="colour" />
            <feComposite in="colour" in2="ring" operator="in" result="edge" />
            <feComponentTransfer in="SourceGraphic" result="body">
              <feFuncA type="linear" slope={BODY[look]} />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="body" />
              <feMergeNode in="edge" />
            </feMerge>
          </filter>
        )),
      )}
    </>
  );
}

/** Something to draw at a depth (z toward the viewer): Scenes sort these back to front. */
export interface Drawable {
  z: number;
  key: string;
  node: ReactElement;
}

export interface OrbitalAt {
  kind: OrbitalKind;
  /** The orbital's + direction in the carbon's frame. */
  axis: Vec3;
  colour: Ink;
  /** Screen position of the nucleus (SVG px) and px per drawing unit. */
  x: number;
  y: number;
  scale: number;
  turn: ViewTurn;
  key: string;
  /** Faded (set aside). */
  dim?: boolean;
  /** Drawn as an outline only (an empty orbital). */
  empty?: boolean;
}

/**
 * One lobe as the union of its cross-sections: see-through with a solid edge (OrbitalDefs'
 * filter), and for a − lobe stripes over the same union (OrbitalDefs' mask).
 */
function lobe(o: OrbitalAt, sign: Sign): Drawable | null {
  const profile = lobeProfile(o.kind, sign);
  if (!profile.outline.length) return null;
  const axis = project(o.axis, o.turn);
  const sections = silhouette(profile, axis);
  const look = o.empty ? "empty" : sign === "+" ? "solid" : "hatched";
  const ellipses = sections.map((s, i) => (
    <ellipse
      key={i}
      cx={o.x + s.cx * o.scale}
      cy={o.y - s.cy * o.scale}
      rx={Math.max(0.5, s.rx * o.scale)}
      ry={Math.max(0.5, s.ry * o.scale)}
      transform={`rotate(${-s.rotate} ${o.x + s.cx * o.scale} ${o.y - s.cy * o.scale})`}
      fill={ink(o.colour)}
    />
  ));
  ellipses.push(
    <polygon
      key="flat"
      points={flatOutline(profile, axis)
        .map(([px, py]) => `${o.x + px * o.scale},${o.y - py * o.scale}`)
        .join(" ")}
      fill={ink(o.colour)}
    />,
  );
  // Depth of the lobe's middle: the + lobe lies along +axis, the − lobe along −axis.
  const z = axis[2] * (sign === "+" ? 1 : -1) * profile.reach * 0.5;
  return {
    z,
    key: `${o.key}${sign}`,
    node: (
      <g key={`${o.key}${sign}`} data-lobe={look} opacity={o.dim ? 0.3 : 1}>
        <g filter={`url(#lobe-${o.colour}-${look})`}>{ellipses}</g>
        {look === "hatched" && (
          <g mask="url(#hatch-mask)" opacity={0.75}>
            {ellipses}
          </g>
        )}
      </g>
    ),
  };
}

/** Both lobes of one orbital (an s orbital has one). */
export function orbitalLobes(o: OrbitalAt): Drawable[] {
  return [lobe(o, "+"), o.kind === "s" ? null : lobe(o, "-")].filter((d): d is Drawable => d !== null);
}

/** Where the tip of an orbital's + lobe lands on screen, for its chip. */
export function tipOf(o: OrbitalAt, beyond = 1.12): { x: number; y: number; z: number } {
  const a = project(o.axis, o.turn);
  const reach = lobeProfile(o.kind, "+").reach * beyond;
  return { x: o.x + a[0] * reach * o.scale, y: o.y - a[1] * reach * o.scale, z: a[2] };
}

/** A chip naming an orbital ("sp³", "2p", "σ"): text on a dark plate, drawn on top. */
export function Chip({ x, y, text, colour, size }: { x: number; y: number; text: string; colour: Ink | "ink"; size: number }) {
  const w = Math.max(text.length, 2) * size * 0.62 + size * 0.7;
  return (
    <g className="orbital-chip">
      <rect x={x - w / 2} y={y - size * 0.75} width={w} height={size * 1.5} fill={ink("surface")} stroke={ink(colour)} strokeWidth={size * 0.08} />
      <text x={x} y={y} fill={ink(colour)} fontSize={size} fontFamily="var(--at-font-data, monospace)" textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  );
}

/** A carbon nucleus with its letter, in the cited carbon colour. */
export function Carbon({ x, y, r, colour }: { x: number; y: number; r: number; colour: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={colour} stroke={ink("ink")} strokeWidth={Math.max(2, r * 0.08)} />
      <text x={x} y={y} fill="#140f2b" fontSize={r * 1.1} fontWeight={700} textAnchor="middle" dominantBaseline="central">
        C
      </text>
    </g>
  );
}

/** The honesty label every model Scene keeps on screen. */
export function ModelTag({ x, y, size, text = "model" }: { x: number; y: number; size: number; text?: string }) {
  const w = text.length * size * 0.62 + size;
  return (
    <g className="honesty-label">
      <rect x={x} y={y} width={w} height={size * 1.6} fill="none" stroke={ink("muted")} strokeWidth={size * 0.08} strokeDasharray={`${size * 0.3} ${size * 0.2}`} />
      <text x={x + w / 2} y={y + size * 0.8} fill={ink("muted")} fontSize={size} fontFamily="var(--at-font-data, monospace)" textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  );
}
