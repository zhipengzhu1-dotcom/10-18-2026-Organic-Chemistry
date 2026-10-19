// mo-filler: a pure function of state (see manifest.ts). Nothing depends on t: a Manipulate Step
// loops its Scene, and each + / − redraws at once. Schematic levels, no numbers.
import { frameSize, safeArea } from "../frame.ts";
import type { SceneProps } from "../types.ts";
import { DATA_FONT, TEXT_FONT, electron, ink, line, muted } from "../dots/dots.tsx";
import { COMPARE, NAMED, PER_LEVEL, fill, type MoFillerState } from "./manifest.ts";

interface Level {
  x: number;
  y: number;
  w: number;
}

/** One electron as a half-arrow: ↑ (spin up) or ↓, the shape cue for the pair's two spins. */
function HalfArrow({ x, y, h, up }: { x: number; y: number; h: number; up: boolean }) {
  const top = y - h / 2;
  const bottom = y + h / 2;
  const tip = up ? top : bottom;
  const back = up ? h * 0.32 : -h * 0.32;
  // The barb sits on one side only: a half-arrow, as MO diagrams draw electrons.
  const d = `M ${x} ${bottom} L ${x} ${top} M ${x} ${tip} L ${x - h * 0.22} ${tip + back}`;
  return <path className={`electron ${up ? "up" : "down"}`} d={d} stroke={electron} strokeWidth={h * 0.09} strokeLinecap="round" fill="none" />;
}

function LevelLine({ level, label, n, size }: { level: Level; label: string; n: number; size: number }) {
  const h = size * 1.5;
  return (
    <g>
      <line x1={level.x - level.w / 2} y1={level.y} x2={level.x + level.w / 2} y2={level.y} stroke={ink} strokeWidth={size * 0.12} strokeLinecap="round" />
      {n >= 1 && <HalfArrow x={level.x - size * 0.6} y={level.y - h * 0.05} h={h} up />}
      {n >= 2 && <HalfArrow x={level.x + size * 0.6} y={level.y - h * 0.05} h={h} up={false} />}
      <text x={level.x + level.w / 2 + size * 0.5} y={level.y} fill={muted} fontSize={size} dominantBaseline="central" style={{ fontFamily: DATA_FONT }}>
        {label}
      </text>
    </g>
  );
}

/** σ and σ* for n electrons, centred at (x, y), `gap` apart. */
function Pair({ x, y, gap, w, n, size }: { x: number; y: number; gap: number; w: number; n: number; size: number }) {
  const f = fill(n);
  return (
    <>
      <LevelLine level={{ x, y: y - gap / 2, w }} label="σ*" n={f.antibonding} size={size} />
      <LevelLine level={{ x, y: y + gap / 2, w }} label="σ" n={f.bonding} size={size} />
    </>
  );
}

