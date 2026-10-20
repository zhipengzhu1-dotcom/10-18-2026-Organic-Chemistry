// acetate-hybrid (Lesson 6 s07, s15): acetate's two contributors, in
// brackets, fade into one hybrid: both C–O bonds dashed, δ− on each oxygen,
// lone pairs hidden, and both C–O bonds labelled with their (equal) computed
// length. `stage: hybrid` holds the final frame (the Wrap shows it).
import type { SceneManifest } from "../types.ts";

export type HybridState = { stage: string };

/** Seconds: the contributors hold, then fade into the hybrid; the labels come last. */
export const HYBRID = { fadeFrom: 1.2, fadeTo: 2.4, labelsTo: 3, end: 4 } as const;

export const acetateHybrid: SceneManifest<HybridState> = {
  id: "acetate-hybrid",
  title: "Acetate: the resonance hybrid",
  states: {
    stage: {
      kind: "choice",
      label: "Stage",
      options: [
        { id: "blend", label: "Blend the two drawings" },
        { id: "hybrid", label: "The hybrid" },
      ],
      default: "blend",
    },
  },
  describe: ({ stage }) =>
    stage === "hybrid"
      ? "Acetate's hybrid: charge shared by both oxygens."
      : "The two acetate drawings merge into one: both C–O bonds dashed, each oxygen δ−, and both bonds labelled with the same length.",
  reducedMotion: "Opens paused on the hybrid with its lengths shown; Play shows the two drawings, then the hybrid, without the fade.",
  data: ["acetate/r.CO.a", "acetate/r.CO.b"],
  duration: HYBRID.end,
  poster: { t: HYBRID.end },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { stage: "blend" } }],
    poster: 5,
    aspects: ["16:9", "9:16"],
  },
};
