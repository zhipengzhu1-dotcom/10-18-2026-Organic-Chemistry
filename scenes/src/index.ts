// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";

// Lesson 0 (#78)
import { buildBySharing } from "./build-by-sharing/manifest.ts";
import BuildBySharing from "./build-by-sharing/BuildBySharing.tsx";
import { crustVsBody } from "./crust-vs-body/manifest.ts";
import CrustVsBody from "./crust-vs-body/CrustVsBody.tsx";
import { giveOrTake } from "./give-or-take/manifest.ts";
import GiveOrTake from "./give-or-take/GiveOrTake.tsx";
import { outerElectrons } from "./outer-electrons/manifest.ts";
import OuterElectrons from "./outer-electrons/OuterElectrons.tsx";
import { waterPush } from "./water-push/manifest.ts";
import WaterPush from "./water-push/WaterPush.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  // Lesson 0 (#78)
  [crustVsBody.id]: { manifest: crustVsBody, Component: CrustVsBody },
  [outerElectrons.id]: { manifest: outerElectrons, Component: OuterElectrons },
  [giveOrTake.id]: { manifest: giveOrTake, Component: GiveOrTake },
  [waterPush.id]: { manifest: waterPush, Component: WaterPush },
  [buildBySharing.id]: { manifest: buildBySharing, Component: BuildBySharing },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type Point, type Segment } from "./structure/render.ts";

export { default as PushReplay, describeReplay, replayDuration, PUSH_SECONDS } from "./push-replay/PushReplay.tsx";