export default function MoFiller({ state, aspect }: SceneProps<MoFillerState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  const n = Math.max(1, Math.min(2 * PER_LEVEL, Math.floor(state.electrons + 1e-9)));

  if (state.show === "three") {
    const size = wide ? 64 : 56;
    const cells = COMPARE.map((c, i) =>
      wide
        ? { ...c, x: area.x + area.w * ((i + 0.5) / 3), y: height / 2 + 40 }
        : { ...c, x: width / 2, y: area.y + area.h * ((i + 0.5) / 3) + 40 },
    );
    const gap = wide ? 360 : 300;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
        {cells.map((c) => (
          <g key={c.formula}>
            <text x={c.x} y={c.y - gap / 2 - size * 1.6} fill={ink} fontSize={size * 1.2} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
              {c.formula}
            </text>
            <Pair x={c.x - size} y={c.y} gap={gap * 0.6} w={size * 3} n={c.electrons} size={size} />
            <text x={c.x} y={c.y + gap / 2 + size * 0.6} fill={ink} fontSize={size * 0.9} textAnchor="middle" style={{ fontFamily: TEXT_FONT }}>
              {`bond order ${fill(c.electrons).order}`}
            </text>
          </g>
        ))}
        <text x={width - area.x} y={height - area.y} fill={muted} fontSize={size * 0.7} textAnchor="end" style={{ fontFamily: TEXT_FONT }}>
          not to scale
        </text>
      </svg>
    );
  }

  const f = fill(n);
  const size = wide ? 64 : 60;
  const mid = { x: width / 2, y: wide ? height / 2 - 40 : height / 2 - 120 };
  const gap = wide ? 420 : 640;
  const side = wide ? 600 : 360;
  const w = wide ? 260 : 240;
  const sigmaStar = { x: mid.x, y: mid.y - gap / 2, w };
  const sigma = { x: mid.x, y: mid.y + gap / 2, w };
  const left = { x: mid.x - side, y: mid.y, w: w * 0.7 };
  const right = { x: mid.x + side, y: mid.y, w: w * 0.7 };
  const tie = (a: Level, b: Level, fromRight: boolean) => (
    <line
      x1={fromRight ? a.x - a.w / 2 : a.x + a.w / 2}
      y1={a.y}
      x2={fromRight ? b.x + b.w / 2 : b.x - b.w / 2}
      y2={b.y}
      stroke={line}
      strokeWidth={5}
      strokeDasharray="14 12"
    />
  );
  const atomLabel = (l: Level) => (
    <text x={l.x} y={l.y + size * 1.3} fill={muted} fontSize={size} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
      1s
    </text>
  );
  const named = NAMED[n];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      {tie(left, sigmaStar, false)}
      {tie(left, sigma, false)}
      {tie(right, sigmaStar, true)}
      {tie(right, sigma, true)}
      <line x1={left.x - left.w / 2} y1={left.y} x2={left.x + left.w / 2} y2={left.y} stroke={muted} strokeWidth={size * 0.12} strokeLinecap="round" />
      <line x1={right.x - right.w / 2} y1={right.y} x2={right.x + right.w / 2} y2={right.y} stroke={muted} strokeWidth={size * 0.12} strokeLinecap="round" />
      {atomLabel(left)}
      {atomLabel(right)}
      <LevelLine level={sigmaStar} label="σ*" n={f.antibonding} size={size} />
      <LevelLine level={sigma} label="σ" n={f.bonding} size={size} />
      <text x={mid.x - w / 2 - size * 0.4} y={sigmaStar.y} fill={muted} fontSize={size * 0.6} textAnchor="end" dominantBaseline="central" style={{ fontFamily: TEXT_FONT }}>
        antibonding
      </text>
      <text x={mid.x - w / 2 - size * 0.4} y={sigma.y} fill={muted} fontSize={size * 0.6} textAnchor="end" dominantBaseline="central" style={{ fontFamily: TEXT_FONT }}>
        bonding
      </text>
      {named && (
        <text className="named" x={mid.x} y={area.y + size} fill={electron} fontSize={size * 1.3} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {named}
        </text>
      )}
      <text x={width - area.x} y={area.y + size * 0.6} fill={muted} fontSize={size * 0.6} textAnchor="end" style={{ fontFamily: TEXT_FONT }}>
        not to scale
      </text>
      {wide ? (
        <text x={mid.x} y={height - area.y - 10} fill={ink} fontSize={50} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {`bonding ${f.bonding} · antibonding ${f.antibonding} · bond order (${f.bonding} − ${f.antibonding}) ÷ 2 = ${f.order}`}
        </text>
      ) : (
        <text x={mid.x} y={height - area.y - 160} fill={ink} fontSize={52} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          <tspan x={mid.x}>{`bonding ${f.bonding} · antibonding ${f.antibonding}`}</tspan>
          <tspan x={mid.x} dy={80}>{`bond order (${f.bonding} − ${f.antibonding}) ÷ 2 = ${f.order}`}</tspan>
        </text>
      )}
    </svg>
  );
}
