// sample-twist: a pure function of (t, state); see manifest.ts.
import { frameSize } from "../frame.ts";
import { pulse } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { layoutTwist } from "./layout.ts";
import { overlapOf, sampleTwist, type TwistState } from "./manifest.ts";

const plus = "var(--at-electron, #35d4ff)";
const minus = "var(--at-boss, #ff4fd8)";
const ink = "var(--at-ink, #f2f0ff)";
const line = "var(--at-line, #6b6890)";

export default function SampleTwist({ t, state, aspect, reducedMotion, cited }: SceneProps<TwistState>) {
  const { width, height } = frameSize(aspect);
  const { stage, bar } = layoutTwist(aspect);
  const carbon = String(cited["elements/C.colour"]?.value ?? line);

  const glow = reducedMotion ? 0.5 : pulse(t, sampleTwist.duration);
  const breathe = 1 + 0.03 * glow;
  const c = Math.cos((state.twist * Math.PI) / 180);
  const overlap = overlapOf(state.twist);

  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const unit = Math.min(stage.w, stage.h);
  const r = unit * 0.07;
  const half = Math.min(stage.w * 0.2, unit * 0.32);
  const left = cx - half;
  const right = cx + half;
  const lobeRx = r * 0.9;
  const lobeRy = unit * 0.17 * breathe;

  /** One p orbital: two lobes along the vertical, foreshortened by `scale` (cos of its twist); a negative scale flips it. */
  const orbital = (x: number, scale: number, key: string) => {
    const ry = lobeRy * (0.2 + 0.8 * Math.abs(scale));
    const up = scale >= 0 ? plus : minus;
    const down = scale >= 0 ? minus : plus;
    const reach = r * 0.6 + ry;
    return (
      <g key={key}>
        <ellipse cx={x} cy={cy - reach} rx={lobeRx} ry={ry} fill={up} fillOpacity={0.55} stroke={up} strokeWidth={4} />
        <ellipse cx={x} cy={cy + reach} rx={lobeRx} ry={ry} fill={down} fillOpacity={0.25} stroke={down} strokeWidth={4} strokeDasharray="12 10" />
      </g>
    );
  };

  const vertical = aspect === "16:9";
  const fill = vertical
    ? { x: bar.x, y: bar.y + bar.h * (1 - overlap) * 0.85, w: bar.w, h: bar.h * 0.85 * overlap }
    : { x: bar.x, y: bar.y + bar.h * 0.35, w: bar.w * overlap, h: bar.h * 0.65 };
  const track = vertical ? { ...bar, h: bar.h * 0.85 } : { ...bar, y: bar.y + bar.h * 0.35, h: bar.h * 0.65 };
  const labelY = vertical ? bar.y + bar.h * 0.95 : bar.y + bar.h * 0.22;
  const labelX = vertical ? bar.x + bar.w / 2 : bar.x;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect
        x={left}
        y={cy - r * 0.6 - lobeRy * 2}
        width={right - left}
        height={lobeRy * 2}
        fill={plus}
        opacity={overlap * (0.15 + 0.2 * glow)}
      />
      <line x1={left} y1={cy} x2={right} y2={cy} stroke={ink} strokeWidth={r * 0.25} strokeLinecap="round" />
      {orbital(left, 1, "left")}
      {orbital(right, c, "right")}
      {[left, right].map((x) => (
        <g key={x}>
          <circle cx={x} cy={cy} r={r} fill={carbon} stroke={ink} strokeWidth={4} />
          <text x={x} y={cy} fill="#111" fontSize={r} fontWeight={700} textAnchor="middle" dominantBaseline="central">
            C
          </text>
        </g>
      ))}

      <rect x={track.x} y={track.y} width={track.w} height={track.h} fill="none" stroke={line} strokeWidth={4} />
      <rect x={fill.x} y={fill.y} width={fill.w} height={fill.h} fill={plus} />
      <text
        x={labelX}
        y={labelY}
        fill={ink}
        fontSize={vertical ? bar.w * 0.22 : bar.h * 0.28}
        textAnchor={vertical ? "middle" : "start"}
        dominantBaseline="central"
      >
        π overlap (model)
      </text>
    </svg>
  );
}
