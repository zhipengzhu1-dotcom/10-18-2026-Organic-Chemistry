// Structure layout: RDKit.js parses a SMILES and computes 2D coordinates; we
// keep only atoms, bonds, charges and coordinates, and add the lone pairs from
// valence. RDKit never draws (the renderer in @astratron/scenes does). Run by
// `pnpm structure` (src/structure-cli.ts); the output is committed as
// `<subject>/structures/<id>.yaml`, so the content build stays synchronous.
import type { MainModule } from "@rdkit/rdkit";
import type { Structure, StructureAtom, StructureBond } from "./model.ts";

export interface LayoutRequest {
  id: string;
  smiles: string;
  /** full = every H an atom (Lewis/Kekulé); line-angle = H's only as part of heteroatom letters. */
  style: Structure["style"];
  source?: string;
}

import { VALENCE } from "./valence.ts";

let rdkit: Promise<MainModule> | undefined;
async function loadRDKit(): Promise<MainModule> {
  // A CommonJS module: under ESM its module.exports (the init function) arrives as `default`.
  const init = ((await import("@rdkit/rdkit")) as unknown as { default: () => Promise<MainModule> }).default;
  return (rdkit ??= init());
}

export async function layoutStructure(req: LayoutRequest): Promise<Structure> {
  const RDKit = await loadRDKit();
  let mol = RDKit.get_mol(req.smiles);
  if (!mol) throw new Error(`${req.id}: RDKit could not parse SMILES "${req.smiles}"`);
  if (req.style !== "line-angle") {
    const withHs = RDKit.get_mol(mol.add_hs());
    mol.delete();
    if (!withHs) throw new Error(`${req.id}: RDKit could not add hydrogens`);
    mol = withHs;
  }
  try {
    mol.set_new_coords();
    const json = JSON.parse(mol.get_json()).molecules[0] as {
      atoms: { chg?: number; impHs?: number }[];
    };
    const { atoms: atomLines, bonds: bondLines } = parseMolblock(mol.get_molblock());

    const hydrogens = new Map<string, number>();
    const atoms: StructureAtom[] = atomLines.map((line, i) => {
      const atom: StructureAtom = { id: `a${i + 1}`, el: line.el, x: round(line.x), y: round(-line.y) };
      const charge = json.atoms[i]?.chg ?? 0;
      const implicitHs = json.atoms[i]?.impHs ?? 0; // commonchem default: 0
      hydrogens.set(atom.id, implicitHs);
      const h = line.el === "C" ? 0 : implicitHs;
      if (charge) atom.charge = charge;
      if (h) atom.h = h;
      return atom;
    });
    const bonds: StructureBond[] = bondLines.map((line, i) => {
      const bond: StructureBond = { id: `b${i + 1}`, a: `a${line.a}`, b: `a${line.b}`, order: line.order };
      if (line.stereo === V2000_STEREO.wedge) bond.stereo = "wedge";
      if (line.stereo === V2000_STEREO.hash) bond.stereo = "hash";
      return bond;
    });

    const bondOrderSum = new Map<string, number>();
    for (const b of bonds)
      for (const end of [b.a, b.b]) bondOrderSum.set(end, (bondOrderSum.get(end) ?? 0) + b.order);
    for (const a of atoms) {
      const valence = VALENCE[a.el];
      if (valence === undefined) continue;
      const used = (a.charge ?? 0) + (bondOrderSum.get(a.id) ?? 0) + (hydrogens.get(a.id) ?? 0);
      const lp = Math.floor((valence - used) / 2);
      if (lp > 0) a.lp = lp;
    }

    const structure: Structure = { id: req.id, style: req.style, smiles: req.smiles, atoms, bonds };
    if (req.source) structure.source = req.source;
    return structure;
  } finally {
    mol.delete();
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000 || 0;

/** V2000 stereo flags: 1 = wedge (up), 6 = hash (down). */
const V2000_STEREO = { wedge: 1, hash: 6 };
/** A V2000 line's fixed-width fields are three characters each; the n-th (0-based) as a number. */
const field = (line: string, n: number) => Number(line.slice(3 * n, 3 * n + 3));
/** The counts line is the fourth; the atom block starts on the fifth. */
const [COUNTS_LINE, FIRST_ATOM_LINE] = [3, 4];

/** Reads the atom and bond blocks of a V2000 molblock (kekulized, with wedge flags). */
function parseMolblock(molblock: string) {
  const lines = molblock.split("\n");
  const counts = lines[COUNTS_LINE];
  const [nAtoms, nBonds] = [field(counts, 0), field(counts, 1)];
  const atomEnd = FIRST_ATOM_LINE + nAtoms;
  const atoms = lines.slice(FIRST_ATOM_LINE, atomEnd).map((l) => {
    const [x, y, , el] = l.trim().split(/\s+/);
    return { x: Number(x), y: Number(y), el };
  });
  const bonds = lines.slice(atomEnd, atomEnd + nBonds).map((l) => {
    const [a, b, order, stereo] = [0, 1, 2, 3].map((n) => field(l, n));
    const known = order === 1 || order === 2 || order === 3;
    if (!known) throw new Error(`unsupported bond order ${order} in molblock`);
    return { a, b, order: order as 1 | 2 | 3, stereo };
  });
  return { atoms, bonds };
}
