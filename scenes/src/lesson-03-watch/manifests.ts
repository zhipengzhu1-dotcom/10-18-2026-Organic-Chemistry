// Lesson 3's three watch-only Scenes (#81): silent, plain Manim CE renders (scenes/manim/lesson_03.py),
// 60 fps, the last frame the poster. Methane's geometry comes from its cited bond length and angle
// (CCCBDB, experimental); the VSEPR model's predictions come from vsepr-model.yaml (cited as a model,
// not a measurement) and are always captioned "model:".
import type { Cited } from "@astratron/content/data";
import type { WatchSceneManifest } from "../types.ts";

const HCH = "methane/a.HCH";
const CH = "methane/r.CH";
const colours = ["elements/C.colour", "elements/H.colour"];
const degrees = (c: Cited | undefined) => (c ? String(c.display).replace("°", "") : "");

/** s01's reveal: the flat Lewis CH₄ lifts off the page into its real, measured shape. */
export const methaneUnflatten: WatchSceneManifest = {
  id: "methane-unflatten",
  title: "Methane isn't flat",
  render: { engine: "manim", script: "lesson_03.py", sceneClass: "MethaneUnflatten" },
  describe: (cited) =>
    "The flat drawing of methane, with a right angle between two hydrogens, lifts off the page. " +
    `The four hydrogens swing out into three dimensions until every H–C–H angle is equal: ${degrees(cited[HCH])} degrees.`,
  reducedMotion: "Opens paused on the last frame: the flat drawing with its right-angle mark beside 3D methane with its measured angle; Play starts the video.",
  data: [CH, HCH, ...colours],
  text: { flat: ["On paper"], real: ["Measured"] },
  duration: 8,
  poster: 8,
  aspects: ["16:9", "9:16"],
};

/** The VSEPR model's predictions, always named as the model's. */
const MODEL = { line: "vsepr-model/linear.angle", triangle: "vsepr-model/trigonal-planar.angle", tetrahedron: "vsepr-model/tetrahedral.angle" };

/** s02: two, three and four electron domains push apart into a line, a flat triangle and a tetrahedron. */
export const domainSpread: WatchSceneManifest = {
  id: "domain-spread",
  title: "Electron domains push apart",
  render: { engine: "manim", script: "lesson_03.py", sceneClass: "DomainSpread" },
  describe: (cited) =>
    `Three panels. Two balloons on a centre push apart until they point in opposite directions: a line, model angle ${degrees(cited[MODEL.line])} degrees. ` +
    `Three balloons spread into a flat triangle, model angle ${degrees(cited[MODEL.triangle])} degrees. ` +
    `Four balloons spread to the corners of a tetrahedron, model angle ${degrees(cited[MODEL.tetrahedron])} degrees.`,
  reducedMotion: "Opens paused on the last frame: all three panels settled, with their names and model angles; Play starts the video.",
  // In panel order; the renderer prints each after its "model:" caption.
  data: [MODEL.line, MODEL.triangle, MODEL.tetrahedron],
  text: {
    names: ["line", "flat triangle", "tetrahedron"],
    captions: ["model:", "model:", "model:"],
  },
  duration: 10,
  poster: 10,
  aspects: ["16:9", "9:16"],
};

/** s08: 3D methane turns until two H's lie in the page; the bonds become line, line, wedge, dash. */
export const wedgeDashMethane: WatchSceneManifest = {
  id: "wedge-dash-methane",
  title: "Lines, wedges and dashes",
  render: { engine: "manim", script: "lesson_03.py", sceneClass: "WedgeDashMethane" },
  describe: () =>
    "Methane turns until two hydrogens lie on a sheet, the page. Those two bonds become plain lines in a V. " +
    "The hydrogen in front of the sheet gets a solid wedge, the one behind gets a hashed wedge. " +
    "The finished drawing: two lines, one wedge and one dash, the wedge and dash next to each other opposite the V.",
  reducedMotion: "Opens paused on the last frame: the model on its sheet beside the finished drawing, each bond labelled; Play starts the video.",
  data: [CH, HCH, ...colours],
  text: { labels: ["in page", "toward you", "away"], sheet: ["the page"] },
  duration: 10,
  poster: 10,
  aspects: ["16:9", "9:16"],
};
