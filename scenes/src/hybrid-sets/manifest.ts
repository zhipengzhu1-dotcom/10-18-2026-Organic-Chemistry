// hybrid-sets (Lesson 4 s04, and s01's still of the unmixed orbitals): a carbon with one hybrid
// set at a time, from the labelled model (scenes/src/hybrid-model). Orange hybrid lobes and blue
// leftover p orbitals, each with a chip, and the model's angle between two lobes. A translucent
// plane holds the sp² lobes. `tour` steps sp³ → sp² → sp → all in time with s04's three lines.
// The spec asks for a rotatable R3F view; Scenes take no Student input (and the video path has no
// WebGL), so this is an SVG drawing at a fixed three-quarter view (notes/82-lesson-4.md).
import { degrees, modelAngle, type HybridSet } from "../hybrid-model/model.ts";
import type { SceneManifest } from "../types.ts";

export type SetChoice = "unmixed" | HybridSet | "all" | "tour";
export type HybridSetsState = { set: SetChoice };

/** Seconds each set holds in the tour, before all three show together. */
export const TOUR_STEP = 4;
const TOUR: HybridSet[] = ["sp3", "sp2", "sp"];

/** What the Scene shows at time t: one set, all three, or the unmixed orbitals. */
export function shownSet(set: SetChoice, t: number): "unmixed" | HybridSet | "all" {
  if (set !== "tour") return set;
  return TOUR[Math.floor(Math.max(0, t) / TOUR_STEP)] ?? "all";
}

const lines: Record<HybridSet, () => string> = {
  sp3: () => `sp3: four orange hybrid lobes to the corners of a tetrahedron, model angle ${degrees(modelAngle("sp3"))} degrees.`,
  sp2: () =>
    `sp2: three orange lobes in a flat triangle, model angle ${degrees(modelAngle("sp2"))} degrees, and one blue p orbital standing straight up through the plane.`,
  sp: () =>
    `sp: two orange lobes in a straight line, model angle ${degrees(modelAngle("sp"))} degrees, and two blue p orbitals at right angles to the line and to each other.`,
};

export const hybridSets: SceneManifest<HybridSetsState> = {
  id: "hybrid-sets",
  title: "Hybrid sets (model)",
  states: {
    set: {
      kind: "choice",
      label: "Set",
      options: [
        { id: "unmixed", label: "Unmixed" },
        { id: "sp3", label: "sp³" },
        { id: "sp2", label: "sp²" },
        { id: "sp", label: "sp" },
        { id: "all", label: "All" },
        { id: "tour", label: "Tour" },
      ],
      default: "all",
    },
  },
  describe: ({ set }, t) => {
    const shown = shownSet(set, t);
    if (shown === "unmixed")
      return "Model: carbon's outer orbitals as they come, before mixing: one round 2s orbital and three 2p orbitals, each two lobes, one solid and one hatched, along three axes at right angles.";
    if (shown === "all") return TOUR.map((s) => lines[s]()).join(" ");
    return lines[shown]();
  },
  reducedMotion: "Opens paused on all three sets side by side; scrubbing steps between them with no motion.",
  data: ["elements/C.colour"],
  duration: TOUR_STEP * 4,
  poster: { t: TOUR_STEP * 4 },
  video: {
    duration: TOUR_STEP * 4,
    timeline: [{ at: 0, state: { set: "tour" } }],
    poster: TOUR_STEP * 4,
    aspects: ["16:9", "9:16"],
  },
};
