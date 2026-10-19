// The 3D card's screen layout: an orthographic projection at `scale` px per Å, the same one the
// WebGL canvas draws with, so the SVG overlay's letters, picks and measurements and the 2D tap
// test all line up with the drawn atoms (and the no-WebGL still is drawn from it too).
import type { Atom } from "@astratron/content/data";
import { project, type Matrix3 } from "@astratron/content/molecule";

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
