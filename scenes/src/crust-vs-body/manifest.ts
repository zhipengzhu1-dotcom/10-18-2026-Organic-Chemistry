// crust-vs-body (Lesson 0 s01 reveal): two bars, carbon's share by mass of Earth's crust and
// of the human body, on one axis with a break so the crust bar is visible. Both values come
// from the cited data (CRC Handbook; ICRP Publication 23).
import type { SceneManifest } from "../types.ts";

export const CRUST = "carbon-abundance/crust.C";
export const BODY = "carbon-abundance/body.C";

export const crustVsBody: SceneManifest<Record<string, never>> = {
  id: "crust-vs-body",
  title: "Carbon: crust vs body",
  states: {},
  describe: (_state, _t, cited) =>
    `Two bars. Carbon is ${cited?.[CRUST]?.display ?? "a tiny share"} of Earth's crust and ${cited?.[BODY]?.display ?? "a large share"} of the human body.`,
  reducedMotion: "Opens paused on the poster frame with both bars drawn; Play grows them once.",
  data: [CRUST, BODY],
  duration: 1.5,
  poster: { t: 1.5 },
  video: { duration: 4, timeline: [{ at: 0, state: {} }], poster: 4, aspects: ["16:9", "9:16"] },
};
