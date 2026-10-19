// Build-time drawing of a Step's structures: the SVG is pre-rendered here so
// no renderer ships to the browser, and each Tap target gets its hit area.
import type { HitShape, StructureView, TapTarget } from "@astratron/content";
import { drawStructure, type Segment } from "@astratron/scenes";

/** Hit radius around an atom: a 48 px tap target at natural size. */
const ATOM_HIT = 24;
/**
 * Hit radius of a region of one atom: still 48 px when a drawing about 500 px wide (a steroid)
 * scales to a phone's column, and clear of a neighbour's 24 px circle one 60 px bond away.
 */
const LONE_REGION_HIT = 34;

export function drawView(view: StructureView, targets: TapTarget[] = []): StructureView {
  const drawing = drawStructure(view.structure, view.hide);
  const hits: Record<string, HitShape> = {};
  const bondsOf = new Map(view.structure.bonds.map((b) => [b.id, b]));

  for (const t of targets) {
    if (t.kind === "atom") {
      hits[t.id] = { circles: [{ ...drawing.atoms[t.id], r: ATOM_HIT }], segments: [] };
    } else if (t.kind === "bond") {
      // The bond's hit area stops where its atoms' begin, so hit areas never overlap.
      hits[t.id] = { circles: [], segments: [trim(drawing.bonds[t.id], ATOM_HIT)] };
    } else {
      const inRegion = new Set(t.atoms);
      hits[t.id] = {
        // A one-atom region (a methyl) is a small target in a wide drawing: give it more room.
        circles: (t.atoms ?? []).map((a) => ({ ...drawing.atoms[a], r: t.atoms?.length === 1 ? LONE_REGION_HIT : ATOM_HIT })),
        segments: [...bondsOf.values()]
          .filter((b) => inRegion.has(b.a) && inRegion.has(b.b))
          .map((b) => drawing.bonds[b.id]),
      };
    }
  }
  return { ...view, drawn: { svg: drawing.svg, viewBox: drawing.viewBox, ...(targets.length && { hits }) } };
}

function trim(s: Segment, by: number): Segment {
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  const k = Math.min(by / len, 0.4);
  const dx = (s.x2 - s.x1) * k;
  const dy = (s.y2 - s.y1) * k;
  return { x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 - dx, y2: s.y2 - dy };
}
