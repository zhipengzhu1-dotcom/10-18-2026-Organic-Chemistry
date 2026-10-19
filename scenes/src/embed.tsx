// Embeds the site renderer's SVG in a Scene's SVG (Lesson 1 Scenes).
import { fit } from "./lewis.ts";
import type { Box } from "./frame.ts";
import type { Drawing } from "./structure/render.ts";

/** The renderer's SVG placed in a Scene's SVG, fitted to `box`. Ink and cyan lone pairs follow the site tokens. */
export function Embedded({ drawing, box }: { drawing: Drawing; box: Box }) {
  const { scale, x, y } = fit(drawing, box);
  const inner = drawing.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      style={{ color: "var(--at-ink, #f2f0ff)", ["--lone-pair" as string]: "var(--at-electron, #35d4ff)" }}
      fontFamily="var(--at-font-data, 'JetBrains Mono'), ui-monospace, monospace"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
