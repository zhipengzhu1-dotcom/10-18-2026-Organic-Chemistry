// Structures in the content build: checking structure files, resolving
// structure cards and Tap-to-identify targets, and writing the screen-reader
// label of every tappable atom and bond.
import type { Figure, Hidden, Option, Push, Structure, StructureAtom, StructureView, TapTarget } from "./model.ts";
import type { ProblemFile, StructureFile } from "./schema.ts";
import { hintIds } from "./shape.ts";
import { expectedLonePairs, hydrogenCount } from "./valence.ts";
import {
  arrowsAct,
  arrowsStart,
  arrowsView,
  atomName,
  charges,
  electrons,
  moleculeOf,
  pushLabel,
  VALENCE,
  type ArrowsTask,
} from "./arrows.ts";

type TapFile = Extract<ProblemFile, { type: "tap-to-identify" }>;
type TapFields = Pick<TapFile, "structure" | "hide" | "outline" | "tappable" | "answer" | "hints" | "replay">;
type FigureFile = NonNullable<TapFile["figures"]>[number];
type OptionFile = Extract<ProblemFile, { type: "multiple-choice" }>["options"][number];

/** Internal consistency of one structure file. */
/** The PubChem compound a structure file names in its `source` ("PubChem CID 7967"), if any. */
export const pubchemCid = (s: Pick<Structure, "source">): number | undefined => {
  const m = s.source?.match(/PubChem CID (\d+)/);
  return m ? Number(m[1]) : undefined;
};

/** Atoms of one element in a molecular formula such as "C18H24O2". */
const countIn = (formula: string, el: string) =>
  [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)].reduce((n, [, e, k]) => n + (e === el ? Number(k || 1) : 0), 0);

/**
 * A drawing that names a PubChem compound must stand for that compound's H's
 * (counted from the cached PubChem record's formula), and every lone pair it
 * draws must follow from valence.
 */
export function checkAgainstPubChem(s: Structure, formula: string): string[] {
  const cid = pubchemCid(s);
  if (cid === undefined) return [];
  const errors: string[] = [];
  const drawn = hydrogenCount(s);
  const real = countIn(formula, "H");
  if (drawn !== real) errors.push(`the drawing has ${drawn} H, but PubChem CID ${cid} (${formula}) has ${real}`);
  const expected = expectedLonePairs(s);
  for (const a of s.atoms) {
    const want = expected[a.id];
    if (want !== undefined && (a.lp ?? 0) !== want)
      errors.push(`${a.id} (${a.el}) draws ${a.lp ?? 0} lone pairs; its bonds and charge give ${want}`);
  }
  return errors;
}

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

const view = (
  structure: Structure,
  hide: Hidden[] | undefined,
  ring?: string[],
  outline?: string[],
  corner?: [string, string, string],
): StructureView => ({
  structure,
  hide: hide ?? [],
  ...(ring || outline || corner ? { highlight: { ring: ring ?? [], outline: outline ?? [], ...(corner ? { corner } : {}) } } : {}),
});

/** Messages for ringed atoms and outlined bonds the structure doesn't have. */
function checkHighlight(structure: Structure, ring: string[] = [], outline: string[] = []): string[] {
  const atoms = new Set(structure.atoms.map((a) => a.id));
  const bonds = new Set(structure.bonds.map((b) => b.id));
  return [
    ...ring.filter((id) => !atoms.has(id)).map((id) => `structure "${structure.id}" has no atom "${id}"`),
    ...outline.filter((id) => !bonds.has(id)).map((id) => `structure "${structure.id}" has no bond "${id}"`),
  ];
}

/** Resolves a figure (a structure drawn with a Step) and checks what it rings and outlines. */
export function resolveFigure(
  figure: FigureFile,
  structures: Map<string, Structure | undefined>,
  errors: string[],
): Figure | undefined {
  const found = structures.get(figure.structure);
  if (!found) {
    if (!structures.has(figure.structure)) errors.push(`structure "${figure.structure}" not found`);
    return undefined;
  }
  const broken = checkHighlight(found, [...(figure.ring ?? []), ...(figure.corner ?? [])], figure.outline);
  errors.push(...broken);
  if (broken.length) return undefined;
  return {
    view: view(found, figure.hide, figure.ring, figure.outline, figure.corner),
    alt: figure.alt,
    ...(figure.large && { large: true }),
    ...(figure.caption ? { caption: figure.caption } : {}),
  };
}

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
): { structure: StructureView; targets: TapTarget[]; replay?: { start: Structure; pushes: Push[] } } | undefined {
  const structure = structures.get(item.structure);
  if (!structure) {
    if (!structures.has(item.structure)) errors.push(`structure "${item.structure}" not found`);
    return undefined;
  }
  const hide = item.hide ?? [];
  errors.push(...checkHighlight(structure, [], item.outline));
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
  const drawn = view(structure, item.hide, undefined, item.outline);
  if (!item.replay) return { structure: drawn, targets };
  // The reveal's push-replay is checked like a Draw-arrows answer: each push a step toward the result, ending on it.
  const { start, result, pushes } = item.replay;
  const found: string[] = [];
  const resolved = resolveArrows({ start, results: [result], answer: pushes }, structures, found);
  for (const message of found) errors.push(`replay: ${message}`);
  return { structure: drawn, targets, ...(resolved && { replay: { start: resolved.start.structure, pushes } }) };
}

