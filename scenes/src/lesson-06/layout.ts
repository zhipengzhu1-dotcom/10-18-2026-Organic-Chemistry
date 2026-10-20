// Lesson 6 Scene layout: n equal panels inside the safe area, a row at 16:9
// and a column at 9:16, so nothing is cropped at either aspect.
import { safeArea, type Box } from "../frame.ts";
import type { Aspect } from "../types.ts";

export function panelBoxes(aspect: Aspect, n: number): Box[] {
  const area = safeArea(aspect);
  const row = aspect === "16:9";
  const gap = (row ? area.w : area.h) * 0.03;
  const size = ((row ? area.w : area.h) - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) =>
    row
      ? { x: area.x + i * (size + gap), y: area.y, w: size, h: area.h }
      : { x: area.x, y: area.y + i * (size + gap), w: area.w, h: size },
  );
}

/** A box's inner part: `top` of its height kept for a heading, the rest for the drawing (with a margin). */
export function split(box: Box, top: number): { head: Box; body: Box } {
  const h = box.h * top;
  return { head: { ...box, h }, body: { x: box.x, y: box.y + h, w: box.w, h: box.h - h } };
}
