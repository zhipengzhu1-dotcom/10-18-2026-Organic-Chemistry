// en-strip: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea } from "../frame.ts";
import { progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { BLUE, DATA_FONT, INK, LINE, MUTED } from "../lewis.ts";
import { highlights, shown, strip, type EnStripState } from "./manifest.ts";

/** Columns of the strip: group 1, then groups 13–17 after a gap. */
const columnOf = (group: number) => (group === 1 ? 0 : group - 12 + 0.5);

/** An arrowhead with its tip at (x, y), pointing along (dx, dy). */
const head = (x: number, y: number, dx: number, dy: number, cell: number) => {
  const l = cell * 0.18;
  const w = cell * 0.1;
  return [[x, y], [x - dx * l - dy * w, y - dy * l + dx * w], [x - dx * l + dy * w, y - dy * l - dx * w]].map((p) => p.join(",")).join(" ");
};

export default function EnStrip({ t, state, aspect, reducedMotion, cited }: SceneProps<EnStripState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  // 6.5 columns + an arrow column wide; 4 rows + room for labels high.
  const cell = Math.min(area.w / 7.6, area.h / 4.8);
  const left = area.x + (area.w - cell * 7.6) / 2;
  const top = area.y + (area.h - cell * 4.8) / 2;
  const lit = new Set(highlights[state.highlight] ?? []);
  const reveal = reducedMotion ? 1 : progress(t, 0.2, 1.2);

  const box = (row: number, group: number) => ({ x: left + columnOf(group) * cell, y: top + (row - 1) * cell });
  const arrowY = top + 2 * cell + cell * 0.55;
  const arrowX = left + 6.7 * cell;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block" }}
      fontFamily={DATA_FONT}
    >
      {strip.map((s) => {
        const { x, y } = box(s.row, s.group);
        const on = lit.has(s.el);
        const pad = cell * 0.05;
        return (
          <g key={s.el} opacity={on ? 1 : 0.45}>
            <rect
              x={x + pad}
              y={y + pad}
              width={cell - 2 * pad}
              height={cell - 2 * pad}
              fill={on ? "var(--at-paper, #ffffff)" : "none"}
              stroke={on ? BLUE : LINE}
              strokeWidth={cell * 0.03}
              strokeDasharray={on ? undefined : `${cell * 0.06} ${cell * 0.05}`}
            />
            <text x={x + cell / 2} y={y + cell * 0.42} fill={INK} fontSize={cell * 0.38} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {s.el}
            </text>
            <text x={x + cell / 2} y={y + cell * 0.78} fill={on ? BLUE : MUTED} fontSize={cell * 0.22} textAnchor="middle" dominantBaseline="central" opacity={reveal}>
              {shown(cited, s.el)}
            </text>
          </g>
        );
      })}
      {/* Rises across a row (under B…O, where the table has no elements) and up a group (beside 17). */}
      <line x1={left + 1.6 * cell} y1={arrowY} x2={left + 5.3 * cell} y2={arrowY} stroke={INK} strokeWidth={cell * 0.04} />
      <polygon points={head(left + 5.3 * cell, arrowY, 1, 0, cell)} fill={INK} />
      <text x={left + 3.45 * cell} y={arrowY + cell * 0.35} fill={INK} fontSize={cell * 0.24} textAnchor="middle" dominantBaseline="central">
        increases →
      </text>
      <line x1={arrowX} y1={top + 4 * cell} x2={arrowX} y2={top + 1.1 * cell} stroke={INK} strokeWidth={cell * 0.04} />
      <polygon points={head(arrowX, top + 1.1 * cell, 0, -1, cell)} fill={INK} />
      <text x={arrowX} y={top + 4.4 * cell} fill={INK} fontSize={cell * 0.24} textAnchor="middle" dominantBaseline="central">
        ↑ increases
      </text>
    </svg>
  );
}
