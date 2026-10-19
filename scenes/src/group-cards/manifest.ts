// group-cards (Lesson 5): a grid of cards, one per functional group, each a
// minimal piece with the group drawn bold and the skeleton thin, its name
// underneath. The cards deal in one by one. Groups and layout follow the
// MIT OCW 5.12 Functional Groups sheet (names and structures only).
import type { SceneManifest } from "../types.ts";
import type { FgStructureId } from "../functional-groups/ids.ts";

export type CardsState = { family: string; start: string };

export interface GroupCard {
  name: string;
  structure: FgStructureId;
  /** The atoms drawn bold: the group itself. */
  group: string[];
  /** The card's screen-reader sentence, after its name. */
  says: string;
}

export const families: Record<string, { label: string; cards: GroupCard[]; describe: string }> = {
  hydrocarbon: {
    label: "No oxygen or nitrogen",
    cards: [
      { name: "alkene", structure: "fg-piece-alkene", group: ["a2", "a3"], says: "two carbons joined by a double bond" },
      { name: "alkyne", structure: "fg-piece-alkyne", group: ["a2", "a3"], says: "two carbons joined by a triple bond" },
      { name: "arene", structure: "fg-benzene", group: ["a1", "a2", "a3", "a4", "a5", "a6"], says: "a benzene ring with alternating double bonds" },
      { name: "alkyl halide", structure: "fg-piece-alkyl-halide", group: ["a2", "a3"], says: "a carbon single-bonded to a halogen, X, which is F, Cl, Br or I" },
    ],
    describe: "",
  },
  "single-bond": {
    label: "One heteroatom on single bonds",
    cards: [
      { name: "alcohol", structure: "fg-ethanol", group: ["a2", "a3"], says: "a skeleton carbon with OH" },
      { name: "phenol", structure: "fg-phenol", group: ["a1", "a2", "a3", "a4", "a5", "a6", "a7"], says: "an OH on a benzene ring" },
      { name: "ether", structure: "fg-piece-ether", group: ["a1", "a2", "a3"], says: "an oxygen between two carbons" },
      { name: "sulfide", structure: "fg-piece-sulfide", group: ["a1", "a2", "a3"], says: "a sulfur between two carbons" },
      { name: "amine", structure: "fg-methylamine", group: ["a1", "a2"], says: "a carbon bonded to nitrogen, which also carries hydrogens or carbons" },
    ],
    describe: "",
  },
  carbonyl: {
    label: "The C=O family",
    cards: [
      { name: "aldehyde", structure: "fg-acetaldehyde", group: ["a2", "a3"], says: "a C=O with H on its carbon" },
      { name: "ketone", structure: "fg-acetone", group: ["a1", "a2", "a3", "a4"], says: "a C=O with a carbon on each side" },
      { name: "carboxylic acid", structure: "fg-acetic-acid", group: ["a2", "a3", "a4"], says: "a C=O with OH beside it" },
      { name: "ester", structure: "fg-methyl-acetate", group: ["a2", "a3", "a4", "a5"], says: "a C=O with O–C beside it" },
      { name: "amide", structure: "fg-acetamide", group: ["a2", "a3", "a4"], says: "a C=O with N beside it" },
    ],
    describe: "",
  },
};

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six"];
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
for (const family of Object.values(families))
  family.describe = `${NUMBER_WORDS[family.cards.length]} cards. ${family.cards.map((c) => `${capital(c.name)}: ${c.says}.`).join(" ")}`;

const ALL =
  "All fourteen group cards in three families: " +
  Object.values(families)
    .map((f) => f.cards.map((c) => c.name).join(", "))
    .join("; ") +
  ".";

/** The cards a family shows, in deal order, each with the family it belongs to. */
export function cardsOf(family: string): (GroupCard & { family: string })[] {
  const ids = family === "all" ? Object.keys(families) : [family];
  return ids.flatMap((id) => families[id].cards.map((c) => ({ ...c, family: id })));
}

const DURATION = 4;
/** Seconds after which card `i` of `n` has fully dealt in. */
export function dealt(i: number, n: number, t: number, state: CardsState, reducedMotion: boolean): number {
  if (reducedMotion || state.start === "dealt") return 1;
  const start = 0.2 + (i * (DURATION - 0.8)) / n;
  return Math.min(1, Math.max(0, (t - start) / 0.4));
}

export const groupCards: SceneManifest<CardsState> = {
  id: "group-cards",
  title: "Functional group cards",
  states: {
    family: {
      kind: "choice",
      label: "Family",
      options: [
        ...Object.entries(families).map(([id, f]) => ({ id, label: f.label })),
        { id: "all", label: "All three families" },
      ],
      default: "all",
    },
    start: {
      kind: "choice",
      label: "Start",
      options: [
        { id: "deal", label: "Deal the cards in" },
        { id: "dealt", label: "Already dealt (final frame)" },
      ],
      default: "deal",
    },
  },
  describe: ({ family }) => (family === "all" ? ALL : families[family].describe),
  reducedMotion: "Opens paused on the poster frame with every card already dealt.",
  data: [],
  duration: DURATION,
  // A short one-shot deal / light-up: no Play/Replay/Scrub, so the Step fits a phone screen.
  controls: false,
  poster: { t: DURATION },
  video: {
    duration: 5,
    timeline: [{ at: 0, state: { family: "all", start: "deal" } }],
    poster: 4.5,
    aspects: ["16:9", "9:16"],
  },
};
