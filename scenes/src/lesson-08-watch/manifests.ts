// Lesson 8's watch-only Scenes (#86): silent, plain Manim CE renders (scenes/manim/lesson_08.py),
// 60 fps, the last frame the poster. All schematic: no computed numbers (the ladders say "not to
// scale"); the only digits are electron counts. Screen-reader text is the Lesson spec's.
//
// The spec's `mo-from-overlap` takes a `system: h2-1s | ethylene-2p` parameter. Watch-only Scenes
// have no states (they are fixed videos), so it ships as two Scenes from one script.
import type { WatchSceneManifest } from "../types.ts";

const aspects: WatchSceneManifest["aspects"] = ["16:9", "9:16"];

/** s01's reveal: BF₃ and NH₃ snap together into H₃N–BF₃. */
export const bf3Nh3Snap: WatchSceneManifest = {
  id: "bf3-nh3-snap",
  title: "BF₃ meets NH₃",
  render: { engine: "manim", script: "lesson_08.py", sceneClass: "BfThreeNhThreeSnap" },
  describe: () =>
    "Flat boron trifluoride, with only six electrons around boron, and ammonia, with a lone pair on nitrogen, drift together. " +
    "The lone pair swings over to boron and becomes a nitrogen–boron bond. Boron trifluoride folds into a pyramid. Nitrogen is now positive and boron negative.",
  reducedMotion: "Opens paused on the last frame: the adduct H₃N⁺–B⁻F₃ with the new N–B bond highlighted; Play starts the video.",
  data: [],
  text: { boronBefore: ["B: 6 e⁻"], boronAfter: ["B: 8 e⁻"], adduct: ["H₃N–BF₃"] },
  duration: 8,
  poster: 8,
  aspects,
};

const ladderWords = { inPhase: ["In phase: same sign"], outOfPhase: ["Out of phase: opposite signs"], node: ["node"], notToScale: ["not to scale"], energy: ["energy ↑"] };

/** s02: H₂'s 1s orbitals add in phase (σ, lower) and out of phase (σ*, a node, higher). */
export const moFromOverlapH2: WatchSceneManifest = {
  id: "mo-from-overlap-h2",
  title: "Two 1s orbitals make σ and σ*",
  render: { engine: "manim", script: "lesson_08.py", sceneClass: "MoFromOverlapH2" },
  describe: () =>
    "Two hydrogen 1s orbitals. Added with the same sign, they build up between the nuclei into one bonding orbital, sigma, which sits lower in energy. " +
    "Added with opposite signs, they cancel in the middle, leaving a node: the antibonding orbital, sigma star, which sits higher.",
  reducedMotion: "Opens paused on the last frame: bonding σ (lower) and antibonding σ* (higher, its node marked) beside the ladder; Play starts the video.",
  data: [],
  text: { ...ladderWords, sigma: ["σ  bonding"], sigmaStar: ["σ*  antibonding"] },
  duration: 10,
  poster: 10,
  aspects,
};

/** s05: ethylene's two p orbitals make π (HOMO, filled) and π* (LUMO, empty). */
export const moFromOverlapEthylene: WatchSceneManifest = {
  id: "mo-from-overlap-ethylene",
  title: "Two p orbitals make π and π*",
  render: { engine: "manim", script: "lesson_08.py", sceneClass: "MoFromOverlapEthylene" },
  describe: () =>
    "Two p orbitals stand side by side on ethylene's carbons. Same sign: they merge above and below the double bond into pi, the bonding orbital, lower in energy. " +
    "Opposite signs: a node cuts between the carbons, giving pi star, higher. Pi holds ethylene's last pair: it is the HOMO. Pi star is empty: it is the LUMO.",
  reducedMotion: "Opens paused on the last frame: π labelled HOMO (filled) and π* labelled LUMO (empty) on the ladder; Play starts the video.",
  data: [],
  text: { ...ladderWords, pi: ["π  bonding"], piStar: ["π*  antibonding"], homo: ["HOMO (filled)"], lumo: ["LUMO (empty)"] },
  duration: 10,
  poster: 10,
  aspects,
};

/** s08 (and s15's still): HOMO → LUMO between two ladders becomes the curved arrow N → B. */
export const arrowIsFlow: WatchSceneManifest = {
  id: "arrow-is-flow",
  title: "The arrow is the flow",
  render: { engine: "manim", script: "lesson_08.py", sceneClass: "ArrowIsFlow" },
  describe: () =>
    "Two energy ladders, ammonia on the left and boron trifluoride on the right. An arrow leaves ammonia's highest filled orbital and lands on boron trifluoride's lowest empty orbital. " +
    "The ladders fold away into Lewis drawings, and the arrow becomes the curved arrow from nitrogen's lone pair to boron. Caption: HOMO to LUMO equals the curved arrow.",
  reducedMotion: "Opens paused on the last frame: the Lewis drawings with the curved arrow from N's lone pair to B and the caption; Play starts the video.",
  data: [],
  text: { homoShort: ["HOMO"], lumoShort: ["LUMO"], notToScale: ["not to scale"], caption: ["HOMO → LUMO", "= the curved arrow"] },
  duration: 10,
  poster: 10,
  aspects,
};

export const lesson08Watch = [bf3Nh3Snap, moFromOverlapH2, moFromOverlapEthylene, arrowIsFlow];
