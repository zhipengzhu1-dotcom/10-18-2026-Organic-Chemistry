// What the video module renders: every registered Scene at both aspect ratios, 60 fps.
import { describe, expect, it } from "vitest";
import { sceneManifests } from "@astratron/scenes/manifests";
import { piTwist } from "../../scenes/src/pi-twist/manifest.ts";
import { videoJobs } from "../src/jobs.ts";

describe("videoJobs", () => {
  it("renders a Scene (Lesson 4's pi-twist) at 1920×1080 and 1080×1920, 60 fps, for its video duration", () => {
    const jobs = videoJobs([piTwist]);
    expect(jobs).toEqual([
      {
        id: "pi-twist-16x9",
        sceneId: "pi-twist",
        aspect: "16:9",
        width: 1920,
        height: 1080,
        fps: 60,
        durationInFrames: 480, // 8 s × 60
        posterFrame: 0, // poster at 0 s
      },
      {
        id: "pi-twist-9x16",
        sceneId: "pi-twist",
        aspect: "9:16",
        width: 1080,
        height: 1920,
        fps: 60,
        durationInFrames: 480,
        posterFrame: 0,
      },
    ]);
  });

  it("covers every Scene in the registry at both aspect ratios", () => {
    const jobs = videoJobs(sceneManifests);
    for (const m of sceneManifests)
      expect(jobs.filter((j) => j.sceneId === m.id).map((j) => j.aspect).sort()).toEqual(["16:9", "9:16"]);
  });

  it("keeps the poster frame inside the video", () => {
    const [job] = videoJobs([{ ...piTwist, video: { ...piTwist.video, poster: 8 } }]);
    expect(job!.posterFrame).toBe(479);
  });
});
