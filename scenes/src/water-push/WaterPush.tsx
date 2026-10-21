// water-push: a pure function of t; see manifest.ts.
import { frameSize } from "../frame.ts";
import { easeInOut, lerp, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { DATA_FONT, Dot, DotsBeside, Letter, SharedPair, pink, blue, ink, pairAt } from "../dots/dots.tsx";
import { BEATS } from "./manifest.ts";

/** The class of the ring around the new O–H pair. */
const HIGHLIGHT = "new-bond";

export default function WaterPush({ t, aspect }: SceneProps) {
  const { width, height } = frameSize(aspect);
  const wide = aspect === "16:9";
  const reach = wide ? 300 : 260;
  const size = wide ? 140 : 130;
  const r = 15;
  const o = { x: wide ? 860 : 540, y: height / 2 };
  const h1 = { x: o.x - reach, y: o.y };

  const drawn = progress(t, BEATS.arrow[0], BEATS.arrow[1]);
  const moved = easeInOut(progress(t, BEATS.move[0], BEATS.move[1]));
  const lit = t >= BEATS.lit;
  const ionAt = { x: lerp(o.x + reach * 1.6, o.x + reach, moved), y: o.y };

  // The pushed lone pair: from beside O (facing H⁺) to the middle of the new O–H bond.
  const near = size * 0.62;
  const pairCentre = { x: lerp(o.x + near, (o.x + ionAt.x) / 2, moved), y: o.y };
  const pushed = pairAt(pairCentre, 0, r * 3);

  // The curved arrow: from the lone pair, arching over, to H⁺.
  const from = { x: o.x + near, y: o.y - r * 3 };
  const to = { x: o.x + reach * 1.6 - size * 0.45, y: o.y - size * 0.45 };
  const ctrl = { x: (from.x + to.x) / 2, y: o.y - reach * 0.9 };
  const arrowOpacity = drawn * (1 - moved);
  const ring = { x: r * 3.6, y: r * 4.2, stroke: 6 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <Letter at={h1} el="H" size={size} />
      <Letter at={o} el="O" size={size} />
      {SharedPair({ a: h1, b: o, r })}
      {DotsBeside({ at: o, deg: -90, d: near, r, count: 2 })}
      {DotsBeside({ at: o, deg: 90, d: near, r, count: 2 })}
      {pushed.map((p, i) => (
        <Dot key={i} at={p} r={r} />
      ))}
      {!lit && (
        <text x={o.x + size * 0.48} y={o.y - size * 0.5} fill={pink} fontSize={size * 0.5} opacity={1 - moved} style={{ fontFamily: DATA_FONT }}>
          −
        </text>
      )}
      <Letter at={ionAt} el={lit ? "H" : "H⁺"} size={size} colour={ink} />
      {arrowOpacity > 0 && (
        <g opacity={arrowOpacity} stroke={blue} strokeWidth={8} fill="none">
          <path d={`M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`} />
          <path d={`M ${to.x - 34} ${to.y - 14} L ${to.x} ${to.y} L ${to.x - 12} ${to.y - 38}`} />
        </g>
      )}
      {lit && (
        <ellipse className={HIGHLIGHT} cx={(o.x + ionAt.x) / 2} cy={o.y} rx={ring.x} ry={ring.y} fill="none" stroke={blue} strokeWidth={ring.stroke} />
      )}
    </svg>
  );
}
