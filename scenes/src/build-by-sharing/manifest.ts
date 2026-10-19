// build-by-sharing (Lesson 0 s05; its last frame in s09; methane in the octet-count Check
// Problem). Stage 1: a carbon with four single dots and a tray of H atoms; an H dropped on a
// single dot snaps there and the two electrons become a shared pair. Stage 2: two CH₃ pieces,
// each carbon with one single dot, join into ethane. A live count of the electrons around each
// carbon. A model drawing: electron counts only, no measured numbers.
import type { SceneManifest, SceneMove } from "../types.ts";
import { OUTER } from "../dots/outer.ts";

/** Each of carbon's four sides holds a single dot or a bonded H. */
export type Side = "n" | "e" | "s" | "w";
export type SharingState = {
  stage: string;
  n: string;
  e: string;
  s: string;
  w: string;
  joined: string;
  /** live: electron counts shown; hidden: none (the Check Problem asks for it); pairs: the pairs light up and are counted. */
  count: string;
};

export const SIDES: Side[] = ["n", "e", "s", "w"];
export const SIDE_NAMES: Record<Side, string> = { n: "top", e: "right", s: "bottom", w: "left" };
/** H atoms in the tray at the start: more than carbon can take. */
export const TRAY = 6;
const CARBON = OUTER.C;
/** A full outer shell: carbon's own electrons plus one more for each of its single dots. */
const FULL = 2 * CARBON;
/** Hydrogen's shell is full with two electrons. */
const H_FULL = 2 * OUTER.H;

const bonded = (s: SharingState) => SIDES.filter((side) => s[side] === "H");
const free = (s: SharingState) => SIDES.filter((side) => s[side] !== "H");
const words = ["no", "one", "two", "three", "four", "five", "six"];

function describe(s: SharingState): string {
  if (s.stage === "2") {
    if (s.joined === "yes")
      return `Ethane, two carbons sharing a pair, each with three hydrogens.${s.count === "hidden" ? "" : ` Each carbon holds ${FULL} electrons.`}`;
    return `Two CH₃ pieces: each carbon shares a pair with three hydrogens and has one single dot left.${
      s.count === "hidden" ? "" : ` Each carbon holds ${FULL - 1} electrons.`
    }`;
  }
  const b = bonded(s).length;
  if (s.count === "hidden")
    return b === CARBON
      ? "Methane, CH₄: a carbon sharing a pair of electrons with each of four hydrogens. Every shared pair is drawn as two dots."
      : `A carbon atom with ${words[b]} hydrogens bonded and ${words[CARBON - b]} single dots.`;
  const tray = TRAY - b;
  const lead =
    b === 0
      ? `A carbon atom with four single outer electrons, and a tray of ${tray} hydrogen atoms with one electron each.`
      : `A carbon atom with ${b} ${b === 1 ? "hydrogen" : "hydrogens"} bonded, each by a shared pair, and ${
          CARBON - b
        } single ${CARBON - b === 1 ? "dot" : "dots"} left; ${tray} hydrogen atoms in the tray.`;
  const pairs = s.count === "pairs" ? ` Counting the shared pairs: ${bonded(s).map((_, i) => 2 * (i + 1)).join(", ")}.` : "";
  return `${lead}${pairs} Carbon holds ${CARBON + b} electrons.`;
}

function drop(s: SharingState, { handle, target }: SceneMove) {
  if (s.stage === "2") {
    if (s.joined === "yes") return null;
    const [mine, other] = handle === "piece-left" ? ["left", "right"] : handle === "piece-right" ? ["right", "left"] : [];
    if (!mine || (target !== `dot-${other}` && target !== `piece-${other}`)) return null;
    return { state: { joined: "yes" }, say: `The two carbons share a pair. Each carbon holds ${FULL} electrons.` };
  }
  if (!handle.startsWith("tray-")) return null;
  if (target.startsWith("h-")) return { refused: `That H holds ${H_FULL} already. It's full.` };
  const side = target === "carbon" ? free(s)[0] : (target.slice("dot-".length) as Side);
  if (target === "carbon" && !side) return { refused: `Carbon already holds ${FULL}, and there's no single dot left. It's full.` };
  if (!SIDES.includes(side) || s[side] === "H") return null;
  const now = bonded(s).length + 1;
  return { state: { [side]: "H" } as Partial<SharingState>, say: `H bonded to carbon. Carbon holds ${CARBON + now} electrons.` };
}

function next(s: SharingState): SceneMove | undefined {
  if (s.stage === "2") return s.joined === "yes" ? undefined : { handle: "piece-left", target: "dot-right" };
  const side = free(s)[0];
  return side ? { handle: `tray-${bonded(s).length + 1}`, target: `dot-${side}` } : undefined;
}

const choice = (label: string, ids: string[], labels: string[], def: string) => ({
  kind: "choice" as const,
  label,
  options: ids.map((id, i) => ({ id, label: labels[i] })),
  default: def,
});
const sideState = (side: Side) => choice(`Carbon's ${SIDE_NAMES[side]} side`, ["dot", "H"], ["single dot", "bonded H"], "dot");

export const buildBySharing: SceneManifest<SharingState> = {
  id: "build-by-sharing",
  title: "Build by sharing",
  states: {
    stage: choice("Stage", ["1", "2"], ["Carbon and a tray of H", "Two CH₃ pieces"], "1"),
    n: sideState("n"),
    e: sideState("e"),
    s: sideState("s"),
    w: sideState("w"),
    joined: choice("Pieces", ["no", "yes"], ["apart", "joined"], "no"),
    count: choice("Electron count", ["live", "hidden", "pairs"], ["shown", "hidden", "pair by pair"], "live"),
  },
  describe: (state) => describe(state),
  reducedMotion: "Opens paused on the poster frame; every drop redraws at once, and the pair-by-pair count shows all pairs lit.",
  interact: { drop, next },
  data: [],
  duration: 3,
  poster: { t: 3 },
  video: {
    duration: 9,
    timeline: [
      { at: 0, state: { stage: "1" } },
      { at: 1, state: { n: "H" } },
      { at: 2, state: { e: "H" } },
      { at: 3, state: { s: "H" } },
      { at: 4, state: { w: "H" } },
      { at: 5.5, state: { stage: "2" } },
      { at: 7, state: { joined: "yes" } },
    ],
    poster: 9,
    aspects: ["16:9", "9:16"],
  },
};
