// Writing a line-angle drawing's carbons out: each chosen carbon gets its C
// letter and its implied H's as atoms, so the drawing turns, carbon by carbon,
// into a Kekulé-style drawing of the same molecule. Pure; Scenes animate it.
import type { Structure, StructureAtom, StructureBond } from "@astratron/content";
import { impliedHydrogens } from "@astratron/content/valence";

/** An H sits this fraction of a bond from its carbon, so crowded corners stay readable. */
const H_REACH = 0.8;

/**
 * The structure with `carbons` written out. New atoms are `<carbon>-h<n>` and
 * their bonds `<carbon>-hb<n>`, in the order the H's are placed.
 */
export function withHydrogens(s: Structure, carbons: readonly string[]): Structure {
  const implied = impliedHydrogens(s);
  const byId = new Map(s.atoms.map((a) => [a.id, a]));
  const bond = medianBond(s) * H_REACH;
  const atoms: StructureAtom[] = s.atoms.map((a) => (carbons.includes(a.id) && a.el === "C" ? { ...a, letter: true } : a));
  const bonds: StructureBond[] = [...s.bonds];
  for (const id of carbons) {
    const c = byId.get(id);
    const n = implied[id] ?? 0;
    if (!c || !n) continue;
    const taken = s.bonds
      .filter((b) => b.a === id || b.b === id)
      .map((b) => byId.get(b.a === id ? b.b : b.a)!)
      .map((o) => Math.atan2(o.y - c.y, o.x - c.x));
    hydrogenDirections(taken, n).forEach((dir, k) => {
      atoms.push({ id: `${id}-h${k + 1}`, el: "H", x: c.x + Math.cos(dir) * bond, y: c.y + Math.sin(dir) * bond });
      bonds.push({ id: `${id}-hb${k + 1}`, a: id, b: `${id}-h${k + 1}`, order: 1 });
    });
  }
  return { ...s, atoms, bonds };
}

/** `n` directions spread evenly through the widest gap between the carbon's bonds (any direction if it has none). */
function hydrogenDirections(taken: number[], n: number): number[] {
  if (!taken.length) return Array.from({ length: n }, (_, k) => -Math.PI / 2 + (2 * Math.PI * k) / n);
  const sorted = taken.map(norm).sort((a, b) => a - b);
  let start = 0;
  let gap = -1;
  sorted.forEach((d, j) => {
    const next = j + 1 < sorted.length ? sorted[j + 1] : sorted[0] + 2 * Math.PI;
    if (next - d > gap + 1e-9) {
      gap = next - d;
      start = d;
    }
  });
  return Array.from({ length: n }, (_, k) => start + (gap * (k + 1)) / (n + 1));
}

const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

function medianBond(s: Structure): number {
  const at = new Map(s.atoms.map((a) => [a.id, a]));
  const ls = s.bonds
    .map((b) => Math.hypot(at.get(b.b)!.x - at.get(b.a)!.x, at.get(b.b)!.y - at.get(b.a)!.y))
    .filter((l) => l > 0)
    .sort((p, q) => p - q);
  return ls.length ? ls[Math.floor(ls.length / 2)] : 1.5;
}
