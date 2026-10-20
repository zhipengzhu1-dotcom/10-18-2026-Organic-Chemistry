// The 3D molecule module (#68): pure geometry behind the 3D Step card, Rotate-and-identify Steps
// and Explore in 3D. Atom names, what a Student measures by tapping atoms, named start views,
// turning, projection to the screen and the Describe text. Every number comes from the
// molecule's cited coordinates (ADR 0002); nothing here draws.
//
// Browser-safe and dependency-free ("@astratron/content/molecule").
import type { Atom, Bond } from "./data.ts";

export type Vec3 = [number, number, number];
/** A rotation: its rows are the screen's right, up and toward-the-viewer axes, in the molecule's frame. */
export type Matrix3 = [Vec3, Vec3, Vec3];

/** What the module needs of a molecule: its cited atoms (Å) and bonds. */
export interface Molecule {
  title: string;
  atoms: Atom[];
  bonds: Bond[];
  /** The Step's own words for the arrangement; Describe reads them first. */
  describe?: string;
  /** Atom names to use instead of the per-element ones (a Step's `labels`). */
  names?: string[];
}

/**
 * A named start view (`views.yaml`), built from atom indices (0-based, file order):
 * - `look: [a, b]`: look along a → b, a nearest the viewer; or
 * - `plane: [a, b, c]`: those three atoms lie in the screen plane; `front: d` puts atom d on the viewer's side.
 * - `up: k`: atom k points straight up from a (look) or b (plane).
 * - `rotate: [x, y, z]`: then turn that many degrees about the screen's x, y and z axes, in that order.
 * With neither look nor plane, the file's own axes face the screen.
 */
export interface ViewSpec {
  look?: [number, number];
  plane?: [number, number, number];
  front?: number;
  up?: number;
  rotate?: Vec3;
}

export type Measurement =
  | { kind: "distance"; atoms: [number, number]; value: number; bonded: boolean; order?: 1 | 2 | 3 }
  | { kind: "angle"; atoms: [number, number, number]; value: number };

const IDENTITY: Matrix3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Atoms closer than this in depth (Å) count as level with each other. */
const LEVEL = 0.05;

const pos = (a: Atom): Vec3 => [a.x, a.y, a.z];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Vec3) => Math.sqrt(dot(a, a));
const unit = (a: Vec3) => scale(a, 1 / length(a));
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const apply = (m: Matrix3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
const multiply = (a: Matrix3, b: Matrix3): Matrix3 =>
  a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as Matrix3;

/** "C1", "H1", "H2", …: atoms numbered per element in file order. */
export function atomNames(atoms: Atom[]): string[] {
  const seen: Record<string, number> = {};
  return atoms.map((a) => `${a.element}${(seen[a.element] = (seen[a.element] ?? 0) + 1)}`);
}

export function centroid(atoms: Atom[]): Vec3 {
  const sum = atoms.reduce<Vec3>((s, a) => [s[0] + a.x, s[1] + a.y, s[2] + a.z], [0, 0, 0]);
  return scale(sum, 1 / Math.max(1, atoms.length));
}

export function bondBetween(bonds: Bond[], i: number, j: number): Bond | undefined {
  return bonds.find((b) => (b.a === i && b.b === j) || (b.a === j && b.b === i));
}

/** Two picks: their distance (bonded or not); three: the angle at the middle atom; otherwise nothing. */
export function measure(m: Molecule, picks: number[]): Measurement | undefined {
  const p = picks.map((i) => pos(m.atoms[i]));
  if (picks.length === 2) {
    const bond = bondBetween(m.bonds, picks[0], picks[1]);
    return {
      kind: "distance",
      atoms: [picks[0], picks[1]],
      value: length(sub(p[0], p[1])),
      bonded: !!bond,
      ...(bond ? { order: bond.order } : {}),
    };
  }
  if (picks.length === 3) {
    const u = sub(p[0], p[1]);
    const v = sub(p[2], p[1]);
    const cos = Math.min(1, Math.max(-1, dot(u, v) / (length(u) * length(v))));
    const [first, middle, last] = picks;
    return { kind: "angle", atoms: [first, middle, last], value: deg(Math.acos(cos)) };
  }
  return undefined;
}

/** Tapping an atom: a picked atom is un-picked; a fourth atom starts a new measurement from itself. */
export function togglePick(picks: number[], atom: number): number[] {
  if (picks.includes(atom)) return picks.filter((i) => i !== atom);
  return picks.length >= 3 ? [atom] : [...picks, atom];
}

/** Single, double, triple: the sign between two atom names, by order. */
const SIGN_BY_ORDER = { 1: "–", 2: "=", 3: "≡" } as const;

/** The scale bar is one ångström long (drawn at the view's px per Å): a unit, not a measurement. */
const SCALE_BAR_ANGSTROMS = 1;
export const SCALE_BAR_LABEL = `${SCALE_BAR_ANGSTROMS} Å`;

export interface ArrowSize {
  head: number;
  tail: number;
  cross: number;
  spread: number;
}

export interface Point2 {
  x: number;
  y: number;
}

/**
 * A dipole arrow's lines, in screen units: the shaft from the tail to the head's base, a cross on
 * the tail (the δ+ end) `tail` along it and `cross` either side, and a head `head` long whose base
 * is `spread` × `head` either side; `size` may depend on the arrow's length. None when the arrow
 * is shorter than `min`.
 */
export function arrowShape(
  from: Point2,
  to: Point2,
  sizing: ArrowSize | ((length: number) => ArrowSize),
  min = 2,
): { shaft: [Point2, Point2]; cross: [Point2, Point2]; head: [Point2, Point2, Point2] } | undefined {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < min) return undefined;
  const size = typeof sizing === "function" ? sizing(len) : sizing;
  const [ux, uy] = [(to.x - from.x) / len, (to.y - from.y) / len];
  const [nx, ny] = [-uy, ux];
  const base = { x: to.x - ux * size.head, y: to.y - uy * size.head };
  const c = { x: from.x + ux * size.tail, y: from.y + uy * size.tail };
  const side = (p: Point2, d: number) => ({ x: p.x + nx * d, y: p.y + ny * d });
  const half = size.head * size.spread;
  return {
    shaft: [from, base],
    cross: [side(c, size.cross), side(c, -size.cross)],
    head: [to, side(base, half), side(base, -half)],
  };
}