type ArrowsFile = Extract<ProblemFile, { type: "draw-arrows" }>;
type ArrowsFields = Pick<ArrowsFile, "start" | "results" | "hideTarget" | "answer" | "hints" | "inBetween">;

/**
 * Resolves a Draw-arrows item's start, target and results, and checks them: every structure's
 * charges agree with its lone pairs and bonds; each result has the start's atoms (same elements
 * and H's) and total charge, with no atom past its octet (H: 2; a carbocation's sextet is a real
 * contributor, e.g. Lesson 6 s04's H₂C⁺–O⁻); the authored pushes are each
 * a step toward a result and end on one; every Hint names atoms or bonds of the start.
 */
export function resolveArrows(
  item: ArrowsFields,
  structures: Map<string, Structure | undefined>,
  errors: string[],
): { start: StructureView; target?: StructureView; results: Structure[] } | undefined {
  const named = [item.start, ...item.results].map((id) => {
    const found = structures.get(id);
    if (!found && !structures.has(id)) errors.push(`structure "${id}" not found`);
    return found;
  });
  if (named.some((s) => !s)) return undefined;
  const [start, ...results] = named as Structure[];
  const before = errors.length;

  for (const s of [start, ...results]) {
    const m = moleculeOf(s);
    const q = charges(m);
    for (const a of s.atoms) {
      if (VALENCE[a.el] === undefined) errors.push(`structure "${s.id}": no valence known for ${a.el}`);
      else if ((q.get(a.id) ?? 0) !== (a.charge ?? 0))
        errors.push(
          `structure "${s.id}": ${atomName(m, a.id)} is drawn with charge ${signed(a.charge ?? 0)}, but its lone pairs and bonds give ${signed(q.get(a.id)!)}`,
        );
    }
  }
  const first = moleculeOf(start);
  const total = (s: Structure) => s.atoms.reduce((t, a) => t + (a.charge ?? 0), 0);
  for (const r of results) {
    const m = moleculeOf(r);
    const theirs = new Map(m.atoms.map((a) => [a.id, a]));
    const mismatch: string[] = [];
    for (const a of first.atoms) {
      const b = theirs.get(a.id);
      if (!b) mismatch.push(`${a.id} is missing`);
      else if (b.el !== a.el) mismatch.push(`${a.id} is ${a.el} in the start, ${b.el} here`);
      else if (b.h !== a.h) mismatch.push(`${a.id} has ${a.h} H in the start, ${b.h} here`);
    }
    for (const b of m.atoms) if (!first.atoms.some((a) => a.id === b.id)) mismatch.push(`${b.id} is extra`);
    if (mismatch.length) errors.push(`result "${r.id}" must have the start's atoms: ${mismatch.join("; ")}`);
    else if (total(r) !== total(start)) errors.push(`result "${r.id}" must have the start's total charge`);
    const e = electrons(m);
    for (const a of m.atoms) {
      const full = a.el === "H" ? 2 : 8;
      if (e.get(a.id)! > full) errors.push(`result "${r.id}": ${atomName(m, a.id)} has ${e.get(a.id)} e⁻, past its octet`);
    }
  }

  const ids = new Set([...start.atoms.map((a) => a.id), ...start.bonds.map((b) => b.id)]);
  for (const hint of item.hints ?? [])
    for (const id of [...(hint.from ?? []), ...(hint.to ?? [])])
      if (!ids.has(id) && id !== "sigma") errors.push(`a Hint names "${id}", which the start structure doesn't have`);

  if (errors.length === before) {
    const task: ArrowsTask = { start, results, answer: item.answer };
    let state = arrowsStart();
    for (const [i, push] of item.answer.entries()) {
      const label = pushLabel(arrowsView(task, state).molecule, push);
      const next = arrowsAct(task, state, { push });
      if (next.last?.kind !== "accepted") {
        errors.push(`push ${i + 1} (${label}) is not a step toward an accepted result`);
        break;
      }
      state = next;
      if (state.done && i < item.answer.length - 1) {
        errors.push(`the pushes reach a result after push ${i + 1}; drop the rest`);
        break;
      }
    }
    if (errors.length === before && !state.done) errors.push("the pushes end before reaching an accepted result");
  }

  return {
    start: view(start, []),
    ...(!item.hideTarget && { target: view(results[0], []) }),
    results,
  };
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

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
