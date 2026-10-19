// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";
import { acetateBondLengths } from "./acetate-bond-lengths/manifest.ts";
import AcetateBondLengths from "./acetate-bond-lengths/AcetateBondLengths.tsx";
import { formaldehydePiShift } from "./formaldehyde-pi-shift/manifest.ts";
import FormaldehydePiShift from "./formaldehyde-pi-shift/FormaldehydePiShift.tsx";
import { threeMoves } from "./three-moves/manifest.ts";
import ThreeMoves from "./three-moves/ThreeMoves.tsx";
import { acetateHybrid } from "./acetate-hybrid/manifest.ts";
import AcetateHybrid from "./acetate-hybrid/AcetateHybrid.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  [acetateBondLengths.id]: { manifest: acetateBondLengths, Component: AcetateBondLengths },
  [formaldehydePiShift.id]: { manifest: formaldehydePiShift, Component: FormaldehydePiShift },
  [threeMoves.id]: { manifest: threeMoves, Component: ThreeMoves },
  [acetateHybrid.id]: { manifest: acetateHybrid, Component: AcetateHybrid },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type Point, type Segment } from "./structure/render.ts";
export { drawContributors, type ContributorsDrawing } from "./structure/contributors.ts";

export { default as PushReplay, describeReplay, replayDuration, PUSH_SECONDS } from "./push-replay/PushReplay.tsx";
