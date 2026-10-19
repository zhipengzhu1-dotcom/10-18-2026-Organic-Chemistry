// Drawing resonance contributors inside a Scene frame (Lesson 7): a structure
// drawn by the site's own renderer, placed in a box at a shared scale, with
// optional highlighted bonds, the hybrid's dashed partial bonds, brackets and
// the ↔ between contributors. Pure: every input is a prop.
import type { Structure } from "@astratron/content";
import type { Box } from "../frame.ts";
import { drawStructure, type Drawing, type Point } from "../structure/render.ts";

export const INK = "var(--at-ink, #f2f0ff)";
export const MUTED = "var(--at-ink-muted, #a9a6c9)";
export const ELECTRON = "var(--at-electron, #35d4ff)";
export const BOSS = "var(--at-boss, #ff4fd8)";
export const LINE = "var(--at-line, #6b6890)";
export const TEXT_FONT = "var(--at-font-text, 'Space Grotesk', system-ui, sans-serif)";
export const DATA_FONT = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";

/** Where the dashed half of a partial bond sits, beside the solid line (drawing units). */
const DASH_SHIFT = 9;
/** How far the dashed line stops short of each lettered end (drawing units). */
const DASH_TRIM = 16;

/** The hybrid of a set of contributors: the given drawn bonds single (solid + dashed in the drawing), charges off. */
export function hybridOf(structure: Structure, partial: string[]): Structure {
  return {
    ...structure,
    id: `${structure.id}-hybrid`,
    atoms: structure.atoms.map(({ charge: _charge, lp: _lp, ...a }) => a),
    bonds: structure.bonds.map((b) => (partial.includes(b.id) ? { ...b, order: 1 as const } : b)),
  };
}

/** The largest scale at which every drawing fits its box. */
export function sharedScale(drawings: Drawing[], boxes: Box[]): number {
  return Math.min(...drawings.map((d, i) => Math.min(boxes[i].w / d.width, boxes[i].h / d.height)));
}

export interface Placed {
  drawing: Drawing;
  /** Top-left of the drawing in the frame, and its scale. */
  x: number;
  y: number;
  scale: number;
}

/** Centres a drawing in a box at a scale. */
export function place(drawing: Drawing, box: Box, scale: number): Placed {
  return {
    drawing,
    scale,
    x: box.x + (box.w - drawing.width * scale) / 2,
    y: box.y + (box.h - drawing.height * scale) / 2,
  };
}

/** An atom's centre in frame coordinates. */
export const atomAt = (p: Placed, id: string): Point => ({
  x: p.x + p.drawing.atoms[id].x * p.scale,
  y: p.y + p.drawing.atoms[id].y * p.scale,
});

/** The placed frame of a placed drawing: its box in frame coordinates. */
export const frameOf = (p: Placed): Box => ({ x: p.x, y: p.y, w: p.drawing.width * p.scale, h: p.drawing.height * p.scale });

interface MoleculeProps {
  placed: Placed;
  opacity?: number;
  /** Bond ids drawn with a glow behind them (amide-cn-lengths' C–N). */
  glow?: string[];
  /** Bond ids that get a dashed second line: the hybrid's partial double bonds. */
  dashed?: string[];
}

/** A placed structure drawing. */
export function Molecule({ placed, opacity = 1, glow = [], dashed = [] }: MoleculeProps) {
  const { drawing, x, y, scale } = placed;
  const inner = drawing.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const centre = mean(Object.values(drawing.atoms));
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} style={{ color: INK, ["--lone-pair" as string]: ELECTRON }}>
      {glow.map((id) => {
        const s = drawing.bonds[id];
        return <line key={id} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={ELECTRON} strokeOpacity={0.35} strokeWidth={16} strokeLinecap="round" />;
      })}
      <g dangerouslySetInnerHTML={{ __html: inner }} />
      {dashed.map((id) => {
        const s = drawing.bonds[id];
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        const [ux, uy] = [(s.x2 - s.x1) / len, (s.y2 - s.y1) / len];
        // The dashed line goes on the side facing the molecule's middle, as a ring's inner line would.
        const mid = { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 };
        const side = Math.sign((centre.x - mid.x) * -uy + (centre.y - mid.y) * ux) || 1;
        const [nx, ny] = [-uy * DASH_SHIFT * side, ux * DASH_SHIFT * side];
        return (
          <line
            key={`dash-${id}`}
            x1={s.x1 + ux * DASH_TRIM + nx}
            y1={s.y1 + uy * DASH_TRIM + ny}
            x2={s.x2 - ux * DASH_TRIM + nx}
            y2={s.y2 - uy * DASH_TRIM + ny}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        );
      })}
    </g>
  );
}

const mean = (points: Point[]): Point => ({
  x: points.reduce((s, p) => s + p.x, 0) / points.length,
  y: points.reduce((s, p) => s + p.y, 0) / points.length,
});

/** Square brackets around a box (the contributors' bracket). */
export function Brackets({ box, opacity = 1 }: { box: Box; opacity?: number }) {
  const lip = Math.min(28, box.w * 0.05);
  const { x, y, w, h } = box;
  return (
    <g fill="none" stroke={INK} strokeWidth={4} opacity={opacity}>
      <path d={`M${x + lip},${y} H${x} V${y + h} H${x + lip}`} />
      <path d={`M${x + w - lip},${y} H${x + w} V${y + h} H${x + w - lip}`} />
    </g>
  );
}

/** The resonance arrow, ↔, centred at a point. */
export function ResonanceArrow({ at, size, opacity = 1 }: { at: Point; size: number; opacity?: number }) {
  return (
    <text x={at.x} y={at.y} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={INK} opacity={opacity} fontFamily={TEXT_FONT}>
      ↔
    </text>
  );
}

/** A short tag above a box ("major", "minor"). */
export function Tag({ box, text, size, colour = ELECTRON, opacity = 1 }: { box: Box; text: string; size: number; colour?: string; opacity?: number }) {
  return (
    <text x={box.x + box.w / 2} y={box.y - size * 0.5} fontSize={size} textAnchor="middle" fill={colour} opacity={opacity} fontFamily={TEXT_FONT} fontWeight={700}>
      {text}
    </text>
  );
}

/** Draws a structure once; Scenes call it at module load for their fixed molecules. */
export const drawn = (structure: Structure, hide: Parameters<typeof drawStructure>[1] = []) => drawStructure(structure, hide);
