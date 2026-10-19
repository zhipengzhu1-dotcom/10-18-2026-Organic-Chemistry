// group-spotlight (Lesson 5): a molecule's skeleton dims and its functional
// groups light one by one, each with a solid ring and a label chip (name +
// formula piece), so the highlight is never colour alone. It is what Lesson
// 5's reveals show (s01, s06, s09, capsaicin, amoxicillin). No numbers: the
// drawings are the content's structure files, laid out by RDKit.js.
import type { SceneManifest } from "../types.ts";
import type { FgStructureId } from "../functional-groups/ids.ts";

export type SpotlightState = { view: string; labels: string };

export interface SpotRegion {
  atoms: string[];
  /** The chip's name, e.g. "carboxylic acid". */
  label: string;
  /** The chip's formula piece, e.g. "C(=O)OH". */
  piece: string;
  /** lit = a group the Step asked for; plain = outlined and labelled but not one of them (aspartame's "no C=O"). */
  tone: "lit" | "plain";
}

export interface SpotView {
  label: string;
  molecules: { id: FgStructureId; regions: SpotRegion[] }[];
  /** The spec's screen-reader text for the reveal. */
  describe: string;
}

const lit = (label: string, piece: string, atoms: string[]): SpotRegion => ({ label, piece, atoms, tone: "lit" });

export const views: Record<string, SpotView> = {
  "acid-pair": {
    label: "Acetic acid and amoxicillin",
    molecules: [
      { id: "fg-acetic-acid", regions: [lit("carboxylic acid", "C(=O)OH", ["a2", "a3", "a4"])] },
      { id: "fg-amoxicillin", regions: [lit("carboxylic acid", "C(=O)OH", ["a22", "a23", "a24"])] },
    ],
    describe:
      "Acetic acid and amoxicillin side by side. Everything dims except one piece on each: a carbon double-bonded to O and single-bonded to OH. Both are labelled carboxylic acid.",
  },
  ethinylestradiol: {
    label: "Ethinylestradiol",
    molecules: [
      {
        id: "fg-ethinylestradiol",
        regions: [
          lit("phenol", "Ar–OH", ["a16", "a17", "a18", "a19", "a20", "a21", "a22"]),
          lit("alkyne", "C≡C", ["a11", "a12"]),
          lit("alcohol", "C–OH", ["a13"]),
        ],
      },
    ],
    describe:
      "Ethinylestradiol. Skeleton dimmed. Lit: the left ring with its OH, labelled phenol; the carbon–carbon triple bond at top right, labelled alkyne; the OH beside it, labelled alcohol.",
  },
  aspartame: {
    label: "Aspartame",
    molecules: [
      {
        id: "fg-aspartame",
        regions: [
          lit("ester", "C(=O)O–C", ["a1", "a2", "a3", "a4"]),
          lit("amide", "C(=O)–N", ["a13", "a14", "a15"]),
          lit("carboxylic acid", "C(=O)OH", ["a18", "a19", "a20"]),
          { label: "amine, no C=O", piece: "NH₂", atoms: ["a21"], tone: "plain" },
          { label: "arene, no C=O", piece: "C₆H₅", atoms: ["a7", "a8", "a9", "a10", "a11", "a12"], tone: "plain" },
        ],
      },
    ],
    describe:
      "Aspartame. Lit: at the left, C=O with O–CH₃, ester; in the middle, C=O with NH, amide; at the right, C=O with OH, carboxylic acid. Also outlined: NH₂, amine, and the benzene ring, arene, neither with a C=O.",
  },
  capsaicin: {
    label: "Capsaicin",
    molecules: [
      {
        id: "fg-capsaicin",
        regions: [
          lit("alkene", "C=C", ["a4", "a5"]),
          lit("amide", "C(=O)–N", ["a10", "a11", "a12"]),
          lit("phenol", "Ar–OH", ["a14", "a15", "a16", "a17", "a18", "a19", "a20"]),
          lit("ether", "C–O–C", ["a21", "a22"]),
        ],
      },
    ],
    describe:
      "Capsaicin. Lit: a C=C in the left-hand tail, alkene; C=O with NH in the middle, amide; on the ring, OH, phenol, and O–CH₃, ether.",
  },
  amoxicillin: {
    label: "Amoxicillin",
    molecules: [
      {
        id: "fg-amoxicillin",
        regions: [
          lit("phenol", "Ar–OH", ["a14", "a15", "a16", "a17", "a18", "a19", "a20"]),
          lit("amine", "NH₂", ["a21"]),
          lit("amide", "C(=O)–N", ["a10", "a11", "a12"]),
          lit("amide (β-lactam)", "C(=O)–N", ["a4", "a8", "a9"]),
          lit("sulfide", "C–S–C", ["a6"]),
          lit("carboxylic acid", "C(=O)OH", ["a22", "a23", "a24"]),
        ],
      },
    ],
    describe:
      "Amoxicillin. Skeleton dimmed. Lit, left to right: the benzene ring with its OH, phenol; NH₂, amine; C=O and NH in the middle, amide; inside the four-membered ring, C=O and N, a second amide called the beta-lactam; S in the five-membered ring, sulfide; C=O with OH at the bottom right, carboxylic acid.",
  },
};

export const spotlightViews = Object.keys(views);

/** Seconds: the first region lights at LEAD, the last by DURATION − 1, each taking FADE. */
export const LEAD = 0.4;
export const FADE = 0.4;
const DURATION = 5;

/** How far region `i` of `n` has lit at `t` (all of them under reduced motion). */
export function litAmount(i: number, n: number, t: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const start = LEAD + (i * (DURATION - 1 - LEAD - FADE)) / Math.max(1, n - 1);
  return Math.min(1, Math.max(0, (t - start) / FADE));
}

export const groupSpotlight: SceneManifest<SpotlightState> = {
  id: "group-spotlight",
  title: "Spot the functional groups",
  states: {
    view: {
      kind: "choice",
      label: "Molecule",
      options: spotlightViews.map((id) => ({ id, label: views[id].label })),
      default: "amoxicillin",
    },
    labels: {
      kind: "choice",
      label: "Labels",
      options: [
        { id: "on", label: "On" },
        { id: "off", label: "Off" },
      ],
      default: "on",
    },
  },
  describe: ({ view }) => views[view].describe,
  reducedMotion: "Opens paused on the poster frame with every group lit and labelled at once.",
  data: [],
  duration: DURATION,
  // A short one-shot deal / light-up: no Play/Replay/Scrub, so the Step fits a phone screen.
  controls: false,
  poster: { t: DURATION },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { view: "amoxicillin", labels: "on" } }],
    poster: 5,
    aspects: ["16:9", "9:16"],
  },
};
