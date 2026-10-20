// bf3-sextet: a pure function of t; see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { pulse } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { VALENCE } from "@astratron/content/valence";
import { CYAN, DATA_FONT, INK, MAGENTA, MUTED, fit } from "../lewis.ts";
import { Embedded } from "../embed.tsx";
import { drawStructure } from "../structure/render.ts";
import { bf3, timing } from "./manifest.ts";

export default function Bf3Sextet({ t, aspect, reducedMotion }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const at = reducedMotion ? Number.POSITIVE_INFINITY : t;
  const counted = timing.counts.filter((s) => at >= s).length;
  const slot = at >= timing.slot;
  const glow = reducedMotion ? 0.5 : pulse(t, 1.2);

  const portrait = aspect === "9:16";
  const drawBox: Box = portrait
    ? { x: area.x, y: area.y, w: area.w, h: area.h * 0.6 }
    : { x: area.x, y: area.y, w: area.w * 0.55, h: area.h * 0.85 };
  const textBox: Box = portrait
    ? { x: area.x + area.w * 0.08, y: area.y + area.h * 0.66, w: area.w * 0.84, h: area.h * 0.3 }
    : { x: area.x + area.w * 0.58, y: area.y + area.h * 0.25, w: area.w * 0.42, h: area.h * 0.5 };
  const drawing = drawStructure(bf3, [], { ring: ["a1"] });
  const { scale, x, y } = fit(drawing, drawBox);
  const boron = { x: x + drawing.atoms.a1.x * scale, y: y + drawing.atoms.a1.y * scale };
  const font = Math.min(textBox.h / 4.5, textBox.w / 12);

  // The empty slot sits in the gap below boron, between the two lower F's.
  const slotY = boron.y + scale * 30;
  const slotLabelY = drawBox.y + drawBox.h + font * 0.2;

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
      <Embedded drawing={drawing} box={drawBox} />
      {bf3.bonds.slice(0, counted).map((b) => {
        const s = drawing.bonds[b.id];
        return (
          <line
            key={b.id}
            x1={x + s.x1 * scale}
            y1={y + s.y1 * scale}
            x2={x + s.x2 * scale}
            y2={y + s.y2 * scale}
            stroke={CYAN}
            strokeOpacity={0.35}
            strokeWidth={scale * 14}
            strokeLinecap="round"
          />
        );
      })}
      {slot && (
        <g opacity={0.55 + 0.45 * glow}>
          <rect
            x={boron.x - scale * 14}
            y={slotY - scale * 8}
            width={scale * 28}
            height={scale * 16}
            rx={scale * 8}
            fill="none"
            stroke={MAGENTA}
            strokeWidth={scale * 2.5}
            strokeDasharray={`${scale * 5} ${scale * 4}`}
          />
          <text x={boron.x} y={slotLabelY} fill={MAGENTA} fontSize={font * 0.8} textAnchor="middle" dominantBaseline="central">
            room for one more pair
          </text>
        </g>
      )}
      <text x={textBox.x} y={textBox.y + font} fill={MUTED} fontSize={font * 0.75} dominantBaseline="central">
        electrons around B
      </text>
      <text x={textBox.x} y={textBox.y + font * 2.4} fill={CYAN} fontSize={font * 1.6} fontWeight={700} dominantBaseline="central">
        {counted * 2}
      </text>
      {slot && (
        <text x={textBox.x} y={textBox.y + font * 4} fill={INK} fontSize={font * 0.75} dominantBaseline="central">
          formal charge {VALENCE.B} − 0 − {bf3.bonds.length} = {VALENCE.B - bf3.bonds.length}
        </text>
      )}
    </svg>
  );
}
