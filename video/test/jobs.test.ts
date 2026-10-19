// What the video module renders: every registered Scene at both aspect ratios, 60 fps.
import { describe, expect, it } from "vitest";
import { sceneManifests } from "@astratron/scenes/manifests";
import { sampleTwist } from "../../scenes/src/sample-twist/manifest.ts";
import { videoJobs } from "../src/jobs.ts";

describe("videoJobs", () => {
  it("renders the sample Scene at 1920×1080 and 1080×1920, 60 fps, for its video duration", () => {
    const jobs = videoJobs([sampleTwist]);
    expect(jobs).toEqual([
      {
        id: "sample-twist-16x9",
        sceneId: "sample-twist",
        aspect: "16:9",
        width: 1920,
        height: 1080,
        fps: 60,
        durationInFrames: 480, // 8 s × 60
        posterFrame: 240, // poster at 4 s
      },
      {
        id: "sample-twist-9x16",
        sceneId: "sample-twist",
        aspect: "9:16",
        width: 1080,
        height: 1920,
        fps: 60,
        durationInFrames: 480,
        posterFrame: 240,
      },
    ]);
  });

  it("covers every Scene in the registry at both aspect ratios", () => {
    const jobs = videoJobs(sceneManifests);
    for (const m of sceneManifests)
      expect(jobs.filter((j) => j.sceneId === m.id).map((j) => j.aspect).sort()).toEqual(["16:9", "9:16"]);
  });

  it("keeps the poster frame inside the video", () => {
    const [job] = videoJobs([{ ...sampleTwist, video: { ...sampleTwist.video, poster: 8 } }]);
    expect(job!.posterFrame).toBe(479);
  });
});
