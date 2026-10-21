// h-fill: a pure function of (t, state); see manifest.ts.
import { impliedHydrogens, VALENCE } from "@astratron/content/valence";
import { frameSize, safeArea, type Box } from "../frame.ts";
import { clamp, easeOut, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { drawStructure } from "../structure/render.ts";
import { withHydrogens } from "../structure/hydrogens.ts";
import { molecule } from "../lesson-02/molecules.ts";
import { innerSvg, stageFor, transformOn } from "../lesson-02/place.ts";
import { drawnHydrogens, FILL, fillOrder, type HFillState } from "./manifest.ts";

const ink = "var(--at-ink, #1d1b26)";
const muted = "var(--at-ink-muted, #57536b)";
const blue = "var(--at-blue, #0a64c2)";
const mono = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";

export function layoutHFill(aspect: Aspect): { stage: Box; counter: Box } {
  const area = safeArea(aspect);
  if (aspect === "16:9") {
    const w = area.w * 0.22;
    return { stage: { ...area, w: area.w - w }, counter: { x: area.x + area.w - w, y: area.y, w, h: area.h * 0.2 } };
  }
  const h = area.h * 0.1;
  return { stage: { ...area, y: area.y + h, h: area.h - h }, counter: { x: area.x, y: area.y, w: area.w, h } };
}

export default function HFill({ t, state, aspect }: SceneProps<HFillState>) {
  const { width, height } = frameSize(aspect);
  const { stage: box, counter } = layoutHFill(aspect);
  const base = molecule(state.molecule);
  const order = fillOrder(state.molecule);
  const implied = impliedHydrogens(base);
  const full = withHydrogens(base, order);
  const fullDrawing = drawStructure(full);
  const stage = stageFor(fullDrawing, full, box);

  // How far the fill has got: carbon i fills over [i, i + 1) of `pos`.
  const pos = state.show === "final" ? order.length : progress(t, FILL.start, FILL.end) * order.length;
  const current = Math.min(order.length - 1, Math.floor(pos));
  const done = order.slice(0, Math.ceil(pos));
  const drawing = drawStructure(withHydrogens(base, done), [], { fade: fadeIn(order, pos, implied) });

  // The counter: H's already drawn, plus every H popped on so far.
  let count = drawnHydrogens(state.molecule);
  order.forEach((id, i) => {
    const n = implied[id] ?? 0;
    for (let k = 0; k < n; k++) if (pos >= i + popAt(k, n)) count++;
  });

  const filling = pos < order.length;
  const active = order[current];
  const at = stage.point(base.atoms.find((a) => a.id === active)!);
  const bondsOf = VALENCE.C - (implied[active] ?? 0);
  const fontPx = Math.max(40, stage.unit * 0.45);
  const label = `${bondsOf} bonds → ${implied[active] ?? 0} H`;
  const labelOpacity = filling ? clamp(Math.min((pos - current) * 4, (current + 1 - pos) * 4)) : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <g
        transform={transformOn(stage, drawing, withHydrogens(base, done))}
        fill={ink}
        style={{ color: ink, fontFamily: mono, ["--lone-pair" as string]: blue }}
        dangerouslySetInnerHTML={{ __html: innerSvg(drawing) }}
      />
      {filling && (
        <g opacity={labelOpacity}>
          <circle cx={at.x} cy={at.y} r={stage.unit * 0.42} fill="none" stroke={blue} strokeWidth={4} />
          <text x={at.x + stage.unit * 0.55} y={at.y - stage.unit * 0.55} fill={blue} fontSize={fontPx} fontFamily={mono}>
            {label}
          </text>
        </g>
      )}
      <text
        x={aspect === "16:9" ? counter.x + counter.w : counter.x + counter.w / 2}
        y={counter.y + counter.h / 2}
        textAnchor={aspect === "16:9" ? "end" : "middle"}
        dominantBaseline="central"
        fill={ink}
        fontSize={counter.h * (aspect === "16:9" ? 0.45 : 0.6)}
        fontFamily={mono}
      >
        H: {count}
      </text>
      {!filling && (
        <text x={box.x + box.w / 2} y={box.y + box.h} textAnchor="middle" fill={muted} fontSize={fontPx}>
          every carbon makes four bonds
        </text>
      )}
    </svg>
  );
}

/** When, within its carbon's slot, the k-th of n H's pops on. */
const popAt = (k: number, n: number) => 0.3 + (0.6 * (k + 1)) / (n + 1);

/** Opacity of each new letter and H: the C letter comes in first, then each H pops on in turn. */
function fadeIn(order: string[], pos: number, implied: Record<string, number>): Record<string, number> {
  const fade: Record<string, number> = {};
  order.forEach((id, i) => {
    if (pos >= i + 1) return;
    fade[id] = easeOut(clamp((pos - i) / 0.25));
    const n = implied[id] ?? 0;
    for (let k = 0; k < n; k++) {
      const o = easeOut(clamp((pos - i - popAt(k, n)) / 0.1 + 1));
      fade[`${id}-h${k + 1}`] = o;
      fade[`${id}-hb${k + 1}`] = o;
    }
  });
  return fade;
}
