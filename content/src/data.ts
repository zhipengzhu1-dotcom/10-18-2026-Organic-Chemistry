// The cited-data lookup (ADR 0002): the one way a chemistry number reaches a
// Scene, Problem, Step or viewer. Every value comes back with its citation and
// licence, and Source notes are generated from what the lookup returned.
//
// Pure and dependency-free so browser islands can import it
// ("@astratron/content/data"). Loading and validating the data files is
// data-load.ts's job, at build time.

export type Tier = "experimental" | "computed";
export type SourceKind = Tier | "reference";
export type Quantity = "bond-length" | "angle" | "dihedral" | "radius" | "colour" | "energy" | "pka" | "count" | "electronegativity";

/** Quantities that make up a molecule's geometry; a molecule never mixes tiers across them. */
export const geometryQuantities: readonly Quantity[] = ["bond-length", "angle", "dihedral"];

export interface Method {
  program: string;
  version: string;
  /** Level of theory, e.g. "B3LYP/cc-pVTZ". */
  level: string;
  /** When the calculation ran (YYYY-MM-DD). */
  date: string;
  /** Largest bond-length deviation from experiment over the validation set, in Å, once measured. */
  maxDeviation?: number;
}

export interface Source {
  id: string;
  /** experimental (measured), computed (our calculation) or reference (a standard table). */
  kind: SourceKind;
  /** One line a Student can follow to the source, ending in its DOI or URL. */
  citation: string;
  licence: string;
  /** The database the value was taken from, e.g. NIST CCCBDB for a paper's value. */
  via?: Source;
  /** Computed sources: how the number was calculated. */
  method?: Method;
}

export interface Cited {
  /** `<data file id>/<value key>`, e.g. "methane/r.CH". */
  ref: string;
  /** Short name shown in the Source note, e.g. "C–H". */
  label: string;
  quantity: Quantity;
  value: number | string;
  unit?: string;
  source: Source;
  licence: string;
  /** For a molecule's values: its geometry tier. */
  tier?: Tier;
  /** What a Student sees: bond lengths and radii to 2 decimals in Å, angles to 1 decimal, electronegativities to 2 decimals. */
  display: string;
  /** The full stored value with its unit, for the Source note. */
  full: string;
  /** Geometry values: the 0-based atom indices measured (so a viewer can highlight the cited bond or angle). */
  atoms?: number[];
  /** The source's own remark on the value, e.g. "re" or "from symmetry". */
  note?: string;
}

export interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface DataSet {
  id: string;
  title: string;
  kind: "molecule" | "table";
  /** Molecules only: where every geometry value and the coordinates come from. */
  geometry?: Tier;
  values: Record<string, Cited>;
  /** Molecules only: Cartesian coordinates in Å, from one source of the molecule's tier. */
  atoms?: { source: Source; list: Atom[] };
  /** Molecules: bonds between atom indices (0-based), with bond order 1–3. */
  bonds?: Bond[];
  /** Licence notice for third-party data, e.g. the NIST acknowledgement on CCCBDB-derived geometry. */
  notice?: string;
}

export interface Bond {
  a: number;
  b: number;
  order: 1 | 2 | 3;
}

/** Every data file of one Subject, by id. */
export type CitedData = Record<string, DataSet>;

/** Looks up one value by `<data file id>/<value key>`. Throws if it isn't in the data. */
export function cite(data: CitedData, ref: string): Cited {
  const value = find(data, ref);
  if (!value) throw new Error(`No cited value "${ref}"`);
  return value;
}

/**
 * How a viewer draws an element: colour and van der Waals radius from the
 * cited "elements" table (`<symbol>.colour`, `<symbol>.vdw`). Viewers use
 * these instead of their library's defaults. Throws if either is missing.
 */
export function elementStyle(data: CitedData, symbol: string): { colour: Cited; vdwRadius: Cited } {
  return { colour: cite(data, `elements/${symbol}.colour`), vdwRadius: cite(data, `elements/${symbol}.vdw`) };
}

export function find(data: CitedData, ref: string): Cited | undefined {
  const slash = ref.indexOf("/");
  if (slash < 0) return undefined;
  return data[ref.slice(0, slash)]?.values[ref.slice(slash + 1)];
}

