// h-fill (Lesson 2 s01, s06, s15, u1-draw-limonene-h): a line-angle drawing
// fills in. Carbon by carbon, in a fixed order, each corner gets its C letter,
// a label "n bonds → m H" appears beside it, and that many H's pop on while a
// counter "H: n" ticks up from the H's already drawn. Ends on the full drawing
// with every H. The molecules are Lesson 2's own structure files, so every
// count is worked out from the drawing (and checked against PubChem's formula
// at build time); the Scene shows no measured numbers.
import { hydrogenCount, impliedHydrogens } from "@astratron/content/valence";
import type { SceneManifest } from "../types.ts";
import { molecule } from "../lesson-02/molecules.ts";

export type HFillState = { molecule: string; show: string };

export const H_FILL_MOLECULES = ["estradiol", "cyclohexanone", "limonene"] as const;

/** Seconds: the drawing rests, then the carbons fill in, then the full drawing holds. */
export const FILL = { start: 1, end: 9 };

/** The carbons in fill order: the structure file's atom order (SMILES order). */
export const fillOrder = (id: string) => molecule(id).atoms.filter((a) => a.el === "C").map((a) => a.id);

/** H's the drawing already shows (OH, stereo H's), from which the counter starts. */
export const drawnHydrogens = (id: string) => {
  const s = molecule(id);
  const implied = Object.values(impliedHydrogens(s)).reduce((n, h) => n + h, 0);
  return hydrogenCount(s) - implied;
};

const words: Record<string, (total: number) => string> = {
  estradiol: (n) =>
    `Estradiol's line drawing fills in. Each corner becomes a carbon, and each carbon gains enough hydrogens to make four bonds. The counter ends at ${n} hydrogens.`,
  cyclohexanone: (n) =>
    `Cyclohexanone fills in. The carbon bonded to oxygen has four bonds already and gets no hydrogens. Each of the other five carbons has two bonds and gains two hydrogens. Total: ${n} hydrogens.`,
  limonene: (n) =>
    `Limonene fills in, carbon by carbon. The two carbons that already have four bonds to other carbons get none; the other two double-bond carbons get one and two; the ring CH₂ corners two each; the two methyls three each. The counter ends at ${n}.`,
};

export const hFill: SceneManifest<HFillState> = {
  id: "h-fill",
  title: "Every corner fills up to four bonds",
  states: {
    molecule: {
      kind: "choice",
      label: "Molecule",
      options: [
        { id: "estradiol", label: "Estradiol" },
        { id: "cyclohexanone", label: "Cyclohexanone" },
        { id: "limonene", label: "Limonene" },
      ],
      default: "estradiol",
    },
    show: {
      kind: "choice",
      label: "Show",
      options: [
        { id: "fill", label: "Fill in" },
        { id: "final", label: "Final drawing" },
      ],
      default: "fill",
    },
  },
  describe: ({ molecule: id, show }) => {
    const n = hydrogenCount(molecule(id));
    if (show === "final") return `${id[0].toUpperCase()}${id.slice(1)} with every carbon and all ${n} hydrogens drawn.`;
    return words[id](n);
  },
  reducedMotion: "Opens paused on the full drawing with every H and the final count; Play runs the fill-in.",
  data: [],
  duration: 10,
  poster: { t: 10 },
  video: {
    duration: 10,
    timeline: [{ at: 0, state: { molecule: "estradiol", show: "fill" } }],
    poster: 10,
    aspects: ["16:9", "9:16"],
  },
};
