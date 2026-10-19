// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import { groupSpotlight } from "./group-spotlight/manifest.ts";
import { groupCards } from "./group-cards/manifest.ts";
import { carbonylNeighbours } from "./carbonyl-neighbours/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [sampleTwist, groupSpotlight, groupCards, carbonylNeighbours];
