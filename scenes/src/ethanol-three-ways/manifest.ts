// ethanol-three-ways (Lesson 2 s02 stage 1, s04 stage 2): ethanol drawn three
// ways. Stage 1: the Lewis drawing; each pair of dots between two atoms
// stretches into a line, the lone-pair dots on O stay: Kekulé. Stage 2: the
// five C–H lines and the two C letters fade out and the chain settles into a
// zigzag ending in OH with its lone pairs: line-angle. `all` plays both and
// ends on the three drawings in a row (stacked at 9:16), labelled. Drawn from
// Lesson 2's own structure files; no numbers.
import type { SceneManifest } from "../types.ts";

export type EthanolState = { stage: string };

/** Seconds, per stage on the site; `all` runs both stages back to back, then the row. */
export const TIMES = {
  one: { start: 0.8, end: 3.8 },
  two: { start: 0.8, end: 4.4 },
  all: { one: { start: 0.5, end: 2.5 }, two: { start: 2.8, end: 5 }, row: 5.3 },
};

export const ethanolThreeWays: SceneManifest<EthanolState> = {
  id: "ethanol-three-ways",
  title: "Ethanol three ways: Lewis, Kekulé, line-angle",
  states: {
    stage: {
      kind: "choice",
      label: "Stage",
      options: [
        { id: "1", label: "Lewis to Kekulé" },
        { id: "2", label: "Kekulé to line-angle" }, // cited-data: ok, a stage number, not an angle
        { id: "all", label: "All three" },
      ],
      default: "all",
    },
  },
  describe: ({ stage }) =>
    stage === "1"
      ? "Ethanol drawn with dots: two carbons, an oxygen, six hydrogens. Each pair of dots between two atoms stretches into a line. The two pairs of dots on oxygen that aren't shared stay as dots. That's the Kekulé structure."
      : stage === "2"
        ? "Ethanol's Kekulé structure loses its five C–H bonds and its two C letters. What's left is a zigzag of two lines ending in O H, with oxygen's two lone pairs. Both carbons are now just the end and the corner of the zigzag."
        : "Ethanol three ways, side by side: the Lewis structure with every electron a dot, the Kekulé structure with every shared pair a line, and the line-angle drawing, a two-line zigzag ending in O H.",
  reducedMotion: "Opens paused on the stage's last drawing (the three drawings in a row for All three); Play runs the change.",
  data: [],
  duration: 6,
  poster: { t: 6 },
  video: {
    duration: 6,
    timeline: [{ at: 0, state: { stage: "all" } }],
    poster: 6,
    aspects: ["16:9", "9:16"],
  },
};
