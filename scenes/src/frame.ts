// The coordinate frame a Scene draws in. A Scene sets its SVG viewBox (or
// camera) to this frame for its aspect and lays everything out inside it, so
// the whole Scene shows at either aspect with nothing cropped; the player
// letterboxes it (`preserveAspectRatio="xMidYMid meet"`).
import type { Aspect } from "./types.ts";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Video pixels: 1920×1080 at 16:9, 1080×1920 at 9:16. */
export function frameSize(aspect: Aspect): { width: number; height: number } {
  return aspect === "16:9" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
}

/** The frame minus a margin on every side (a fraction of the short side). */
export function safeArea(aspect: Aspect, margin = 0.06): Box {
  const { width, height } = frameSize(aspect);
  const m = Math.min(width, height) * margin;
  return { x: m, y: m, w: width - 2 * m, h: height - 2 * m };
}
