// pi-twist (Lesson 4 s08, Manipulate a Scene): ethylene's σ framework, built from its cited
// lengths and H–C–C angle, with one model p orbital per carbon. The `twist` slider turns the
// right-hand CH₂ about the C–C axis, and its p turns with it; a bar labelled "π overlap (model)"
// shows how much side-on overlap is left: full, none at 90°, full again (flipped) at 180°. The bar
// is the model (|cos twist|), not a calculation, and shows no numbers. Grown from sample-twist (#64).
import type { SceneManifest } from "../types.ts";

export type PiTwistState = { twist: number };

/** Side-on overlap of the two model p orbitals: 1 when parallel, 0 at right angles (sign ignored). */
export const overlapAt = (twist: number) => Math.abs(Math.cos((twist * Math.PI) / 180));

/** The overlap in words, as the live region reads it. */
export function overlapWord(twist: number): "full" | "partial" | "none" {
  const overlap = overlapAt(twist);
  return overlap < 0.01 ? "none" : overlap > 0.99 ? "full" : "partial";
}

export const piTwist: SceneManifest<PiTwistState> = {
  id: "pi-twist",
  title: "Twist a π bond",
  states: {
    twist: { kind: "range", label: "Twist", min: 0, max: 180, step: 15, default: 0, unitSymbol: "°" },
  },
  describe: ({ twist }) => {
    const word = overlapWord(twist);
    const at = `Twist ${Math.round(twist)} degrees.`;
    if (word === "none") return `${at} The two p orbitals are at right angles. π overlap: none.`;
    return `${at} π overlap: ${word}.`;
  },
  reducedMotion: "Opens paused on the poster frame (it has no idle motion); moving the slider redraws the twist at once.",
  data: ["ethylene/r.CC", "ethylene/r.CH", "ethylene/a.HCC", "elements/C.colour", "elements/H.colour"],
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
    poster: 0,
    aspects: ["16:9", "9:16"],
  },
};
