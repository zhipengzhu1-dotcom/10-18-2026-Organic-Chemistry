// rule-ladder (Lesson 7 s05): four rungs light in turn: 1 full octets,
// 2 fewest charges, 3 − on the more electronegative atom, 4 charges close
// together. Then acetamide's two contributors climb the ladder: rung 1 ties
// (both ✓), rung 2 decides (✓ neutral, ✗ charged), and the neutral card is
// tagged "major". With `rung` set to one rule, only that rung lights.
import type { SceneManifest } from "../types.ts";

export type Rung = "1" | "2" | "3" | "4";
export type RuleLadderState = { rung: Rung | "all" };

export const RULES: { id: Rung; title: string; spoken: string }[] = [
  { id: "1", title: "Full octets", spoken: "Rule one, full octets." },
  { id: "2", title: "Fewest charges", spoken: "Rule two, fewest charges." },
  { id: "3", title: "− on the more electronegative atom", spoken: "Rule three, negative charge on the more electronegative atom." },
  { id: "4", title: "Charges close together", spoken: "Rule four, charges close together." },
];

export const ruleLadder: SceneManifest<RuleLadderState> = {
  id: "rule-ladder",
  title: "Four rules, in order",
  states: {
    rung: {
      kind: "choice",
      label: "Rule",
      options: [...RULES.map((r) => ({ id: r.id, label: `Rule ${r.id}` })), { id: "all", label: "All four" }],
      default: "all",
    },
  },
  describe: ({ rung }) =>
    rung === "all"
      ? `${RULES.map((r) => r.spoken).join(" ")} Acetamide's two drawings tie on rule one; rule two picks the neutral drawing as major.`
      : RULES.find((r) => r.id === rung)!.spoken,
  reducedMotion: "Opens paused on the poster frame: all four rungs lit with the acetamide verdict, nothing lighting in turn.",
  data: [],
  duration: 8.5,
  poster: { t: 8.5 },
  video: {
    duration: 10,
    timeline: [{ at: 0, state: { rung: "all" } }],
    poster: 9,
    aspects: ["16:9", "9:16"],
  },
};
