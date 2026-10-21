// pi-twist: a pure function of (state); see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { Chip, fill as marker, ink, ModelTag, OrbitalDefs, orbitalLobes, type Drawable } from "../hybrid-model/draw.tsx";
import { project, type Vec3, type ViewTurn } from "../hybrid-model/model.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { overlapAt, overlapWord, type PiTwistState } from "./manifest.ts";

/** A three-quarter view: the C–C axis runs left to right, the molecule's plane seen from a little above. */
const VIEW: ViewTurn = { yaw: -35, pitch: 14 };
/** How long a model p lobe is drawn, in Å of the drawing (a picture size, not a measurement). */
const LOBE = 0.8;

export function layoutPiTwist(aspect: Aspect): { stage: Box; bar: Box } {
  const area = safeArea(aspect);
  const gap = area.w * 0.04;
  if (aspect === "16:9") {
    const barW = area.w * 0.14;
    return { stage: { x: area.x, y: area.y, w: area.w - barW - gap, h: area.h }, bar: { x: area.x + area.w - barW, y: area.y + area.h * 0.1, w: barW, h: area.h * 0.8 } };
  }
  const barH = area.h * 0.1;
  return { stage: { x: area.x, y: area.y, w: area.w, h: area.h - barH - gap }, bar: { x: area.x, y: area.y + area.h - barH, w: area.w, h: barH } };
}

const turnX = (v: Vec3, deg: number): Vec3 => {
  const a = (deg * Math.PI) / 180;
  return [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
};

export default function PiTwist({ state, aspect, cited }: SceneProps<PiTwistState>) {
  const { width, height } = frameSize(aspect);
  const { stage, bar } = layoutPiTwist(aspect);
  const carbon = String(cited["elements/C.colour"]?.value ?? ink("line"));
  const hydrogen = String(cited["elements/H.colour"]?.value ?? ink("ink"));
  const rCC = Number(cited["ethylene/r.CC"]?.value ?? 1);
  const rCH = Number(cited["ethylene/r.CH"]?.value ?? 1);
  const hcc = (Number(cited["ethylene/a.HCC"]?.value ?? 0) * Math.PI) / 180; // cited-data: ok, degrees to radians
  const twist = state.twist;
  const overlap = overlapAt(twist);

  // Ethylene in its own frame (Å): C–C along x, the flat molecule in the xz plane, p orbitals along y.
  const c1: Vec3 = [-rCC / 2, 0, 0];
  const c2: Vec3 = [rCC / 2, 0, 0];
  const hLeft = [1, -1].map((s) => [c1[0] + rCH * Math.cos(hcc), 0, s * rCH * Math.sin(hcc)] as Vec3);
  const hRight = [1, -1].map((s) => {
    const d = turnX([-Math.cos(hcc), 0, s * Math.sin(hcc)], twist);
    return [c2[0] + rCH * d[0], rCH * d[1], rCH * d[2]] as Vec3;
  });
  const pRight = turnX([0, 1, 0], twist);

  const span = rCC + 2 * rCH;
  const scale = Math.min(stage.w / (span * 1.25), stage.h / (LOBE * 2.6));
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h * 0.52;
  const screen = (v: Vec3) => {
    const [x, y, z] = project(v, VIEW);
    return { x: cx + x * scale, y: cy - y * scale, z };
  };

  const drawables: Drawable[] = [];
  const ball = (v: Vec3, element: "C" | "H", key: string) => {
    const p = screen(v);
    const r = scale * (element === "C" ? 0.24 : 0.17);
    drawables.push({
      z: p.z + 0.001,
      key,
      node: (
        <g key={key}>
          <circle cx={p.x} cy={p.y} r={r} fill={element === "C" ? carbon : hydrogen} stroke="var(--at-ink, #1d1b26)" strokeWidth={Math.max(2, r * 0.1)} />
          <text x={p.x} y={p.y} fill="var(--at-ink, #1d1b26)" fontSize={r * 1.1} fontWeight={700} textAnchor="middle" dominantBaseline="central">
            {element}
          </text>
        </g>
      ),
    });
  };
  const stick = (a: Vec3, b: Vec3, key: string) => {
    const [p, q] = [screen(a), screen(b)];
    drawables.push({
      z: Math.min(p.z, q.z) - 0.002,
      key,
      node: <line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--at-ink-muted, #57536b)" strokeOpacity={0.45} strokeWidth={scale * 0.08} strokeLinecap="round" />,
    });
  };
  stick(c1, c2, "cc");
  hLeft.forEach((h, i) => stick(c1, h, `l${i}`));
  hRight.forEach((h, i) => stick(c2, h, `r${i}`));
  for (const [at, axis, key] of [
    [c1, [0, 1, 0] as Vec3, "p1"],
    [c2, pRight, "p2"],
  ] as const) {
    const p = screen(at);
    for (const d of orbitalLobes({ kind: "p", axis, colour: "blue", x: p.x, y: p.y, scale: scale * LOBE, turn: VIEW, key }))
      drawables.push({ ...d, z: d.z * LOBE + p.z });
  }
  ball(c1, "C", "c1");
  ball(c2, "C", "c2");
  hLeft.forEach((h, i) => ball(h, "H", `hl${i}`));
  hRight.forEach((h, i) => ball(h, "H", `hr${i}`));
  drawables.sort((a, b) => a.z - b.z);

  const label = Math.min(width, height) * 0.032;
  const word = overlapWord(twist);
  const flipped = pRight[1] < 0;
  const chip = word === "none" ? "no π bond" : flipped && word === "full" ? "flipped: solid meets hatched" : null;
  const vertical = aspect === "16:9";
  const track = vertical ? { ...bar, h: bar.h * 0.82 } : { ...bar, y: bar.y + bar.h * 0.4, h: bar.h * 0.6 };
  const fill = vertical
    ? { x: track.x, y: track.y + track.h * (1 - overlap), w: track.w, h: track.h * overlap }
    : { x: track.x, y: track.y, w: track.w * overlap, h: track.h };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <OrbitalDefs />
      </defs>
      <ModelTag x={stage.x} y={stage.y} size={label * 0.8} />
      {drawables.map((d) => d.node)}
      {chip && <Chip x={stage.x + stage.w / 2} y={stage.y + stage.h * 0.94} text={chip} colour="ink" size={label} />}
      <g data-overlap={overlap.toFixed(6)}>
        {/* A blue marker fill inside the track's pen line (paper: a fill never stands alone). */}
        <rect x={fill.x} y={fill.y} width={fill.w} height={fill.h} fill={marker("blue")} />
        <rect x={track.x} y={track.y} width={track.w} height={track.h} fill="none" stroke={ink("blue")} strokeWidth={4} />
        <text
          x={vertical ? bar.x + bar.w / 2 : bar.x}
          y={vertical ? bar.y + bar.h * 0.92 : bar.y + bar.h * 0.18}
          fill={ink("ink")}
          fontSize={vertical ? Math.min(label, bar.w * 0.13) : label}
          textAnchor={vertical ? "middle" : "start"}
          dominantBaseline="central"
          fontFamily="var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)"
        >
          π overlap (model)
        </text>
      </g>
    </svg>
  );
}
