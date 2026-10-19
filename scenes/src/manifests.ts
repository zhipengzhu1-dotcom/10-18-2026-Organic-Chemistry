// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import { amideCnLengths } from "./amide-cn-lengths/manifest.ts";
import { amideHybrid } from "./amide-hybrid/manifest.ts";
import { ruleLadder } from "./rule-ladder/manifest.ts";
import { carbonylSites } from "./carbonyl-sites/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [sampleTwist, amideCnLengths, amideHybrid, ruleLadder, carbonylSites];
