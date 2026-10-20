// outer-electrons: a pure function of t; see manifest.ts.
import { frameSize } from "../frame.ts";
import { progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { AtomDots, TEXT_FONT, line, muted, type Pt } from "../dots/dots.tsx";
import { VALENCE } from "@astratron/content/valence";
import { BEAT, ROW } from "./manifest.ts";

export default function OuterElectrons({ t, aspect, reducedMotion }: SceneProps) {
  const { width, height } = frameSize(aspect);
  const wide = aspect === "16:9";
  const size = wide ? 150 : 170;
  const atoms = [...ROW, "Ne"];
  // 16:9: one row, neon set apart on the right. 9:16: three rows of two, neon last.
  const place = (i: number): Pt =>
    wide
      ? { x: 220 + i * 270 + (i === atoms.length - 1 ? 120 : 0), y: 470 }
      : { x: i % 2 === 0 ? 300 : 780, y: 380 + Math.floor(i / 2) * 470 };
  const shown = (i: number) => (reducedMotion ? 1 : progress(t, i * BEAT, i * BEAT + BEAT));
  const neon = place(atoms.length - 1);
  const labelAt = wide ? { x: neon.x - 60, y: 770 } : { x: width / 2, y: 1660 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      {atoms.map((el, i) => (
        <AtomDots key={el} at={place(i)} el={el} n={VALENCE[el]} size={size} r={16} opacity={shown(i)} />
      ))}
      {wide && <line x1={neon.x - 200} y1={300} x2={neon.x - 200} y2={640} stroke={line} strokeWidth={4} strokeDasharray="12 12" />}
      <text
        x={labelAt.x}
        y={labelAt.y}
        fill={muted}
        fontSize={wide ? 50 : 40}
        textAnchor={wide ? "end" : "middle"}
        opacity={shown(atoms.length - 1)}
        style={{ fontFamily: TEXT_FONT }}
      >
        already full: neon reacts with almost nothing
      </text>
    </svg>
  );
}
