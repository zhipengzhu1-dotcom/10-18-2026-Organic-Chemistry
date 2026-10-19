// The Scene registry, shared by the site and the video renderer (ADR 0001).
// Each entry pairs a manifest (also listed in manifests.ts) with its pure
// component. Lesson files name Scenes by id.
import type { RegisteredScene } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import SampleTwist from "./sample-twist/SampleTwist.tsx";
import { streamBend } from "./stream-bend/manifest.ts";
import StreamBend from "./stream-bend/StreamBend.tsx";
import { enStrip } from "./en-strip/manifest.ts";
import EnStrip from "./en-strip/EnStrip.tsx";
import { bondDipoles } from "./bond-dipoles/manifest.ts";
import BondDipoles from "./bond-dipoles/BondDipoles.tsx";
import { dotsAndSticks } from "./dots-and-sticks/manifest.ts";
import DotsAndSticks from "./dots-and-sticks/DotsAndSticks.tsx";
import { bf3Sextet } from "./bf3-sextet/manifest.ts";
import Bf3Sextet from "./bf3-sextet/Bf3Sextet.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  [streamBend.id]: { manifest: streamBend, Component: StreamBend },
  [enStrip.id]: { manifest: enStrip, Component: EnStrip },
  [bondDipoles.id]: { manifest: bondDipoles, Component: BondDipoles },
  [dotsAndSticks.id]: { manifest: dotsAndSticks, Component: DotsAndSticks },
  [bf3Sextet.id]: { manifest: bf3Sextet, Component: Bf3Sextet },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type Highlight, type Point, type Segment } from "./structure/render.ts";
