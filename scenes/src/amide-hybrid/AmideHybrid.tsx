// amide-hybrid: a pure function of t; see manifest.ts.
import { Brackets, DATA_FONT, ELECTRON, BOSS, INK, MUTED, Molecule, ResonanceArrow, TEXT_FONT, Tag, atomAt, drawn, frameOf, hybridOf, place } from "../contributors/draw.tsx";
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
  major: Box;
  minor: Box;
  arrow: { x: number; y: number };
  bracket: Box;
  hybrid: Box;
  label: { x: number; y: number };
  font: number;
}

export function layoutHybrid(aspect: Aspect): HybridLayout {
  const { width, height } = frameSize(aspect);
  if (aspect === "16:9")
    return {
      major: { x: 420, y: 110, w: 520, h: 330 },
      minor: { x: 1060, y: 110, w: 460, h: 330 },
      arrow: { x: 1000, y: 275 },
      bracket: { x: 360, y: 80, w: 1200, h: 390 },
      hybrid: { x: 610, y: 540, w: 700, h: 390 },
      label: { x: width / 2, y: 1010 },
      font: 44,
    };
  return {
    major: { x: 70, y: 200, w: 450, h: 380 },
    minor: { x: 590, y: 200, w: 420, h: 380 },
    arrow: { x: 555, y: 390 },
    bracket: { x: 30, y: 150, w: 1020, h: 480 },
    hybrid: { x: 90, y: 760, w: 900, h: 700 },
    label: { x: width / 2, y: height - 300 },
    font: 48,
  };
}

export default function AmideHybrid({ t, aspect, cited }: SceneProps<Record<string, never>>) {
  const { width, height } = frameSize(aspect);
  const L = layoutHybrid(aspect);
  const scale = Math.min(L.major.w / MAJOR.width, L.major.h / MAJOR.height, L.minor.w / (MINOR.width * MINOR_SIZE), L.minor.h / (MINOR.height * MINOR_SIZE));
  const major = place(MAJOR, L.major, scale);
  const minor = place(MINOR, L.minor, scale * MINOR_SIZE);
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
        <Brackets box={L.bracket} />
        <Molecule placed={major} />
        <ResonanceArrow at={L.arrow} size={L.font * 1.6} />
        <Molecule placed={minor} />
      </g>
      <Tag box={frameOf(major)} text="major" size={L.font} opacity={tags * lerp(1, 0.8, merge)} />
      <Tag box={frameOf(minor)} text="minor" size={L.font * MINOR_SIZE} colour={MUTED} opacity={tags * lerp(1, 0.8, merge)} />

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
