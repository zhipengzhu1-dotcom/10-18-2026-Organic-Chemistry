// Lesson 3's one-centre molecules for Scenes (four-domain-family, dipole-sum), rebuilt from their
// cited bond lengths and angles: a Scene receives cited values, not coordinate files (ADR 0002).
// Each shape is set the same way up: the centre at the origin, a lone pair or the lone atom of a
// tetrahedron straight up (+y), the other atoms below. Lone pairs are a sketch of the model
// (their directions are drawn, never measured). No React here, so manifests can import it.
import type { Cited } from "@astratron/content/data";
import { project, turn, type Matrix3, type Vec3 } from "@astratron/content/molecule";

/** Scene key → the cited geometry file it is rebuilt from. */
export const SHAPES = {
  methane: "methane",
  nh3: "ammonia",
  water: "water",
  co2: "carbon-dioxide",
  bf3: "boron-trifluoride",
  ccl4: "carbon-tetrachloride",
  ch2cl2: "dichloromethane",
} as const;
export type ShapeKey = keyof typeof SHAPES;

interface Recipe {
  centre: string;
  /** The cited values used: bond-length and angle keys in the file. */
  keys: string[];
  title: string;
  /** The VSEPR shape name the Lesson uses. */
  shape: string;
}

const RECIPES: Record<ShapeKey, Recipe> = {
  methane: { centre: "C", keys: ["r.CH", "a.HCH"], title: "Methane", shape: "tetrahedral" },
  nh3: { centre: "N", keys: ["r.NH", "a.HNH"], title: "Ammonia", shape: "trigonal pyramidal" },
  water: { centre: "O", keys: ["r.OH", "a.HOH"], title: "Water", shape: "bent" },
  co2: { centre: "C", keys: ["r.CO"], title: "Carbon dioxide", shape: "linear" },
  bf3: { centre: "B", keys: ["r.BF", "a.FBF"], title: "Boron trifluoride", shape: "trigonal planar" },
  ccl4: { centre: "C", keys: ["r.CCl", "a.ClCCl"], title: "Carbon tetrachloride", shape: "tetrahedral" },
  ch2cl2: { centre: "C", keys: ["r.CH", "r.CCl", "a.HCH", "a.ClCCl"], title: "Dichloromethane", shape: "tetrahedral" },
};

/** An element's cited Jmol colour. */
export const colourRef = (el: string) => `elements/${el}.colour`;

/** The cited refs a shape is rebuilt from. */
export const shapeRefs = (key: string): string[] => {
  const recipe = RECIPES[key as ShapeKey];
  return recipe ? recipe.keys.map((k) => `${SHAPES[key as ShapeKey]}/${k}`) : [];
};

export interface ShapeAtom {
  element: string;
  pos: Vec3;
}

export interface Shape {
  key: ShapeKey;
  title: string;
  shape: string;
  /** The centre is atom 0. */
  atoms: ShapeAtom[];
  /** Bonds from the centre: [0, i, order]. */
  bonds: [number, number, 1 | 2 | 3][]; // cited-data: ok, bond orders
  /** Unit directions of the centre's lone pairs (a sketch of the model). */
  lonePairs: Vec3[];
}

const rad = (d: number) => (d * Math.PI) / 180;
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (v: Vec3): Vec3 => scale(v, 1 / Math.hypot(...v));

/** The model tetrahedron's angle between two domains (radians), from its geometry, not a measurement. */
const TETRAHEDRAL = Math.acos(-1 / 3);

/** Three directions below the centre, every pair `angle` degrees apart (a flat triangle at 120°). */
function tripod(angle: number): Vec3[] {
  const c = Math.cos(rad(angle));
  const cosPolar = -Math.sqrt(Math.max(0, (2 * c + 1) / 3));
  const sinPolar = Math.sqrt(1 - cosPolar * cosPolar);
  return [0, 1, 2].map((k) => {
    const phi = (2 * Math.PI * k) / 3 + Math.PI / 2;
    return [sinPolar * Math.cos(phi), cosPolar, sinPolar * Math.sin(phi)];
  });
}