/** Dark or light ink for a letter on an atom of this colour ("#RRGGBB"), by its relative luminance. */
export function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? "#140f2b" : "white";
}

/** The measurement as drawn (value + what it is) and as read aloud. Lengths to 2 decimals, angles to 1. */
export function readout(m: Measurement, names: string[]): { value: string; what: string; spoken: string } {
  if (m.kind === "distance") {
    const [a, b] = m.atoms.map((i) => names[i]);
    const value = m.value.toFixed(2);
    return {
      value: `${value} Å`,
      what: m.bonded ? `${a}${SIGN_BY_ORDER[m.order ?? 1]}${b} bond` : `${a}···${b} not bonded`,
      spoken: `${a} to ${b}: ${value} ångströms, ${m.bonded ? "a bond" : "not bonded"}.`,
    };
  }
  const [a, v, b] = m.atoms.map((i) => names[i]);
  const value = m.value.toFixed(1);
  return { value: `${value}°`, what: `${a}–${v}–${b} angle at ${v}`, spoken: `Angle ${a}, ${v}, ${b}: ${value} degrees, at ${v}.` };
}

/** Why a view can't be built on these atoms ([] when it can). */
export function viewErrors(atoms: Atom[], spec: ViewSpec): string[] {
  const errors: string[] = [];
  const last = atoms.length - 1;
  const inRange = (field: string, list: number[]) => {
    for (const i of list)
      if (!Number.isInteger(i) || i < 0 || i > last) errors.push(`${field}: atom ${i} is not in the molecule (0–${last})`);
  };
  if (spec.look && spec.plane) return ["give look or plane, not both"];
  if (spec.look) inRange("look", spec.look);
  if (spec.plane) inRange("plane", spec.plane);
  if (spec.up !== undefined) inRange("up", [spec.up]);
  if (spec.front !== undefined) inRange("front", [spec.front]);
  if (errors.length) return errors;
  if (spec.look && spec.look[0] === spec.look[1]) return ["look: needs two different atoms"];
  if (spec.plane && length(planeNormal(atoms, spec.plane)) < 1e-6) return ["plane: the three atoms are in a line"];
  if (spec.front !== undefined && !spec.plane) return ["front: only goes with plane"];
  if ((spec.look || spec.plane) && spec.up !== undefined) {
    const { back, from } = sight(atoms, spec);
    const u = sub(pos(atoms[spec.up]), from);
    if (length(sub(u, scale(back, dot(u, back)))) < 1e-6) errors.push(`up: atom ${spec.up} lies on the line of sight`);
  }
  return errors;
}

