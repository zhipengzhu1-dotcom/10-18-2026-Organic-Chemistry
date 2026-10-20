// acetate-bond-lengths: a pure function of (t, state); see manifest.ts.
// The drawings are the content structure files; every length is a cited value.
import type { Cited } from "@astratron/content/data";
import { frameSize } from "../frame.ts";
import { panelBoxes, split } from "../lesson-06/layout.ts";
import { fit, fontData, fontText, ink, muted, Placed, electron } from "../lesson-06/draw.tsx";
import { lesson6Structures } from "../lesson-06/structures.ts";
import { easeOut, progress } from "../motion.ts";
import { drawStructure, type Point } from "../structure/render.ts";
import type { SceneProps } from "../types.ts";
import type { BondLengthsState } from "./manifest.ts";

const LABEL_OUT = 30; // how far a label sits off its line, in drawing units

const panels = {
  acid: {
    name: "Acetic acid",
    structure: lesson6Structures["acetic-acid"],
    labels: { b2: "acetic-acid/r.CO.double", b3: "acetic-acid/r.CO.single" },
  },
  anion: {
    name: "Acetate",
    structure: lesson6Structures.acetate,
    labels: { b2: "acetate/r.CO.a", b3: "acetate/r.CO.b" },
  },
} as const;

export default function AcetateBondLengths({ t, state, aspect, reducedMotion, cited }: SceneProps<BondLengthsState>) {
  const { width, height } = frameSize(aspect);
  const shown = state.molecule === "acid" ? [panels.acid] : state.molecule === "anion" ? [panels.anion] : [panels.acid, panels.anion];
  const boxes = panelBoxes(aspect, shown.length);
  const reveal = reducedMotion ? 1 : easeOut(progress(t, 0.4, 1.4));
  const unitSize = Math.min(width, height);
  const method = Object.values(cited)[0]?.source.method?.level;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block", color: ink }}>
      {shown.map((panel, i) => {
        const { head, body } = split(boxes[i], 0.16);
        const drawing = drawStructure(panel.structure);
        const at = fit(drawing.width, drawing.height, { ...body, h: body.h * 0.86 }, 3.2);
        const mids = Object.fromEntries(
          Object.keys(panel.labels).map((line) => {
            const seg = drawing.bonds[line];
            return [line, { x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 }];
          }),
        );
        return (
          <g key={panel.name}>
            <text x={head.x + head.w / 2} y={head.y + head.h / 2} textAnchor="middle" dominantBaseline="central" fill={ink} fontSize={unitSize * 0.05} fontWeight={700} style={{ fontFamily: fontText }}>
              {panel.name}
            </text>
            <Placed svg={drawing.svg} at={at} />
            {Object.entries(panel.labels).map(([line, ref]) => {
              const value: Cited | undefined = cited[ref];
              const seg = drawing.bonds[line];
              if (!value || !seg) return null;
              // Each label sits on the side of its line away from the other labelled line.
              const other = Object.entries(mids).find(([l]) => l !== line)![1];
              const spot = at.at(outward(mids[line], seg, other));
              return (
                <text key={line} x={spot.x} y={spot.y} textAnchor="middle" dominantBaseline="central" fill={electron} opacity={reveal} fontSize={unitSize * 0.04} style={{ fontFamily: fontData }}>
                  {value.display}
                </text>
              );
            })}
            <text x={body.x + body.w / 2} y={body.y + body.h * 0.95} textAnchor="middle" dominantBaseline="central" fill={muted} fontSize={unitSize * 0.028} style={{ fontFamily: fontData }}>
              {method ? `computed, ${method}` : "computed"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A point off the middle of a line, on the side away from `avoid`. */
function outward(mid: Point, seg: { x1: number; y1: number; x2: number; y2: number }, avoid: Point): Point {
  const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) || 1;
  let nx = -(seg.y2 - seg.y1) / len;
  let ny = (seg.x2 - seg.x1) / len;
  if (nx * (mid.x - avoid.x) + ny * (mid.y - avoid.y) < 0) [nx, ny] = [-nx, -ny];
  return { x: mid.x + nx * LABEL_OUT, y: mid.y + ny * LABEL_OUT };
}
