// One rebuilt molecule (shapes.ts) drawn in 3D projection into an SVG box: bonds, then atoms back
// to front as shaded balls in their cited Jmol colours, each with its letter, and optional lone-pair
// lobes (a sketch). Pure: everything comes from the props. Shared by Lesson 3's Scenes.
import type { Cited } from "@astratron/content/data";
import { inkOn, SCALE_BAR_LABEL, type Matrix3, type Vec3 } from "@astratron/content/molecule";
import type { Box } from "../frame.ts";
import { CYAN, DATA_FONT, INK } from "../lewis.ts";
import { colourRef, onScreen, type Shape } from "./shapes.ts";

/** Every ball's size (its radius) in Å on screen, the same for all elements: a sketch, unlike the 3D card's 30% of Bondi radii. */
export const BALL_SIZE = 0.3;
/** Lone-pair lobes reach this far from the centre, in Å on screen (a sketch). */
const LOBE = 0.95;




/** Pixels per Å that fit the shape (and lobes) in the box at any turn. */
export function fitScale(shape: Shape, box: Box, room = 1.25): number {
  const reach = Math.max(LOBE, ...shape.atoms.map((a) => Math.hypot(...a.pos))) + BALL_SIZE * 2;
  return Math.min(box.w, box.h) / 2 / (reach * room);
}

export interface Placed {
  x: number;
  y: number;
  z: number;
}

/** Screen px of 3D points (Å about the centre) in a box centred at (cx, cy). */
export const place = (points: Vec3[], view: Matrix3, cx: number, cy: number, px: number): Placed[] =>
  onScreen(points, view).map(([x, y, z]) => ({ x: cx + x * px, y: cy - y * px, z }));

interface Props {
  shape: Shape;
  view: Matrix3;
  cx: number;
  cy: number;
  /** Pixels per Å. */
  px: number;
  cited: Record<string, Cited>;
  lonePairs?: boolean;
  /** Text size for letters and labels. */
  font: number;
  id: string;
}

export function ShapeView({ shape, view, cx, cy, px, cited, lonePairs, font, id }: Props) {
  const at = place(
    shape.atoms.map((a) => a.pos),
    view,
    cx,
    cy,
    px,
  );
  const lobes = lonePairs ? place(shape.lonePairs.map((d) => [d[0] * LOBE, d[1] * LOBE, d[2] * LOBE] as Vec3), view, cx, cy, px) : [];
  const colour = (el: string) => String(cited[colourRef(el)]?.value ?? "#888888");
  const order = shape.atoms.map((_, i) => i).sort((a, b) => at[a].z - at[b].z);
  const ball = BALL_SIZE * px;
  return (
    <g>
      <defs>
        {[...new Set(shape.atoms.map((a) => a.element))].map((el) => (
          <radialGradient key={el} id={`${id}-${el}`} cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="white" stopOpacity="0.85" />
            <stop offset="0.35" stopColor={colour(el)} />
            <stop offset="1" stopColor={colour(el)} stopOpacity="0.8" />
          </radialGradient>
        ))}
      </defs>
      {lobes.map((p, i) => {
        const [dx, dy] = [p.x - cx, p.y - cy];
        const len = Math.hypot(dx, dy) || 1;
        const [nx, ny] = [-dy / len, dx / len];
        const w = px * 0.32;
        // A teardrop from the centre out to the lobe tip, with "lone pair (sketch)" beyond it.
        const d = `M${cx},${cy} C${cx + dx * 0.4 + nx * w},${cy + dy * 0.4 + ny * w} ${p.x + nx * w},${p.y + ny * w} ${p.x},${p.y} C${p.x - nx * w},${p.y - ny * w} ${cx + dx * 0.4 - nx * w},${cy + dy * 0.4 - ny * w} ${cx},${cy}Z`;
        return (
          <g key={`lp-${i}`}>
            <path d={d} fill={CYAN} fillOpacity={0.22} stroke={CYAN} strokeOpacity={0.7} strokeDasharray="6 5" strokeWidth={2} />
            {i === 0 && <text
              x={p.x + (dx / len) * font * 0.6}
              y={p.y + (dy / len) * font * 0.6}
              fill={CYAN}
              fontSize={font * 0.62}
              fontFamily={DATA_FONT}
              textAnchor={dx > 4 ? "start" : dx < -4 ? "end" : "middle"}
              dominantBaseline="central"
            >
              lone pair (sketch)
            </text>}
          </g>
        );
      })}
      {shape.bonds.map(([a, b, n]) => {
        const [p, q] = [at[a], at[b]];
        const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        const [nx, ny] = [-(q.y - p.y) / len, (q.x - p.x) / len];
        const offsets = n === 1 ? [0] : n === 2 ? [-0.09, 0.09] : [-0.14, 0, 0.14];
        return offsets.map((o) => (
          <line
            key={`b-${a}-${b}-${o}`}
            x1={p.x + nx * o * px}
            y1={p.y + ny * o * px}
            x2={q.x + nx * o * px}
            y2={q.y + ny * o * px}
            stroke="#c8c8d0"
            strokeWidth={Math.max(3, ball * 0.35)}
            strokeLinecap="round"
          />
        ));
      })}
      {order.map((i) => {
        const a = shape.atoms[i];
        const p = at[i];
        const size = ball * (a.element === "H" ? 0.8 : 1);
        return (
          <g key={`a-${i}`}>
            <circle cx={p.x} cy={p.y} r={size} fill={`url(#${id}-${a.element})`} stroke="#140f2b" strokeWidth={2} />
            <text
              x={p.x}
              y={p.y}
              fill={inkOn(colour(a.element))}
              fontSize={Math.min(font, size * 1.1)}
              fontFamily={DATA_FONT}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {a.element}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A one-ångström scale bar with its label, left-aligned at (x, y). */
export function ScaleBar({ x, y, px, font }: { x: number; y: number; px: number; font: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + px} y2={y} stroke={INK} strokeWidth={4} />
      <line x1={x} y1={y - 8} x2={x} y2={y + 8} stroke={INK} strokeWidth={3} />
      <line x1={x + px} y1={y - 8} x2={x + px} y2={y + 8} stroke={INK} strokeWidth={3} />
      <text x={x + px + 12} y={y} fill={INK} fontSize={font} fontFamily={DATA_FONT} dominantBaseline="central">
        {SCALE_BAR_LABEL}
      </text>
    </g>
  );
}
