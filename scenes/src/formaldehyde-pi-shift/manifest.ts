// formaldehyde-pi-shift (Lesson 6 s02): the C=O π pair slides onto O; C turns
// positive, O negative; no atom moves. Ends on the two contributors in
// brackets, H₂C=O ↔ H₂C⁺–O⁻. A model drawing: it shows no numbers.
import type { SceneManifest } from "../types.ts";

/** Seconds: the arrow plays (push-replay timing), then the pair settles into brackets. */
export const SHIFT = { pairFrom: 2.6, pairTo: 3.4, end: 5 } as const;

export const formaldehydePiShift: SceneManifest<Record<string, never>> = {
  id: "formaldehyde-pi-shift",
  title: "Formaldehyde: the π pair moves to oxygen",
  states: {},
  describe: () =>
    "Formaldehyde, H₂C double-bonded to O. A curved arrow starts on the C=O π bond and ends on oxygen. The pair becomes a lone pair on O: oxygen is now negative, carbon positive. No atom moves.",
  reducedMotion: "Opens paused on the bracketed pair of drawings; Play shows the arrow with no riding electrons.",
  data: [],
  duration: SHIFT.end,
  poster: { t: SHIFT.end },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: {} }],
    poster: 5.5,
    aspects: ["16:9", "9:16"],
  },
};
