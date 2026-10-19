// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
// Lesson 0 (#78)
import { buildBySharing } from "./build-by-sharing/manifest.ts";
import { crustVsBody } from "./crust-vs-body/manifest.ts";
import { giveOrTake } from "./give-or-take/manifest.ts";
import { outerElectrons } from "./outer-electrons/manifest.ts";
import { waterPush } from "./water-push/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [
  sampleTwist,
  // Lesson 0 (#78)
  crustVsBody,
  outerElectrons,
  giveOrTake,
  waterPush,
  buildBySharing,
];
