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
import { groupSpotlight } from "./group-spotlight/manifest.ts";
import { groupCards } from "./group-cards/manifest.ts";
import { carbonylNeighbours } from "./carbonyl-neighbours/manifest.ts";
import { hFill } from "./h-fill/manifest.ts";
import { ethanolThreeWays } from "./ethanol-three-ways/manifest.ts";
import { lonePairFill } from "./lone-pair-fill/manifest.ts";
import { acetateBondLengths } from "./acetate-bond-lengths/manifest.ts";
import { formaldehydePiShift } from "./formaldehyde-pi-shift/manifest.ts";
import { threeMoves } from "./three-moves/manifest.ts";
import { acetateHybrid } from "./acetate-hybrid/manifest.ts";
import { amideCnLengths } from "./amide-cn-lengths/manifest.ts";
import { amideHybrid } from "./amide-hybrid/manifest.ts";
import { ruleLadder } from "./rule-ladder/manifest.ts";
import { carbonylSites } from "./carbonyl-sites/manifest.ts";

// Lesson 0 (#78)
import { buildBySharing } from "./build-by-sharing/manifest.ts";
import { crustVsBody } from "./crust-vs-body/manifest.ts";
import { giveOrTake } from "./give-or-take/manifest.ts";
import { outerElectrons } from "./outer-electrons/manifest.ts";
import { waterPush } from "./water-push/manifest.ts";
// Lesson 3 (#81)
import { fourDomainFamily } from "./four-domain-family/manifest.ts";
import { dipoleSum } from "./dipole-sum/manifest.ts";
// Lesson 8 (#86)
import { moFiller } from "./mo-filler/manifest.ts";
import { frontierLadder } from "./frontier-ladder/manifest.ts";

// Lesson 4 (#82)
import { hybridSets } from "./hybrid-sets/manifest.ts";
import { piTwist } from "./pi-twist/manifest.ts";
import { methaneUnmixedVsReal } from "./methane-unmixed-vs-real/manifest.ts";
import { orbitalSum } from "./orbital-sum/manifest.ts";

export const sceneManifests: readonly SceneManifest<any>[] = [
  sampleTwist,
  streamBend,
  enStrip,
  bondDipoles,
  dotsAndSticks,
  bf3Sextet,
  groupSpotlight,
  groupCards,
  carbonylNeighbours,
  hFill,
  ethanolThreeWays,
  lonePairFill,
  // Lesson 0 (#78)
  crustVsBody,
  outerElectrons,
  giveOrTake,
  waterPush,
  buildBySharing,
  // Lesson 3 (#81)
  fourDomainFamily,
  dipoleSum,
  // Lesson 6 (#84)
  acetateBondLengths,
  formaldehydePiShift,
  threeMoves,
  acetateHybrid,
  // Lesson 7 (#85)
  amideCnLengths,
  amideHybrid,
  ruleLadder,
  carbonylSites,
  // Lesson 4 (#82)
  hybridSets,
  methaneUnmixedVsReal,
  orbitalSum,
  piTwist,
  // Lesson 8 (#86)
  moFiller,
  frontierLadder,
];
