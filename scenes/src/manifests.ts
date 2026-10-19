// Every registered Scene's manifest, without its component, so Node tools
// (the content build, the video module's links) can read them without React.
// Adding a Scene: add its manifest here AND its component in index.ts.
import type { SceneManifest } from "./types.ts";
import { sampleTwist } from "./sample-twist/manifest.ts";
import { streamBend } from "./stream-bend/manifest.ts";
import { enStrip } from "./en-strip/manifest.ts";
import { bondDipoles } from "./bond-dipoles/manifest.ts";
import { dotsAndSticks } from "./dots-and-sticks/manifest.ts";
import { bf3Sextet } from "./bf3-sextet/manifest.ts";
import { hFill } from "./h-fill/manifest.ts";
import { ethanolThreeWays } from "./ethanol-three-ways/manifest.ts";
import { lonePairFill } from "./lone-pair-fill/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [sampleTwist, streamBend, enStrip, bondDipoles, dotsAndSticks, bf3Sextet, hFill, ethanolThreeWays, lonePairFill];
