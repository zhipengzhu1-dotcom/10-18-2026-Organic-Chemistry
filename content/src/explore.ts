// Explore in 3D (#71): resolves a Step's or Problem's `molecule: <data file id>` to the
// molecule's coordinates, bonds and the cited colour and radius of each of its elements.
import { find, geometryQuantities, type Cited, type CitedData } from "./data.ts";
import type { ExploreMolecule } from "./model.ts";

/** The molecule, or why it can't be explored (messages start `molecule "<id>"`). */
export function exploreMolecule(data: CitedData, id: string): { molecule?: ExploreMolecule; errors: string[] } {
  const set = data[id];
  const named = `molecule "${id}"`;
  if (!set) return { errors: [`${named} is not a data file`] };
  if (set.kind !== "molecule" || !set.geometry) return { errors: [`${named} is not a molecule data file`] };
  if (!set.atoms) return { errors: [`${named} has no atoms`] };
  if (!set.bonds?.length) return { errors: [`${named} has no bonds`] };

  const errors: string[] = [];
  const elements: ExploreMolecule["elements"] = {};
  for (const symbol of new Set(set.atoms.list.map((a) => a.element))) {
    const colour = find(data, `elements/${symbol}.colour`);
    const vdwRadius = find(data, `elements/${symbol}.vdw`);
    if (!colour) errors.push(`${named}: no cited colour for ${symbol} (elements/${symbol}.colour)`);
    if (!vdwRadius) errors.push(`${named}: no cited van der Waals radius for ${symbol} (elements/${symbol}.vdw)`);
    if (colour && vdwRadius) elements[symbol] = { colour, vdwRadius };
  }
  if (errors.length) return { errors };

  const geometry = Object.values(set.values).filter((v) => geometryQuantities.includes(v.quantity));
  const styles = Object.values(elements);
  const cited: Cited[] = [...geometry, ...styles.map((e) => e.colour), ...styles.map((e) => e.vdwRadius)];
  return {
    molecule: {
      id,
      title: set.title,
      tier: set.geometry,
      atoms: set.atoms.list,
      bonds: set.bonds,
      elements,
      cited,
      ...(set.notice ? { notice: set.notice } : {}),
    },
    errors,
  };
}
