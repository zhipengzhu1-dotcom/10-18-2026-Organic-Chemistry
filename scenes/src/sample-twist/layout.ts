// sample-twist layout: the molecule on its stage and the overlap bar, placed
// for each aspect so nothing is cropped (row at 16:9, column at 9:16).
import { safeArea, type Box } from "../frame.ts";
import type { Aspect } from "../types.ts";

export function layoutTwist(aspect: Aspect): { stage: Box; bar: Box } {
  const area = safeArea(aspect);
  const gap = area.w * 0.04;
  if (aspect === "16:9") {
    const barW = area.w * 0.12;
    return {
      stage: { x: area.x, y: area.y, w: area.w - barW - gap, h: area.h },
      bar: { x: area.x + area.w - barW, y: area.y, w: barW, h: area.h },
    };
  }
  const barH = area.h * 0.1;
  return {
    stage: { x: area.x, y: area.y, w: area.w, h: area.h - barH - gap },
    bar: { x: area.x, y: area.y + area.h - barH, w: area.w, h: barH },
  };
}
