// water-push (Lesson 0 s04; the same push as the homepage hero, #73): OH⁻, an oxygen with
// three lone pairs and one shared pair with H, beside H⁺. A curved arrow shows one lone pair
// swinging over to H⁺, where it becomes a second O–H shared pair: water, every shell full.
// Watched, not worked, here (the homepage makes the push live). Electron counts only.
import type { SceneManifest } from "../types.ts";
import { VALENCE } from "@astratron/content/valence";

const OCTET = 2 * VALENCE.C;
const H_FULL = 2 * VALENCE.H;

export const waterPush: SceneManifest<Record<string, never>> = {
  id: "water-push",
  title: "A pair becomes a bond",
  states: {},
  describe: () =>
    "Hydroxide, an oxygen with three lone pairs and one bond to hydrogen, and a hydrogen ion. " +
    "One lone pair on oxygen swings over to the hydrogen ion and becomes a bond. " +
    `The result is water: oxygen shares two pairs and keeps two lone pairs, so its shell holds ${OCTET}. ` +
    `Each hydrogen holds ${H_FULL}.`,
  reducedMotion: "Opens paused on the poster frame, water with the new O–H pair highlighted; Play runs the push once.",
  data: [],
  duration: 4,
  poster: { t: 4 },
  video: { duration: 6, timeline: [{ at: 0, state: {} }], poster: 6, aspects: ["16:9", "9:16"] },
};

/** Seconds: the arrow draws in, the pair moves and H⁺ comes in, then the new bond lights. */
export const BEATS = { arrow: [0.6, 1.6], move: [1.8, 3], lit: 3 } as const;
