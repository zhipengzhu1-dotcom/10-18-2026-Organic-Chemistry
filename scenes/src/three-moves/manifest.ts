// three-moves (Lesson 6 s05): three panels, one resonance move each.
// 1 lone pair → bond (acetate's O⁻ into C–O), 2 bond → atom (formaldehyde's
// π pair onto O), 3 bond → next bond (allyl cation's π toward C⁺). A model
// drawing: it shows no numbers.
import type { SceneManifest } from "../types.ts";

export type ThreeMovesState = { panel: string };

/** Seconds each panel is lit in turn when `panel` is `all`; after the last, all three stay lit. */
export const PANEL_SECONDS = 2.5;

const sentences = [
  "Move one: the negative oxygen of acetate sends a lone pair into the bond to carbon.",
  "Move two: formaldehyde's π pair lands on oxygen.",
  "Move three: in the allyl cation, the C=C π pair slides one position toward the positive carbon.",
];

export const threeMoves: SceneManifest<ThreeMovesState> = {
  id: "three-moves",
  title: "The three moves",
  states: {
    panel: {
      kind: "choice",
      label: "Panel",
      options: [
        { id: "1", label: "Lone pair → bond" },
        { id: "2", label: "Bond → atom" }, // cited-data: ok, a panel number
        { id: "3", label: "Bond → next bond" }, // cited-data: ok, a panel number
        { id: "all", label: "All three" },
      ],
      default: "all",
    },
  },
  describe: ({ panel }) => (panel === "all" ? sentences.join(" ") : sentences[Number(panel) - 1]),
  reducedMotion: "Opens paused with all three panels lit and every arrow drawn; Play lights them in turn with no riding electrons.",
  data: [],
  duration: PANEL_SECONDS * 3,
  poster: { t: PANEL_SECONDS * 3 },
  video: {
    duration: 9,
    timeline: [{ at: 0, state: { panel: "all" } }],
    poster: 8.5,
    aspects: ["16:9", "9:16"],
  },
};
