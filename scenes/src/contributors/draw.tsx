// Drawing resonance contributors inside a Scene frame (Lesson 7): a structure
// drawn by the site's own renderer, placed in a box at a shared scale, with
// optional highlighted bonds and the hybrid's dashed partial bonds; contributors in
// brackets joined by ↔ come from Lesson 6's drawContributors. Pure: every input is a prop.
import type { Structure } from "@astratron/content";
import type { Box } from "../frame.ts";
import { drawStructure, type Drawing, type Point } from "../structure/render.ts";
import { drawContributors } from "../structure/contributors.ts";

export const INK = "var(--at-ink, #1d1b26)";
export const MUTED = "var(--at-ink-muted, #57536b)";
export const ELECTRON = "var(--at-blue, #0a64c2)";
export const BOSS = "var(--at-pink, #bd1278)";
export const LINE = "var(--at-ink-muted, #57536b)";
export const TEXT_FONT = "var(--at-font-text, 'Nunito', system-ui, sans-serif)";
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
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} fontFamily={DATA_FONT} style={{ color: INK, ["--lone-pair" as string]: ELECTRON }}>
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

export interface PlacedContributors {
  svg: string;
  x: number;
  y: number;
  scale: number;
  /** Each contributor's drawing, in frame coordinates (for its "major"/"minor" tag). */
  frames: Box[];
}

/**
 * Contributors in one pair of brackets joined by ↔ (Lesson 6's `drawContributors`), fitted to a box.
 * `sizes` draws a contributor smaller (amide-hybrid's minor one) by shrinking its drawing's box.
 */
export function placeContributors(drawings: Drawing[], box: Box, sizes: number[] = []): PlacedContributors {
  const sized = drawings.map((d, i) => ({ ...d, width: d.width * (sizes[i] ?? 1), height: d.height * (sizes[i] ?? 1) }));
  const row = drawContributors(sized);
  const scale = Math.min(box.w / row.width, box.h / row.height);
  const x = box.x + (box.w - row.width * scale) / 2;
  const y = box.y + (box.h - row.height * scale) / 2;
  const frames = row.offsets.map((o, i) => ({ x: x + o.x * scale, y: y + o.y * scale, w: sized[i].width * scale, h: sized[i].height * scale }));
  return { svg: row.svg, x, y, scale, frames };
}

/** A placed row of contributors. */
export function Contributors({ placed, opacity = 1 }: { placed: PlacedContributors; opacity?: number }) {
  const inner = placed.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return (
    <g
      transform={`translate(${placed.x} ${placed.y}) scale(${placed.scale})`}
      opacity={opacity}
      fontFamily={DATA_FONT}
      style={{ color: INK, ["--lone-pair" as string]: ELECTRON }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
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
