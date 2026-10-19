// bond-dipoles (Lesson 1, s04 reveal and u1-bond-polarity-rank reveal): ranked
// bonds stacked least to most polar, each with δ+/δ− and a crossed arrow
// (+→) pointing at the δ− atom. The arrow's weight follows the difference in
// cited electronegativity, labelled "ΔEN": it is not a dipole moment and is
// never labelled as one.
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";

export type BondDipolesState = { bonds: string };

/** The bond sets a Step can show, least to most polar (the order the build checks against the data). */
export const bondSets: Record<string, [string, string][]> = {
  "ch-nh-oh-cf": [["C", "H"], ["N", "H"], ["O", "H"], ["C", "F"]],
  "ch-ccl-co-oh": [["C", "H"], ["C", "Cl"], ["C", "O"], ["O", "H"]],
};

const NAMES: Record<string, string> = { H: "hydrogen", C: "carbon", N: "nitrogen", O: "oxygen", F: "fluorine", Cl: "chlorine" };
const ELEMENTS = ["H", "C", "N", "O", "F", "Cl"];
const ref = (el: string) => `electronegativity-pauling/${el}`;

export interface RankedBond {
  label: string;
  /** The atom written first and second. */
  a: string;
  b: string;
  /** The δ− atom: the bigger electronegativity. */
  minus: string;
  /** |ΔEN| and as shown (2 decimals). */
  delta: number;
  shown: string;
}

/** Each bond of a set with its δ− end and ΔEN, from the cited values. */
export function rank(set: string, cited: Record<string, Cited>): RankedBond[] {
  const en = (el: string) => Number(cited[ref(el)]?.value ?? Number.NaN);
  return (bondSets[set] ?? []).map(([a, b]) => {
    const delta = Math.abs(en(a) - en(b));
    return { label: `${a}–${b}`, a, b, minus: en(a) > en(b) ? a : b, delta, shown: delta.toFixed(2) };
  });
}

export const bondDipoles: SceneManifest<BondDipolesState> = {
  id: "bond-dipoles",
  title: "Bond polarity, least to most",
  states: {
    bonds: {
      kind: "choice",
      label: "Bonds",
      options: [
        { id: "ch-nh-oh-cf", label: "C–H, N–H, O–H, C–F" },
        { id: "ch-ccl-co-oh", label: "C–H, C–Cl, C–O, O–H" },
      ],
      default: "ch-nh-oh-cf",
    },
  },
  describe: ({ bonds }, _t, cited) => {
    const ranked = rank(bonds, cited);
    const parts = ranked.map((r, i) =>
      i === 0 && r.label === "C–H"
        ? `C–H, difference ${r.shown}, nearly nonpolar.`
        : `${r.label}, ${r.shown}, δ− on ${NAMES[r.minus]}.`,
    );
    return `Four bonds from least to most polar. ${parts.join(" ")} Each has an arrow pointing at its negative end.`;
  },
  reducedMotion: "Opens paused on every bond with its arrow and ΔEN label; the rows don't slide in.",
  data: ELEMENTS.map(ref),
  duration: 5,
  poster: { t: 5 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { bonds: "ch-nh-oh-cf" } }],
    poster: 5.5,
    aspects: ["16:9", "9:16"],
  },
};
