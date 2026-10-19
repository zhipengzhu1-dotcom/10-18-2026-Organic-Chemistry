// en-strip (Lesson 1, s02; one tap away in s03, s04 and u1-bond-polarity-rank):
// a strip of the periodic table, rows 1–3 plus Br, with H, B, C, N, O, F, Cl
// and Br lit and their cited Pauling electronegativity under each letter.
// Arrows say the values rise across a row and up a group.
import type { Cited } from "@astratron/content/data";
import type { SceneManifest } from "../types.ts";

export type EnStripState = { highlight: string };

/** The elements on the strip, with their place in the periodic table (row, group). */
export const strip = [
  { el: "H", name: "hydrogen", row: 1, group: 1 },
  { el: "B", name: "boron", row: 2, group: 13 },
  { el: "C", name: "carbon", row: 2, group: 14 },
  { el: "N", name: "nitrogen", row: 2, group: 15 },
  { el: "O", name: "oxygen", row: 2, group: 16 },
  { el: "F", name: "fluorine", row: 2, group: 17 },
  { el: "Cl", name: "chlorine", row: 3, group: 17 },
  { el: "Br", name: "bromine", row: 4, group: 17 },
] as const;

/** Which elements a Step lights; the rest are dimmed and dashed. */
export const highlights: Record<string, string[]> = {
  all: strip.map((s) => s.el),
  "h-c-o-f-cl": ["H", "C", "O", "F", "Cl"],
  "h-c-n-o-f": ["H", "C", "N", "O", "F"],
  "h-c-o-cl": ["H", "C", "O", "Cl"],
};

export const enRef = (el: string) => `electronegativity-pauling/${el}`;
/** An element's value as shown (2 decimals), from the cited table; "?" if a Step forgot to pass it. */
export const shown = (cited: Record<string, Cited>, el: string) => cited[enRef(el)]?.display ?? "?";

export const enStrip: SceneManifest<EnStripState> = {
  id: "en-strip",
  title: "Electronegativity across the table",
  states: {
    highlight: {
      kind: "choice",
      label: "Highlight",
      options: [
        { id: "all", label: "All eight" },
        { id: "h-c-o-f-cl", label: "H, C, O, F, Cl" },
        { id: "h-c-n-o-f", label: "H, C, N, O, F" },
        { id: "h-c-o-cl", label: "H, C, O, Cl" },
      ],
      default: "all",
    },
  },
  describe: ({ highlight }, _t, cited) => {
    const lit = strip.filter((s) => highlights[highlight]?.includes(s.el));
    return `Electronegativity values: ${lit.map((s) => `${s.name} ${shown(cited, s.el)}`).join(", ")}. Values rise across a row and up a group.`;
  },
  reducedMotion: "Opens on the full strip with every value shown; nothing moves.",
  data: strip.map((s) => enRef(s.el)),
  duration: 2,
  poster: { t: 2 },
  video: {
    duration: 4,
    timeline: [{ at: 0, state: { highlight: "all" } }],
    poster: 3,
    aspects: ["16:9", "9:16"],
  },
};

