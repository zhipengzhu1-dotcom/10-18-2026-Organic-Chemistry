// Lesson 4's hybrid-orbital model (#82): the textbook picture, not a calculation. Every "model"
// Scene (hybrid-sets, methane-unmixed-vs-real, orbital-sum, pi-twist) and the Manim render
// hybrid-mixing (scenes/manim/lesson_04.py, which repeats these few lines in Python) draw from it.
//
// The model: the hydrogen-like angular parts of carbon's 2s and 2p orbitals, Y00 = 1/(2√π) and
// Y10 = √(3/4π)·cos θ, mixed in the textbook proportions: an spⁿ hybrid along its axis is
// (s + √n·p)/√(1+n). Each orbital is drawn the way textbooks draw orbital shapes: the polar plot of
// its angular part squared, r(θ) = A(θ)², scaled so a p lobe reaches 1 drawing unit, with each
// lobe keeping the sign of A there. (A full isosurface with a radial part draws every lobe as a
// near-sphere, which hides the directions this Lesson is about; recorded in notes/82-lesson-4.md.)
// No measured number comes from here: only shapes and the model's own angles.

export type OrbitalKind = "s" | "p" | "sp3" | "sp2" | "sp";
export type HybridSet = "sp3" | "sp2" | "sp";
export type Sign = "+" | "-";
export type Vec3 = [number, number, number];

const Y00 = 1 / (2 * Math.sqrt(Math.PI));
const Y10 = Math.sqrt(3 / (4 * Math.PI));
/** How many p orbitals each kind mixes in with its s (p alone: no s). */
const P_SHARE: Record<OrbitalKind, number> = { s: 0, p: Infinity, sp: 1, sp2: 2, sp3: 3 };

/** The angular factor of an orbital along its axis, at angle θ from it. */
export function angular(kind: OrbitalKind, theta: number): number {
  const n = P_SHARE[kind];
  if (n === Infinity) return Y10 * Math.cos(theta);
  return (Y00 + Math.sqrt(n) * Y10 * Math.cos(theta)) / Math.sqrt(1 + n);
}

export interface LobeProfile {
  kind: OrbitalKind;
  sign: Sign;
  /** Closed outline in the plane of the axis: [u along the axis (the + lobe's way), v across it], in drawing units. */
  outline: [number, number][];
  /** The farthest point from the nucleus. */
  reach: number;
  /** The widest half-width across the axis. */
  width: number;
}

/** One sign's lobe of an orbital: the + lobe points along +u, a hybrid's small − lobe along −u. */
export function lobeProfile(kind: OrbitalKind, sign: Sign, steps = 72): LobeProfile {
  const want = sign === "+" ? 1 : -1;
  const half: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (Math.PI * i) / steps;
    const a = angular(kind, theta) * want;
    if (a <= 0) continue;
    const r = (a * a) / (Y10 * Y10);
    half.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  if (!half.length) return { kind, sign, outline: [], reach: -Infinity, width: -Infinity };
  // The lobe is symmetric about its axis: mirror the upper half (v ≥ 0) to close it.
  const outline = [...half, ...half.map(([u, v]) => [u, -v] as [number, number]).reverse()];
  const reach = Math.max(...half.map(([u, v]) => Math.hypot(u, v)));
  const width = Math.max(...half.map(([, v]) => Math.abs(v)));
  return { kind, sign, outline, reach, width };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};

/**
 * Where one hybrid set's lobes point, and its leftover p orbitals, in the carbon's own frame:
 * sp³ to the corners of a tetrahedron; sp² in the xy plane with its p along z; sp along x with
 * its p along y and z.
 */
export function hybridDirections(set: HybridSet): { hybrids: Vec3[]; p: Vec3[] } {
  if (set === "sp3")
    return {
      hybrids: [
        unit([1, 1, 1]),
        unit([1, -1, -1]),
        unit([-1, 1, -1]),
        unit([-1, -1, 1]),
      ],
      p: [],
    };
  if (set === "sp2") {
    const third = (2 * Math.PI) / 3;
    return { hybrids: [0, 1, 2].map((k) => [Math.cos(k * third), Math.sin(k * third), 0] as Vec3), p: [[0, 0, 1]] };
  }
  return {
    hybrids: [
      [1, 0, 0],
      [-1, 0, 0],
    ],
    p: [
      [0, 1, 0],
      [0, 0, 1],
    ],
  };
}

