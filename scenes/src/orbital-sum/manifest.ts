// orbital-sum (Lesson 4 s03, the spec's static "Visual" row and its Reveal): 2s + 2p + 2p → ?,
// with the third 2p set aside, dimmed; `filled: yes` fills in the three sp² hybrids. Drawn from
// the labelled model (scenes/src/hybrid-model). Not in the spec's Scene table: s03's picture
// needed a Scene so its reveal can fill in (notes/82-lesson-4.md).
import type { SceneManifest } from "../types.ts";

export type OrbitalSumState = { filled: "no" | "yes" };

export const orbitalSum: SceneManifest<OrbitalSumState> = {
  id: "orbital-sum",
  title: "Orbitals in, hybrids out (model)",
  states: {
    filled: {
      kind: "choice",
      label: "Filled",
      options: [
        { id: "no", label: "Question" },
        { id: "yes", label: "Answer" },
      ],
      default: "no",
    },
  },
  describe: ({ filled }) =>
    filled === "yes"
      ? "Model: one 2s orbital and two 2p orbitals mix into three sp2 hybrid orbitals. The third 2p orbital is left over, unchanged."
      : "Model: one 2s orbital and two 2p orbitals go into the mix, and a third 2p orbital waits to one side, dimmed. How many hybrid orbitals come out?",
  reducedMotion: "Still: the row is drawn at once, with no motion.",
  data: [],
  duration: 2,
  controls: false,
  poster: { t: 0 },
  video: {
    duration: 6,
    timeline: [
      { at: 0, state: { filled: "no" } },
      { at: 3, state: { filled: "yes" } },
    ],
    poster: 6,
    aspects: ["16:9", "9:16"],
  },
};
