// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import { hFill } from "./h-fill/manifest.ts";
import { ethanolThreeWays } from "./ethanol-three-ways/manifest.ts";
import { lonePairFill } from "./lone-pair-fill/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [sampleTwist, hFill, ethanolThreeWays, lonePairFill];
