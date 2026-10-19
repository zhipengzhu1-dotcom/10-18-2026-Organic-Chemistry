// sample-twist: the sample Scene that proves the Scene path end to end (#64).
// Two carbons on a C–C axis, each with a model p orbital; the `twist` state
// turns the right-hand end about the axis and a bar shows how much side-on
// overlap is left. A model drawing (no measured geometry), so it shows no
// numbers. Lesson 4's `pi-twist` (#82) may grow from it; remove it with the
// other samples (#88) otherwise.
import type { SceneManifest } from "../types.ts";

export type TwistState = { twist: number };

/** Side-on overlap of the two model p orbitals: 1 when parallel, 0 at right angles (sign ignored). */
export const overlapOf = (twist: number) => Math.abs(Math.cos((twist * Math.PI) / 180));

export const sampleTwist: SceneManifest<TwistState> = {
  id: "sample-twist",
  title: "Twist a π bond (sample)",
  states: {
    twist: { kind: "range", label: "Twist", min: 0, max: 180, step: 15, default: 0, unitSymbol: "°" },
  },
  describe: ({ twist }) => {
    const overlap = overlapOf(twist);
    const lead = `Two carbons joined along a horizontal axis, each with a p orbital. The right-hand end is twisted ${Math.round(twist)} degrees.`;
    if (overlap < 0.01) return `${lead} The p orbitals are perpendicular: no side-on overlap, and the overlap bar is empty.`;
    if (overlap > 0.99)
      return `${lead} The p orbitals are parallel${twist > 90 ? ", one flipped," : ""}: full side-on overlap, and the overlap bar is full.`;
    return `${lead} The p orbitals are tilted: partial overlap, and the overlap bar is about ${Math.round(overlap * 100)} percent full.`;
  },
  reducedMotion: "Opens paused on the poster frame with no glow pulse; moving the slider redraws the twist at once.",
  data: ["elements/C.colour"],
  duration: 4,
  poster: { t: 0 },
  video: {
    duration: 8,
    timeline: [
      { at: 0, state: { twist: 0 } },
      { at: 1, state: { twist: 0 } },
      { at: 4, state: { twist: 90 } },
      { at: 5, state: { twist: 90 } },
      { at: 7.5, state: { twist: 180 } },
    ],
    poster: 4,
    aspects: ["16:9", "9:16"],
  },
};
