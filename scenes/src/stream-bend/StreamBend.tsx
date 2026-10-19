// stream-bend: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea } from "../frame.ts";
import { easeInOut, lerp, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { CYAN, DATA_FONT, INK, LINE, MUTED, ORANGE } from "../lewis.ts";
import { timing, type StreamBendState } from "./manifest.ts";

/** Sample points down a stream. */
const SAMPLES = 24;

export default function StreamBend({ t, state, aspect, reducedMotion }: SceneProps<StreamBendState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const near = state.rod === "near";
  const rodIn = near ? easeInOut(progress(t, ...timing.rodIn)) : 0;
  const bend = near ? easeInOut(progress(t, ...timing.bend)) : 0;

  const font = Math.min(area.w, area.h) * 0.07;
  const top = area.y + font * 1.2;
  const bottom = area.y + area.h - font * 1.6;
  const waterX = area.x + area.w * 0.45;
  const hexaneX = area.x + area.w * 0.78;
  const rodY = lerp(top, bottom, 0.45);
  const rodLength = area.w * 0.2;
  const rodTip = lerp(area.x + rodLength, waterX - area.w * 0.09, rodIn);
  const reach = area.w * 0.06 * bend;
  const thickness = Math.min(area.w, area.h) * 0.018;

  /** A stream's path; the water's curves toward the rod, most where it passes it. */
  const stream = (x0: number, pull: number) =>
    Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const s = i / SAMPLES;
      const y = lerp(top, bottom, s);
      const x = x0 - pull * easeInOut(Math.min(1, s / 0.6)) * (1 - 0.25 * Math.max(0, s - 0.6));
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  const flow = reducedMotion ? 0 : -t * area.h * 0.35;

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
      {/* The tap: a pipe with two nozzles. */}
      <rect x={waterX - area.w * 0.06} y={area.y} width={hexaneX - waterX + area.w * 0.12} height={font * 0.6} fill={LINE} />
      {[waterX, hexaneX].map((x) => (
        <rect key={x} x={x - thickness} y={area.y + font * 0.6} width={thickness * 2} height={top - area.y - font * 0.6} fill={LINE} />
      ))}

      <path d={stream(waterX, reach)} fill="none" stroke={CYAN} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${thickness * 4} ${thickness * 1.5}`} strokeDashoffset={flow} />
      <path d={stream(hexaneX, 0)} fill="none" stroke={ORANGE} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${thickness * 4} ${thickness * 1.5}`} strokeDashoffset={flow} />

      <text x={waterX} y={area.y + area.h} fill={INK} fontSize={font} textAnchor="middle">
        water
      </text>
      <text x={hexaneX} y={area.y + area.h} fill={INK} fontSize={font} textAnchor="middle">
        hexane
      </text>

      {/* The rod, charged by rubbing, held level and pointing at the water. */}
      <rect
        x={rodTip - rodLength}
        y={rodY - thickness * 1.5}
        width={rodLength}
        height={thickness * 3}
        rx={thickness * 1.5}
        fill={MUTED}
        stroke={INK}
        strokeWidth={thickness * 0.3}
      />
      <text x={rodTip - rodLength / 2} y={rodY - thickness * 3} fill={INK} fontSize={font * 0.8} textAnchor="middle">
        charged rod
      </text>
    </svg>
  );
}
