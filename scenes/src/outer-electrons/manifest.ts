// outer-electrons (Lesson 0 s02's picture): H, C, N, O and F, each with its outer electrons as
// dots, then neon with eight, "already full". The spec calls it a static picture; it is a Scene
// so it draws with the same dot renderer, appearing atom by atom, and posts as its last frame.
import type { SceneManifest } from "../types.ts";
import { OUTER } from "../dots/outer.ts";

export const ROW = ["H", "C", "N", "O", "F"] as const;
const NAMES: Record<string, string> = { H: "Hydrogen", C: "carbon", N: "nitrogen", O: "oxygen", F: "fluorine" };
/** Seconds between atoms appearing. */
export const BEAT = 0.35;

export const outerElectrons: SceneManifest<Record<string, never>> = {
  id: "outer-electrons",
  title: "Outer electrons",
  states: {},
  describe: () => {
    const [first, ...rest] = ROW;
    return (
      `${NAMES[first]} has ${OUTER[first]} outer electron, ${rest.map((el) => `${NAMES[el]} ${OUTER[el]}`).join(", ")}. ` +
      `Neon has ${OUTER.Ne}, a full shell, and reacts with almost nothing.`
    );
  },
  reducedMotion: "Opens paused on the poster frame with every atom and dot drawn; Play shows them appear once.",
  data: [],
  duration: 2.6,
  poster: { t: 2.6 },
  video: { duration: 4, timeline: [{ at: 0, state: {} }], poster: 4, aspects: ["16:9", "9:16"] },
};
