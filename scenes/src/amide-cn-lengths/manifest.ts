// amide-cn-lengths (Lesson 7 s01): methylamine, acetamide and methanimine side
// by side, the C–N bond highlighted in each and labelled with its computed
// length. Labels only: no ruler or scale bar, since bond length does not map
// linearly onto contributor weight. `labels: hidden` is the Hook's question
// (the Step switches to `shown` once the Student answers).
import type { SceneManifest } from "../types.ts";

export type AmideMolecule = "methylamine" | "acetamide" | "methanimine";
export type AmideCnState = { molecule: AmideMolecule | "all"; labels: "shown" | "hidden" };

export const MOLECULES: { id: AmideMolecule; name: string; bond: string }[] = [
  { id: "methylamine", name: "Methylamine", bond: "single bond" },
  { id: "acetamide", name: "Acetamide", bond: "drawn as a single bond" },
  { id: "methanimine", name: "Methanimine", bond: "double bond" },
];

export const amideCnLengths: SceneManifest<AmideCnState> = {
  id: "amide-cn-lengths",
  title: "Three C–N bonds",
  states: {
    molecule: {
      kind: "choice",
      label: "Molecule",
      options: [
        { id: "all", label: "All three" },
        ...MOLECULES.map((m) => ({ id: m.id, label: m.name })),
      ],
      default: "all",
    },
    labels: {
      kind: "choice",
      label: "Lengths",
      options: [
        { id: "shown", label: "Shown" },
        { id: "hidden", label: "Hidden" },
      ],
      default: "shown",
    },
  },
  describe: ({ molecule, labels }) => {
    if (molecule !== "all") {
      const m = MOLECULES.find((x) => x.id === molecule)!;
      return `${m.name}, with its C–N bond, ${m.bond}, highlighted${labels === "shown" ? " and labelled with its computed length" : ""}.`;
    }
    if (labels === "hidden") return "Methylamine, acetamide and methanimine side by side, the C–N bond highlighted in each.";
    return "Three C–N bonds, computed. Methylamine's single bond is the longest. Methanimine's double bond is the shortest. Acetamide's, drawn as a single bond, falls in between.";
  },
  reducedMotion: "Opens paused on the poster frame with all three molecules and their labels drawn; nothing fades in.",
  data: ["methylamine/r.CN", "acetamide/r.CN", "methanimine/r.CN"],
  duration: 4.5,
  poster: { t: 4.5 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { molecule: "all", labels: "shown" } }],
    poster: 5,
    aspects: ["16:9", "9:16"],
  },
};
