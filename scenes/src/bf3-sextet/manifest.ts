// bf3-sextet (Lesson 1, s10): BF₃, full Lewis with fluorine's lone pairs.
// Boron's electron count runs 2, 4, 6 as each bond is counted, and stops; an
// empty dashed slot then glows on boron, "room for one more pair". Counts only.
import type { SceneManifest } from "../types.ts";
import { star } from "../lewis.ts";

export const bf3 = star("boron-trifluoride", "B", 0, [{ el: "F", lp: 3 }, { el: "F", lp: 3 }, { el: "F", lp: 3 }], -Math.PI / 2);

/** When each bond is counted, and when the empty slot appears (seconds). */
export const timing = { counts: [0.6, 1.6, 2.6], slot: 3.6 } as const;

export const bf3Sextet: SceneManifest<Record<string, never>> = {
  id: "bf3-sextet",
  title: "Boron's empty slot",
  states: {},
  describe: () =>
    "Boron trifluoride. Boron has three bonds to fluorine and no lone pairs: six electrons, formal charge zero. An empty slot on boron shows room for one more pair.",
  reducedMotion: "Opens paused on the count at 6 with the empty slot shown; the slot doesn't glow.",
  data: [],
  duration: 5,
  poster: { t: 5 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: {} }],
    poster: 5.5,
    aspects: ["16:9", "9:16"],
  },
};
