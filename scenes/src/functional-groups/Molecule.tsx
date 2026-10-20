// A structure drawn by the site's own renderer inside a Scene, with parts of
// it picked out. The whole molecule is drawn once (dimmed when asked); each
// region is a second copy of the drawing clipped to a halo around the
// region's atoms and the links between them, so the region shows at full
// strength (or bold) without the renderer knowing about regions. Pure.
import type { Structure } from "@astratron/content";
import type { Box } from "../frame.ts";
import { drawStructure, type Drawing, type Point } from "../structure/render.ts";

export const CYAN = "var(--at-electron, #3ee8ff)";
export const INK = "var(--at-ink, #ffffff)";
export const MUTED = "var(--at-ink-muted, #b9a8e8)";
export const FONT_TEXT = "var(--at-font-text, 'Space Grotesk', system-ui, sans-serif)";
export const FONT_DATA = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";

/** Halo around a region's atoms and along its inner links, in drawing units (one link is 60). */
export const HALO = 26;
const BAND = 15;

export interface Placed {
  drawing: Drawing;
  /** Drawing units → frame pixels. */
  scale: number;
  ox: number;
  oy: number;
  /** An atom's centre in frame pixels. */
  point: (atom: string) => Point;
  /** Where the drawing actually sits in the frame. */
  bounds: Box;
}

/** A structure's drawing size, in drawing units. */
export function drawingSize(structure: Structure): { width: number; height: number } {
  const { width, height } = drawStructure(structure, ["lone-pairs"]);
  return { width, height };
}

/** The scale that fits a structure's drawing into a box. */
export function fitScale(structure: Structure, box: Box): number {
  const drawing = drawStructure(structure, ["lone-pairs"]);
  return Math.min(box.w / drawing.width, box.h / drawing.height);
}

/** Fits a structure (lone pairs hidden, as Lesson 5 draws them) into a box, centred, at most `maxScale`. */
export function placeMolecule(structure: Structure, box: Box, maxScale = 2): Placed {
  const drawing = drawStructure(structure, ["lone-pairs"]);
  const scale = Math.min(box.w / drawing.width, box.h / drawing.height, maxScale);
  const ox = box.x + (box.w - drawing.width * scale) / 2;
  const oy = box.y + (box.h - drawing.height * scale) / 2;
  return {
    drawing,
    scale,
    ox,
    oy,
    point: (atom) => ({ x: ox + drawing.atoms[atom].x * scale, y: oy + drawing.atoms[atom].y * scale }),
    bounds: { x: ox, y: oy, w: drawing.width * scale, h: drawing.height * scale },
  };
}

/** The centre of a set of atoms, in frame pixels. */
export function centreOf(placed: Placed, atoms: string[]): Point {
  const pts = atoms.map(placed.point);
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

export interface Highlight {
  atoms: string[];
  /** 0 (not shown) to 1 (fully shown). */
  amount: number;
  /** lit: cyan copy, tinted halo and a solid cyan ring; plain: ink copy and a thin muted ring; bold: thick ink copy only. */
  tone: "lit" | "plain" | "bold";
}

interface Props {
  structure: Structure;
  placed: Placed;
  highlights: Highlight[];
  /** Unique within the Scene's SVG, for clip and mask ids. */
  idBase: string;
  /** Opacity of the whole molecule under the highlights. */
  base: number;
}

export function Molecule({ structure, placed, highlights, idBase, base }: Props) {
  const { drawing, scale, ox, oy } = placed;
  const inner = drawing.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const shapesOf = (atoms: string[]) => {
    const inside = new Set(atoms);
    const links = structure.bonds.filter((l) => inside.has(l.a) && inside.has(l.b)).map((l) => drawing.bonds[l.id]);
    return (
      <>
        {atoms.map((a) => (
          <circle key={a} cx={drawing.atoms[a].x} cy={drawing.atoms[a].y} r={HALO} />
        ))}
        {links.map((s, i) => {
          const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
          const nx = (-(s.y2 - s.y1) / len) * BAND;
          const ny = ((s.x2 - s.x1) / len) * BAND;
          const pts = [
            [s.x1 + nx, s.y1 + ny],
            [s.x2 + nx, s.y2 + ny],
            [s.x2 - nx, s.y2 - ny],
            [s.x1 - nx, s.y1 - ny],
          ];
          return <polygon key={`l${i}`} points={pts.map((p) => p.join(",")).join(" ")} />;
        })}
      </>
    );
  };
  const shown = highlights.map((h, i) => ({ ...h, i })).filter((h) => h.amount > 0);
  return (
    <g transform={`translate(${ox} ${oy}) scale(${scale})`} fontFamily={FONT_DATA}>
      <defs>
        {shown.map(({ atoms, i }) => (
          <g key={i}>
            <clipPath id={`${idBase}-clip-${i}`}>{shapesOf(atoms)}</clipPath>
            {/* Keeps only the outside half of the ring's stroke, so overlapping halos read as one outline. */}
            <mask id={`${idBase}-mask-${i}`} maskUnits="userSpaceOnUse" x={-drawing.width} y={-drawing.height} width={drawing.width * 3} height={drawing.height * 3}>
              <rect x={-drawing.width} y={-drawing.height} width={drawing.width * 3} height={drawing.height * 3} fill="white" />
              <g fill="black">{shapesOf(atoms)}</g>
            </mask>
          </g>
        ))}
      </defs>
      <g opacity={base} color={INK} dangerouslySetInnerHTML={{ __html: inner }} />
      {shown.map(({ atoms, amount, tone, i }) => (
        <g key={i} opacity={amount}>
          {tone === "lit" && (
            // Group opacity, so overlapping halo shapes tint as one even wash.
            <g fill={CYAN} opacity={0.16}>
              {shapesOf(atoms)}
            </g>
          )}
          <g
            clipPath={`url(#${idBase}-clip-${i})`}
            color={tone === "lit" ? CYAN : INK}
            className={tone === "bold" ? "fg-bold" : undefined}
            dangerouslySetInnerHTML={{ __html: inner }}
          />
          {tone !== "bold" && (
            <g mask={`url(#${idBase}-mask-${i})`} fill="none" stroke={tone === "lit" ? CYAN : MUTED} strokeWidth={tone === "lit" ? 7 : 4}>
              {shapesOf(atoms)}
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

/** Thick strokes and bold letters for a `bold` highlight (a Scene puts this in its SVG once). */
export const BOLD_CSS = ".fg-bold line, .fg-bold polygon { stroke-width: 5px; } .fg-bold text { font-weight: 700; }";
