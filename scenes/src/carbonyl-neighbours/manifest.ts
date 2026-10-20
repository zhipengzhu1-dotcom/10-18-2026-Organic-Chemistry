// carbonyl-neighbours (Lesson 5, s07): one C=O stays put while the atom on
// the other side of its carbon swaps through H, C, OH, O–C and N, the name
// changing with it; it ends on a five-row ladder of all of them. A line-angle
// sketch with no numbers. Groups from the MIT OCW 5.12 Functional Groups sheet.
import type { SceneManifest } from "../types.ts";

export interface Neighbour {
  /** What is drawn on the right of the C=O carbon. */
  kind: "H" | "C" | "OH" | "OC" | "N";
  name: string;
}

export const neighbours: Neighbour[] = [
  { kind: "H", name: "aldehyde" },
  { kind: "C", name: "ketone" },
  { kind: "OH", name: "carboxylic acid" },
  { kind: "OC", name: "ester" },
  { kind: "N", name: "amide" },
];

/** Seconds each neighbour holds before the next swaps in. */
export const HOLD = 2;
/** When the single C=O gives way to the ladder, and how long that takes. */
export const LADDER_AT = HOLD * neighbours.length;
export const LADDER_FADE = 1;
const DURATION = LADDER_AT + 2;

export const carbonylNeighbours: SceneManifest<Record<string, never>> = {
  id: "carbonyl-neighbours",
  title: "Read the C=O with its neighbour",
  states: {},
  describe: () =>
    "One C=O stays put. Its neighbour changes: H, aldehyde. Carbon, ketone. OH, carboxylic acid. Oxygen then carbon, ester. Nitrogen, amide.",
  reducedMotion: "Opens paused on the poster frame: the five-row ladder, the same C=O on every row with each neighbour and its name.",
  data: [],
  duration: DURATION,
  poster: { t: DURATION },
  video: {
    duration: DURATION,
    timeline: [{ at: 0, state: {} }],
    poster: DURATION,
    aspects: ["16:9", "9:16"],
  },
};
