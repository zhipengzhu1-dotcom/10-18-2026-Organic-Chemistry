// Drawing helpers shared by Lesson 6's Scenes: placing a pre-rendered
// structure (or bracketed contributors) inside a frame box at a capped scale,
// and a curved arrow that draws itself with a riding electron pair.
import type { Push, Structure } from "@astratron/content";
import { arrowhead, moleculeOf } from "@astratron/content/arrows";
import type { Box } from "../frame.ts";
import { pushArrow } from "../structure/arrows.ts";
import type { Drawing, Point } from "../structure/render.ts";

export const ink = "var(--at-ink, #1d1b26)";
export const electron = "var(--at-blue, #0a64c2)";
export const muted = "var(--at-ink-muted, #57536b)";
export const fontText = "var(--at-font-text, 'Nunito', system-ui, sans-serif)";
export const fontData = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";

/** How a drawing of `width`×`height` sits centred in `box`: its scale (capped) and offset; `at` maps a drawing point into the frame. */
export interface Fit {
  s: number;
  ox: number;
  oy: number;
  at: (p: Point) => Point;
}

export function fit(width: number, height: number, box: Box, maxScale = 4): Fit {
  const s = Math.min(box.w / width, box.h / height, maxScale);
  const ox = box.x + (box.w - width * s) / 2;
  const oy = box.y + (box.h - height * s) / 2;
  return { s, ox, oy, at: (p) => ({ x: ox + p.x * s, y: oy + p.y * s }) };
}

/** The inside of an `<svg>` string, without its root element. */
export const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

/** A pre-rendered drawing placed by `fit`, in the current text colour. */
export function Placed({ svg, at, opacity = 1 }: { svg: string; at: Fit; opacity?: number }) {
  return (
    <g
      transform={`translate(${at.ox} ${at.oy}) scale(${at.s})`}
      opacity={opacity}
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      dangerouslySetInnerHTML={{ __html: inner(svg) }}
    />
  );
}

/** The arrowhead marker an `Arrow` points with; put it once in the Scene's `<defs>`. */
export function ArrowHead({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill={electron} />
    </marker>
  );
}

/**
 * One push drawn as a curved arrow on a placed drawing. `progress` (0–1) draws its first part with
 * an electron pair riding the tip; at 1 the whole arrow shows with its head.
 */
export function Arrow({ drawing, structure, push, at, progress, head }: {
  drawing: Drawing;
  structure: Structure;
  push: Push;
  at: Fit;
  progress: number;
  head: string;
}) {
  const place = arrowhead(moleculeOf(structure), push);
  const arrow = place && pushArrow(drawing, structure, { from: push.from, to: place.to }, place.place);
  if (!arrow) return null;
  const tip = at.at(arrow.at(progress));
  const gap = at.s * 3;
  return (
    <g className="push-arrow">
      <path
        transform={`translate(${at.ox} ${at.oy}) scale(${at.s})`}
        d={arrow.d}
        fill="none"
        stroke={electron}
        strokeWidth={2.5}
        pathLength={1}
        strokeDasharray={`${progress} 1`}
        markerEnd={progress >= 1 ? `url(#${head})` : undefined}
      />
      {progress > 0 && progress < 1 && (
        <g fill={electron}>
          <circle cx={tip.x - gap} cy={tip.y} r={at.s * 2.6} />
          <circle cx={tip.x + gap} cy={tip.y} r={at.s * 2.6} />
        </g>
      )}
    </g>
  );
}
