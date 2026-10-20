// hybrid-mixing: Lesson 4 s02's watch-only Scene, a silent plain Manim CE render
// (scenes/manim/lesson_04.py). One 2s sphere and three 2p dumbbells (solid and hatched lobes)
// slide to the centre, blend, and split into four sp³ lobes that swing out to the corners of a
// tetrahedron; "4 in → 4 out" writes on; the "model" label stays on screen. The lobe shapes are
// the Lesson's hybrid model (scenes/src/hybrid-model, repeated in the script). The spec also asks
// for sp² and sp cuts for a future video channel; only sp³ (the one this Lesson plays) is rendered
// (notes/82-lesson-4.md). No measured numbers.
import type { WatchSceneManifest } from "../types.ts";

const text = {
  model: ["model"],
  counter: ["4 in → 4 out"],
  chips: ["2s", "2p", "sp³"],
};

export const hybridMixing: WatchSceneManifest = {
  id: "hybrid-mixing",
  title: "Mixing 2s and 2p into sp³ (model)",
  render: { engine: "manim", script: "lesson_04.py", sceneClass: "HybridMixing" },
  describe: () =>
    "One round 2s orbital and three dumbbell-shaped 2p orbitals slide together and blend. Four identical sp3 orbitals come out, each one big lobe, and swing out to the four corners of a tetrahedron. Four in, four out. Labelled: model.",
  reducedMotion: "Opens paused on the poster frame, the four sp³ lobes in a tetrahedron with \"4 in → 4 out\"; Play starts the video.",
  data: [],
  text,
  duration: 10,
  poster: 10,
  aspects: ["16:9", "9:16"],
};