function planeNormal(atoms: Atom[], [a, b, c]: [number, number, number]): Vec3 {
  return cross(sub(pos(atoms[a]), pos(atoms[b])), sub(pos(atoms[c]), pos(atoms[b])));
}

/** The direction toward the viewer, and the atom "up" is measured from. */
function sight(atoms: Atom[], spec: ViewSpec): { back: Vec3; from: Vec3 } {
  if (spec.look) {
    const [a, b] = spec.look.map((i) => pos(atoms[i]));
    return { back: unit(sub(a, b)), from: a };
  }
  const [a, b] = spec.plane!;
  let back = unit(planeNormal(atoms, spec.plane!));
  if (spec.front !== undefined && dot(sub(pos(atoms[spec.front]), pos(atoms[b])), back) < 0) back = scale(back, -1);
  return { back, from: pos(atoms[b]) };
}

/** The rotation a view puts the molecule in. Throws on a view `viewErrors` rejects. */
export function viewMatrix(atoms: Atom[], spec: ViewSpec = {}): Matrix3 {
  const errors = viewErrors(atoms, spec);
  if (errors.length) throw new Error(errors.join("; "));
  let r = IDENTITY;
  if (spec.look || spec.plane) {
    const { back, from } = sight(atoms, spec);
    const perpendicular = (v: Vec3) => sub(v, scale(back, dot(v, back)));
    let up =
      spec.up !== undefined
        ? perpendicular(sub(pos(atoms[spec.up]), from))
        : [perpendicular([0, 1, 0]), perpendicular([0, 0, 1])].find((v) => length(v) > 1e-6)!;
    up = unit(up);
    r = [cross(up, back), up, back];
  }
  const [x, y, z] = spec.rotate ?? [0, 0, 0];
  return turn(turn(turn(r, "x", x), "y", y), "z", z);
}

/** Turns a rotation about one of the screen's axes by `degrees` (x tilts, y spins, z rolls). */
export function turn(r: Matrix3, axis: "x" | "y" | "z", degrees: number): Matrix3 {
  if (!degrees) return r;
  const c = Math.cos(rad(degrees));
  const s = Math.sin(rad(degrees));
  const about: Matrix3 =
    axis === "x"
      ? [
          [1, 0, 0],
          [0, c, -s],
          [0, s, c],
        ]
      : axis === "y"
        ? [
            [c, 0, s],
            [0, 1, 0],
            [-s, 0, c],
          ]
        : [
            [c, -s, 0],
            [s, c, 0],
            [0, 0, 1],
          ];
  return multiply(about, r);
}

/** Screen coordinates in Å about the molecule's centre: x right, y up, z toward the viewer. */
export function project(atoms: Atom[], r: Matrix3): Vec3[] {
  const c = centroid(atoms);
  return atoms.map((a) => apply(r, sub(pos(a), c)));
}

/**
 * The page sheet (Lesson 3 s09): the view that lays three atoms flat in the page (the screen
 * plane), with the first of them pointing up from the second.
 */
export function pageView(atoms: Atom[], plane: [number, number, number]): Matrix3 {
  return viewMatrix(atoms, { plane, up: plane[0] });
}

/** How far (degrees, 0–90) the plane through three atoms is turned out of the screen plane. */
export function pageTilt(atoms: Atom[], r: Matrix3, plane: [number, number, number]): number {
  const n = unit(planeNormal(atoms, plane));
  return deg(Math.acos(Math.min(1, Math.abs(dot(n, r[2])))));
}

/**
 * Atoms bonded to the plane's middle atom that are not in the plane: on the viewer's side of the
 * plane ("toward") or behind it ("away"), in the current view.
 */
export function pageSides(m: Molecule, r: Matrix3, plane: [number, number, number]): { atom: number; side: "toward" | "away" }[] {
  const centre = plane[1];
  const n = unit(planeNormal(m.atoms, plane));
  const facing = dot(n, r[2]) >= 0 ? n : scale(n, -1);
  return m.bonds
    .filter((b) => b.a === centre || b.b === centre)
    .map((b) => (b.a === centre ? b.b : b.a))
    .filter((i) => !plane.includes(i))
    .sort((a, b) => a - b)
    .map((atom) => {
      const d = dot(sub(pos(m.atoms[atom]), pos(m.atoms[centre])), facing);
      return { atom, side: d >= 0 ? ("toward" as const) : ("away" as const) };
    });
}

/** Within this many degrees of the screen plane, a plane of atoms is "in the page". */
export const IN_PAGE = 10;

/**
 * What Describe adds for the page sheet: whether the three atoms' plane is in the page and, when it
 * is, which side each other atom on the middle one sits.
 */
