// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";

import { hFill } from "./h-fill/manifest.ts";
import HFill from "./h-fill/HFill.tsx";
import { ethanolThreeWays } from "./ethanol-three-ways/manifest.ts";
import EthanolThreeWays from "./ethanol-three-ways/EthanolThreeWays.tsx";
import { lonePairFill } from "./lone-pair-fill/manifest.ts";
import LonePairFill from "./lone-pair-fill/LonePairFill.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  [hFill.id]: { manifest: hFill, Component: HFill },
  [ethanolThreeWays.id]: { manifest: ethanolThreeWays, Component: EthanolThreeWays },
  [lonePairFill.id]: { manifest: lonePairFill, Component: LonePairFill },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type DrawOptions, type Point, type Segment } from "./structure/render.ts";
export { withHydrogens } from "./structure/hydrogens.ts";

export { default as PushReplay, describeReplay, replayDuration, PUSH_SECONDS } from "./push-replay/PushReplay.tsx";
