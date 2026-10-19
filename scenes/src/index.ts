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
import { groupSpotlight } from "./group-spotlight/manifest.ts";
import GroupSpotlight from "./group-spotlight/GroupSpotlight.tsx";
import { groupCards } from "./group-cards/manifest.ts";
import GroupCards from "./group-cards/GroupCards.tsx";
import { carbonylNeighbours } from "./carbonyl-neighbours/manifest.ts";
import CarbonylNeighbours from "./carbonyl-neighbours/CarbonylNeighbours.tsx";

import { hFill } from "./h-fill/manifest.ts";
import HFill from "./h-fill/HFill.tsx";
import { ethanolThreeWays } from "./ethanol-three-ways/manifest.ts";
import EthanolThreeWays from "./ethanol-three-ways/EthanolThreeWays.tsx";
import { lonePairFill } from "./lone-pair-fill/manifest.ts";
import LonePairFill from "./lone-pair-fill/LonePairFill.tsx";
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
import { fourDomainFamily } from "./four-domain-family/manifest.ts";
import FourDomainFamily from "./four-domain-family/FourDomainFamily.tsx";
import { dipoleSum } from "./dipole-sum/manifest.ts";
import DipoleSum from "./dipole-sum/DipoleSum.tsx";

// Lesson 8 (#86)
import { moFiller } from "./mo-filler/manifest.ts";
import MoFiller from "./mo-filler/MoFiller.tsx";
import { frontierLadder } from "./frontier-ladder/manifest.ts";
import FrontierLadder from "./frontier-ladder/FrontierLadder.tsx";

export const sceneRegistry: Record<string, RegisteredScene<any>> = {
  [sampleTwist.id]: { manifest: sampleTwist, Component: SampleTwist },
  [streamBend.id]: { manifest: streamBend, Component: StreamBend },
  [enStrip.id]: { manifest: enStrip, Component: EnStrip },
  [bondDipoles.id]: { manifest: bondDipoles, Component: BondDipoles },
  [dotsAndSticks.id]: { manifest: dotsAndSticks, Component: DotsAndSticks },
  [bf3Sextet.id]: { manifest: bf3Sextet, Component: Bf3Sextet },
  [groupSpotlight.id]: { manifest: groupSpotlight, Component: GroupSpotlight },
  [groupCards.id]: { manifest: groupCards, Component: GroupCards },
  [carbonylNeighbours.id]: { manifest: carbonylNeighbours, Component: CarbonylNeighbours },
  [hFill.id]: { manifest: hFill, Component: HFill },
  [ethanolThreeWays.id]: { manifest: ethanolThreeWays, Component: EthanolThreeWays },
  [lonePairFill.id]: { manifest: lonePairFill, Component: LonePairFill },
  // Lesson 0 (#78)
  [crustVsBody.id]: { manifest: crustVsBody, Component: CrustVsBody },
  [outerElectrons.id]: { manifest: outerElectrons, Component: OuterElectrons },
  [giveOrTake.id]: { manifest: giveOrTake, Component: GiveOrTake },
  [waterPush.id]: { manifest: waterPush, Component: WaterPush },
  [buildBySharing.id]: { manifest: buildBySharing, Component: BuildBySharing },
  [fourDomainFamily.id]: { manifest: fourDomainFamily, Component: FourDomainFamily },
  [dipoleSum.id]: { manifest: dipoleSum, Component: DipoleSum },
  // Lesson 8 (#86)
  [moFiller.id]: { manifest: moFiller, Component: MoFiller },
  [frontierLadder.id]: { manifest: frontierLadder, Component: FrontierLadder },
};

export type * from "./types.ts";
export { frameSize, safeArea, type Box } from "./frame.ts";
export { clamp, easeInOut, easeOut, lerp, progress, pulse, seededRandom } from "./motion.ts";
export { stateAt } from "./timeline.ts";
export { defaultState } from "./state.ts";

export { BOND_PX, drawStructure, type Drawing, type DrawOptions, type Highlight, type Point, type Segment } from "./structure/render.ts";
export { withHydrogens } from "./structure/hydrogens.ts";

export { default as PushReplay, describeReplay, replayDuration, PUSH_SECONDS } from "./push-replay/PushReplay.tsx";
