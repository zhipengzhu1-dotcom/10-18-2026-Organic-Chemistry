// methane-unmixed-vs-real (Lesson 4 s01's reveal). Left, the labelled model of what unmixed
// orbitals would give: three H's on three 2p lobes at right angles and a fourth on the round 2s,
// dashed with a "?". Right, methane as measured, rebuilt from its cited C–H length and H–C–H
// angle, with all four lengths labelled and the six angles marked. The spec asks for R3F with the
// right panel in the 3D card; Scenes take no Student input and the video path has no WebGL, so
// both panels are SVG at a fixed view (the Lesson's 3D card comes at s05; notes/82-lesson-4.md).
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";

export type MethanePanelState = { panel: "unmixed" | "real" | "both" };

export const R_CH = "methane/r.CH";
export const A_HCH = "methane/a.HCH";

const left =
  "a model that is not a real molecule: three hydrogens sit on three p orbitals at right angles, and a fourth sits on the round s orbital with a question mark.";
const right = (cited: Record<string, Cited>) =>
  `methane, measured: four identical C–H bonds of ${cited[R_CH]?.display ?? "measured length"}, and all six H–C–H angles ${cited[A_HCH]?.display ?? "equal"}.`;

export const methaneUnmixedVsReal: SceneManifest<MethanePanelState> = {
  id: "methane-unmixed-vs-real",
  title: "Unmixed orbitals vs real methane",
  states: {
    panel: {
      kind: "choice",
      label: "Panel",
      options: [
        { id: "unmixed", label: "Unmixed (model)" },
        { id: "real", label: "Real (measured)" },
        { id: "both", label: "Both" },
      ],
      default: "both",
    },
  },
  describe: ({ panel }, _t, cited) => {
    if (panel === "unmixed") return `A ${left}`;
    if (panel === "real") return `Real ${right(cited)}`;
    return `Left, ${left} Right, real ${right(cited)}`;
  },
  reducedMotion: "Opens paused on both panels with every label shown; there is no idle motion.",
  data: [R_CH, A_HCH, "elements/C.colour", "elements/H.colour"],
  duration: 4,
  controls: false,
  poster: { t: 4 },
  video: {
    duration: 8,
    timeline: [
      { at: 0, state: { panel: "unmixed" } },
      { at: 3, state: { panel: "both" } },
    ],
    poster: 8,
    aspects: ["16:9", "9:16"],
  },
};
