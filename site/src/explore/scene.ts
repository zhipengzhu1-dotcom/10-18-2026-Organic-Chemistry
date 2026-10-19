// Explore in 3D (#71): what the 3Dmol.js view is given. Pure, so it is tested without
// WebGL; the viewer (viewer-3dmol.ts) only passes these to 3Dmol. Every colour and radius
// comes from the cited data on the molecule (ADR 0002), never from 3Dmol's defaults.
import type { ExploreMolecule } from "@astratron/content";

export type ExploreStyle = "ball-and-stick" | "space-filling";

/** Ball-and-stick balls are this fraction of the cited van der Waals radius (tooling-web-3d decision). */
export const BALL_SCALE = 0.3;
/** Stick radius in Å: a drawing size, not a chemistry value. */
export const STICK_RADIUS = 0.15;

export interface ElementStyle {
  elem: string;
  style: { sphere: { radius: number; color: string }; stick?: { radius: number; color: string } };
}

/** One 3Dmol style per element in the molecule, in first-appearance order. */
export function styles(molecule: ExploreMolecule, mode: ExploreStyle): ElementStyle[] {
  return Object.entries(molecule.elements).map(([elem, { colour, vdwRadius }]) => {
    const color = String(colour.value);
    const vdw = Number(vdwRadius.value);
    return mode === "space-filling"
      ? { elem, style: { sphere: { radius: vdw, color } } }
      : { elem, style: { sphere: { radius: vdw * BALL_SCALE, color }, stick: { radius: STICK_RADIUS, color } } };
  });
}

/** The molecule as a V2000 molfile: our coordinates and our bond orders, so 3Dmol never guesses bonds. */
export function molBlock(molecule: ExploreMolecule): string {
  const pad = (n: number | string, width: number) => String(n).padStart(width);
  const atoms = molecule.atoms.map(
    (a) =>
      `${pad(a.x.toFixed(4), 10)}${pad(a.y.toFixed(4), 10)}${pad(a.z.toFixed(4), 10)} ${a.element.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`,
  );
  const bonds = molecule.bonds.map((b) => `${pad(b.a + 1, 3)}${pad(b.b + 1, 3)}${pad(b.order, 3)}  0`);
  return [
    molecule.id,
    "  AstraTron",
    "",
    `${pad(atoms.length, 3)}${pad(bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`,
    ...atoms,
    ...bonds,
    "M  END",
  ].join("\n");
}

const NAMES: Record<string, string> = {
  H: "hydrogen",
  B: "boron",
  C: "carbon",
  N: "nitrogen",
  O: "oxygen",
  F: "fluorine",
  P: "phosphorus",
  S: "sulfur",
  Cl: "chlorine",
  Br: "bromine",
  I: "iodine",
};
const nameOf = (el: string) => NAMES[el] ?? el;
const ORDER_WORD = { 1: "", 2: "double", 3: "triple" } as const;

/** Hill order: carbon, then hydrogen, then the rest alphabetically. */
function hill(a: string, b: string): number {
  const rank = (e: string) => (e === "C" ? 0 : e === "H" ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b);
}

function count(n: number, el: string): string {
  return `${n} ${nameOf(el)}${n === 1 ? "" : "s"}`;
}

function list(parts: string[]): string {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * The text a screen reader gets instead of the 3D picture: the atom counts, then what
 * each heavy atom is bonded to (all atoms when there are no heavy atoms, as in H₂).
 */
export function describeMolecule(molecule: ExploreMolecule): string {
  const { atoms, bonds } = molecule;
  const tally = new Map<string, number>();
  for (const a of atoms) tally.set(a.element, (tally.get(a.element) ?? 0) + 1);
  const formula = list([...tally].sort(([a], [b]) => hill(a, b)).map(([el, n]) => count(n, el)));

  const neighbours = (i: number) => {
    const groups = new Map<string, { el: string; order: 1 | 2 | 3; n: number }>();
    for (const b of bonds) {
      const j = b.a === i ? b.b : b.b === i ? b.a : -1;
      if (j < 0) continue;
      const el = atoms[j].element;
      const k = `${el}/${b.order}`;
      const g = groups.get(k) ?? groups.set(k, { el, order: b.order, n: 0 }).get(k)!;
      g.n++;
    }
    const parts = [...groups.values()]
      .sort((a, b) => hill(a.el, b.el) || a.order - b.order)
      .map((g) => `${count(g.n, g.el)}${g.order > 1 ? ` (${ORDER_WORD[g.order]} bond${g.n === 1 ? "" : "s"})` : ""}`);
    return parts.length ? list(parts) : "nothing";
  };

  const heavy = atoms.some((a) => a.element !== "H");
  const sentences: string[] = [];
  for (const el of [...tally.keys()].sort(hill)) {
    if (heavy && el === "H") continue;
    const indices = atoms.flatMap((a, i) => (a.element === el ? [i] : []));
    const said = indices.map(neighbours);
    const name = nameOf(el);
    if (indices.length === 1) sentences.push(`The ${name} is bonded to ${said[0]}.`);
    else if (said.every((s) => s === said[0])) sentences.push(`Each ${name} is bonded to ${said[0]}.`);
    else said.forEach((s, k) => sentences.push(`${name[0].toUpperCase()}${name.slice(1)} ${k + 1} is bonded to ${s}.`));
  }
  return `${molecule.title}: ${formula}. ${sentences.join(" ")}`;
}
