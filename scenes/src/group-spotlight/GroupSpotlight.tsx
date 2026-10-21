// group-spotlight: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { fgStructures } from "../functional-groups/structures.ts";
import { centreOf, BLUE, drawingSize, fitScale, FONT_DATA, FONT_HAND, HALO, INK, Molecule, MUTED, placeMolecule, type Placed } from "../functional-groups/Molecule.tsx";
import type { Aspect, SceneProps } from "../types.ts";
import { litAmount, views, type SpotlightState } from "./manifest.ts";

// Chips are large for the frame because the site shows the 16:9 frame at phone width too.
const NAME_PX = 48;
const PIECE_PX = 38;
const CHIP_PAD = 12;
const CHIP_GAP = 10;
/** Room kept around the molecules for label chips, as a share of the area. */
const CHIP_ROOM = 0.1;
/** Small molecules stop growing here (frame px per drawing unit). */
const MAX_SCALE = 3;

interface Layout {
  placed: Placed[];
  chips: (Box & { region: number; molecule: number })[];
}

/** Molecules side by side at 16:9, stacked at 9:16, with their label chips placed beside each region. */
function layout(view: string, aspect: Aspect): Layout {
  const area = safeArea(aspect);
  const { molecules } = views[view];
  const n = molecules.length;
  const across = aspect === "16:9";
  const inset = { x: area.w * CHIP_ROOM * (across ? 0.6 : 0.3), y: area.h * CHIP_ROOM * (across ? 1 : 0.5) };
  // Each molecule's slot is in proportion to its drawing (its width side by side, its height stacked).
  const sizes = molecules.map((m) => drawingSize(fgStructures[m.id]));
  const shares = sizes.map((s) => (across ? s.width : s.height));
  const total = shares.reduce((a, b) => a + b, 0);
  let start = 0;
  const slots = molecules.map((_, i): Box => {
    const share = shares[i] / total;
    const slot: Box = across
      ? { x: area.x + area.w * start, y: area.y, w: area.w * share, h: area.h }
      : { x: area.x, y: area.y + area.h * start, w: area.w, h: area.h * share };
    start += share;
    return { x: slot.x + inset.x / n, y: slot.y + inset.y, w: slot.w - (2 * inset.x) / n, h: slot.h - 2 * inset.y };
  });
  // Side by side, molecules share one scale so their sizes compare honestly.
  const scale = Math.min(MAX_SCALE, ...molecules.map((m, i) => fitScale(fgStructures[m.id], slots[i])));
  const placed = molecules.map((m, i) => placeMolecule(fgStructures[m.id], slots[i], scale));

  // Chips keep clear of each other and of every lit atom.
  const halo = HALO * scale;
  const obstacles: Box[] = molecules.flatMap((m, mi) =>
    m.regions.flatMap((r) => r.atoms.map((a) => placed[mi].point(a)).map((q) => ({ x: q.x - halo, y: q.y - halo, w: 2 * halo, h: 2 * halo }))),
  );
  const chips: Layout["chips"] = [];
  const overlaps = (p: Box, q: Box) =>
    !(p.x + p.w + CHIP_GAP <= q.x || q.x + q.w + CHIP_GAP <= p.x || p.y + p.h + CHIP_GAP <= q.y || q.y + q.h + CHIP_GAP <= p.y);
  const clampIn = (b: Box): Box => ({
    ...b,
    x: Math.min(Math.max(b.x, area.x), area.x + area.w - b.w),
    y: Math.min(Math.max(b.y, area.y), area.y + area.h - b.h),
  });
  const free = (b: Box) => !chips.some((q) => overlaps(b, q)) && !obstacles.some((q) => overlaps(b, q));
  molecules.forEach((m, mi) => {
    const p = placed[mi];
    const mid = { x: p.bounds.x + p.bounds.w / 2, y: p.bounds.y + p.bounds.h / 2 };
    m.regions.forEach((r, ri) => {
      const w = Math.max(r.label.length * NAME_PX * 0.56, r.piece.length * PIECE_PX * 0.62) + 2 * CHIP_PAD;
      const h = NAME_PX + PIECE_PX + 2 * CHIP_PAD;
      const c = centreOf(p, r.atoms);
      const out = Math.atan2(c.y - mid.y, c.x - mid.x);
      // Outward from the molecule first, then turning either way, then further out.
      const candidates: Box[] = [];
      for (const reach of [0.7, 1.1, 1.6, 2.2])
        for (const turn of [0, 1, -1, 2, -2, 3, -3, 4]) {
          const a = out + (turn * Math.PI) / 4;
          const d = reach * Math.max(w, h);
          candidates.push(clampIn({ x: c.x + Math.cos(a) * d - w / 2, y: c.y + Math.sin(a) * d - h / 2, w, h }));
        }
      const box = candidates.find(free) ?? candidates.find((b) => !chips.some((q) => overlaps(b, q))) ?? candidates[0];
      chips.push({ ...box, region: ri, molecule: mi });
    });
  });
  return { placed, chips };
}

/** Where each label chip sits (for the layout test). */
export function chipBoxes(view: string, aspect: Aspect): Box[] {
  return layout(view, aspect).chips.map(({ x, y, w, h }) => ({ x, y, w, h }));
}

export default function GroupSpotlight({ t, state, aspect, reducedMotion }: SceneProps<SpotlightState>) {
  const { width, height } = frameSize(aspect);
  const view = views[state.view];
  const { placed, chips } = layout(state.view, aspect);
  const total = view.molecules.reduce((s, m) => s + m.regions.length, 0);
  let k = 0;
  const amounts = view.molecules.map((m) => m.regions.map(() => litAmount(k++, total, t, reducedMotion)));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {view.molecules.map((m, mi) => (
        <Molecule
          key={m.id + mi}
          structure={fgStructures[m.id]}
          placed={placed[mi]}
          idBase={`gs-${mi}`}
          base={0.4}
          highlights={m.regions.map((r, ri) => ({ atoms: r.atoms, amount: amounts[mi][ri], tone: r.tone }))}
        />
      ))}
      {state.labels === "on" &&
        chips.map((c) => {
          const region = view.molecules[c.molecule].regions[c.region];
          const amount = amounts[c.molecule][c.region];
          if (amount <= 0) return null;
          const tone = region.tone === "lit" ? BLUE : MUTED;
          return (
            <g key={`chip-${c.molecule}-${c.region}`} opacity={amount}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={12} fill="var(--at-paper, #ffffff)" fillOpacity={0.88} stroke={tone} strokeWidth={3} />
              <text x={c.x + c.w / 2} y={c.y + CHIP_PAD + NAME_PX * 0.8} textAnchor="middle" fontSize={NAME_PX * 1.1} fill={INK} fontFamily={FONT_HAND}>
                {region.label}
              </text>
              <text x={c.x + c.w / 2} y={c.y + CHIP_PAD + NAME_PX + PIECE_PX * 0.85} textAnchor="middle" fontSize={PIECE_PX} fill={tone} fontFamily={FONT_DATA}>
                {region.piece}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
