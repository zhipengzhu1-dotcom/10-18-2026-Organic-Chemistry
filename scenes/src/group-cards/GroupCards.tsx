// group-cards: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { fgStructures } from "../functional-groups/structures.ts";
import { BOLD_CSS, FONT_HAND, INK, Molecule, placeMolecule } from "../functional-groups/Molecule.tsx";
import type { Aspect, SceneProps } from "../types.ts";
import { cardsOf, dealt, type CardsState } from "./manifest.ts";

const GAP = 24;

/**
 * Card boxes: a 2-column grid; at 16:9 the "all" view puts each family on its own row
 * (up to five across) so fourteen cards still read at that size.
 */
export function cardBoxes(family: string, aspect: Aspect): Box[] {
  const area = safeArea(aspect);
  const cards = cardsOf(family);
  const rows: number[][] = [];
  if (family === "all" && aspect === "16:9") {
    for (const f of [...new Set(cards.map((c) => c.family))]) rows.push(cards.flatMap((c, i) => (c.family === f ? [i] : [])));
  } else {
    for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2).map((_, j) => i + j));
  }
  const cols = Math.max(...rows.map((r) => r.length));
  const w = (area.w - GAP * (cols - 1)) / cols;
  const h = Math.min((area.h - GAP * (rows.length - 1)) / rows.length, w * 0.9);
  const top = area.y + (area.h - (h * rows.length + GAP * (rows.length - 1))) / 2;
  const boxes: Box[] = [];
  rows.forEach((row, r) => {
    const left = area.x + (area.w - (w * row.length + GAP * (row.length - 1))) / 2;
    row.forEach((i, c) => (boxes[i] = { x: left + c * (w + GAP), y: top + r * (h + GAP), w, h }));
  });
  return boxes;
}

export default function GroupCards({ t, state, aspect, reducedMotion }: SceneProps<CardsState>) {
  const { width, height } = frameSize(aspect);
  const cards = cardsOf(state.family);
  const boxes = cardBoxes(state.family, aspect);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      <style>{BOLD_CSS}</style>
      {cards.map((card, i) => {
        const amount = dealt(i, cards.length, t, state, reducedMotion);
        if (amount <= 0) return null;
        const b = boxes[i];
        const namePx = Math.min(b.h * 0.16, b.w * 0.11);
        const pad = b.h * 0.08;
        const placed = placeMolecule(fgStructures[card.structure], { x: b.x + pad, y: b.y + pad, w: b.w - 2 * pad, h: b.h - 3 * pad - namePx }, 1.6);
        return (
          <g key={card.name} opacity={amount} transform={`translate(0 ${(1 - amount) * 30})`}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill="var(--at-paper, #ffffff)" stroke="var(--at-ink-muted, #57536b)" strokeWidth={3} />
            <Molecule
              structure={fgStructures[card.structure]}
              placed={placed}
              idBase={`gc-${i}`}
              base={0.75}
              highlights={[{ atoms: card.group, amount: 1, tone: "bold" }]}
            />
            <text x={b.x + b.w / 2} y={b.y + b.h - pad} textAnchor="middle" fontSize={namePx * 1.1} fill={INK} fontFamily={FONT_HAND}>
              {card.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
