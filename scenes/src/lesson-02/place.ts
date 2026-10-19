// Placing structure drawings in a Scene's frame. A Scene draws several stages
// of one molecule (H's added, atoms moved); each stage is its own drawing with
// its own extent and scale, so every drawing is laid on one shared frame by an
// anchor atom: structure coordinates map to the same frame point in every stage.
import type { Structure } from "@astratron/content";
import type { Box } from "../frame.ts";
import type { Drawing, Point } from "../structure/render.ts";

/** Drawing units per structure unit, measured along the drawing's first bond. */
function unitsPer(d: Drawing, s: Structure): number {
  const at = new Map(s.atoms.map((a) => [a.id, a]));
  for (const b of s.bonds) {
    const [p, q] = [at.get(b.a)!, at.get(b.b)!];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len > 0) return Math.hypot(d.atoms[b.b].x - d.atoms[b.a].x, d.atoms[b.b].y - d.atoms[b.a].y) / len;
  }
  return 1;
}

export interface Stage {
  /** Frame px per drawing unit of the reference drawing. */
  k: number;
  /** Where structure point `p` lands in the frame. */
  point: (p: Point) => Point;
  /** Frame px per structure unit. */
  unit: number;
}

/** Fits a reference drawing (the largest stage) into the box, centred; the scale is capped at `maxK`. */
export function stageFor(ref: Drawing, refS: Structure, box: Box, maxK = 3): Stage {
  const k = Math.min(box.w / ref.width, box.h / ref.height, maxK);
  const ox = box.x + (box.w - ref.width * k) / 2;
  const oy = box.y + (box.h - ref.height * k) / 2;
  const u = unitsPer(ref, refS);
  const a = refS.atoms[0];
  const refAt = ref.atoms[a.id];
  return {
    k,
    unit: k * u,
    point: (p) => ({ x: ox + k * (refAt.x + u * (p.x - a.x)), y: oy + k * (refAt.y + u * (p.y - a.y)) }),
  };
}

/** The SVG transform that lays drawing `d` (of structure `s`) on the stage, true to structure coordinates. */
export function transformOn(stage: Stage, d: Drawing, s: Structure): string {
  const a = s.atoms[0];
  const kk = stage.unit / unitsPer(d, s);
  const to = stage.point(a);
  return `translate(${round(to.x - kk * d.atoms[a.id].x)} ${round(to.y - kk * d.atoms[a.id].y)}) scale(${round(kk, 4)})`;
}

/** The drawing's SVG content without its own <svg> wrapper, to sit in a Scene's <g>. */
export const innerSvg = (d: Drawing) => d.svg.slice(d.svg.indexOf(">") + 1, d.svg.lastIndexOf("</svg>"));

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;
