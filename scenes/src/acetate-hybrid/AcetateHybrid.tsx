// acetate-hybrid: a pure function of (t, state); see manifest.ts.
import type { Structure } from "@astratron/content";
import { replay, toStructure } from "@astratron/content/arrows";
import { frameSize, safeArea } from "../frame.ts";
import { electron, fit, fontData, ink, Placed } from "../lesson-06/draw.tsx";
import { lesson6Structures } from "../lesson-06/structures.ts";
import { easeInOut, progress } from "../motion.ts";
import { drawContributors } from "../structure/contributors.ts";
import { drawStructure, type Point, type Segment } from "../structure/render.ts";
import type { SceneProps } from "../types.ts";
import { HYBRID, type HybridState } from "./manifest.ts";

const SIDE = 7; // how far the dashed second line sits beside the solid one, in drawing units
const TRIM = 15; // how far the dashed line stops short of each letter
const LABEL_OUT = 30; // how far a length label sits off its line
const DELTA_OUT = 30; // how far δ− sits beyond its oxygen

const acetate = lesson6Structures.acetate;
const swapped = toStructure(replay(acetate, [{ from: "a4", to: "b3" }, { from: "b2", to: "a3" }]).at(-1)!.molecule);
const contributors = drawContributors([drawStructure(acetate), drawStructure(swapped)]);

/** The hybrid's skeleton: both C–O single, no charges; the partial second lines and δ− are drawn on top. */
const skeleton: Structure = {
  ...acetate,
  atoms: acetate.atoms.map(({ charge: _c, ...a }) => a),
  bonds: acetate.bonds.map((b) => ({ ...b, order: 1 as const })),
};
const hybrid = drawStructure(skeleton, ["lone-pairs", "charges"]);
const carbon = "a2";
const oxygens = [
  { atom: "a3", line: "b2", ref: "acetate/r.CO.a" },
  { atom: "a4", line: "b3", ref: "acetate/r.CO.b" },
];

export default function AcetateHybrid({ t, state, aspect, reducedMotion, cited }: SceneProps<HybridState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const unitSize = Math.min(width, height);
  const final = state.stage === "hybrid";
  const fade = final ? 1 : reducedMotion ? (t >= HYBRID.fadeFrom ? 1 : 0) : easeInOut(progress(t, HYBRID.fadeFrom, HYBRID.fadeTo));
  const labels = final || reducedMotion ? fade : easeInOut(progress(t, HYBRID.fadeTo, HYBRID.labelsTo));
  const pair = fit(contributors.width, contributors.height, area, 4);
  const one = fit(hybrid.width, hybrid.height, { ...area, y: area.y + area.h * 0.1, h: area.h * 0.8 }, 3.4);
  const c = hybrid.atoms[carbon];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block", color: ink }}>
      {fade < 1 && <Placed svg={contributors.svg} at={pair} opacity={1 - fade} />}
      {fade > 0 && (
        <g opacity={fade}>
          <Placed svg={hybrid.svg} at={one} />
          {oxygens.map(({ atom, line, ref }) => {
            const o = hybrid.atoms[atom];
            const other = hybrid.atoms[oxygens.find((x) => x.atom !== atom)!.atom];
            const seg = hybrid.bonds[line];
            const dashed = beside(seg, other, SIDE, TRIM);
            const p = one.at({ x: dashed.x1, y: dashed.y1 });
            const q = one.at({ x: dashed.x2, y: dashed.y2 });
            const away = along(c, o, DELTA_OUT);
            const delta = one.at(away);
            const label = one.at(beside(seg, other, -LABEL_OUT, 0, true));
            return (
              <g key={atom}>
                <line
                  className="partial-bond"
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  stroke={ink}
                  strokeWidth={one.s * 2}
                  strokeDasharray={`${one.s * 5} ${one.s * 5}`}
                />
                <text x={delta.x} y={delta.y} textAnchor="middle" dominantBaseline="central" fill={electron} fontSize={unitSize * 0.045} style={{ fontFamily: fontData }}>
                  δ−
                </text>
                {cited[ref] && (
                  <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fill={electron} opacity={labels} fontSize={unitSize * 0.04} style={{ fontFamily: fontData }}>
                    {cited[ref].display}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/**
 * A copy of a line moved `by` toward the point `toward` (negative: away from it), trimmed `trim`
 * at each end; with `mid`, only its midpoint (as a segment's first point).
 */
function beside(seg: Segment, toward: Point, by: number, trim: number): Segment;
function beside(seg: Segment, toward: Point, by: number, trim: number, mid: true): Point;
function beside(seg: Segment, toward: Point, by: number, trim: number, mid?: true): Segment | Point {
  const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) || 1;
  const ux = (seg.x2 - seg.x1) / len;
  const uy = (seg.y2 - seg.y1) / len;
  let nx = -uy;
  let ny = ux;
  const mx = (seg.x1 + seg.x2) / 2;
  const my = (seg.y1 + seg.y2) / 2;
  if (nx * (toward.x - mx) + ny * (toward.y - my) < 0) [nx, ny] = [-nx, -ny];
  if (mid) return { x: mx + nx * by, y: my + ny * by };
  return {
    x1: seg.x1 + nx * by + ux * trim,
    y1: seg.y1 + ny * by + uy * trim,
    x2: seg.x2 + nx * by - ux * trim,
    y2: seg.y2 + ny * by - uy * trim,
  };
}

/** The point `by` beyond `to`, on the line from `from` through `to`. */
function along(from: Point, to: Point, by: number): Point {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: to.x + ((to.x - from.x) / len) * by, y: to.y + ((to.y - from.y) / len) * by };
}
