// rule-ladder: a pure function of (t, state); see manifest.ts.
import { BOSS, DATA_FONT, ELECTRON, INK, LINE, MUTED, Molecule, TEXT_FONT, drawn, place } from "../contributors/draw.tsx";
import { acetamide, acetamidePolar } from "../contributors/structures.ts";
import { frameSize, type Box } from "../frame.ts";
import { easeOut, lerp, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { RULES, type RuleLadderState } from "./manifest.ts";

const NEUTRAL = drawn(acetamide);
const CHARGED = drawn(acetamidePolar);
/** The verdict per rung, neutral then charged: rung 1 ties, rung 2 decides; rungs 3 and 4 are never reached. */
const VERDICT: (readonly [boolean, boolean] | null)[] = [[true, true], [true, false], null, null];

export interface LadderLayout {
  rungs: Box[];
  /** Where each rung's number and title sit. */
  title: { dx: number; dy: number };
  /** The two cards (neutral, charged) and the x of their mark columns. */
  cards: [Box, Box];
  marksY: (rung: Box) => number;
  font: number;
}

export function layoutLadder(aspect: Aspect): LadderLayout {
  if (aspect === "16:9")
    return {
      rungs: RULES.map((_, i) => ({ x: 80, y: 300 + i * 185, w: 1760, h: 160 })),
      title: { dx: 150, dy: 95 },
      cards: [
        { x: 1150, y: 20, w: 300, h: 210 },
        { x: 1500, y: 20, w: 300, h: 210 },
      ],
      marksY: (r) => r.y + r.h / 2 + 22,
      font: 46,
    };
  return {
    rungs: RULES.map((_, i) => ({ x: 50, y: 560 + i * 320, w: 980, h: 290 })),
    title: { dx: 120, dy: 80 },
    cards: [
      { x: 110, y: 140, w: 380, h: 300 },
      { x: 590, y: 140, w: 380, h: 300 },
    ],
    marksY: (r) => r.y + 210,
    font: 42,
  };
}

export default function RuleLadder({ t, state, aspect }: SceneProps<RuleLadderState>) {
  const { width, height } = frameSize(aspect);
  const L = layoutLadder(aspect);
  const all = state.rung === "all";
  const scale = Math.min(...L.cards.map((box, i) => {
    const d = i === 0 ? NEUTRAL : CHARGED;
    return Math.min(box.w / d.width, box.h / d.height);
  }));
  const cards = all ? easeOut(progress(t, 4, 4.6)) : 0;
  const major = all ? easeOut(progress(t, 7, 7.5)) : 0;
  const centre = (b: Box) => b.x + b.w / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      {RULES.map((rule, i) => {
        const box = L.rungs[i];
        const lit = all ? easeOut(progress(t, 0.4 + 0.9 * i, 0.9 + 0.9 * i)) : state.rung === rule.id ? 1 : 0;
        const verdict = VERDICT[i];
        const marks = verdict && all ? easeOut(progress(t, 5 + i, 5.5 + i)) : 0;
        return (
          <g key={rule.id}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={24} fill={ELECTRON} fillOpacity={0.12 * lit} stroke={lit > 0.5 ? ELECTRON : LINE} strokeWidth={4} opacity={lerp(0.4, 1, lit)} />
            <g opacity={lerp(0.4, 1, lit)} fontFamily={TEXT_FONT}>
              <text x={box.x + L.title.dx * 0.45} y={box.y + L.title.dy} fontSize={L.font * 1.3} textAnchor="middle" fill={ELECTRON} fontWeight={700} fontFamily={DATA_FONT}>
                {rule.id}
              </text>
              <text x={box.x + L.title.dx} y={box.y + L.title.dy} fontSize={L.font} fill={INK} fontWeight={700}>
                {rule.title}
              </text>
            </g>
            {verdict &&
              verdict.map((ok, k) => (
                <text
                  key={k}
                  x={centre(L.cards[k])}
                  y={L.marksY(box)}
                  fontSize={L.font * 1.4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={ok ? ELECTRON : BOSS}
                  fontFamily={TEXT_FONT}
                  fontWeight={700}
                  opacity={marks}
                >
                  {ok ? "✓" : "✗"}
                </text>
              ))}
          </g>
        );
      })}
      <g opacity={cards}>
        {L.cards.map((box, k) => (
          <g key={k}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={18} fill="none" stroke={k === 0 && major > 0.5 ? ELECTRON : LINE} strokeWidth={3} />
            <Molecule placed={place(k === 0 ? NEUTRAL : CHARGED, box, scale * 0.85)} />
          </g>
        ))}
        <text x={centre(L.cards[0])} y={L.cards[0].y + L.cards[0].h + L.font * 0.9} fontSize={L.font * 0.8} textAnchor="middle" fill={ELECTRON} fontFamily={TEXT_FONT} fontWeight={700} opacity={major}>
          major
        </text>
        <text x={centre(L.cards[1])} y={L.cards[1].y + L.cards[1].h + L.font * 0.9} fontSize={L.font * 0.8} textAnchor="middle" fill={MUTED} fontFamily={TEXT_FONT} opacity={major}>
          minor
        </text>
      </g>
    </svg>
  );
}
