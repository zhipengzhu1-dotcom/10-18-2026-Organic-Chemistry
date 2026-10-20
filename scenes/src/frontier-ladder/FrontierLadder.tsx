// frontier-ladder: a pure function of (state, cited); see manifest.ts. Static: nothing depends on t.
import { frameSize, safeArea } from "../frame.ts";
import type { SceneProps } from "../types.ts";
import { DATA_FONT, TEXT_FONT, boss, electron, ink, line, muted } from "../dots/dots.tsx";
import { FLOWS, ladders, type FrontierLadderState, type Ladder } from "./manifest.ts";

/** The Scene frame's own ground (both themes), behind a label that sits over an arrow. */
const surface = "var(--at-surface, #1b1838)";

function HalfArrow({ x, y, h, up, w }: { x: number; y: number; h: number; up: boolean; w: number }) {
  const top = y - h / 2;
  const bottom = y + h / 2;
  const tip = up ? top : bottom;
  const back = up ? h * 0.32 : -h * 0.32;
  return <path className="electron" d={`M ${x} ${bottom} L ${x} ${top} M ${x} ${tip} L ${x - h * 0.24} ${tip + back}`} stroke={electron} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

/** A vertical bracket from y1 to y2 at x, ticks pointing toward `side` (−1 left, +1 right); its label runs up the far side. */
function Bracket({ x, y1, y2, side, label, size, dashed = false, colour = muted, pill = false }: { x: number; y1: number; y2: number; side: number; label: string; size: number; dashed?: boolean; colour?: string; pill?: boolean }) {
  const tick = 18 * side;
  const lx = x - side * (size * 0.75);
  const ly = (y1 + y2) / 2;
  return (
    <g>
      <path d={`M ${x + tick} ${y1} L ${x} ${y1} L ${x} ${y2} L ${x + tick} ${y2}`} stroke={colour} strokeWidth={5} fill="none" strokeDasharray={dashed ? "14 10" : undefined} />
      {pill && <rect x={lx - size * 0.7} y={ly - label.length * size * 0.33} width={size * 1.4} height={label.length * size * 0.66} rx={size * 0.5} fill={surface} />}
      <text x={lx} y={ly} fill={colour} fontSize={size} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${lx} ${ly})`} style={{ fontFamily: DATA_FONT }}>
        {label}
      </text>
    </g>
  );
}

export default function FrontierLadder({ state, aspect, cited }: SceneProps<FrontierLadderState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  const size = wide ? 54 : 40;
  const span = { top: area.y + (wide ? 230 : 330), bottom: area.y + area.h - (wide ? 90 : 160) };
  const pair = ladders(state.molecules, cited, span);
  const xs = wide ? [width * 0.3, width * 0.7] : [width * 0.28, width * 0.72];
  const levelW = wide ? 340 : 300;
  const nh3bf3 = state.molecules === "nh3-bf3";
  const flows = !nh3bf3 || state.flow === "none" ? [] : state.flow === "both" ? (["nh3-bf3", "bf3-nh3"] as const) : ([state.flow] as ("nh3-bf3" | "bf3-nh3")[]);
  const smaller = Number(cited[FLOWS["nh3-bf3"].ref]?.value ?? 0) <= Number(cited[FLOWS["bf3-nh3"].ref]?.value ?? 0) ? "nh3-bf3" : "bf3-nh3";

  const panelOf = (l: Ladder, i: number) => {
    const x = xs[i];
    const outer = i === 0 ? -1 : 1;
    const inner = -outer;
    // 16:9: each value just past the level's outer end; 9:16 (narrow): over the outer end of the level.
    const valueX = x + outer * (levelW / 2 + (wide ? 18 : 0));
    const valueAnchor = wide === outer < 0 ? "end" : "start";
    /** The gap bracket: between the panels at 16:9 (the values sit outside), outside at 9:16. */
    const gapSide = wide ? inner : outer;
    return (
      <g key={l.molecule.key}>
        <text x={x} y={area.y + size * 1.2} fill={ink} fontSize={size * 1.5} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {l.molecule.formula}
        </text>
        <rect x={x - size * 2.4} y={area.y + size * 1.9} width={size * 4.8} height={size * 1.3} rx={size * 0.65} fill="none" stroke={line} strokeWidth={3} />
        <text x={x} y={area.y + size * 2.55} fill={muted} fontSize={size * 0.75} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: TEXT_FONT }}>
          Computed
        </text>
        {(["lumo", "homo"] as const).map((k) => {
          const rung = l[k];
          return (
            <g key={k}>
              <line x1={x - levelW / 2} y1={rung.y} x2={x + levelW / 2} y2={rung.y} stroke={ink} strokeWidth={7} strokeLinecap="round" strokeDasharray={k === "lumo" ? "18 10" : undefined} />
              {k === "homo" && (
                <>
                  <HalfArrow x={x + inner * (levelW / 2 - 65) - 25} y={rung.y - size * 0.75} h={size * 1.2} up w={6} />
                  <HalfArrow x={x + inner * (levelW / 2 - 65) + 25} y={rung.y - size * 0.75} h={size * 1.2} up={false} w={6} />
                </>
              )}
              <text x={x} y={rung.y + size * 1.2} fill={muted} fontSize={size * 0.75} textAnchor="middle" style={{ fontFamily: TEXT_FONT }}>
                {k === "homo" ? "HOMO (filled)" : "LUMO (empty)"}
              </text>
              <text x={valueX} y={wide ? rung.y : rung.y - size * 0.45} fill={ink} fontSize={size} textAnchor={valueAnchor} dominantBaseline={wide ? "central" : undefined} style={{ fontFamily: DATA_FONT }}>
                {rung.energy?.display ?? ""}
              </text>
            </g>
          );
        })}
        {!nh3bf3 && l.gap && (
          <Bracket x={x + gapSide * (levelW / 2 + 30)} y1={l.lumo.y} y2={l.homo.y} side={-gapSide} label={`gap ${l.gap.display}`} size={size * 0.8} />
        )}
        {state.ring === "ethylene-homo" && l.molecule.key === "ethylene" && (
          <ellipse className="ring" cx={x} cy={l.homo.y} rx={levelW * 0.7} ry={size * 1.3} fill="none" stroke={boss} strokeWidth={6} strokeDasharray="16 10" />
        )}
      </g>
    );
  };

  const flowOf = (id: "nh3-bf3" | "bf3-nh3", k: number) => {
    const f = FLOWS[id];
    const from = pair[f.from].homo;
    const to = pair[f.to].lumo;
    const dir = f.to > f.from ? 1 : -1;
    const x1 = xs[f.from] + dir * (levelW / 2 + 10);
    const x2 = xs[f.to] - dir * (levelW / 2 + 10);
    const solid = id === smaller;
    const colour = solid ? electron : muted;
    // Bend the curve so the two flows don't overlap: one bows up-left, the other down-right.
    const cx = (x1 + x2) / 2 + (k === 0 ? -1 : 1) * 40;
    const cy = Math.min(from.y, to.y) + (k === 0 ? 40 : 140);
    const end = { x: x2, y: to.y };
    const tx = end.x - cx;
    const ty = end.y - cy;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    const head = 34;
    // The bracket stands where the arrow lands, from the source HOMO's height (a dotted guide) up to the target LUMO.
    const bracketX = xs[f.to] - dir * (levelW / 2 + 26);
    return (
      <g key={id} className={`flow flow-${id} ${solid ? "solid" : "dashed"}`}>
        <path d={`M ${x1} ${from.y} Q ${cx} ${cy} ${end.x} ${end.y}`} stroke={colour} strokeWidth={8} fill="none" strokeDasharray={solid ? undefined : "18 12"} />
        <polygon
          points={`${end.x},${end.y} ${end.x - ux * head - uy * head * 0.5},${end.y - uy * head + ux * head * 0.5} ${end.x - ux * head + uy * head * 0.5},${end.y - uy * head - ux * head * 0.5}`}
          fill={colour}
        />
        <line x1={x1} y1={from.y} x2={bracketX} y2={from.y} stroke={colour} strokeWidth={3} strokeDasharray="3 9" />
        <Bracket
          x={bracketX}
          y1={to.y}
          y2={from.y}
          side={dir}
          pill
          label={cited[f.ref]?.display ?? ""}
          size={size * 0.8}
          dashed={!solid}
          colour={colour}
        />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <text x={area.x} y={span.top - size * 1.6} fill={muted} fontSize={size * 0.7} style={{ fontFamily: TEXT_FONT }}>
        ↑ energy
      </text>
      {pair.map(panelOf)}
      {flows.map(flowOf)}
    </svg>
  );
}