const token = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/**
 * Replaces every `{{<file>/<key>}}` in the text fields of a Lesson Step or
 * Problem with the value's display string. Returns the cited values (in
 * first-use order) and any refs that aren't in the data.
 */
export function citeIn<T>(item: T, data: CitedData): { item: T; cited: Cited[]; missing: string[] } {
  const cited: Cited[] = [];
  const missing: string[] = [];
  const walk = (v: unknown): unknown => {
    if (typeof v === "string")
      return v.replace(token, (whole, ref: string) => {
        const c = find(data, ref);
        if (!c) {
          if (!missing.includes(ref)) missing.push(ref);
          return whole;
        }
        if (!cited.includes(c)) cited.push(c);
        return c.display;
      });
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { item: walk(item) as T, cited, missing };
}

export interface SourceNoteParagraph {
  /** Bold opening, e.g. "Geometry: computed, not measured." */
  lead?: string;
  text: string;
}

/**
 * The Source note for a set of looked-up values: one paragraph per data file
 * (in first-use order), naming every value at full precision and where it
 * came from. Geometry paragraphs open with their tier, worded as in
 * research/cccbdb-geometry.md §4.
 */
export function sourceNote(values: Cited[]): SourceNoteParagraph[] {
  const byFile = new Map<string, Cited[]>();
  for (const v of values) {
    const file = v.ref.slice(0, v.ref.indexOf("/"));
    const list = byFile.get(file) ?? byFile.set(file, []).get(file)!;
    if (!list.some((c) => c.ref === v.ref)) list.push(v);
  }

  const paragraphs: SourceNoteParagraph[] = [];
  for (const list of byFile.values()) {
    const geometry = list.filter((v) => v.tier && geometryQuantities.includes(v.quantity));
    const other = list.filter((v) => !geometry.includes(v));
    if (geometry.length) paragraphs.push(geometryParagraph(geometry));
    if (other.length) paragraphs.push({ text: clauses(other) });
  }
  return paragraphs;
}

function geometryParagraph(values: Cited[]): SourceNoteParagraph {
  if (values[0].tier === "experimental")
    return {
      lead: "Geometry: experimental (gas phase).",
      text: `${clauses(values)} Other distances are calculated from these values.`,
    };
  const sentences = bySource(values).map(([source, vs]) => {
    const m = source.method;
    if (!m) return `${named(vs)} from ${source.citation}.`;
    const error =
      m.maxDeviation === undefined
        ? ""
        : ` For molecules with experimental structures, this method's bond lengths differ from experiment by up to ${m.maxDeviation} Å.`;
    return `${named(vs)} optimised at ${m.level} with ${m.program} ${m.version} (our calculation, ${m.date}), isolated molecule in the gas phase.${error}`;
  });
  return { lead: "Geometry: computed, not measured.", text: sentences.join(" ") };
}

/** "A 1 Å and B 2° from <citation>, via <database>." per source. */
function clauses(values: Cited[]): string {
  return bySource(values)
    .map(([source, vs]) => `${named(vs)} from ${source.citation}${source.via ? `, via ${source.via.citation}` : ""}.`)
    .join(" ");
}

function bySource(values: Cited[]): [Source, Cited[]][] {
  const groups = new Map<Source, Cited[]>();
  for (const v of values) (groups.get(v.source) ?? groups.set(v.source, []).get(v.source)!).push(v);
  return [...groups];
}

function named(values: Cited[]): string {
  const parts = values.map((v) => `${v.label} ${v.full}`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** The display and full strings for a value; used when the data is loaded. */
export function format(quantity: Quantity, value: number | string, unit?: string): { display: string; full: string } {
  const withUnit = (v: string) => (!unit ? v : unit === "°" ? `${v}°` : `${v} ${unit}`);
  if (typeof value === "string") return { display: withUnit(value), full: withUnit(value) };
  const decimals =
    quantity === "bond-length" || quantity === "radius" || quantity === "electronegativity" ? 2 : quantity === "angle" || quantity === "dihedral" ? 1 : undefined;
  return { display: withUnit(decimals === undefined ? String(value) : value.toFixed(decimals)), full: withUnit(String(value)) };
}
