// stream-bend (Lesson 1, s01): a charged rod beside a stream of water and a
// stream of hexane. Only the observation: water curves toward the rod, hexane
// falls straight. No dipole arrows and no mechanism (most of the bending comes
// from charge induced in the stream: Ziaei-Moayyed, Goodman and Williams,
// J. Chem. Educ. 77, 1520 (2000)). A model drawing: no numbers.
import type { SceneManifest } from "../types.ts";

export type StreamBendState = { rod: string };

/** When the rod moves in and the water bends (seconds). */
export const timing = { rodIn: [0.8, 2.6], bend: [1.6, 3.8] } as const;

export const streamBend: SceneManifest<StreamBendState> = {
  id: "stream-bend",
  title: "A charged rod beside water and hexane",
  states: {
    rod: {
      kind: "choice",
      label: "Rod",
      options: [
        { id: "near", label: "Brought near" },
        { id: "away", label: "Held away" },
      ],
      default: "near",
    },
  },
  describe: ({ rod }) =>
    rod === "away"
      ? "Two thin streams fall side by side, one of water and one of hexane. A charged rod is held away from them."
      : "A charged rod is held beside two falling streams. The water stream curves toward the rod. The hexane stream falls straight down.",
  reducedMotion: "Opens paused on the poster frame (rod in place, water curved, hexane straight); the streams don't flow.",
  data: [],
  duration: 6,
  poster: { t: 6 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { rod: "near" } }],
    poster: 5.5,
    aspects: ["16:9", "9:16"],
  },
};
