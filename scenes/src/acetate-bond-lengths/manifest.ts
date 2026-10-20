// acetate-bond-lengths (Lesson 6 s01 reveal, s07): acetic acid and acetate
// side by side, each C–O bond labelled with its length. Acetic acid's two
// differ; acetate's two match. Both molecules are our own PySCF computation
// (same method, so a few hundredths of an Å compare fairly).
import type { SceneManifest } from "../types.ts";

export type BondLengthsState = { molecule: string };

const acid = "Acetic acid: one C–O bond is clearly shorter than the other.";
const anion = "Acetate: both C–O bonds are the same length";

export const acetateBondLengths: SceneManifest<BondLengthsState> = {
  id: "acetate-bond-lengths",
  title: "Acetic acid and acetate: C–O lengths",
  states: {
    molecule: {
      kind: "choice",
      label: "Molecule",
      options: [
        { id: "acid", label: "Acetic acid" },
        { id: "anion", label: "Acetate" },
        { id: "both", label: "Both" },
      ],
      default: "both",
    },
  },
  describe: ({ molecule }) =>
    molecule === "acid" ? acid : molecule === "anion" ? `${anion}.` : `${acid} ${anion}, and that length sits between acetic acid's two.`,
  reducedMotion: "Opens paused on the poster frame with every length already shown; nothing moves.",
  data: ["acetic-acid/r.CO.double", "acetic-acid/r.CO.single", "acetate/r.CO.a", "acetate/r.CO.b"],
  duration: 3,
  poster: { t: 3 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { molecule: "both" } }],
    poster: 5,
    aspects: ["16:9", "9:16"],
  },
};
