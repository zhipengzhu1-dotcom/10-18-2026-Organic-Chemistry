// dots-and-sticks (Lesson 1: s06, s07 reveal, u1-fc-oxygen-three-bonds
// reveal): one atom in a structure is ringed and its formal charge is counted
// line by line: valence, minus lone-pair electrons (each pair pulses as it is
// counted), minus bonds (each stick pulses), equals the formal charge. Counts
// only, no measured data.
import type { Structure } from "@astratron/content";
import type { SceneManifest } from "../types.ts";
import { formalCharge, star, VALENCE, type Partner } from "../lewis.ts";

export type DotsAndSticksState = { example: string };

/** The numbers of one count. */
export interface Count {
  valence: number;
  lonePairElectrons: number;
  bonds: number;
  charge: number;
}

export interface Example {
  structure: Structure;
  count: Count;
  /** What a screen reader hears for this count. */
  say: (c: Count) => string;
}

const H: Partner = { el: "H" };
const LOOSE_SINGLE: Partner = { el: "*" };
const LOOSE_DOUBLE: Partner = { el: "*", order: 2 };

function example(id: string, el: string, lp: number, partners: Partner[], turn: number, say: Example["say"]): Example {
  const count = {
    valence: VALENCE[el],
    lonePairElectrons: 2 * lp,
    bonds: partners.reduce((n, p) => n + (p.order ?? 1), 0),
    charge: formalCharge(el, lp, partners),
  };
  return { structure: star(id, el, lp, partners, turn), count, say };
}

/** "plus 1", "minus 1", "zero". */
export const signedWords = (n: number) => (n > 0 ? `plus ${n}` : n < 0 ? `minus ${-n}` : "zero");
/** "+1", "−1", "0". */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

const quarter = Math.PI / 4;
const hydronium = example("hydronium", "O", 1, [H, H, H], Math.PI / 2, (c) =>
  `Hydronium. Oxygen: ${c.valence} valence electrons, minus ${c.lonePairElectrons} in its one lone pair, minus ${c.bonds} bonds, equals ${signedWords(c.charge)}.`,
);
const hydroxide = example("hydroxide", "O", 3, [H], 0, (c) =>
  `Hydroxide. Oxygen: ${c.valence}, minus ${c.lonePairElectrons} in three lone pairs, minus ${c.bonds} bond, equals ${signedWords(c.charge)}.`,
);
const ammonium = example("ammonium", "N", 0, [H, H, H, H], quarter, (c) =>
  `Nitrogen: ${c.valence} valence electrons, no lone pairs, ${c.bonds} bonds. ${c.valence} minus ${c.lonePairElectrons} minus ${c.bonds} is ${signedWords(c.charge)}.`,
);
const oxygenThreeBonds = example("oxygen-three-bonds", "O", 1, [LOOSE_SINGLE, LOOSE_DOUBLE], Math.PI, (c) =>
  `Oxygen: ${c.valence} valence electrons, minus ${c.lonePairElectrons} in one lone pair, minus ${c.bonds} bonds, equals ${signedWords(c.charge)}.`,
);

// Practice Problems (#87): the PS1 Q1 bromine and boron fragments.
const bromineTwoBonds = example("bromine-two-bonds", "Br", 2, [LOOSE_SINGLE, LOOSE_SINGLE], 0, (c) => // cited-data: ok, counts of lone pairs and bonds
  `Bromine: ${c.valence} valence electrons, minus ${c.lonePairElectrons} in two lone pairs, minus ${c.bonds} bonds, equals ${signedWords(c.charge)}.`,
);
const boronFourBonds = example("boron-four-bonds", "B", 0, [LOOSE_SINGLE, LOOSE_SINGLE, LOOSE_DOUBLE], Math.PI / 2, (c) => // cited-data: ok, counts of lone pairs and bonds
  `Boron: ${c.valence} valence electrons, no lone pairs, ${c.bonds} bonds. ${c.valence} minus ${c.lonePairElectrons} minus ${c.bonds} equals ${signedWords(c.charge)}.`,
);

/** Each choice of the `example` state: the counts it runs, in order. */
export const examples: Record<string, Example[]> = {
  "hydronium-hydroxide": [hydronium, hydroxide],
  ammonium: [ammonium],
  "oxygen-three-bonds": [oxygenThreeBonds],
  "bromine-two-bonds": [bromineTwoBonds],
  "boron-four-bonds": [boronFourBonds],
};

export const dotsAndSticks: SceneManifest<DotsAndSticksState> = {
  id: "dots-and-sticks",
  title: "Count dots and sticks",
  states: {
    example: {
      kind: "choice",
      label: "Example",
      options: [
        { id: "hydronium-hydroxide", label: "H₃O⁺ then OH⁻" },
        { id: "ammonium", label: "NH₄⁺" },
        { id: "oxygen-three-bonds", label: "O with 3 bonds" }, // cited-data: ok, a count of bonds
        { id: "bromine-two-bonds", label: "Br with 2 bonds" }, // cited-data: ok, a count of bonds
        { id: "boron-four-bonds", label: "B with 4 bonds" }, // cited-data: ok, a count of bonds
      ],
      default: "hydronium-hydroxide",
    },
  },
  describe: ({ example: which }) => (examples[which] ?? []).map((e) => e.say(e.count)).join(" "),
  reducedMotion: "Opens paused on the finished count beside each structure; nothing pulses.",
  data: [],
  duration: 8,
  poster: { t: 8 },
  video: {
    duration: 8,
    timeline: [{ at: 0, state: { example: "hydronium-hydroxide" } }],
    poster: 7.5,
    aspects: ["16:9", "9:16"],
  },
};
