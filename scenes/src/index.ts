// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";
import { amideCnLengths } from "./amide-cn-lengths/manifest.ts";
import AmideCnLengths from "./amide-cn-lengths/AmideCnLengths.tsx";
import { amideHybrid } from "./amide-hybrid/manifest.ts";
import AmideHybrid from "./amide-hybrid/AmideHybrid.tsx";
import { ruleLadder } from "./rule-ladder/manifest.ts";
import RuleLadder from "./rule-ladder/RuleLadder.tsx";
import { carbonylSites } from "./carbonyl-sites/manifest.ts";
import CarbonylSites from "./carbonyl-sites/CarbonylSites.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  // Lesson 7
  [amideCnLengths.id]: { manifest: amideCnLengths, Component: AmideCnLengths },
  [amideHybrid.id]: { manifest: amideHybrid, Component: AmideHybrid },
  [ruleLadder.id]: { manifest: ruleLadder, Component: RuleLadder },
  [carbonylSites.id]: { manifest: carbonylSites, Component: CarbonylSites },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type Point, type Segment } from "./structure/render.ts";

export { default as PushReplay, describeReplay, replayDuration, PUSH_SECONDS } from "./push-replay/PushReplay.tsx";
