// Cited data files (ADR 0002): schema and the checks the build runs on them.
// One file per molecule or table under <subject>/data/, written by hand or by
// pipelines/ (YAML or JSON). Each value names its source; each source carries
// its citation and licence.
import { z } from "zod";
import { format, geometryQuantities, type CitedData, type DataSet, type Source } from "./data.ts";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes");
const key = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "must be letters, digits, dots, dashes or underscores");
const text = z.string().min(1);

const method = z.strictObject({
  program: text,
  version: text,
  level: text,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  maxDeviation: z.number().positive().optional(),
});

const source = z.strictObject({
  kind: z.enum(["experimental", "computed", "reference"]),
  citation: text,
  licence: text,
  /** Id of another source in this file that the value was taken from (e.g. NIST CCCBDB). */
  via: key.optional(),
  method: method.optional(),
});

const value = z.strictObject({
  label: text,
  quantity: z.enum(["bond-length", "angle", "dihedral", "radius", "colour", "energy", "pka", "count"]),
  value: z.union([z.number(), z.string().min(1)]),
  unit: text.optional(),
  source: key,
});

const atom = z.tuple([z.string().regex(/^[A-Z][a-z]?$/, "must be an element symbol"), z.number(), z.number(), z.number()]);

export const dataFile = z.strictObject({
  id,
  kind: z.enum(["molecule", "table"]),
  title: text,
  geometry: z.enum(["experimental", "computed"]).optional(),
  sources: z.record(key, source),
  values: z.record(key, value),
  atoms: z.strictObject({ source: key, list: z.array(atom).min(1) }).optional(),
});

export type DataFile = z.infer<typeof dataFile>;

const units: Partial<Record<DataFile["values"][string]["quantity"], string[]>> = {
  "bond-length": ["Å"],
  radius: ["Å"],
  angle: ["°"],
  dihedral: ["°"],
  energy: ["eV", "kJ/mol", "kcal/mol"],
};

/** Resolves one data file into a DataSet; `errors` lists every broken rule (messages without the file name). */
export function resolveDataFile(file: DataFile): { set: DataSet; errors: string[] } {
  const errors: string[] = [];

  const sources = new Map<string, Source>();
  const sourceOf = (sid: string): Source | undefined => {
    if (sources.has(sid)) return sources.get(sid);
    const raw = file.sources[sid];
    if (!raw) return undefined;
    const { via, ...rest } = raw;
    const resolved: Source = { id: sid, ...rest, via: undefined };
    sources.set(sid, resolved);
    if (via) {
      resolved.via = via === sid ? undefined : sourceOf(via);
      if (!resolved.via) errors.push(`sources.${sid}.via: "${via}" is not another source in this file`);
    }
    if (!resolved.via) delete resolved.via;
    return resolved;
  };
  for (const sid of Object.keys(file.sources)) sourceOf(sid);

  if (file.kind === "molecule" && !file.geometry) errors.push(`geometry: a molecule must say experimental or computed`);
  if (file.kind === "table" && (file.geometry || file.atoms)) errors.push(`a table has no geometry or atoms`);

  const mixes = (where: string, src: Source) => {
    if (file.geometry && src.kind !== file.geometry)
      errors.push(
        `${where}: ${src.kind} source "${src.id}" in ${file.geometry === "experimental" ? "an" : "a"} ${file.geometry} molecule; one molecule never mixes experimental and computed geometry`,
      );
  };

  const set: DataSet = { id: file.id, title: file.title, kind: file.kind, values: {} };
  if (file.geometry) set.geometry = file.geometry;

  for (const [k, v] of Object.entries(file.values)) {
    const src = sources.get(v.source);
    if (!src) {
      errors.push(`values.${k}.source: "${v.source}" is not a source in this file`);
      continue;
    }
    const allowed = units[v.quantity];
    if (allowed && !allowed.includes(v.unit ?? "")) {
      errors.push(`values.${k}.unit: a ${v.quantity} needs one of ${allowed.join(", ")}; found ${v.unit ?? "none"}`);
      continue;
    }
    if (v.quantity === "count" && !(typeof v.value === "number" && Number.isInteger(v.value) && v.unit === undefined)) {
      errors.push(`values.${k}.value: a count must be a whole number`);
      continue;
    }
    if (geometryQuantities.includes(v.quantity)) mixes(`values.${k}`, src);
    set.values[k] = {
      ref: `${file.id}/${k}`,
      label: v.label,
      quantity: v.quantity,
      value: v.value,
      ...(v.unit ? { unit: v.unit } : {}),
      source: src,
      licence: src.licence,
      ...(file.geometry ? { tier: file.geometry } : {}),
      ...format(v.quantity, v.value, v.unit),
    };
  }

  if (file.atoms) {
    const src = sources.get(file.atoms.source);
    if (!src) errors.push(`atoms.source: "${file.atoms.source}" is not a source in this file`);
    else {
      mixes("atoms", src);
      set.atoms = { source: src, list: file.atoms.list.map(([element, x, y, z]) => ({ element, x, y, z })) };
    }
  }

  return { set, errors };
}

export type { CitedData };
