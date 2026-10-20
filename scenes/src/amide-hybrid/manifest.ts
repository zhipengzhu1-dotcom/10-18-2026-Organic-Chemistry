// amide-hybrid (Lesson 7 s03, s15): acetamide's two contributors in brackets,
// the neutral one full size and tagged "major", the charged one smaller and
// tagged "minor"; they merge into one hybrid with C–N and C–O each drawn solid
// plus dashed and δ− on O. The C–N length label from amide-cn-lengths stays on.
// No settable states. Its last frame (the poster) is the Wrap's "final frame".
import type { SceneManifest } from "../types.ts";

export const amideHybrid: SceneManifest<Record<string, never>> = {
  id: "amide-hybrid",
  title: "Acetamide's hybrid",
  states: {},
  describe: (_state, t) =>
    t < amideHybrid.duration
      ? "Acetamide's neutral drawing is tagged major and drawn larger; the charged drawing is tagged minor. They merge into one hybrid with a partial double C–N bond and a partial negative charge on oxygen."
      : "Acetamide's hybrid: the neutral drawing is major, the charged drawing minor, and the C–N bond sits between single and double.",
  reducedMotion: "Opens paused on the poster frame: the hybrid beside the two tagged contributors, nothing fading.",
  data: ["acetamide/r.CN"],
  duration: 6,
  poster: { t: 6 },
  video: {
    duration: 7,
    timeline: [{ at: 0, state: {} }],
    poster: 6.5,
    aspects: ["16:9", "9:16"],
  },
};
