// crust-vs-body: a pure function of (t, cited); see manifest.ts. The axis runs from zero with
// a break: the stretch before the break is magnified so the crust's share shows as a bar.
import { frameSize, safeArea } from "../frame.ts";
import { easeOut, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { DATA_FONT, HAND_FONT, TEXT_FONT, pink, pinkFill, blue, blueFill, ink, line, muted } from "../dots/dots.tsx";
import { BODY, CRUST } from "./manifest.ts";

/** Share of the axis length before the break. */
const MAGNIFIED = 0.25;

export default function CrustVsBody({ t, aspect, reducedMotion, cited }: SceneProps) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  const crust = Number(cited[CRUST]?.value ?? 0);
  const body = Number(cited[BODY]?.value ?? 1);

  // The break sits a little past the crust value; the axis ends a little past the body value.
  const breakAt = crust * 2.5;
  const end = body * 1.25;
  const axis = { x: area.x + (wide ? 560 : 40), w: area.w - (wide ? 760 : 240) };
  const at = (v: number) =>
    v <= breakAt ? (v / breakAt) * MAGNIFIED * axis.w : (MAGNIFIED + ((v - breakAt) / (end - breakAt)) * (1 - MAGNIFIED)) * axis.w;
  const grow = reducedMotion ? 1 : easeOut(progress(t, 0.1, 1.2));

  const rows = [
    { label: "Earth's crust", value: crust, display: cited[CRUST]?.display ?? "", colour: pink, fill: pinkFill },
    { label: "Human body", value: body, display: cited[BODY]?.display ?? "", colour: blue, fill: blueFill },
  ];
  const rowH = wide ? 320 : 420;
  const top = wide ? area.y + 200 : area.y + 500;
  const label = wide ? 84 : 72;
  const barH = wide ? 130 : 140;
  const breakX = axis.x + MAGNIFIED * axis.w;
  const axisY = top + rows.length * rowH - rowH / 2 + barH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <text x={width / 2} y={area.y + 60} fill={muted} fontSize={wide ? 72 : 68} textAnchor="middle" style={{ fontFamily: HAND_FONT }}>
        Carbon, share by mass
      </text>
      {rows.map((row, i) => {
        const y = top + i * rowH;
        const w = at(row.value) * grow;
        const labelAt = wide ? { x: axis.x - 30, y: y + barH / 2, anchor: "end" as const } : { x: axis.x, y: y - 40, anchor: "start" as const };
        return (
          <g key={row.label}>
            <text x={labelAt.x} y={labelAt.y} fill={ink} fontSize={label} textAnchor={labelAt.anchor} dominantBaseline="central" style={{ fontFamily: HAND_FONT }}>
              {row.label}
            </text>
            <rect className="bar" x={axis.x} y={y} width={w} height={barH} fill={row.fill} stroke={row.colour} strokeWidth={6} />
            <text x={axis.x + w + 24} y={y + barH / 2} fill={ink} fontSize={label} dominantBaseline="central" opacity={grow} style={{ fontFamily: DATA_FONT }}>
              {row.display}
            </text>
          </g>
        );
      })}
      <line x1={axis.x} y1={axisY} x2={breakX - 18} y2={axisY} stroke={line} strokeWidth={6} />
      <line x1={breakX + 18} y1={axisY} x2={axis.x + axis.w} y2={axisY} stroke={line} strokeWidth={6} />
      <g className="axis-break" stroke={line} strokeWidth={6} fill="none">
        <path d={`M ${breakX - 30} ${axisY + 24} L ${breakX - 6} ${axisY - 24}`} />
        <path d={`M ${breakX + 6} ${axisY + 24} L ${breakX + 30} ${axisY - 24}`} />
      </g>
      <text x={axis.x} y={axisY + 70} fill={muted} fontSize={wide ? 56 : 52} style={{ fontFamily: TEXT_FONT }}>
        axis broken to show the crust
      </text>
    </svg>
  );
}
