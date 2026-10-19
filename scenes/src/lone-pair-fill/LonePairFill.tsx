// lone-pair-fill: a pure function of (t, state); see manifest.ts.
import { expectedLonePairs } from "@astratron/content/valence";
import { frameSize, safeArea, type Box } from "../frame.ts";
import { clamp, easeOut, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { drawStructure } from "../structure/render.ts";
import { molecule } from "../lesson-02/molecules.ts";
import { innerSvg, stageFor, transformOn } from "../lesson-02/place.ts";
import { FILL, lonePairAtoms, PANELS, type LonePairState } from "./manifest.ts";

const ink = "var(--at-ink, #f2f0ff)";
const muted = "var(--at-ink-muted, #b9a8e8)";
const line = "var(--at-line, #6a4bd1)";
const electron = "var(--at-electron, #3ee8ff)";
const mono = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";
const sans = "var(--at-font-text, system-ui, sans-serif)";

/** The chip across the top and one box per drawing: a row at 16:9, a column at 9:16. */
export function layoutLonePairs(aspect: Aspect, panels: number): { chip: Box; boxes: Box[] } {
  const area = safeArea(aspect);
  const chipH = area.h * (aspect === "16:9" ? 0.1 : 0.05);
  const chip = { x: area.x, y: area.y, w: area.w, h: chipH };
  const top = area.y + chipH * 1.4;
  const h = area.y + area.h - top;
  const boxes = Array.from({ length: panels }, (_, i) =>
    aspect === "16:9" || panels === 1
      ? { x: area.x + (area.w / panels) * i, y: top, w: area.w / panels, h }
      : { x: area.x, y: top + (h / panels) * i, w: area.w, h: h / panels },
  );
  return { chip, boxes };
}

export default function LonePairFill({ t, state, aspect }: SceneProps<LonePairState>) {
  const { width, height } = frameSize(aspect);
  const ids = PANELS[state.molecule];
  const { chip, boxes } = layoutLonePairs(aspect, ids.length);
  const order = lonePairAtoms(state.molecule);
  const pos = progress(t, FILL.start, FILL.end) * order.length;
  const allShown = pos >= order.length;
  const fontPx = Math.min(chip.h * 0.42, 40);

  const panels = ids.map((id, p) => {
    const s = molecule(id);
    const lp = expectedLonePairs(s);
    const fade: Record<string, number> = {};
    const labels: { at: string; text: string; opacity: number; active: boolean }[] = [];
    order.forEach(([panel, atom], j) => {
      if (panel !== p) return;
      fade[`${atom}.lp`] = easeOut(clamp((pos - j) / 0.5));
      const a = s.atoms.find((x) => x.id === atom)!;
      const bonded = s.bonds.filter((b) => b.a === atom || b.b === atom).reduce((n, b) => n + b.order, 0) + (a.h ?? 0);
      const pairs = lp[atom];
      labels.push({
        at: atom,
        text: `${a.el}, ${bonded} bond${bonded === 1 ? "" : "s"} → ${pairs} lone pair${pairs === 1 ? "" : "s"}`,
        opacity: clamp((pos - j) * 3),
        active: pos > j && pos < j + 1,
      });
    });
    const drawing = drawStructure(s, [], { fade });
    const stage = stageFor(drawing, s, { ...boxes[p], h: boxes[p].h * 0.78 }, ids.length > 1 ? 4 : 3.5);
    // Labels sit below the drawing, one line per atom, in fill order.
    return (
      <g key={id}>
        <g
          transform={transformOn(stage, drawing, s)}
          style={{ color: ink, fontFamily: mono, ["--lone-pair" as string]: electron }}
          dangerouslySetInnerHTML={{ __html: innerSvg(drawing) }}
        />
        {labels.map((l, i) => {
          const at = stage.point(s.atoms.find((a) => a.id === l.at)!);
          return (
            <g key={l.at} opacity={l.opacity}>
              {l.active && <circle cx={at.x} cy={at.y} r={stage.unit * 0.42} fill="none" stroke={electron} strokeWidth={4} />}
              <text
                x={boxes[p].x + boxes[p].w / 2}
                y={boxes[p].y + boxes[p].h * 0.8 + i * fontPx * 1.3}
                textAnchor="middle"
                fill={l.active ? electron : muted}
                fontSize={fontPx * 0.9}
                fontFamily={mono}
              >
                {l.text}
              </text>
            </g>
          );
        })}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <rect x={chip.x + chip.w * (aspect === "16:9" ? 0.34 : 0.15)} y={chip.y} width={chip.w * (aspect === "16:9" ? 0.32 : 0.7)} height={chip.h} rx={chip.h / 2} fill="none" stroke={allShown ? electron : line} strokeWidth={3} />
      <text x={chip.x + chip.w / 2} y={chip.y + chip.h / 2} textAnchor="middle" dominantBaseline="central" fill={allShown ? electron : muted} fontSize={fontPx} fontFamily={sans}>
        {allShown ? "Lone pairs shown" : "Lone pairs hidden"}
      </text>
      {panels}
    </svg>
  );
}
