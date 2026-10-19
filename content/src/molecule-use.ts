// Molecules in Steps: checks a Step's or Problem's `molecule` against the cited data and the
// Subject's named start views (views.yaml), and resolves it to what the 3D viewer draws, for both
// the inline 3D Step card (#68) and Explore in 3D (#71).
import type { z } from "zod";
import { find, geometryQuantities, type Cited, type CitedData } from "./data.ts";
import type { MoleculeUse, OrbitalUse } from "./model.ts";
import { blindMesh, bondDipoles, netDipole, viewErrors, viewMatrix, type ViewSpec } from "./molecule.ts";
import type { viewsFile } from "./schema.ts";

/** A Step's `molecule` as written in the Lesson or Problem file. */
export interface MoleculeUseFile {
  id: string;
  card?: boolean;
  view?: string;
  describe?: string;
  orbitals?: string[];
  label?: string;
  labels?: Record<string, string>;
  pageSheet?: [number, number, number];
  dipoles?: boolean;
  /** Lesson 8 (#86): `hide` names each orbital only by its molecule's `label` (A, B…), for "which one is σ*?" Steps. */
  orbitalLabels?: "hide";
  /** Lesson 8 (#86): false switches tap-measuring off on the card (and on every molecule of its toggle). */
  measure?: false;
  toggle?: Omit<MoleculeUseFile, "toggle" | "orbitalLabels" | "measure">[];
}
export type Views = z.infer<typeof viewsFile>;

/** The cited table bond-dipole arrows are sized from (Lesson 1's Pauling values). */
export const ELECTRONEGATIVITY_TABLE = "electronegativity-pauling";

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
  const named = `molecule "${use.id}"`;
  if (use.toggle && (!use.label || use.toggle.some((t) => !t.label)))
    return { errors: [`${named}: a toggle needs a label on every molecule`] };
  if (use.orbitalLabels === "hide" && !use.label)
    return { errors: [`${named}: orbitalLabels: hide names each orbital by its molecule's label (A, B…); add a label`] };
  const shared = { blind: use.orbitalLabels === "hide", measure: use.measure };
  const main = resolveOne(use, data, views, card, shared);
  if (!main.molecule || !use.toggle) return main;
  const others = use.toggle.map((t) => resolveOne(t, data, views, true, shared));
  const errors = others.flatMap((o) => o.errors);
  if (errors.length) return { errors };
  return { molecule: { ...main.molecule, card: true, toggle: others.map((o) => o.molecule!) }, errors: [] };
}

/** What every molecule of one card shares: orbitals named only by letter, and measuring on or off. */
interface Shared {
  blind: boolean;
  measure?: false;
}

