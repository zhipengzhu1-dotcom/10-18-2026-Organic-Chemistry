// The 3D card's screen layout: an orthographic projection at `scale` px per Å, the same one the
// WebGL canvas draws with, so the SVG overlay's letters, picks and measurements and the 2D tap
// test all line up with the drawn atoms (and the no-WebGL still is drawn from it too).
import type { MoleculeUse } from "@astratron/content";
import type { Atom } from "@astratron/content/data";
import { centroid, project, type Matrix3, type Vec3 } from "@astratron/content/molecule";

/** Ball-and-stick atoms are drawn at 30% of their van der Waals (Bondi) radius (spec #56). */
export const BALL = 0.3;

export interface Drawable {
  atoms: Atom[];
  /** Per element: Jmol colour and Bondi radius (Å), from the cited elements table. */
  elements: Record<string, { colour: string; vdw: number }>;
}

export interface Frame {
  width: number;
  height: number;
  /** Pixels per Å. */
  scale: number;
  trueScale: boolean;
}

export interface PlacedAtom {
  index: number;
  element: string;
  /** Centre in px from the frame's top left. */
  x: number;
  y: number;
  /** Depth in Å toward the viewer. */
  z: number;
  /** Drawn radius in px. */
  r: number;
  /** False when a nearer atom covers this atom's centre, so its letter is hidden. */
  labelled: boolean;
}

/** Each atom's drawn radius in Å. */
export const radius = (m: Drawable, element: string, trueScale: boolean) =>
  m.elements[element].vdw * (trueScale ? 1 : BALL);

export function placeAtoms(m: Drawable, rotation: Matrix3, frame: Frame): PlacedAtom[] {
  const placed = project(m.atoms, rotation).map(([x, y, z], index) => ({
    index,
    element: m.atoms[index].element,
    x: frame.width / 2 + x * frame.scale,
    y: frame.height / 2 - y * frame.scale,
    z,
    r: radius(m, m.atoms[index].element, frame.trueScale) * frame.scale,
    labelled: true,
  }));
  for (const a of placed)
    a.labelled = !placed.some((b) => b.z > a.z + 1e-6 && Math.hypot(b.x - a.x, b.y - a.y) < b.r);
  return placed;
}

/** Pixels per Å that keep the whole true-scale molecule inside the frame in any rotation. */
export function fitScale(m: Drawable, width: number, height: number): number {
  const extent = Math.max(
    ...project(m.atoms, [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]).map((p, i) => Math.hypot(...p) + radius(m, m.atoms[i].element, true)),
  );
  return (Math.min(width, height) / 2 / extent) * 0.9;
}

/** The front-most atom drawn under a point, if any. */
export function atomAt(placed: PlacedAtom[], x: number, y: number): number | undefined {
  const hits = placed.filter((a) => Math.hypot(a.x - x, a.y - y) <= a.r).sort((a, b) => b.z - a.z);
  return hits[0]?.index;
}

/** Bond-dipole arrow length on screen per unit of electronegativity difference, in Å (a rough guide, not to scale). */
export const ARROW_PER_UNIT = 0.9;

interface Point2 {
  x: number;
  y: number;
}

/**
 * Where the card draws a molecule's bond-dipole arrows (Lesson 3): along each bond from the δ+
 * atom toward the δ− atom, or, once added, tip to tail in 3D about the molecule's centre with the
 * net arrow from the chain's start to its end (none when the sum is zero).
 */
export function dipoleArrows(
  m: Drawable & { dipoles?: MoleculeUse["dipoles"] },
  rotation: Matrix3,
  frame: Frame,
  added: boolean,
): { arrows: { from: Point2; to: Point2 }[]; net?: { from: Point2; to: Point2 }; ring?: Point2; zero: boolean } {
  const d = m.dipoles;
  if (!d) return { arrows: [], zero: true };
  const c = centroid(m.atoms);
  const at = (i: number): Vec3 => [m.atoms[i].x, m.atoms[i].y, m.atoms[i].z];
  const screen = (p: Vec3): Point2 => {
    const q: Vec3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const dot = (r: Vec3) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2];
    return { x: frame.width / 2 + dot(rotation[0]) * frame.scale, y: frame.height / 2 - dot(rotation[1]) * frame.scale };
  };
  const vectors = d.arrows.map((a) => {
    const v: Vec3 = [0, 1, 2].map((k) => at(a.to)[k] - at(a.from)[k]) as Vec3;
    const k = (a.size * ARROW_PER_UNIT) / Math.hypot(...v);
    return v.map((x) => x * k) as Vec3;
  });
  const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const total = vectors.reduce(plus, [0, 0, 0]);
  if (!added) {
    const arrows = vectors.map((v, k) => {
      const [p, q] = [at(d.arrows[k].from), at(d.arrows[k].to)];
      const mid: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      const start: Vec3 = [mid[0] - v[0] / 2, mid[1] - v[1] / 2, mid[2] - v[2] / 2];
      return { from: screen(start), to: screen(plus(start, v)) };
    });
    return { arrows, zero: d.net.zero };
  }
  let tail: Vec3 = [c[0] - total[0] / 2, c[1] - total[1] / 2, c[2] - total[2] / 2];
  const first = tail;
  const arrows = vectors.map((v) => {
    const from = tail;
    tail = plus(tail, v);
    return { from: screen(from), to: screen(tail) };
  });
  return { arrows, ...(d.net.zero ? { ring: screen(first) } : { net: { from: screen(first), to: screen(tail) } }), zero: d.net.zero };
}
