// carbonyl-sites: a pure function of t; see manifest.ts.
import { PINK, Contributors, DATA_FONT, BLUE, INK, MUTED, Molecule, TEXT_FONT, atomAt, drawn, frameOf, hybridOf, place, placeContributors } from "../contributors/draw.tsx";
import { acetone, acetonePolar } from "../contributors/structures.ts";
import { frameSize, type Box } from "../frame.ts";
import { easeInOut, easeOut, lerp, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";

/** In the structure files: carbonyl C = a2, O = a3, C=O = b2. */
const NEUTRAL = drawn(acetone);
const POLAR = drawn(acetonePolar);
const HYBRID = drawn(hybridOf(acetone, ["b2"]));

export interface SitesLayout {
  /** The bracketed contributors (C=O ↔ C⁺–O⁻). */
  contributors: Box;
  hybrid: Box;
  font: number;
}

export function layoutSites(aspect: Aspect): SitesLayout {
  if (aspect === "16:9")
    return {
      contributors: { x: 460, y: 50, w: 1000, h: 300 },
      hybrid: { x: 700, y: 400, w: 520, h: 340 },
      font: 44,
    };
  return {
    contributors: { x: 40, y: 140, w: 1000, h: 390 },
    hybrid: { x: 140, y: 640, w: 800, h: 460 },
    font: 40,
  };
}

export default function CarbonylSites({ t, aspect }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const L = layoutSites(aspect);
  const row = placeContributors([NEUTRAL, POLAR], L.contributors);
  const hybrid = place(HYBRID, L.hybrid, Math.min(L.hybrid.w / HYBRID.width, L.hybrid.h / HYBRID.height));

  const appear = easeOut(progress(t, 0, 0.8));
  const merge = easeOut(progress(t, 1.4, 2.8));
  const deltas = easeOut(progress(t, 3, 3.8));
  const drift = easeInOut(progress(t, 4.2, 5.5));
  const arrow = easeOut(progress(t, 5.5, 6.3));

  const c = atomAt(hybrid, "a2");
  const o = atomAt(hybrid, "a3");
  const unit = Math.hypot(o.x - c.x, o.y - c.y);
  // The electron source comes in from below, into the open space between the two methyls.
  const rest = { x: c.x - 0.3 * unit, y: c.y + 1.75 * unit };
  const from = { x: rest.x - 1.6 * unit, y: rest.y + 0.5 * unit };
  const pair = { x: lerp(from.x, rest.x, drift), y: lerp(from.y, rest.y, drift) };
  const tail = { x: rest.x, y: rest.y - 0.25 * unit };
  const head = { x: c.x - 0.12 * unit, y: c.y + 0.42 * unit };
  const bend = { x: tail.x - 0.6 * unit, y: (tail.y + head.y) / 2 };
  const dir = Math.atan2(head.y - bend.y, head.x - bend.x);
  const tip = (da: number, r: number) => `${head.x - r * Math.cos(dir + da)},${head.y - r * Math.sin(dir + da)}`;
  const dot = Math.max(5, unit * 0.045);

  const label = (at: { x: number; y: number }, symbol: string, word: string, colour: string) => (
    <text x={at.x} y={at.y} fontSize={L.font} fill={colour} fontFamily={DATA_FONT} dominantBaseline="central" opacity={deltas}>
      {symbol}
      <tspan fontFamily={TEXT_FONT} fill={INK} fontSize={L.font * 0.8}>
        {` ${word}`}
      </tspan>
    </text>
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <g opacity={appear * lerp(1, 0.5, merge)}>
        <Contributors placed={row} />
      </g>
      <g opacity={merge}>
        <text x={frameOf(hybrid).x + frameOf(hybrid).w / 2} y={L.hybrid.y - L.font * 0.2} fontSize={L.font * 0.8} textAnchor="middle" fill={MUTED} fontFamily={TEXT_FONT}>
          hybrid
        </text>
        <Molecule placed={hybrid} dashed={["b2"]} />
      </g>
      {label({ x: c.x + 0.55 * unit, y: c.y }, "δ+", "electron-poor", BLUE)}
      {label({ x: o.x + 0.55 * unit, y: o.y }, "δ−", "electron-rich", PINK)}

      <g opacity={progress(t, 4.2, 4.6)}>
        <circle cx={pair.x - dot * 1.6} cy={pair.y} r={dot} fill={BLUE} />
        <circle cx={pair.x + dot * 1.6} cy={pair.y} r={dot} fill={BLUE} />
        <text x={pair.x} y={pair.y + L.font * 1.1} fontSize={L.font * 0.8} textAnchor="middle" fill={INK} fontFamily={TEXT_FONT}>
          an electron source
        </text>
      </g>
      <g opacity={arrow} stroke={BLUE} strokeWidth={4} fill="none" strokeLinecap="round">
        <path d={`M${tail.x},${tail.y} Q${bend.x},${bend.y} ${head.x},${head.y}`} strokeDasharray="2 12" />
        <polyline points={`${tip(0.5, unit * 0.16)} ${head.x},${head.y} ${tip(-0.5, unit * 0.16)}`} />
      </g>
    </svg>
  );
}