function resolveOne(
  use: Omit<MoleculeUseFile, "toggle">,
  data: CitedData,
  views: Views,
  card: boolean,
  shared: Shared = { blind: false },
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
  const last = atoms.length - 1;
  const outside = (field: string, list: number[]) => {
    for (const i of list) if (!Number.isInteger(i) || i < 0 || i > last) errors.push(`${named}: ${field}: atom ${i} is not in the molecule (0–${last})`);
  };
  if (use.labels) outside("labels", Object.keys(use.labels).map(Number));
  if (use.pageSheet) {
    outside("pageSheet", use.pageSheet);
    if (!errors.length)
      for (const message of viewErrors(atoms, { plane: use.pageSheet })) errors.push(`${named}: pageSheet: ${message.replace(/^plane: /, "")}`);
  }

  const styles: { colour: Cited; vdw: Cited }[] = [];
  const elements: MoleculeUse["elements"] = {};
  const symbols = [...new Set(atoms.map((a) => a.element))];
  for (const symbol of symbols) {
    const colour = find(data, `elements/${symbol}.colour`);
    const vdw = find(data, `elements/${symbol}.vdw`);
    if (!colour) errors.push(`${named}: no cited colour for ${symbol} (elements/${symbol}.colour)`);
    if (!vdw) errors.push(`${named}: no cited van der Waals radius for ${symbol} (elements/${symbol}.vdw)`);
    if (!colour || !vdw) continue;
    styles.push({ colour, vdw });
    elements[symbol] = { colour: String(colour.value), vdw: Number(vdw.value) };
  }
  const electronegativities: Cited[] = [];
  if (use.dipoles)
    for (const symbol of symbols) {
      const ref = `${ELECTRONEGATIVITY_TABLE}/${symbol}`;
      const value = find(data, ref);
      if (value) electronegativities.push(value);
      else errors.push(`${named}: no cited electronegativity for ${symbol} (${ref})`);
    }
  if (errors.length) return { errors };

  const resolved = resolveOrbitals(use, data, card || !!use.card, shared.blind);
  if (resolved.errors.length) return { errors: resolved.errors.map((m) => `${named}: ${m}`) };

  const geometry = Object.values(set.values).filter((v) => geometryQuantities.includes(v.quantity));
  const molecule = { title: set.title, atoms, bonds: set.bonds };
  const dipoles = () => {
    const en = Object.fromEntries(symbols.map((s, i) => [s, Number(electronegativities[i].value)]));
    const arrows = bondDipoles(molecule, en);
    return { arrows, net: netDipole(molecule, arrows) };
  };
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
      cited: [...geometry, ...styles.map((s) => s.colour), ...styles.map((s) => s.vdw), ...electronegativities, ...resolved.cited],
      ...(set.notice ? { notice: set.notice } : {}),
      card: card || !!use.card,
      ...(use.describe ? { describe: use.describe } : {}),
      ...(resolved.orbitals.length ? { orbitals: resolved.orbitals } : {}),
      ...(use.label ? { label: use.label } : {}),
      ...(use.labels ? { labels: Object.fromEntries(Object.entries(use.labels).map(([k, v]) => [Number(k), v])) } : {}),
      ...(use.pageSheet ? { pageSheet: use.pageSheet } : {}),
      ...(use.dipoles ? { dipoles: dipoles() } : {}),
      ...(shared.blind ? { orbitalLabels: "hide" as const } : {}),
      ...(shared.measure === false ? { measure: false as const } : {}),
    },
    errors,
  };
}

/**
 * A Step's `orbitals` (#70): each `<orbital data file>/<orbital id>` must be computed on the
 * Step's molecule file (so the lobes sit on these very atoms) and shown on the inline card.
 * `cited` is what the Source note adds: each set's isovalue, then the energies shown.
 */
function resolveOrbitals(
  use: Omit<MoleculeUseFile, "toggle">,
  data: CitedData,
  card: boolean,
  blind = false,
): { orbitals: OrbitalUse[]; cited: Cited[]; errors: string[] } {
  const orbitals: OrbitalUse[] = [];
  const cited: Cited[] = [];
  const errors: string[] = [];
  if (!use.orbitals?.length) return { orbitals, cited, errors };
  if (!card) return { orbitals, cited, errors: ["orbitals show only on the inline card (card: true)"] };
  const add = (c: Cited | undefined) => c && !cited.some((x) => x.ref === c.ref) && cited.push(c);
  for (const ref of use.orbitals) {
    const [fid, oid] = ref.split("/");
    const set = data[fid]?.orbitals;
    if (!set) {
      errors.push(`"${fid}" is not an orbital data file`);
      continue;
    }
    if (set.molecule !== use.id) {
      errors.push(`orbitals "${fid}" were computed on "${set.molecule}", so they don't sit on these atoms`);
      continue;
    }
    const entry = set.list[oid];
    if (!entry) {
      errors.push(`no orbital "${ref}"`);
      continue;
    }
    add(data[fid].values[set.iso]);
    if (blind) {
      // Named only by its molecule's letter: no orbital name, energy or file name reaches the page, so
      // "which one is σ*?" can't be read from the page source. The mesh is served by its hash (site/src/pages/orbitals/m).
      const letter = use.label!;
      orbitals.push({ ref: letter, label: `orbital ${letter}`, chip: letter, style: entry.style, mesh: blindMesh(entry.sha256), lobes: entry.lobes });
      continue;
    }
    const energy = entry.energy ? data[fid].values[entry.energy] : undefined;
    add(energy);
    orbitals.push({
      ref,
      label: entry.label,
      chip: entry.chip,
      style: entry.style,
      ...(entry.density ? { density: true } : {}),
      mesh: entry.mesh,
      lobes: entry.lobes,
      ...(energy ? { energy } : {}),
    });
  }
  // Energies first (the numbers a Student reads), then the isovalue.
  cited.sort((a, b) => Number(b.quantity === "energy") - Number(a.quantity === "energy"));
  return { orbitals, cited, errors };
}
