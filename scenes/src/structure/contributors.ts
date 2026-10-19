// Resonance contributors drawn the textbook way: side by side, joined by ↔,
// the whole set closed in one pair of square brackets (Lesson 6 drawing rule).
// Takes drawings from `drawStructure` and returns one SVG string, so Scenes,
// build-time pages and video frames share it.
import type { Drawing, Point } from "./render.ts";

const GAP = 22; // space either side of ↔
const JOIN_W = 28; // width given to the ↔ glyph
const BRACKET_W = 10; // bracket serif length
const BRACKET_PAD = 8; // space inside the brackets
const STROKE = 2;
const FONT = 26;

export interface ContributorsDrawing {
  svg: string;
  viewBox: string;
  width: number;
  height: number;
  /** Where each contributor's own drawing starts (its top-left), in this SVG's coordinates. */
  offsets: Point[];
}

/** Contributors left to right, ↔ between each pair, inside one pair of brackets; each is centred vertically. */
export function drawContributors(drawings: Drawing[]): ContributorsDrawing {
  const height = Math.max(...drawings.map((d) => d.height));
  const offsets: Point[] = [];
  const parts: string[] = [];
  let x = BRACKET_W + BRACKET_PAD;
  drawings.forEach((d, i) => {
    if (i > 0) {
      x += GAP;
      parts.push(
        `<text class="contributor-join" x="${x + JOIN_W / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="central" font-size="${FONT}" fill="currentColor">↔</text>`,
      );
      x += JOIN_W + GAP;
    }
    const at = { x, y: (height - d.height) / 2 };
    offsets.push(at);
    const inner = d.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    parts.push(
      `<svg class="contributor" x="${at.x}" y="${at.y}" width="${d.width}" height="${d.height}" viewBox="${d.viewBox}" overflow="visible">${inner}</svg>`,
    );
    x += d.width;
  });
  x += BRACKET_PAD;
  const width = x + BRACKET_W;
  const top = STROKE;
  const bottom = height - STROKE;
  const bracket = (edge: number, dir: 1 | -1) =>
    `<path class="contributor-bracket" d="M${edge + dir * BRACKET_W},${top} H${edge} V${bottom} H${edge + dir * BRACKET_W}" fill="none" stroke="currentColor" stroke-width="${STROKE}"/>`;
  parts.push(bracket(STROKE, 1), bracket(width - STROKE, -1));
  const viewBox = `0 0 ${width} ${height}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="structure contributors" viewBox="${viewBox}" width="${width}" height="${height}" aria-hidden="true" font-family="'JetBrains Mono', ui-monospace, monospace">` +
    parts.join("") +
    `</svg>`;
  return { svg, viewBox, width, height, offsets };
}
