// Molecules in Steps: checks a Step's or Problem's `molecule` against the cited data and the
// Subject's named start views (views.yaml), and resolves it to what the 3D viewer draws, for both
// the inline 3D Step card (#68) and Explore in 3D (#71).
import type { z } from "zod";
import { find, geometryQuantities, type CitedData } from "./data.ts";
import type { MoleculeUse } from "./model.ts";
import { viewErrors, viewMatrix, type ViewSpec } from "./molecule.ts";
import type { viewsFile } from "./schema.ts";

/** A Step's `molecule` as written in the Lesson or Problem file. */
export interface MoleculeUseFile {
  id: string;
  card?: boolean;
  view?: string;
  describe?: string;
}
export type Views = z.infer<typeof viewsFile>;

/**
 * The start view when a Step names none: the file's axes turned 15° about x and 70° about y.
 * CCCBDB lays planar molecules in the yz plane, which would face the screen edge-on (#71).
 */
export const DEFAULT_VIEW: ViewSpec = { rotate: [15, 70, 0] };

/** Messages for every view in views.yaml whose molecule is missing or whose atoms don't build it. */
export function checkViews(views: Views, data: CitedData): string[] {
  const errors: string[] = [];
  for (const [molecule, named] of Object.entries(views)) {
    const atoms = data[molecule]?.atoms?.list;
    if (!atoms) {
      errors.push(`"${molecule}" is not a molecule in the cited data`);
      continue;
    }
    for (const [name, spec] of Object.entries(named))
      for (const message of viewErrors(atoms, spec as ViewSpec)) errors.push(`${molecule} view "${name}": ${message}`);
  }
  return errors;
}

/**
 * The molecule resolved for the 3D viewer, or the reasons it can't be (messages start
 * `molecule "<id>"`). `card` forces the inline card (Rotate-and-identify).
 */
export function resolveMoleculeUse(
  use: MoleculeUseFile,
  data: CitedData,
  views: Views,
  card = false,
): { molecule?: MoleculeUse; errors: string[] } {
  const set = data[use.id];
  const named = `molecule "${use.id}"`;
  if (!set) return { errors: [`${named} is not a data file`] };
  if (set.kind !== "molecule" || !set.geometry) return { errors: [`${named} is not a molecule data file`] };
  if (!set.atoms) return { errors: [`${named} has no atoms`] };
  if (!set.bonds?.length) return { errors: [`${named} has no bonds`] };
  const atoms = set.atoms.list;
  const spec = use.view === undefined ? DEFAULT_VIEW : views[use.id]?.[use.view];
  if (!spec) return { errors: [`${named} has no view "${use.view}" in views.yaml`] };
  // A broken view is reported once, at views.yaml.
  if (viewErrors(atoms, spec as ViewSpec).length) return { errors: [] };

  const errors: string[] = [];
  const styles: { colour: NonNullable<ReturnType<typeof find>>; vdw: NonNullable<ReturnType<typeof find>> }[] = [];
  const elements: MoleculeUse["elements"] = {};
  for (const symbol of new Set(atoms.map((a) => a.element))) {
    const colour = find(data, `elements/${symbol}.colour`);
    const vdw = find(data, `elements/${symbol}.vdw`);
    if (!colour) errors.push(`${named}: no cited colour for ${symbol} (elements/${symbol}.colour)`);
    if (!vdw) errors.push(`${named}: no cited van der Waals radius for ${symbol} (elements/${symbol}.vdw)`);
    if (!colour || !vdw) continue;
    styles.push({ colour, vdw });
    elements[symbol] = { colour: String(colour.value), vdw: Number(vdw.value) };
  }
  if (errors.length) return { errors };

  const geometry = Object.values(set.values).filter((v) => geometryQuantities.includes(v.quantity));
  return {
    molecule: {
      id: use.id,
      title: set.title,
      tier: set.geometry,
      atoms,
      bonds: set.bonds,
      ...(use.view ? { view: use.view } : {}),
      orientation: viewMatrix(atoms, spec as ViewSpec),
      elements,
      cited: [...geometry, ...styles.map((s) => s.colour), ...styles.map((s) => s.vdw)],
      ...(set.notice ? { notice: set.notice } : {}),
      card: card || !!use.card,
      ...(use.describe ? { describe: use.describe } : {}),
    },
    errors,
  };
}