/** The model's angle between two lobes of a set, in degrees (from the directions, never typed in). */
export function modelAngle(set: HybridSet): number {
  const [a, b] = hybridDirections(set).hybrids;
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI;
}

/** A turn of the carbon's frame for drawing: yaw about the screen's vertical, then pitch about its horizontal (degrees). */
export interface ViewTurn {
  yaw: number;
  pitch: number;
  /** A first turn about the frame's own z axis (degrees), e.g. to spin an sp² set within its plane. */
  spin?: number;
}

/** A frame vector on screen: [x right, y up, z toward the viewer]. */
export function project(v: Vec3, turn: ViewTurn): Vec3 {
  const yaw = (turn.yaw * Math.PI) / 180;
  const pitch = (turn.pitch * Math.PI) / 180;
  const spin = ((turn.spin ?? 0) * Math.PI) / 180;
  const x0 = v[0] * Math.cos(spin) - v[1] * Math.sin(spin);
  const y0 = v[0] * Math.sin(spin) + v[1] * Math.cos(spin);
  const x1 = x0 * Math.cos(yaw) + v[2] * Math.sin(yaw);
  const z1 = -x0 * Math.sin(yaw) + v[2] * Math.cos(yaw);
  const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch);
  return [x1, y2, z2];
}

/** One cross-section of a lobe as seen on screen: an ellipse centred on the axis, rotated `rotate` degrees. */
export interface Section {
  cx: number;
  cy: number;
  /** Half-length along the axis's direction on screen. */
  rx: number;
  /** Half-width across it. */
  ry: number;
  rotate: number;
}

/**
 * A lobe's outline on screen as the union of its circular cross-sections, each drawn as the
 * ellipse it projects to (the exact silhouette of a body of revolution under an orthographic view).
 * `axis` is the lobe's + direction already on screen ([x right, y up, z toward the viewer]);
 * screen y is up here, so a Scene flips it when it draws.
 */
export function silhouette(profile: LobeProfile, axis: Vec3): Section[] {
  const a = unit(axis);
  const along = Math.hypot(a[0], a[1]);
  const rotate = along > 1e-9 ? (Math.atan2(a[1], a[0]) * 180) / Math.PI : 0;
  const tilt = Math.abs(a[2]);
  const upper = evenly(profile.outline.filter(([, v]) => v >= 0), 96);
  return upper.map(([u, v]) => ({ cx: u * a[0], cy: u * a[1], rx: v * tilt, ry: v, rotate }));
}

/**
 * The lobe's profile laid flat along its axis on screen ([x right, y up] points): the exact
 * silhouette side on, and inside the silhouette at any other angle. Drawn with the sections so the
 * union has no gaps where the sections are thin.
 */
export function flatOutline(profile: LobeProfile, axis: Vec3): [number, number][] {
  const a = unit(axis);
  const along = Math.hypot(a[0], a[1]);
  const across: [number, number] = along > 1e-9 ? [-a[1] / along, a[0] / along] : [0, 1];
  return profile.outline.map(([u, v]) => [u * a[0] + v * across[0], u * a[1] + v * across[1]]);
}

/** The polyline resampled to n points evenly spaced along it, so the drawn edge has no scallops. */
function evenly(points: [number, number][], n: number): [number, number][] {
  if (points.length < 2) return points;
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lengths[lengths.length - 1];
  const out: [number, number][] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const at = (total * k) / (n - 1);
    while (j < points.length - 1 && lengths[j] < at) j++;
    const span = lengths[j] - lengths[j - 1] || 1;
    const f = Math.min(1, Math.max(0, (at - lengths[j - 1]) / span));
    out.push([points[j - 1][0] + f * (points[j][0] - points[j - 1][0]), points[j - 1][1] + f * (points[j][1] - points[j - 1][1])]);
  }
  return out;
}

/** Formats a model angle in degrees: one decimal, no ".0". */
export const degrees = (value: number) => {
  const one = Math.round(value * 10) / 10;
  return Number.isInteger(one) ? String(one) : one.toFixed(1);
};
