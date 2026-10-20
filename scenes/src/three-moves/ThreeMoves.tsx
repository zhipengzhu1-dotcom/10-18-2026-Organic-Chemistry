// three-moves: a pure function of (t, state); see manifest.ts. Each panel is a
// start drawing with its one arrow; the lit panel's arrow draws itself.
import { frameSize } from "../frame.ts";
import { Arrow, ArrowHead, electron, fit, fontData, fontText, ink, Placed } from "../lesson-06/draw.tsx";
import { panelBoxes, split } from "../lesson-06/layout.ts";
import { lesson6Structures } from "../lesson-06/structures.ts";
import { easeInOut, progress } from "../motion.ts";
import { PUSH_SECONDS } from "../push-replay/PushReplay.tsx";
import { drawStructure } from "../structure/render.ts";
import type { SceneProps } from "../types.ts";
import { PANEL_SECONDS, type ThreeMovesState } from "./manifest.ts";

const moves = [
  { name: "Lone pair → bond", structure: lesson6Structures.acetate, push: { from: "a4", to: "b3" } },
  { name: "Bond → atom", structure: lesson6Structures.formaldehyde, push: { from: "b1", to: "a2" } },
  { name: "Bond → next bond", structure: lesson6Structures["allyl-cation"], push: { from: "b1", to: "b2" } },
].map((m) => ({ ...m, drawing: drawStructure(m.structure) }));

export default function ThreeMoves({ t, state, aspect, reducedMotion }: SceneProps<ThreeMovesState>) {
  const { width, height } = frameSize(aspect);
  const boxes = panelBoxes(aspect, 3);
  const unitSize = Math.min(width, height);
  const all = state.panel === "all";
  // With `all`, panel k is lit during its turn; after the last turn all three stay lit.
  const turn = Math.floor(t / PANEL_SECONDS);
  const lit = (i: number) => (all ? t >= PANEL_SECONDS * 3 || turn === i : state.panel === String(i + 1));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block", color: ink }}>
      <defs>
        <ArrowHead id="three-moves-head" />
      </defs>
      {moves.map((move, i) => {
        const box = boxes[i];
        const { head, body } = split(box, 0.2);
        const at = fit(move.drawing.width, move.drawing.height, { ...body, y: body.y + body.h * 0.05, h: body.h * 0.9 }, 4.5);
        const on = lit(i);
        // The arrow draws itself during its own turn; otherwise it is shown whole.
        const own = all && turn === i && !reducedMotion ? easeInOut(progress(t - i * PANEL_SECONDS, 0.3, 0.3 + PUSH_SECONDS * 0.7)) : 1;
        return (
          <g key={move.name} data-panel={i + 1} data-lit={on} opacity={on ? 1 : 0.35}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={unitSize * 0.02} fill="none" stroke={on ? electron : ink} strokeOpacity={on ? 0.8 : 0.25} strokeWidth={4} />
            <text x={head.x + head.w / 2} y={head.y + head.h * 0.55} textAnchor="middle" dominantBaseline="central" fill={ink} fontSize={unitSize * 0.042} fontWeight={700} style={{ fontFamily: fontText }}>
              <tspan style={{ fontFamily: fontData }}>{`${i + 1}.`}</tspan> {move.name}
            </text>
            <Placed svg={move.drawing.svg} at={at} />
            <Arrow drawing={move.drawing} structure={move.structure} push={move.push} at={at} progress={own} head="three-moves-head" />
          </g>
        );
      })}
    </svg>
  );
}
