// amide-cn-lengths: a pure function of (t, state); see manifest.ts.
import { DATA_FONT, ELECTRON, INK, MUTED, Molecule, TEXT_FONT, drawn, place, sharedScale } from "../contributors/draw.tsx";
import { acetamide, methanimine, methylamine } from "../contributors/structures.ts";
import { frameSize, type Box } from "../frame.ts";
import { easeOut, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { MOLECULES, type AmideCnState, type AmideMolecule } from "./manifest.ts";

const DRAWINGS = { methylamine: drawn(methylamine), acetamide: drawn(acetamide), methanimine: drawn(methanimine) };
/** The C–N bond id in each structure file. */
const CN: Record<AmideMolecule, string> = { methylamine: "b1", acetamide: "b3", methanimine: "b1" };

interface Panel {
  id: AmideMolecule;
  box: Box;
  /** Where the label lines start, and how they align. */
  label: { x: number; y: number; anchor: "middle" | "start" };
}

/** Panels: a row at 16:9, a column at 9:16; one large panel when a single molecule is shown. */
export function layoutPanels(aspect: Aspect, molecule: AmideCnState["molecule"]): { panels: Panel[]; font: number; title: { x: number; y: number } } {
  const { width, height } = frameSize(aspect);
  const ids = molecule === "all" ? MOLECULES.map((m) => m.id) : [molecule];
  if (ids.length === 1) {
    const box = { x: width * 0.15, y: height * 0.16, w: width * 0.7, h: height * 0.5 };
    return { panels: [{ id: ids[0], box, label: { x: width / 2, y: box.y + box.h + 90, anchor: "middle" } }], font: 56, title: { x: width / 2, y: 110 } };
  }
  if (aspect === "16:9") {
    const gap = 60;
    const w = (width - 160 - gap * 2) / 3;
    return {
      panels: ids.map((id, i) => {
        const box = { x: 80 + i * (w + gap), y: 190, w, h: 520 };
        return { id, box, label: { x: box.x + w / 2, y: 800, anchor: "middle" as const } };
      }),
      font: 48,
      title: { x: width / 2, y: 110 },
    };
  }
  const h = (height - 260) / 3;
  return {
    panels: ids.map((id, i) => {
      const box = { x: 60, y: 200 + i * h, w: 600, h: h - 60 };
      return { id, box, label: { x: 690, y: box.y + box.h / 2 - 50, anchor: "start" as const } };
    }),
    font: 44,
    title: { x: width / 2, y: 120 },
  };
}

export default function AmideCnLengths({ t, state, aspect, cited }: SceneProps<AmideCnState>) {
  const { width, height } = frameSize(aspect);
  const { panels, font, title } = layoutPanels(aspect, state.molecule);
  const scale = sharedScale(
    panels.map((p) => DRAWINGS[p.id]),
    panels.map((p) => p.box),
  );
  const shown = state.labels === "shown";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <text x={title.x} y={title.y} fontSize={font * 1.1} textAnchor="middle" fill={INK} fontFamily={TEXT_FONT} fontWeight={700}>
        {shown ? "C–N bond lengths, computed" : "Three C–N bonds"}
      </text>
      {panels.map((p, i) => {
        const appear = easeOut(progress(t, 0.2 + 0.7 * i, 0.8 + 0.7 * i));
        const label = shown ? easeOut(progress(t, 2.6 + 0.4 * i, 3.1 + 0.4 * i)) : 0;
        const value = cited[`${p.id}/r.CN`];
        const name = MOLECULES.find((m) => m.id === p.id)!.name;
        const line = (k: number) => p.label.y + k * font * 1.25;
        return (
          <g key={p.id} opacity={appear}>
            <Molecule placed={place(DRAWINGS[p.id], p.box, scale)} glow={[CN[p.id]]} />
            <text x={p.label.x} y={line(0)} fontSize={font} textAnchor={p.label.anchor} fill={INK} fontFamily={TEXT_FONT} fontWeight={700}>
              {name}
            </text>
            {shown && (
            <g opacity={label}>
              <text x={p.label.x} y={line(1)} fontSize={font} textAnchor={p.label.anchor} fill={ELECTRON} fontFamily={DATA_FONT}>
                {`${value?.label ?? "C–N"} ${value?.display ?? ""}`}
              </text>
              <text x={p.label.x} y={line(2)} fontSize={font * 0.75} textAnchor={p.label.anchor} fill={MUTED} fontFamily={TEXT_FONT}>
                computed
              </text>
            </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
