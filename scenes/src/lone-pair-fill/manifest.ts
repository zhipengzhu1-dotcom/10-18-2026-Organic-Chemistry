// lone-pair-fill (Lesson 2 s07, s10 reveal, u1-draw-acetaminophen-lone-pairs
// reveal): a line-angle drawing marked "Lone pairs hidden". Atom by atom, each
// N, O or halogen lights, a label reads its pattern ("O, 2 bonds → 2 lone
// pairs") and the pairs appear as cyan dots; the chip changes to "Lone pairs
// shown". Counts come from the structure files (valence-checked at build time).
import { expectedLonePairs } from "@astratron/content/valence";
import type { Structure } from "@astratron/content";
import type { SceneManifest } from "../types.ts";
import { molecule } from "../lesson-02/molecules.ts";

export type LonePairState = { molecule: string };

/** The drawings each choice shows, side by side. */
export const PANELS: Record<string, string[]> = {
  "pattern-strip": ["ethanol", "ethylamine", "chloroethane"],
  acetamide: ["acetamide"],
  acetaminophen: ["acetaminophen"],
};

/** Seconds: the hidden drawing rests, then the atoms light in turn, then everything holds. */
export const FILL = { start: 0.8, end: 5.2 };

/** Every atom that carries lone pairs, in fill order (panel by panel, structure-file order): [panel, atom id]. */
export function lonePairAtoms(choice: string): [number, string][] {
  return PANELS[choice].flatMap((id, panel) => {
    const s: Structure = molecule(id);
    const lp = expectedLonePairs(s);
    return s.atoms.filter((a) => a.el !== "C" && (lp[a.id] ?? 0) > 0).map((a): [number, string] => [panel, a.id]);
  });
}

const words: Record<string, string> = {
  "pattern-strip":
    "Three line drawings with their lone pairs hidden: ethanol, ethylamine and chloroethane. Oxygen with two bonds gains two lone pairs. Nitrogen with three bonds gains one. Chlorine with one bond gains three.",
  acetamide: "Oxygen, two bonds, gains two lone pairs. Nitrogen, three bonds, gains one. Three lone pairs in all.",
  acetaminophen: "The carbonyl oxygen gains two lone pairs, the nitrogen one, and the OH oxygen two. Five in all.",
};

export const lonePairFill: SceneManifest<LonePairState> = {
  id: "lone-pair-fill",
  title: "Lone pairs follow the bonding pattern",
  states: {
    molecule: {
      kind: "choice",
      label: "Molecule",
      options: [
        { id: "pattern-strip", label: "Ethanol, ethylamine, chloroethane" },
        { id: "acetamide", label: "Acetamide" },
        { id: "acetaminophen", label: "Acetaminophen" },
      ],
      default: "pattern-strip",
    },
  },
  describe: ({ molecule: choice }) => words[choice],
  reducedMotion: "Opens paused with every lone pair drawn and every label shown; Play runs the fill-in.",
  data: [],
  duration: 6,
  poster: { t: 6 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { molecule: "pattern-strip" } }],
    poster: 6,
    aspects: ["16:9", "9:16"],
  },
};
