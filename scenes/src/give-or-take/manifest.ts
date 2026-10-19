// give-or-take (Lesson 0 s03, the signature Step): one atom at a time from Li to F, each
// with its outer electrons as dots. Two routes to a full shell: Give (lose every outer
// electron; the bar is the sum of its ionization energies) and Take (gain 8 − outer; the
// first electron's affinity, where the anion is bound, is a separate dashed "released" bar,
// never a cost beside Give; every further electron is flagged "a lone atom won't hold this
// one"). A counter shows the electrons to move the cheaper way. Every energy and every outer
// electron count comes from the cited data (NIST ASD; Andersen, Haugen & Hotop 1999).
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";
import { OUTER } from "../dots/outer.ts";

export type GiveOrTakeState = { atom: string };

export const ATOMS = ["Li", "Be", "B", "C", "N", "O", "F"] as const;
const NAMES: Record<string, string> = { Li: "Lithium", Be: "Beryllium", B: "Boron", C: "Carbon", N: "Nitrogen", O: "Oxygen", F: "Fluorine" };
/** Atoms whose singly charged anion is bound (Andersen, Haugen & Hotop 1999, Table 3). */
const BOUND = ["Li", "B", "C", "O", "F"];
/** A full outer shell in this row: the octet (a count, the rule this Lesson teaches). */
export const OCTET = 2 * OUTER.C;

const ie = (atom: string, key: string) => `ionization-li-f/${atom}.${key}`;
const ea = (atom: string) => `electron-affinity-li-f/${atom}`;

export interface Routes {
  name: string;
  outer: number;
  give: { count: number; energy?: Cited };
  take: { count: number; released?: Cited };
  /** Electrons to move the cheaper way. */
  move: number;
}

/** Both routes for one atom, from its cited values (outer-electron counts fall back to the periodic table without them). */
export function routes(atom: string, cited: Record<string, Cited> = {}): Routes {
  const outer = Number(cited[ie(atom, "valence")]?.value ?? OUTER[atom] ?? 0);
  const take = OCTET - outer;
  return {
    name: NAMES[atom],
    outer,
    give: { count: outer, energy: cited[ie(atom, "give")] },
    take: { count: take, released: cited[ea(atom)] },
    move: Math.min(outer, take),
  };
}

/** "148.0 eV" → "148.0": the number of a cited energy as displayed. */
export const number = (c: Cited | undefined) => c?.display.replace(/\s*eV$/, "");

function describe({ atom }: GiveOrTakeState, cited?: Record<string, Cited>): string {
  const r = routes(atom, cited);
  const cost = r.give.energy ? `, costing ${number(r.give.energy)} electron-volts` : "";
  const takeLine = r.take.released
    ? `the first one releases ${number(r.take.released)} electron-volts, and a lone atom won't hold more`
    : BOUND.includes(atom)
      ? "the first one is held, and a lone atom won't hold more"
      : "a lone atom won't hold even one";
  return `${r.name}: ${r.outer} outer electrons. Give ${r.give.count}${cost}, or take ${r.take.count}: ${takeLine}. Electrons to move, cheaper way: ${r.move}.`;
}

export const giveOrTake: SceneManifest<GiveOrTakeState> = {
  id: "give-or-take",
  title: "Give or take",
  states: {
    atom: { kind: "choice", label: "Atom", options: ATOMS.map((id) => ({ id, label: `${id}, ${NAMES[id].toLowerCase()}` })), default: "Li" },
  },
  describe: (state, _t, cited) => describe(state, cited),
  reducedMotion: "Opens paused on the poster frame; each slider stop redraws the bars at once, with no growing bars.",
  data: [
    ...ATOMS.flatMap((atom) => [ie(atom, "valence"), ie(atom, "give")]),
    ...ATOMS.filter((atom) => BOUND.includes(atom)).map(ea),
  ],
  duration: 1.2,
  poster: { t: 1.2 },
  video: {
    duration: 12,
    timeline: ATOMS.map((atom, i) => ({ at: i * 1.5, state: { atom } })).concat([{ at: 11, state: { atom: "C" } }]),
    poster: 11.5,
    aspects: ["16:9", "9:16"],
  },
};
