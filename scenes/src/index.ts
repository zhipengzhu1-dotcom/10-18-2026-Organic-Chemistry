// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";
import { groupSpotlight } from "./group-spotlight/manifest.ts";
import GroupSpotlight from "./group-spotlight/GroupSpotlight.tsx";
import { groupCards } from "./group-cards/manifest.ts";
import GroupCards from "./group-cards/GroupCards.tsx";
import { carbonylNeighbours } from "./carbonyl-neighbours/manifest.ts";
import CarbonylNeighbours from "./carbonyl-neighbours/CarbonylNeighbours.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  [groupSpotlight.id]: { manifest: groupSpotlight, Component: GroupSpotlight },
  [groupCards.id]: { manifest: groupCards, Component: GroupCards },
  [carbonylNeighbours.id]: { manifest: carbonylNeighbours, Component: CarbonylNeighbours },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type Point, type Segment } from "./structure/render.ts";
