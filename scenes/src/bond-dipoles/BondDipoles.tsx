// bond-dipoles: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea } from "../frame.ts";
import { easeOut, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { CYAN, DATA_FONT, INK, MAGENTA, MUTED } from "../lewis.ts";
import { rank, type BondDipolesState } from "./manifest.ts";

/** When row i slides in (seconds). */
const rowAt = (i: number) => 0.3 + i * 1.0;

export default function BondDipoles({ t, state, aspect, reducedMotion, cited }: SceneProps<BondDipolesState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const rows = rank(state.bonds, cited);
  const most = Math.max(...rows.map((r) => r.delta), 0.01);
  const rowH = area.h / rows.length;
  // In portrait the ΔEN label goes under the bond; in landscape beside it.
  const portrait = aspect === "9:16";
  const unit = Math.min(rowH * (portrait ? 0.26 : 0.36), area.w * 0.08);
  const leftX = portrait ? area.x + area.w * 0.15 : area.x + area.w * 0.12;
  const span = portrait ? area.w * 0.7 : area.w * 0.5;

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
      {rows.map((r, i) => {
        const shown = reducedMotion ? 1 : easeOut(progress(t, rowAt(i), rowAt(i) + 0.6));
        const cy = area.y + rowH * (i + 0.42);
        const ax = leftX;
        const bx = leftX + span;
        const sign = (el: string) => (el === r.minus ? "δ−" : "δ+");
        const tone = (el: string) => (el === r.minus ? MAGENTA : CYAN);
        // The crossed arrow: tail (+) at the δ+ atom, head at the δ− atom; weight follows ΔEN.
        const toB = r.minus === r.b;
        const from = toB ? ax + unit : bx - unit;
        const to = toB ? bx - unit : ax + unit;
        const dir = toB ? 1 : -1;
        const arrowY = cy + unit * 1.15;
        const weight = unit * (0.06 + 0.22 * (r.delta / most));
        const head = unit * 0.45;
        const cross = from + dir * unit * 0.4;
        return (
          <g key={r.label} opacity={shown} transform={`translate(${(1 - shown) * -area.w * 0.05} 0)`}>
            <text x={ax} y={cy} fill={INK} fontSize={unit} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {r.a}
            </text>
            <text x={bx} y={cy} fill={INK} fontSize={unit} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {r.b}
            </text>
            <line x1={ax + unit * 0.7} y1={cy} x2={bx - unit * 0.7} y2={cy} stroke={INK} strokeWidth={unit * 0.08} />
            <text x={ax} y={cy - unit * 0.95} fill={tone(r.a)} fontSize={unit * 0.6} textAnchor="middle" dominantBaseline="central">
              {sign(r.a)}
            </text>
            <text x={bx} y={cy - unit * 0.95} fill={tone(r.b)} fontSize={unit * 0.6} textAnchor="middle" dominantBaseline="central">
              {sign(r.b)}
            </text>
            <line x1={from} y1={arrowY} x2={to - dir * head * 0.8} y2={arrowY} stroke={INK} strokeWidth={weight} />
            <line x1={cross} y1={arrowY - unit * 0.3} x2={cross} y2={arrowY + unit * 0.3} stroke={INK} strokeWidth={unit * 0.08} />
            <polygon
              points={`${to},${arrowY} ${to - dir * head},${arrowY - head * 0.55 - weight / 2} ${to - dir * head},${arrowY + head * 0.55 + weight / 2}`}
              fill={INK}
            />
            <text
              x={portrait ? (ax + bx) / 2 : bx + unit * 1.4}
              y={portrait ? arrowY + unit * 0.95 : cy + unit * 0.55}
              fill={MUTED}
              fontSize={unit * 0.62}
              textAnchor={portrait ? "middle" : "start"}
              dominantBaseline="central"
            >
              ΔEN {r.shown}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