export function describePage(m: Molecule, r: Matrix3, plane: [number, number, number], names: string[]): string {
  const three = list([...plane].map((i) => names[i]));
  if (pageTilt(m.atoms, r, plane) > IN_PAGE) return `${three} are not in the page.`;
  const sides = pageSides(m, r, plane).map((s) => `${names[s.atom]} points ${s.side === "toward" ? "toward you" : "away"}`);
  return `${three} are in the page.${sides.length ? ` On ${names[plane[1]]}, ${list(sides)}.` : ""}`;
}

/** A bond dipole: from the δ+ atom toward the δ− atom, `size` = the electronegativity difference. */
export interface BondDipole {
  from: number;
  to: number;
  size: number;
}

/**
 * Every polar bond's dipole (Lesson 3's `dipole-sum`): it lies along the bond and points at the
 * more electronegative atom; its length is the two atoms' electronegativity difference, a rough
 * guide only. `en` maps element → electronegativity (from the cited table).
 */
export function bondDipoles(m: Molecule, en: Record<string, number>): BondDipole[] {
  return m.bonds.flatMap((b) => {
    const [ea, eb] = [en[m.atoms[b.a].element], en[m.atoms[b.b].element]];
    if (ea === undefined || eb === undefined)
      throw new Error(`no electronegativity for ${m.atoms[b.a].element} or ${m.atoms[b.b].element}`);
    if (ea === eb) return [];
    return [ea > eb ? { from: b.b, to: b.a, size: ea - eb } : { from: b.a, to: b.b, size: eb - ea }];
  });
}

/** Below this fraction of the largest bond dipole, a sum counts as zero (symmetric molecules). */
const NET_ZERO = 0.02;

/** The bond dipoles added tip to tail: the net vector (molecule frame), its size, and whether it cancels. */
export function netDipole(m: Molecule, dipoles: BondDipole[]): { vector: Vec3; size: number; zero: boolean } {
  const vector = dipoles.reduce<Vec3>(
    (s, d) => {
      const v = scale(unit(sub(pos(m.atoms[d.to]), pos(m.atoms[d.from]))), d.size);
      return [s[0] + v[0], s[1] + v[1], s[2] + v[2]];
    },
    [0, 0, 0],
  );
  const size = length(vector);
  const largest = Math.max(0, ...dipoles.map((d) => d.size));
  return { vector, size, zero: size <= NET_ZERO * largest };
}

const list = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/**
 * What the Describe button reads: the Step's own words (if any), the atoms and their bonds,
 * then what the current view shows: atoms level with the screen, and the nearest and farthest atoms.
 */
export function describeMolecule(m: Molecule, r: Matrix3): string {
  const names = m.names ?? atomNames(m.atoms);
  const parts = m.describe ? [m.describe] : [];
  parts.push(`${m.title}: ${m.atoms.length} atoms.`);
  m.atoms.forEach((_, i) => {
    const later = m.bonds
      .filter((b) => b.a === i || b.b === i)
      .map((b) => ({ j: b.a === i ? b.b : b.a, order: b.order }))
      .filter(({ j }) => j > i)
      .sort((x, y) => x.j - y.j)
      .map(({ j, order }) => `${names[j]}${order === 2 ? " (double)" : order === 3 ? " (triple)" : ""}`);
    if (later.length) parts.push(`${names[i]} is bonded to ${list(later)}.`);
  });

  const depth = project(m.atoms, r).map((p) => p[2]);
  const near = Math.max(...depth);
  const far = Math.min(...depth);
  if (near - far < LEVEL) {
    parts.push("All atoms lie in the screen plane.");
    return parts.join(" ");
  }
  const level = depth
    .map((d) => depth.flatMap((e, j) => (Math.abs(e - d) < LEVEL ? [j] : [])))
    .filter((group) => group.length >= 3)
    .sort((a, b) => b.length - a.length)[0];
  if (level) parts.push(`${list(level.map((i) => names[i]))} lie in the screen plane.`);
  const at = (d: number) => list(names.filter((_, i) => Math.abs(depth[i] - d) < LEVEL));
  parts.push(`Nearest you: ${at(near)}. Farthest: ${at(far)}.`);
  return parts.join(" ");
}

/** Where an orbital shown only as A or B (Lesson 8, #86) loads its mesh: by the first 16 hex digits of its sha256, not its file name. */
export const blindMesh = (sha256: string) => `/orbitals/m/${sha256.slice(0, 16)}.glb`;
