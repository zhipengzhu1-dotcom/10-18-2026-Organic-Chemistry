// carbonyl-sites (Lesson 7 s10): acetone's two contributors (C=O ↔ C⁺–O⁻)
// fade into the hybrid; δ+ appears on the carbonyl C and δ− on O, each written
// as a symbol and a word. A lone pair labelled "an electron source" drifts in
// and a dotted curved arrow points from it to the δ+ carbon. No numbers.
import type { SceneManifest } from "../types.ts";

export const carbonylSites: SceneManifest<Record<string, never>> = {
  id: "carbonyl-sites",
  title: "Where acetone reacts",
  states: {},
  describe: () =>
    "Acetone's C=O and C⁺–O⁻ drawings merge into one hybrid: the carbon is labelled δ+, electron-poor, and oxygen δ−, electron-rich. A lone pair labelled 'an electron source' approaches, with a dotted arrow pointing to the δ+ carbon.",
  reducedMotion: "Opens paused on the poster frame: the hybrid with its δ labels and the dotted arrow, nothing drifting.",
  data: [],
  duration: 7,
  poster: { t: 7 },
  video: {
    duration: 8,
    timeline: [{ at: 0, state: {} }],
    poster: 7.5,
    aspects: ["16:9", "9:16"],
  },
};
