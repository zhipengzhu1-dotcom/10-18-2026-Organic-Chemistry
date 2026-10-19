// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import { acetateBondLengths } from "./acetate-bond-lengths/manifest.ts";
import { formaldehydePiShift } from "./formaldehyde-pi-shift/manifest.ts";
import { threeMoves } from "./three-moves/manifest.ts";
import { acetateHybrid } from "./acetate-hybrid/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [sampleTwist, acetateBondLengths, formaldehydePiShift, threeMoves, acetateHybrid];
