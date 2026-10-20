// four-domain-family (Lesson 3, s05; s15's final frame): CH₄, NH₃ and H₂O side by side, rebuilt
// from their cited (experimental) bond lengths and angles, all in the same orientation and
// turning together. Lone pairs are translucent lobes labelled "lone pair (sketch)". Under each:
// the shape name and the measured angle; a dashed line reads the VSEPR model's tetrahedral angle
// (cited as a model value, vsepr-model.yaml).
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";
import { colourRef, shapeRefs } from "../shapes-3d/shapes.ts";

export type FourDomainState = { labels: string };

/** The tetrahedron model's prediction, cited as the model's (never a measurement). */
export const MODEL_ANGLE = "vsepr-model/tetrahedral.angle";

export const FAMILY = [
  { key: "methane", angle: "methane/a.HCH", angleName: "H–C–H", words: "Methane: four hydrogens, tetrahedral" },
  {
    key: "nh3",
    angle: "ammonia/a.HNH",
    angleName: "H–N–H",
    words: "Ammonia: three hydrogens below the nitrogen and one lone pair above, trigonal pyramidal",
  },
  { key: "water", angle: "water/a.HOH", angleName: "H–O–H", words: "Water: two hydrogens and two lone pairs, bent" },
] as const;

/** Seconds of the opening turn; the Scene ends (and its poster sits) side on. */
export const TURN_SECONDS = 8;

const degrees = (c: Cited | undefined) => (c ? String(c.display).replace("°", "") : "");

export const fourDomainFamily: SceneManifest<FourDomainState> = {
  id: "four-domain-family",
  title: "Four domains: three shapes",
  states: {
    labels: {
      kind: "choice",
      label: "Labels",
      options: [
        { id: "angles", label: "Names and measured angles" },
        { id: "names", label: "Names only" },
      ],
      default: "angles",
    },
  },
  describe: ({ labels }, _t, cited) =>
    labels === "names"
      ? "Methane tetrahedral, ammonia trigonal pyramidal, water bent."
      : `Three molecules side by side. ${FAMILY.map((m) => `${m.words}, ${m.angleName} ${degrees(cited[m.angle])} degrees.`).join(" ")} ` +
        `The tetrahedron model predicts ${degrees(cited[MODEL_ANGLE])} degrees for all three.`,
  reducedMotion: "Opens paused side on, with every name and angle shown; Play turns the three together once.",
  data: [...FAMILY.flatMap((m) => shapeRefs(m.key)), MODEL_ANGLE, ...["C", "N", "O", "H"].map(colourRef)],
  duration: TURN_SECONDS,
  poster: { t: TURN_SECONDS },
  video: {
    duration: TURN_SECONDS + 2,
    timeline: [{ at: 0, state: { labels: "angles" } }],
    poster: TURN_SECONDS + 1,
    aspects: ["16:9", "9:16"],
  },
};
