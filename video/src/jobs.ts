// What the video module renders (spec #56, story 110): every registered Scene,
// at each aspect its manifest's `video` block names, at 60 fps, for the
// video's duration. Pure and React-free: the Remotion Root and the render CLI
// both read it, so the compositions and the renders can't disagree.
import { frameSize, type Aspect, type SceneManifest } from "@astratron/scenes";

export const FPS = 60;

export interface VideoJob {
  /** The Remotion composition id and output base name: `<scene>-16x9` | `<scene>-9x16`. */
  id: string;
  sceneId: string;
  aspect: Aspect;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** The frame rendered as the still (the manifest's `video.poster`, kept inside the video). */
  posterFrame: number;
}

export const aspectTag = (aspect: Aspect) => aspect.replace(":", "x");

export function videoJobs(manifests: readonly SceneManifest<any>[]): VideoJob[] {
  return manifests.flatMap((m) => {
    const durationInFrames = Math.round(m.video.duration * FPS);
    return m.video.aspects.map((aspect) => ({
      id: `${m.id}-${aspectTag(aspect)}`,
      sceneId: m.id,
      aspect,
      ...frameSize(aspect),
      fps: FPS,
      durationInFrames,
      posterFrame: Math.min(Math.round(m.video.poster * FPS), durationInFrames - 1),
    }));
  });
}
