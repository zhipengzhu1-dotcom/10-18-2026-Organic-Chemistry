// hybrid-sets: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { Carbon, Chip, OrbitalDefs, ink, ModelTag, orbitalLobes, tipOf, type Drawable, type OrbitalAt } from "../hybrid-model/draw.tsx";
import { degrees, hybridDirections, lobeProfile, modelAngle, project, type HybridSet, type Vec3, type ViewTurn } from "../hybrid-model/model.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { shownSet, type HybridSetsState } from "./manifest.ts";

const SUP: Record<HybridSet, string> = { sp3: "sp³", sp2: "sp²", sp: "sp" };
/** Each set's three-quarter view: sp² seen from a little above its plane, so its p stands up. */
const TURN: Record<HybridSet | "unmixed", ViewTurn> = {
  sp3: { yaw: 25, pitch: -15 },
  sp2: { spin: 20, yaw: 0, pitch: -68 },
  sp: { yaw: 35, pitch: -18 },
  unmixed: { yaw: 35, pitch: -18 },
};

/** The panels: one big, or three in a row (16:9) / a column (9:16). */
export function panels(aspect: Aspect, count: number): Box[] {
  const area = safeArea(aspect);
  const top = area.y + area.h * 0.08;
  const h = area.h - (top - area.y);
  if (count === 1) return [{ x: area.x, y: top, w: area.w, h }];
  return Array.from({ length: count }, (_, i) =>
    aspect === "16:9" ? { x: area.x + (area.w / count) * i, y: top, w: area.w / count, h } : { x: area.x, y: top + (h / count) * i, w: area.w, h: h / count },
  );
}

function setDrawing(set: HybridSet, box: Box, carbon: string, captionSize: number) {
  const turn = TURN[set];
  const scale = Math.min(box.w, box.h * 0.82) * 0.36;
  const x = box.x + box.w / 2;
  const y = box.y + box.h * 0.44;
  const chip = Math.max(26, scale * 0.16);
  const { hybrids, p } = hybridDirections(set);
  const orbitals: OrbitalAt[] = [
    ...hybrids.map((axis, i) => ({ kind: set, axis, colour: "ignite" as const, x, y, scale, turn, key: `${set}h${i}` })),
    ...p.map((axis, i) => ({ kind: "p" as const, axis, colour: "electron" as const, x, y, scale, turn, key: `${set}p${i}` })),
  ];
  const drawables: Drawable[] = orbitals.flatMap(orbitalLobes);
  if (set === "sp2") {
    // The plane the three sp² lobes lie in, edge to edge just past their tips.
    const corners: Vec3[] = [
      [1.25, 1.25, 0],
      [-1.25, 1.25, 0],
      [-1.25, -1.25, 0],
      [1.25, -1.25, 0],
    ];
    const pts = corners.map((c) => project(c, turn)).map(([px, py]) => `${x + px * scale},${y - py * scale}`);
    drawables.push({
      z: 0,
      key: "plane",
      node: <polygon key="plane" data-plane="sp2" points={pts.join(" ")} fill={ink("muted")} fillOpacity={0.14} stroke={ink("muted")} strokeOpacity={0.5} strokeWidth={2} />,
    });
  }
  drawables.push({ z: 0.01, key: "C", node: <Carbon key="C" x={x} y={y} r={scale * 0.12} colour={carbon} /> });
  drawables.sort((a, b) => a.z - b.z);

  // The model's angle between the first two lobes, as an arc on screen.
  const [a, b] = hybrids.map((h) => project(h, turn));
  const R = scale * 0.42;
  const start = Math.atan2(-a[1], a[0]);
  let end = Math.atan2(-b[1], b[0]);
  while (end - start > Math.PI) end -= 2 * Math.PI;
  while (start - end > Math.PI) end += 2 * Math.PI;
  const arc = `M${x + R * Math.cos(start)},${y + R * Math.sin(start)} A${R},${R} 0 0 ${end > start ? 1 : 0} ${x + R * Math.cos(end)},${y + R * Math.sin(end)}`;

  return (
    <g key={set} data-set={set}>
      {drawables.map((d) => d.node)}
      <path d={arc} fill="none" stroke={ink("ink")} strokeWidth={Math.max(3, scale * 0.015)} strokeDasharray={`${scale * 0.04} ${scale * 0.03}`} />
      {orbitals.map((o) => {
        const tip = tipOf(o, o.kind === "p" ? 1.18 : 1.1);
        return <Chip key={`chip${o.key}`} x={tip.x} y={tip.y} text={o.kind === "p" ? "2p" : SUP[set]} colour={o.colour} size={chip} />;
      })}
      <text x={x} y={box.y + box.h * 0.95} fill={ink("ink")} fontSize={captionSize} fontFamily="var(--at-font-data, monospace)" textAnchor="middle" dominantBaseline="central">
        {`${SUP[set]} · model: ${degrees(modelAngle(set))}°`}
      </text>
    </g>
  );
}

function unmixedDrawing(box: Box, carbon: string) {
  const turn = TURN.unmixed;
  const scale = Math.min(box.w, box.h) * 0.36;
  const x = box.x + box.w / 2;
  const y = box.y + box.h * 0.48;
  const chip = Math.max(26, scale * 0.15);
  const axes: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const ps: OrbitalAt[] = axes.map((axis, i) => ({ kind: "p", axis, colour: "electron", x, y, scale, turn, key: `p${i}` }));
  const s: OrbitalAt = { kind: "s", axis: [1, 0, 0], colour: "electron", x, y, scale, turn, key: "s" };
  // The round 2s sits behind the dumbbells, faint, so all three p orbitals show through it.
  const sphere = orbitalLobes(s).map((d) => ({ ...d, z: -10, node: <g key={d.key} opacity={0.4}>{d.node}</g> }));
  const drawables = [...sphere, ...ps.flatMap(orbitalLobes), { z: 0.01, key: "C", node: <Carbon key="C" x={x} y={y} r={scale * 0.1} colour={carbon} /> }].sort(
    (a, b) => a.z - b.z,
  );
  const sReach = lobeProfile("s", "+").reach * scale;
  return (
    <g data-set="unmixed">
      {drawables.map((d) => d.node)}
      <line x1={x - sReach * 0.7} y1={y + sReach * 0.7} x2={x - scale * 0.95} y2={y + scale * 0.85} stroke={ink("electron")} strokeWidth={3} />
      <Chip x={x - scale * 1.05} y={y + scale * 0.92} text="2s" colour="electron" size={chip} />
      {ps.map((o) => {
        const tip = tipOf(o, 1.18);
        return <Chip key={`chip${o.key}`} x={tip.x} y={tip.y} text="2p" colour="electron" size={chip} />;
      })}
    </g>
  );
}

export default function HybridSets({ t, state, aspect, cited }: SceneProps<HybridSetsState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const carbon = String(cited["elements/C.colour"]?.value ?? ink("line"));
  const shown = shownSet(state.set, t);
  const sets: HybridSet[] = shown === "all" ? ["sp3", "sp2", "sp"] : shown === "unmixed" ? [] : [shown];
  const boxes = panels(aspect, Math.max(1, sets.length));
  const caption = Math.min(width, height) * 0.045;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <OrbitalDefs />
      </defs>
      <ModelTag x={area.x} y={area.y} size={caption * 0.8} />
      {shown === "unmixed" ? unmixedDrawing(boxes[0], carbon) : sets.map((s, i) => setDrawing(s, boxes[i], carbon, caption))}
    </svg>
  );
}
