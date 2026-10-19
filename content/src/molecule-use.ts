// 3D molecules in Steps (#68): checks a Step's `molecule` against the cited data and the
// Subject's named start views (views.yaml), and resolves it to what the 3D Step card draws.
import type { z } from "zod";
import { find, type Cited, type CitedData } from "./data.ts";
import type { MoleculeUse } from "./model.ts";
import { viewErrors, viewMatrix, type ViewSpec } from "./molecule.ts";
import type { viewsFile } from "./schema.ts";

/** A Step's `molecule` as written in the Lesson or Problem file. */
export interface MoleculeUseFile {
  id: string;
  view?: string;
  describe?: string;
}
export type Views = z.infer<typeof viewsFile>;

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
 * The molecule resolved for the 3D card, with the Cited values its Source note needs (the
 * molecule's geometry values, then each element's colour and radius); or the reasons it can't be.
 */
export function resolveMoleculeUse(
  use: MoleculeUseFile,
  data: CitedData,
  views: Views,
): { molecule?: MoleculeUse; cited: Cited[]; errors: string[] } {
  const set = data[use.id];
  if (!set) return { cited: [], errors: [`molecule "${use.id}" is not in the cited data`] };
  if (!set.atoms || !set.bonds) return { cited: [], errors: [`"${use.id}" has no atoms to show in 3D`] };
  const atoms = set.atoms.list;
  const spec = use.view === undefined ? {} : views[use.id]?.[use.view];
  if (!spec) return { cited: [], errors: [`${use.id} has no view "${use.view}" in views.yaml`] };
  const broken = viewErrors(atoms, spec as ViewSpec);
  // A broken view is reported once, at views.yaml.
  if (broken.length) return { cited: [], errors: [] };

  const errors: string[] = [];
  const cited = Object.values(set.values);
  const elements: MoleculeUse["elements"] = {};
  for (const symbol of [...new Set(atoms.map((a) => a.element))].sort()) {
    const [colour, vdw] = [`elements/${symbol}.colour`, `elements/${symbol}.vdw`].map((ref) => {
      const value = find(data, ref);
      if (!value) errors.push(`molecule "${use.id}" needs "${ref}" in the cited data`);
      return value;
    });
    if (!colour || !vdw) continue;
    cited.push(colour, vdw);
    elements[symbol] = { colour: String(colour.value), vdw: Number(vdw.value) };
  }
  if (errors.length) return { cited: [], errors };
  return {
    molecule: {
      id: use.id,
      title: set.title,
      atoms,
      bonds: set.bonds,
      ...(use.view ? { view: use.view } : {}),
      orientation: viewMatrix(atoms, spec as ViewSpec),
      elements,
      ...(use.describe ? { describe: use.describe } : {}),
    },
    cited,
    errors,
  };
}
