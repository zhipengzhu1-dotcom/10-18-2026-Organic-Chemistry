// dots-and-sticks: a pure function of (t, state); see manifest.ts. Each count
// runs in its share of the Scene: valence, then the ringed atom's lone pairs
// pulse one by one (+2 each), then its sticks (+1 each, a double bond 2),
// then the formal charge. A finished count stays on screen.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { clamp, pulse } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { CYAN, DATA_FONT, INK, MAGENTA, MUTED, fit } from "../lewis.ts";
import { Embedded } from "../embed.tsx";
import { drawStructure } from "../structure/render.ts";
import { dotsAndSticks, examples, signed, type DotsAndSticksState, type Example } from "./manifest.ts";

/** Fractions of a count's share: lone pairs pulse, then sticks, then the total shows. */
const PHASE = { pairs: [0.15, 0.45], sticks: [0.45, 0.75], total: 0.8 } as const;

export default function DotsAndSticks({ t, state, aspect, reducedMotion }: SceneProps<DotsAndSticksState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const list = examples[state.example] ?? [];
  const share = dotsAndSticks.duration / Math.max(list.length, 1);
  const portrait = aspect === "9:16";

  const panels = list.map((_, i): Box => {
    if (portrait || list.length === 1) {
      const h = area.h / list.length;
      return { x: area.x, y: area.y + i * h, w: area.w, h };
    }
    const w = area.w / list.length;
    return { x: area.x + i * w, y: area.y, w, h: area.h };
  });

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
      {list.map((example, i) => (
        <Panel
          key={example.structure.id}
          example={example}
          box={panels[i]}
          // Under reduced motion every count is shown finished.
          u={reducedMotion ? 1 : clamp((t - i * share) / share, 0, 1)}
          glow={reducedMotion ? 0 : pulse(t, 0.6)}
        />
      ))}
    </svg>
  );
}

function Panel({ example, box, u, glow }: { example: Example; box: Box; u: number; glow: number }) {
  const { structure, count } = example;
  const drawing = drawStructure(structure, [], { ring: ["a1"] });
  // Drawing beside the count when the panel is wide, above it when tall.
  const wide = box.w > box.h * 1.1;
  const drawBox: Box = wide
    ? { x: box.x, y: box.y + box.h * 0.1, w: box.w * 0.45, h: box.h * 0.8 }
    : { x: box.x, y: box.y, w: box.w, h: box.h * 0.5 };
  const textBox: Box = wide
    ? { x: box.x + box.w * 0.5, y: box.y + box.h * 0.15, w: box.w * 0.5, h: box.h * 0.7 }
    : { x: box.x + box.w * 0.08, y: box.y + box.h * 0.52, w: box.w * 0.84, h: box.h * 0.45 };
  const { scale, x, y } = fit(drawing, drawBox);
  const at = (p: { x: number; y: number }) => ({ x: x + p.x * scale, y: y + p.y * scale });

  const stage = (from: number, to: number) => clamp((u - from) / (to - from), 0, 1);
  const pairs = drawing.lonePairs.filter((p) => p.atom === "a1");
  const sticks = structure.bonds.filter((b) => b.a === "a1" || b.b === "a1");
  const pairsDone = Math.min(pairs.length, Math.floor(stage(...PHASE.pairs) * (pairs.length + 1)));
  const sticksDone = Math.min(sticks.length, Math.floor(stage(...PHASE.sticks) * (sticks.length + 1)));
  const counting = (done: number, n: number, k: number) => k === done - 1 && done <= n && u < PHASE.total;
  const bondsCounted = sticks.slice(0, sticksDone).reduce((n, b) => n + b.order, 0);

  const font = Math.min(textBox.h / 5, textBox.w / 13);
  const lines: { text: string; colour: string }[] = [{ text: `valence ${count.valence}`, colour: INK }];
  if (u >= PHASE.pairs[0]) lines.push({ text: `− lone-pair electrons ${2 * pairsDone}`, colour: CYAN });
  if (u >= PHASE.sticks[0]) lines.push({ text: `− bonds ${bondsCounted}`, colour: INK });
  if (u >= PHASE.total) lines.push({ text: `formal charge = ${signed(count.charge)}`, colour: MAGENTA });

  return (
    <g>
      <Embedded drawing={drawing} box={drawBox} />
      {pairs.slice(0, pairsDone).map((p, k) => {
        const c = at(p);
        return (
          <circle
            key={`p${k}`}
            cx={c.x}
            cy={c.y}
            r={scale * (counting(pairsDone, pairs.length, k) ? 10 + 4 * glow : 9)}
            fill="none"
            stroke={CYAN}
            strokeWidth={scale * 2}
          />
        );
      })}
      {sticks.slice(0, sticksDone).map((b, k) => {
        const s = drawing.bonds[b.id];
        const p = at({ x: s.x1, y: s.y1 });
        const q = at({ x: s.x2, y: s.y2 });
        return (
          <line
            key={`b${k}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={INK}
            strokeOpacity={counting(sticksDone, sticks.length, k) ? 0.35 + 0.3 * glow : 0.25}
            strokeWidth={scale * 14}
            strokeLinecap="round"
          />
        );
      })}
      {lines.map((line, k) => (
        <text key={k} x={textBox.x} y={textBox.y + font * (1.2 + k * 1.35)} fill={line.colour} fontSize={font} dominantBaseline="central">
          {line.text}
        </text>
      ))}
      <text x={textBox.x} y={textBox.y + font * 0.1} fill={MUTED} fontSize={font * 0.7} dominantBaseline="central">
        {structure.atoms[0].el}: count dots and sticks
      </text>
    </g>
  );
}
