// mo-filler (Lesson 8 s04, the signature Manipulate Step): two 1s levels at the sides, σ (lower)
// and σ* (higher) in the middle, schematic and "not to scale". Electrons are half-arrows (↑ then
// ↓), always landing in the lowest level with room, two per level. A live counter reads the bond
// order. `show: three` is the Rank Problem's reveal: H₂, He₂⁺ and He₂ side by side.
// Counts only: no chemistry numbers (the bond orders are worked out by counting).
import type { SceneManifest } from "../types.ts";

export type MoFillerState = { electrons: number; show: string };

/** Two electrons per level (the Pauli rule this Lesson uses). */
export const PER_LEVEL = 2;

const HALF = "½";
/** Bond order as the counter writes it: "½", "1", "1½"… */
function orderText(bonding: number, antibonding: number): string {
  const twice = bonding - antibonding;
  const whole = Math.floor(twice / 2);
  return twice % 2 ? `${whole || ""}${HALF}` : String(whole);
}
const ORDER_WORDS: Record<string, string> = { [HALF]: "one half", "0": "0", "1": "1" };

/** Where n electrons go: σ first, then σ*. */
export function fill(electrons: number) {
  const bonding = Math.min(electrons, PER_LEVEL);
  const antibonding = Math.max(0, Math.min(electrons - PER_LEVEL, PER_LEVEL));
  return { bonding, antibonding, order: orderText(bonding, antibonding) };
}

/** The molecule an electron count makes, where the Lesson names one. */
export const NAMED: Record<number, string> = { 2: "H₂", 4: "He₂" };

/** The Rank Problem's three cards, strongest bond first. */
export const COMPARE = [
  { formula: "H₂", electrons: 2 },
  { formula: "He₂⁺", electrons: 3 },
  { formula: "He₂", electrons: 4 },
] as const;

const DIAGRAM = "Two 1s levels at the sides. In the middle, sigma below and sigma star above. Not to scale.";

function describe({ electrons, show }: MoFillerState): string {
  if (show === "three")
    return "H₂: two bonding, none antibonding, bond order 1. He₂ plus: two bonding, one antibonding, one half. He₂: two and two, zero.";
  const f = fill(electrons);
  const named = NAMED[electrons] ? ` This is ${NAMED[electrons]}.` : "";
  return `${electrons} electrons. Bonding ${f.bonding}, antibonding ${f.antibonding}. Bond order ${ORDER_WORDS[f.order] ?? f.order}.${named} ${DIAGRAM}`;
}

export const moFiller: SceneManifest<MoFillerState> = {
  id: "mo-filler",
  title: "Fill the orbitals",
  states: {
    electrons: { kind: "range", label: "Electrons", min: 1, max: 4, step: 1, default: 1, stepper: true },
    show: {
      kind: "choice",
      label: "Show",
      options: [
        { id: "one", label: "One diagram" },
        { id: "three", label: "H₂, He₂⁺ and He₂" },
      ],
      default: "one",
    },
  },
  describe: (state) => describe(state),
  reducedMotion: "Opens paused on the poster frame; each + or − redraws the levels at once.",
  data: [],
  duration: 1,
  controls: false,
  poster: { t: 1 },
  video: {
    duration: 8,
    timeline: [
      { at: 0, state: { electrons: 1, show: "one" } },
      { at: 1.5, state: { electrons: 2 } },
      { at: 3, state: { electrons: 3 } },
      { at: 4.5, state: { electrons: 4 } },
    ],
    poster: 7,
    aspects: ["16:9", "9:16"],
  },
};
