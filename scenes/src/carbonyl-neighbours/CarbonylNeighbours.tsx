// carbonyl-neighbours: a pure function of t; see manifest.ts.
import { frameSize, safeArea } from "../frame.ts";
import { CYAN, FONT_DATA, FONT_TEXT, INK } from "../functional-groups/Molecule.tsx";
import { progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { HOLD, LADDER_AT, LADDER_FADE, neighbours, type Neighbour } from "./manifest.ts";

/** Line-angle offsets, in units of `u` (one stick is about 1.5u long). */
const DX = 1.3;
const DY = 0.75;

/**
 * CH₃–C(=O)–X drawn line-angle around the carbonyl carbon at (x, y): the stick on the left,
 * the C=O straight up, the neighbour down to the right. `name` sits beside or below.
 */
function Carbonyl({ x, y, u, n, nameAt, amount }: { x: number; y: number; u: number; n: Neighbour; nameAt: "below" | "right"; amount: number }) {
  const stroke = { stroke: INK, strokeWidth: u * 0.07, strokeLinecap: "round" as const };
  const letter = (lx: number, ly: number, s: string, colour = INK, anchor: "middle" | "start" = "middle") => (
    <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" fontSize={u * 0.6} fill={colour} fontFamily={FONT_DATA}>
      {s}
    </text>
  );
  const end = { x: x + DX * u, y: y + DY * u };
  const trim = 0.3; // share of the stick left bare before a letter
  const toLetter = { x: x + DX * u * (1 - trim), y: y + DY * u * (1 - trim) };
  const off = u * 0.11;
  return (
    <g>
      <line x1={x - DX * u} y1={y + DY * u} x2={x} y2={y} {...stroke} />
      <line x1={x - off} y1={y} x2={x - off} y2={y - 1.15 * u} {...stroke} stroke={CYAN} />
      <line x1={x + off} y1={y} x2={x + off} y2={y - 1.15 * u} {...stroke} stroke={CYAN} />
      {letter(x, y - 1.5 * u, "O", CYAN)}
      <g opacity={amount}>
        {n.kind === "C" ? (
          <line x1={x} y1={y} x2={end.x} y2={end.y} {...stroke} stroke={CYAN} />
        ) : (
          <line x1={x} y1={y} x2={toLetter.x} y2={toLetter.y} {...stroke} stroke={CYAN} />
        )}
        {n.kind === "H" && letter(end.x + u * 0.1, end.y, "H", CYAN)}
        {n.kind === "OH" && letter(end.x - u * 0.2, end.y, "OH", CYAN, "start")}
        {n.kind === "N" && letter(end.x - u * 0.2, end.y, "NH₂", CYAN, "start")}
        {n.kind === "OC" && (
          <>
            {letter(end.x, end.y, "O", CYAN)}
            <line x1={end.x + DX * u * trim} y1={end.y - DY * u * trim} x2={end.x + DX * u} y2={end.y - DY * u} {...stroke} stroke={CYAN} />
          </>
        )}
        <text
          x={nameAt === "below" ? x : x + 3.3 * u}
          y={nameAt === "below" ? y + 2.1 * u : y}
          textAnchor={nameAt === "below" ? "middle" : "start"}
          dominantBaseline="central"
          fontSize={u * 0.62}
          fontWeight={700}
          fill={INK}
          fontFamily={FONT_TEXT}
        >
          {n.name}
        </text>
      </g>
    </g>
  );
}

export default function CarbonylNeighbours({ t, aspect }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const ladder = progress(t, LADDER_AT, LADDER_AT + LADDER_FADE);
  const index = Math.min(neighbours.length - 1, Math.floor(t / HOLD));
  const swapIn = index === 0 ? 1 : progress(t, index * HOLD, index * HOLD + 0.3);

  const single = Math.min(area.w, area.h) / 5;
  const rowH = area.h / neighbours.length;
  const u = Math.min(rowH / 3, area.w / 10);
  const left = area.x + (area.w - 9 * u) / 2 + 1.5 * u;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {ladder < 1 && (
        <g opacity={1 - ladder}>
          <Carbonyl x={width / 2 - single * 0.3} y={height / 2} u={single} n={neighbours[index]} nameAt="below" amount={swapIn} />
        </g>
      )}
      {ladder > 0 && (
        <g opacity={ladder}>
          {neighbours.map((n, i) => (
            <Carbonyl key={n.kind} x={left} y={area.y + rowH * i + rowH * 0.62} u={u} n={n} nameAt="right" amount={1} />
          ))}
        </g>
      )}
    </svg>
  );
}
