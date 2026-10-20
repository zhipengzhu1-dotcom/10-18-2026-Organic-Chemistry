// amide-hybrid: a pure function of t; see manifest.ts.
import { Contributors, DATA_FONT, ELECTRON, BOSS, INK, MUTED, Molecule, TEXT_FONT, Tag, atomAt, drawn, frameOf, hybridOf, place, placeContributors } from "../contributors/draw.tsx";
import { acetamide, acetamidePolar } from "../contributors/structures.ts";
import { frameSize, type Box } from "../frame.ts";
import { easeOut, lerp, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";

/** In the structure files: C2 = a2, O3 = a3, N4 = a4; C–O = b2, C–N = b3. */
const PARTIAL = ["b2", "b3"];
const MAJOR = drawn(acetamide);
const MINOR = drawn(acetamidePolar);
const HYBRID = drawn(hybridOf(acetamide, PARTIAL));
/** The minor contributor is drawn this much smaller than the major one. */
const MINOR_SIZE = 0.72;

export interface HybridLayout {
  /** The bracketed contributors (major, minor). */
  contributors: Box;
  hybrid: Box;
  label: { x: number; y: number };
  font: number;
}

export function layoutHybrid(aspect: Aspect): HybridLayout {
  const { width, height } = frameSize(aspect);
  if (aspect === "16:9")
    return {
      contributors: { x: 360, y: 90, w: 1200, h: 380 },
      hybrid: { x: 610, y: 540, w: 700, h: 390 },
      label: { x: width / 2, y: 1010 },
      font: 44,
    };
  return {
    contributors: { x: 30, y: 160, w: 1020, h: 470 },
    hybrid: { x: 90, y: 760, w: 900, h: 700 },
    label: { x: width / 2, y: height - 300 },
    font: 48,
  };
}

export default function AmideHybrid({ t, aspect, cited }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const L = layoutHybrid(aspect);
  const row = placeContributors([MAJOR, MINOR], L.contributors, [1, MINOR_SIZE]);
  const [major, minor] = row.frames;
  const hybridScale = Math.min(L.hybrid.w / HYBRID.width, L.hybrid.h / HYBRID.height);
  const hybrid = place(HYBRID, L.hybrid, hybridScale);

  const appear = easeOut(progress(t, 0, 0.8));
  const tags = easeOut(progress(t, 0.6, 1.2));
  // The merge: the contributors step back as the hybrid comes in, then δ− lands on O.
  const merge = easeOut(progress(t, 1.6, 3));
  const delta = easeOut(progress(t, 3.2, 3.8));
  const contributors = appear * lerp(1, 0.55, merge);

  const o = atomAt(hybrid, "a3");
  const c = atomAt(hybrid, "a2");
  const away = Math.hypot(o.x - c.x, o.y - c.y) || 1;
  const deltaAt = { x: o.x + ((o.x - c.x) / away) * L.font * 1.1 + L.font * 0.9, y: o.y + ((o.y - c.y) / away) * L.font * 1.1 };
  const cn = cited["acetamide/r.CN"];
  const hybridBox = frameOf(hybrid);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <g opacity={contributors}>
        <Contributors placed={row} />
      </g>
      <Tag box={major} text="major" size={L.font} opacity={tags * lerp(1, 0.8, merge)} />
      <Tag box={minor} text="minor" size={L.font * MINOR_SIZE} colour={MUTED} opacity={tags * lerp(1, 0.8, merge)} />

      <g opacity={merge}>
        <Tag box={hybridBox} text="hybrid" size={L.font} colour={INK} />
        <Molecule placed={hybrid} dashed={PARTIAL} />
      </g>
      <text x={deltaAt.x} y={deltaAt.y} fontSize={L.font * 1.1} textAnchor="middle" dominantBaseline="central" fill={BOSS} fontFamily={DATA_FONT} opacity={delta}>
        δ−
      </text>

      <text x={L.label.x} y={L.label.y} fontSize={L.font} textAnchor="middle" fill={ELECTRON} fontFamily={DATA_FONT} opacity={appear}>
        {`${cn?.label ?? "C–N"} ${cn?.display ?? ""}`}
        <tspan fill={MUTED} fontFamily={TEXT_FONT}>
          , computed
        </tspan>
      </text>
    </svg>
  );
}
