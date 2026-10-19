// Structures in the content build: checking structure files, resolving
// structure cards and Tap-to-identify targets, and writing the screen-reader
// label of every tappable atom and bond.
import type { Hidden, Option, Structure, StructureAtom, StructureView, TapTarget } from "./model.ts";
import type { ProblemFile, StructureFile } from "./schema.ts";
import { hintIds } from "./shape.ts";

type TapFile = Extract<ProblemFile, { type: "tap-to-identify" }>;
type TapFields = Pick<TapFile, "structure" | "hide" | "tappable" | "answer" | "hints">;
type OptionFile = Extract<ProblemFile, { type: "multiple-choice" }>["options"][number];

/** Internal consistency of one structure file. */
export function checkStructure(file: StructureFile): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const { id } of [...file.atoms, ...file.bonds]) {
    if (seen.has(id)) errors.push(`id "${id}" is used twice`);
    seen.add(id);
  }
  const atoms = new Set(file.atoms.map((a) => a.id));
  for (const b of file.bonds)
    for (const end of [b.a, b.b]) if (!atoms.has(end)) errors.push(`bond ${b.id} joins "${end}", which is not an atom`);
  return errors;
}

const view = (structure: Structure, hide: Hidden[] | undefined): StructureView => ({ structure, hide: hide ?? [] });

/** Resolves structure cards; text options pass through. */
export function resolveOptions(
  options: OptionFile[],
  structures: Map<string, Structure | undefined>,
  errors: string[],
): Option[] {
  return options.map(({ id, text, structure, hide }) => {
    if (!structure) return { id, text };
    const found = structures.get(structure);
    if (!found) {
      if (!structures.has(structure)) errors.push(`structure "${structure}" not found`);
      return { id, text };
    }
    return { id, text, structure: view(found, hide) };
  });
}

/** Resolves a Tap-to-identify item's structure and targets, and checks its answer and Hints against them. */
export function resolveTap(
  item: TapFields,
  structures: Map<string, Structure | undefined>,
  errors: string[],
): { structure: StructureView; targets: TapTarget[] } | undefined {
  const structure = structures.get(item.structure);
  if (!structure) {
    if (!structures.has(item.structure)) errors.push(`structure "${item.structure}" not found`);
    return undefined;
  }
  const hide = item.hide ?? [];
  const atomById = new Map(structure.atoms.map((a) => [a.id, a]));
  const bondById = new Map(structure.bonds.map((b) => [b.id, b]));
  const missing = (kind: string, id: string) => errors.push(`structure "${structure.id}" has no ${kind} "${id}"`);

  const { atoms = [], bonds = [], regions = [] } = item.tappable;
  const atomIds = atoms === "all" ? [...atomById.keys()] : atoms.filter((id) => atomById.has(id) || !missing("atom", id));
  const bondIds = bonds === "all" ? [...bondById.keys()] : bonds.filter((id) => bondById.has(id) || !missing("bond", id));
  for (const r of regions) for (const a of r.atoms) if (!atomById.has(a)) missing("atom", a);

  const placed: (TapTarget & { x: number; y: number })[] = [
    ...atomIds.map((id) => {
      const a = atomById.get(id)!;
      return { id, kind: "atom" as const, label: atomLabel(structure, a, hide), x: a.x, y: a.y };
    }),
    ...bondIds.map((id) => {
      const b = bondById.get(id)!;
      const [p, q] = [atomById.get(b.a)!, atomById.get(b.b)!];
      return { id, kind: "bond" as const, label: b.label ?? bondLabel(b.order, p, q), x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    }),
    ...regions.map((r) => {
      const pts = r.atoms.flatMap((a) => atomById.get(a) ?? []);
      const mean = (f: (a: StructureAtom) => number) => pts.reduce((s, a) => s + f(a), 0) / (pts.length || 1);
      return { id: r.id, kind: "region" as const, label: r.label, atoms: r.atoms, x: mean((a) => a.x), y: mean((a) => a.y) };
    }),
  ];
  // Reading order: rows top to bottom (half a bond apart), then left to right.
  placed.sort((p, q) => Math.round(p.y / 0.75) - Math.round(q.y / 0.75) || p.x - q.x);
  const targets = placed.map(({ x: _x, y: _y, ...t }) => t);
  // Same-sounding targets are numbered in reading order, so a screen-reader user can tell them apart.
  const total = new Map<string, number>();
  for (const t of targets) total.set(t.label, (total.get(t.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const t of targets) {
    const n = total.get(t.label)!;
    if (n < 2) continue;
    const i = (seen.get(t.label) ?? 0) + 1;
    seen.set(t.label, i);
    t.label = `${t.label.replace(/\.$/, "")} (${i} of ${n}).`;
  }

  // The answer and Hints may only name targets (the shared Hint and Correct-line rules run in shape.ts).
  const tappable = new Set(targets.map((t) => t.id));
  for (const id of item.answer) if (!tappable.has(id)) errors.push(`answer names "${id}", which can't be tapped`);
  for (const hint of item.hints ?? [])
    for (const id of hintIds(hint)) if (!tappable.has(id)) errors.push(`a Hint names "${id}", which can't be tapped`);
  return { structure: view(structure, item.hide), targets };
}

const ELEMENT: Record<string, string> = {
  H: "Hydrogen", B: "Boron", C: "Carbon", N: "Nitrogen", O: "Oxygen", F: "Fluorine", Si: "Silicon",
  P: "Phosphorus", S: "Sulfur", Cl: "Chlorine", Br: "Bromine", I: "Iodine", Li: "Lithium", Na: "Sodium", Mg: "Magnesium",
};
const ORDER = ["", "single", "double", "triple"];

/** "Oxygen: double bond to C; 2 lone pairs; charge −1." Charges and lone pairs are left out when the Step hides them. */
function atomLabel(s: Structure, atom: StructureAtom, hide: Hidden[]): string {
  if (atom.label) return atom.label;
  const byId = new Map(s.atoms.map((a) => [a.id, a]));
  const partners: Record<number, string[]> = {};
  for (const b of s.bonds) {
    const other = b.a === atom.id ? b.b : b.b === atom.id ? b.a : undefined;
    if (other) (partners[b.order] ??= []).push(byId.get(other)?.el ?? "?");
  }
  const bonds = [3, 2, 1]
    .filter((o) => partners[o])
    .map((o) => {
      const els = partners[o];
      const list = els.length > 1 ? `${els.slice(0, -1).join(", ")} and ${els.at(-1)}` : els[0];
      return `${ORDER[o]} bond${els.length > 1 ? "s" : ""} to ${list}`;
    });
  const name = (ELEMENT[atom.el] ?? atom.el) + (atom.h ? ` with ${atom.h} H` : "");
  const parts = [`${name}: ${bonds.join(", ") || "no bonds"}`];
  if (atom.lp && !hide.includes("lone-pairs")) parts.push(`${atom.lp} lone pair${atom.lp > 1 ? "s" : ""}`);
  if (atom.charge && !hide.includes("charges")) parts.push(`charge ${atom.charge > 0 ? "+" : "−"}${Math.abs(atom.charge)}`);
  return parts.join("; ") + ".";
}

function bondLabel(order: number, p: StructureAtom, q: StructureAtom): string {
  const kind = ORDER[order];
  return `${kind[0].toUpperCase()}${kind.slice(1)} bond, ${p.el} to ${q.el}.`;
}