/** Two directions `angle` degrees apart in the plane of `across` and y, opening downward (or upward). */
function pair(angle: number, across: Vec3, down = true): Vec3[] {
  const half = rad(angle) / 2; // cited-data: ok, half of a cited angle
  const y = down ? -Math.cos(half) : Math.cos(half);
  return [1, -1].map((s) => add(scale(across, s * Math.sin(half)), [0, y, 0]));
}

/** A shape rebuilt from its cited values (`cited` holds at least `shapeRefs(key)`). */
export function buildShape(key: string, cited: Record<string, Cited>): Shape {
  const recipe = RECIPES[key as ShapeKey];
  if (!recipe) throw new Error(`no shape "${key}"`);
  const value = (k: string) => {
    const c = cited[`${SHAPES[key as ShapeKey]}/${k}`];
    if (!c) throw new Error(`shape ${key} needs ${SHAPES[key as ShapeKey]}/${k}`);
    return Number(c.value);
  };
  const out = (el: string, dir: Vec3, r: number): ShapeAtom => ({ element: el, pos: scale(norm(dir), r) });
  const centre: ShapeAtom = { element: recipe.centre, pos: [0, 0, 0] };
  let outer: ShapeAtom[];
  let lonePairs: Vec3[] = [];
  let order: 1 | 2 = 1;
  switch (key as ShapeKey) {
    case "methane":
    case "ccl4": {
      const [r, a] = recipe.keys.map(value);
      const el = key === "methane" ? "H" : "Cl";
      outer = [out(el, [0, 1, 0], r), ...tripod(a).map((d) => out(el, d, r))];
      break;
    }
    case "nh3":
    case "bf3": {
      const [r, a] = recipe.keys.map(value);
      outer = tripod(a).map((d) => out(key === "nh3" ? "H" : "F", d, r));
      if (key === "nh3") lonePairs = [[0, 1, 0]];
      break;
    }
    case "water": {
      const [r, a] = recipe.keys.map(value);
      const hs = pair(a, [1, 0, 0]);
      outer = hs.map((d) => out("H", d, r));
      // Sketch: the two lone pairs point up, in the plane across the H's, at the model tetrahedron's angle.
      lonePairs = pair(deg(TETRAHEDRAL), [0, 0, 1], false).map(norm);
      break;
    }
    case "co2": {
      const [r] = recipe.keys.map(value);
      outer = [out("O", [-1, 0, 0], r), out("O", [1, 0, 0], r)];
      order = 2;
      break;
    }
    case "ch2cl2": {
      const [rH, rCl, aH, aCl] = recipe.keys.map(value);
      outer = [...pair(aH, [1, 0, 0]).map((d) => out("H", d, rH)), ...pair(aCl, [0, 0, 1], false).map((d) => out("Cl", d, rCl))];
      break;
    }
  }
  const atoms = [centre, ...outer];
  return {
    key: key as ShapeKey,
    title: recipe.title,
    shape: recipe.shape,
    atoms,
    bonds: outer.map((_, i) => [0, i + 1, order]),
    lonePairs,
  };
}

const deg = (r: number) => (r * 180) / Math.PI;

/** Screen positions (x right, y up, z toward you) of points about the centre, turned by `r`. */
export function onScreen(points: Vec3[], r: Matrix3): Vec3[] {
  // project() centres on the centroid; add the origin last and undo that shift.
  const all = project([...points, [0, 0, 0]].map(([x, y, z]) => ({ element: "X", x, y, z })), r);
  const origin = all[all.length - 1];
  return all.slice(0, -1).map((p) => [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]]);
}

/** The Scenes' view: tilted a little toward you, then turned `spin` degrees about the vertical. */
export function sceneView(spin: number, tilt = 12): Matrix3 {
  const flat: Matrix3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  return turn(turn(flat, "y", spin), "x", tilt);
}
