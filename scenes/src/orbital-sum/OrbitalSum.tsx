// orbital-sum: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea } from "../frame.ts";
import { Chip, ink, ModelTag, OrbitalDefs, orbitalLobes, tipOf, type OrbitalAt } from "../hybrid-model/draw.tsx";
import { hybridDirections, type OrbitalKind, type Vec3, type ViewTurn } from "../hybrid-model/model.ts";
import type { SceneProps } from "../types.ts";
import type { OrbitalSumState } from "./manifest.ts";

const FACE: ViewTurn = { yaw: 0, pitch: 0 };
const UP: Vec3 = [0, 1, 0];

export default function OrbitalSum({ state, aspect }: SceneProps<OrbitalSumState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  // Cells: 2s, 2p, 2p, the result, and the set-aside 2p. Row at 16:9; two rows at 9:16.
  const unit = wide ? area.w / 11 : area.w / 6.2;
  const scale = unit * 0.62;
  const chip = Math.max(28, unit * 0.26);
  const word = Math.max(30, unit * 0.3);
  const rowY = wide ? area.y + area.h * 0.5 : area.y + area.h * 0.28;
  const inX = wide ? [1, 2.7, 4.4].map((k) => area.x + unit * k) : [0.9, 3.1, 5.3].map((k) => area.x + unit * k);
  const result = wide ? { x: area.x + unit * 7.4, y: rowY } : { x: area.x + area.w * 0.42, y: area.y + area.h * 0.66 };
  const aside = wide ? { x: area.x + unit * 10.1, y: rowY } : { x: area.x + area.w * 0.86, y: area.y + area.h * 0.66 };
  const filled = state.filled === "yes";

  const cell = (kind: OrbitalKind, x: number, y: number, key: string, dim = false) => {
    const o: OrbitalAt = { kind, axis: UP, colour: "blue", x, y, scale, turn: FACE, key, dim };
    return (
      <g key={key}>
        {orbitalLobes(o).map((d) => d.node)}
        <Chip x={x} y={y + scale * 1.3} text={kind === "s" ? "2s" : "2p"} colour="blue" size={chip} />
      </g>
    );
  };
  const hybrids: OrbitalAt[] = hybridDirections("sp2").hybrids.map((axis, i) => ({
    kind: "sp2",
    axis: [axis[1], axis[0], 0],
    colour: "orange",
    x: result.x,
    y: result.y,
    scale: scale * 1.05,
    turn: FACE,
    key: `h${i}`,
  }));
  const text = (x: number, y: number, s: string, size = word, colour = ink("ink")) => (
    <text x={x} y={y} fill={colour} fontSize={size} fontFamily="var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)" textAnchor="middle" dominantBaseline="central">
      {s}
    </text>
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <OrbitalDefs />
      </defs>
      <ModelTag x={area.x} y={area.y} size={word * 0.8} />
      {cell("s", inX[0], rowY, "s")}
      {text((inX[0] + inX[1]) / 2, rowY, "+", word * 1.6)}
      {cell("p", inX[1], rowY, "p1")}
      {text((inX[1] + inX[2]) / 2, rowY, "+", word * 1.6)}
      {cell("p", inX[2], rowY, "p2")}
      {wide
        ? text((inX[2] + result.x) / 2 - unit * 0.2, rowY, "→", word * 1.8)
        : text(result.x, (rowY + result.y) / 2 + unit * 0.2, "↓", word * 1.8)}
      {filled ? (
        <g data-filled="yes">
          {hybrids.flatMap(orbitalLobes).map((d) => d.node)}
          {hybrids.map((o) => {
            const tip = tipOf(o, 1.15);
            return <Chip key={`c${o.key}`} x={tip.x} y={tip.y} text="sp²" colour="orange" size={chip} />;
          })}
        </g>
      ) : (
        <g data-filled="no">
          <rect x={result.x - unit * 0.8} y={result.y - unit * 0.8} width={unit * 1.6} height={unit * 1.6} fill="none" stroke={ink("muted")} strokeWidth={4} strokeDasharray="14 10" />
          {text(result.x, result.y, "?", word * 2.4, ink("muted"))}
        </g>
      )}
      {cell("p", aside.x, aside.y, "p3", !filled)}
      {text(aside.x, aside.y - scale * 1.3, filled ? "left over" : "set aside", word * 0.75, ink("muted"))}
    </svg>
  );
}
