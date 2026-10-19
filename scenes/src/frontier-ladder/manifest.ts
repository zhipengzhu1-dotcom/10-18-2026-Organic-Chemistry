// frontier-ladder (Lesson 8 s07 reveal, s10): one energy ladder per molecule, side by side on one
// shared axis, each with its HOMO (filled, two half-arrows) and LUMO (empty), drawn to scale from
// the computed energies and labelled with them; each molecule's gap as a bracket. With `flow` set,
// a curved arrow runs from one molecule's HOMO to the other's LUMO, its bracket labelled with that
// difference; with `both`, the smaller gap is solid and the larger dashed. Every number is cited
// (pipelines/orbitals, B3LYP/cc-pVTZ).
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";

export type FrontierLadderState = { molecules: string; flow: string; ring: string };

interface Molecule {
  key: string;
  formula: string;
  name: string;
  file: string;
}
const ETHANE: Molecule = { key: "ethane", formula: "C₂H₆", name: "Ethane", file: "ethane-b3lyp-orbitals" };
const ETHYLENE: Molecule = { key: "ethylene", formula: "C₂H₄", name: "Ethylene", file: "ethylene-b3lyp-orbitals" };
const NH3: Molecule = { key: "nh3", formula: "NH₃", name: "Ammonia", file: "ammonia-b3lyp-orbitals" };
const BF3: Molecule = { key: "bf3", formula: "BF₃", name: "Boron trifluoride", file: "boron-trifluoride-b3lyp-orbitals" };

export const PAIRS: Record<string, [Molecule, Molecule]> = { "ethane-ethylene": [ETHANE, ETHYLENE], "nh3-bf3": [NH3, BF3] };
/** The NH₃/BF₃ flows: from whose HOMO to whose LUMO, and the cited difference. */
export const FLOWS = {
  "nh3-bf3": { from: 0, to: 1, ref: "frontier-flow/nh3_bf3" },
  "bf3-nh3": { from: 1, to: 0, ref: "frontier-flow/bf3_nh3" },
} as const;

const value = (cited: Record<string, Cited>, ref: string) => Number(cited[ref]?.value ?? 0);
/** "−7.6 eV" → "−7.6": a cited energy as the screen reader hears it after "electron-volts" is said once. */
export const bare = (c: Cited | undefined) => (c ? c.display.replace(/\s*eV$/, "") : "");

export interface Rung {
  energy: Cited | undefined;
  y: number;
}
export interface Ladder {
  molecule: Molecule;
  homo: Rung;
  lumo: Rung;
  gap: Cited | undefined;
}

/** Both ladders of a pair on one axis: `top` (frame y) is the highest level shown, `bottom` the lowest. */
export function ladders(pair: string, cited: Record<string, Cited>, span: { top: number; bottom: number }): Ladder[] {
  const ms = PAIRS[pair] ?? PAIRS["ethane-ethylene"];
  const all = ms.flatMap((m) => [value(cited, `${m.file}/homo`), value(cited, `${m.file}/lumo`)]);
  const hi = Math.max(...all);
  const lo = Math.min(...all);
  const y = (e: number) => (hi === lo ? (span.top + span.bottom) / 2 : span.top + ((hi - e) / (hi - lo)) * (span.bottom - span.top));
  return ms.map((m) => ({
    molecule: m,
    homo: { energy: cited[`${m.file}/homo`], y: y(value(cited, `${m.file}/homo`)) },
    lumo: { energy: cited[`${m.file}/lumo`], y: y(value(cited, `${m.file}/lumo`)) },
    gap: cited[`${m.file}/gap`],
  }));
}

function describe({ molecules }: FrontierLadderState, cited: Record<string, Cited>): string {
  const e = (m: Molecule, k: string) => bare(cited[`${m.file}/${k}`]);
  if (molecules === "nh3-bf3")
    return (
      `Two energy ladders, computed. Ammonia: HOMO ${e(NH3, "homo")}, LUMO ${e(NH3, "lumo")} electron-volts. ` +
      `Boron trifluoride: HOMO ${e(BF3, "homo")}, LUMO ${e(BF3, "lumo")}. ` +
      `From ammonia's HOMO up to boron trifluoride's LUMO: ${bare(cited[FLOWS["nh3-bf3"].ref])}. ` +
      `From boron trifluoride's HOMO up to ammonia's LUMO: ${bare(cited[FLOWS["bf3-nh3"].ref])}.`
    );
  return (
    `Two energy ladders, computed. Ethane: HOMO ${e(ETHANE, "homo")}, LUMO ${e(ETHANE, "lumo")} electron-volts, gap ${e(ETHANE, "gap")}. ` +
    `Ethylene: HOMO ${e(ETHYLENE, "homo")}, LUMO ${e(ETHYLENE, "lumo")}, gap ${e(ETHYLENE, "gap")}. Ethylene's HOMO is higher and its gap smaller.`
  );
}

export const frontierLadder: SceneManifest<FrontierLadderState> = {
  id: "frontier-ladder",
  title: "Frontier orbital ladders",
  states: {
    molecules: {
      kind: "choice",
      label: "Molecules",
      options: [
        { id: "ethane-ethylene", label: "Ethane and ethylene" },
        { id: "nh3-bf3", label: "NH₃ and BF₃" },
      ],
      default: "ethane-ethylene",
    },
    flow: {
      kind: "choice",
      label: "Flow",
      options: [
        { id: "none", label: "None" },
        { id: "nh3-bf3", label: "NH₃ → BF₃" },
        { id: "bf3-nh3", label: "BF₃ → NH₃" },
        { id: "both", label: "Both" },
      ],
      default: "none",
    },
    ring: {
      kind: "choice",
      label: "Ring",
      options: [
        { id: "none", label: "None" },
        { id: "ethylene-homo", label: "Ethylene's HOMO" },
      ],
      default: "none",
    },
  },
  describe: (state, _t, cited) => describe(state, cited),
  reducedMotion: "Opens paused on the poster frame; the ladders are static and the flow arrows are drawn at once.",
  data: [ETHANE, ETHYLENE, NH3, BF3].flatMap((m) => ["homo", "lumo", "gap"].map((k) => `${m.file}/${k}`)).concat([FLOWS["nh3-bf3"].ref, FLOWS["bf3-nh3"].ref]),
  duration: 1,
  controls: false,
  poster: { t: 1 },
  video: {
    duration: 10,
    timeline: [
      { at: 0, state: { molecules: "ethane-ethylene", flow: "none", ring: "none" } },
      { at: 2, state: { ring: "ethylene-homo" } },
      { at: 4, state: { molecules: "nh3-bf3", ring: "none" } },
      { at: 6, state: { flow: "both" } },
    ],
    poster: 9,
    aspects: ["16:9", "9:16"],
  },
};
