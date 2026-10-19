// ethanol-three-ways: a pure function of (t, state); see manifest.ts.
import type { ReactNode } from "react";
import type { Structure } from "@astratron/content";
import { frameSize, safeArea, type Box } from "../frame.ts";
import { clamp, easeInOut, lerp, progress } from "../motion.ts";
import type { Aspect, SceneProps } from "../types.ts";
import { drawStructure, type Drawing } from "../structure/render.ts";
import { molecule } from "../lesson-02/molecules.ts";
import { innerSvg, stageFor, transformOn, type Stage } from "../lesson-02/place.ts";
import { TIMES, type EthanolState } from "./manifest.ts";

const ink = "var(--at-ink, #f2f0ff)";
const muted = "var(--at-ink-muted, #b9a8e8)";
const electron = "var(--at-electron, #3ee8ff)";
const mono = "var(--at-font-data, 'JetBrains Mono', ui-monospace, monospace)";
const text = "var(--at-font-text, system-ui, sans-serif)";

/** Bonds stop this far (drawing px) short of a letter, as in the renderer. */
const LETTER_GAP = 12;
/** The dots are gone by the time the lines are this far grown (1 / DOT_FADE). */
const DOT_FADE = 1.6;
/** The caption changes name halfway through a change. */
const HALF = 0.5;
/** Ethanol is small: let it grow to fill the frame. */
const MAX_SCALE = 6;
/** The carbons' H's and their bonds, which line-angle leaves out. */
const C_HYDROGENS = ["a4", "a5", "a6", "a7", "a8", "b3", "b4", "b5", "b6", "b7"];

const lewis = () => molecule("ethanol-lewis");
const kekule = (): Structure => ({ ...lewis(), style: "full" });
const lineAngle = () => molecule("ethanol");

/** Where the main drawing and its caption go, and the three panels of the row. */
export function layoutEthanol(aspect: Aspect): { main: Box; caption: Box; row: { box: Box; caption: Box }[] } {
  const area = safeArea(aspect);
  const captionH = area.h * (aspect === "16:9" ? 0.12 : 0.06);
  const main = { ...area, h: area.h - captionH };
  const caption = { x: area.x, y: area.y + area.h - captionH, w: area.w, h: captionH };
  const row = [0, 1, 2].map((i) => {
    if (aspect === "16:9") {
      const w = area.w / 3;
      const x = area.x + i * w;
      return { box: { x: x + w * 0.05, y: area.y, w: w * 0.9, h: area.h - captionH }, caption: { x, y: caption.y, w, h: captionH } };
    }
    const h = area.h / 3;
    const y = area.y + i * h;
    return { box: { x: area.x, y, w: area.w, h: h - captionH }, caption: { x: area.x, y: y + h - captionH, w: area.w, h: captionH } };
  });
  return { main, caption, row };
}

function Drawn({ stage, drawing, structure, opacity = 1, children }: { stage: Stage; drawing: Drawing; structure: Structure; opacity?: number; children?: ReactNode }) {
  return (
    <g transform={transformOn(stage, drawing, structure)} opacity={opacity} style={{ color: ink, fontFamily: mono, ["--lone-pair" as string]: electron }}>
      <g dangerouslySetInnerHTML={{ __html: innerSvg(drawing) }} />
      {children}
    </g>
  );
}

/** Stage 1 at p (0 → 1): the Lewis drawing's shared pairs stretch into lines. */
function LewisToKekule({ stage, p }: { stage: Stage; p: number }) {
  const s = lewis();
  const fade = Object.fromEntries(s.bonds.map((b) => [b.id, 1 - clamp(p * DOT_FADE)]));
  const d = drawStructure(s, [], { fade });
  return (
    <Drawn stage={stage} drawing={d} structure={s}>
      {s.bonds.map((b) => {
        const g = d.bonds[b.id];
        const len = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
        const half = Math.max(0, len / 2 - LETTER_GAP) * easeInOut(p);
        const [mx, my, ux, uy] = [(g.x1 + g.x2) / 2, (g.y1 + g.y2) / 2, (g.x2 - g.x1) / len, (g.y2 - g.y1) / len];
        return (
          <line
            key={b.id}
            x1={mx - ux * half}
            y1={my - uy * half}
            x2={mx + ux * half}
            y2={my + uy * half}
            stroke={ink}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={p > 0 ? 1 : 0}
          />
        );
      })}
    </Drawn>
  );
}

/** Stage 2 at q (0 → 1): C–H lines and C letters fade, the chain settles into the zigzag, then line-angle. */
function KekuleToLineAngle({ stage, q }: { stage: Stage; q: number }) {
  const k = kekule();
  const la = lineAngle();
  const gone = 1 - easeInOut(progress(q, 0, 0.4));
  const move = easeInOut(progress(q, 0.4, 0.85));
  const swap = easeInOut(progress(q, 0.85, 1));
  const target = new Map(la.atoms.map((a) => [a.id, a]));
  const o = target.get("a3")!;
  const atoms = k.atoms.map((a) => {
    const to = target.get(a.id) ?? (a.id === "a9" ? { x: o.x + 0.45, y: o.y } : a);
    return { ...a, x: lerp(a.x, to.x, move), y: lerp(a.y, to.y, move) };
  });
  // Once the C–H's and C letters are gone the carbons are corners: draw line-angle, so no gap is left where a letter was.
  const moving: Structure =
    gone > 0
      ? { ...k, atoms }
      : {
          ...k,
          style: "line-angle",
          atoms: atoms.filter((a) => !C_HYDROGENS.includes(a.id)),
          bonds: k.bonds.filter((b) => !C_HYDROGENS.includes(b.id)),
        };
  const fade: Record<string, number> = { a1: gone, a2: gone };
  for (const id of C_HYDROGENS) fade[id] = gone;
  const d = drawStructure(moving, [], { fade });
  const final = drawStructure(la);
  return (
    <>
      <Drawn stage={stage} drawing={d} structure={moving} opacity={1 - swap} />
      {swap > 0 && <Drawn stage={stage} drawing={final} structure={la} opacity={swap} />}
    </>
  );
}

function Caption({ box, label, opacity = 1, size }: { box: Box; label: string; opacity?: number; size: number }) {
  return (
    <text x={box.x + box.w / 2} y={box.y + box.h / 2} textAnchor="middle" dominantBaseline="central" fill={muted} fontSize={size} fontFamily={text} opacity={opacity}>
      {label}
    </text>
  );
}

export default function EthanolThreeWays({ t, state, aspect }: SceneProps<EthanolState>) {
  const { width, height } = frameSize(aspect);
  const { main, caption, row } = layoutEthanol(aspect);
  const lewisDrawing = drawStructure(lewis());
  const stage = stageFor(lewisDrawing, lewis(), main, MAX_SCALE);
  const size = caption.h * 0.5;

  let body: ReactNode;
  let label: string;
  let rowIn = 0;
  if (state.stage === "1") {
    const p = progress(t, TIMES.one.start, TIMES.one.end);
    body = <LewisToKekule stage={stage} p={p} />;
    label = p < HALF ? "Lewis" : "Kekulé";
  } else if (state.stage === "2") {
    const q = progress(t, TIMES.two.start, TIMES.two.end);
    body = <KekuleToLineAngle stage={stage} q={q} />;
    label = q < HALF ? "Kekulé" : "line-angle";
  } else {
    const p = progress(t, TIMES.all.one.start, TIMES.all.one.end);
    const q = progress(t, TIMES.all.two.start, TIMES.all.two.end);
    body = t < TIMES.all.two.start ? <LewisToKekule stage={stage} p={p} /> : <KekuleToLineAngle stage={stage} q={q} />;
    label = t < TIMES.all.two.start ? (p < HALF ? "Lewis" : "Kekulé") : q < HALF ? "Kekulé" : "line-angle";
    rowIn = easeInOut(progress(t, TIMES.all.row, TIMES.all.row + 0.5));
  }

  const panels: [Structure, string][] = [
    [lewis(), "Lewis"],
    [kekule(), "Kekulé"],
    [lineAngle(), "line-angle"],
  ];
  // Each panel fits the Lewis drawing (the widest), so the three share one scale.
  const panelStages = row.map((r) => stageFor(lewisDrawing, lewis(), r.box, MAX_SCALE));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      {rowIn < 1 && (
        <g opacity={1 - rowIn}>
          {body}
          <Caption box={caption} label={label} size={size} />
        </g>
      )}
      {rowIn > 0 &&
        panels.map(([s, name], i) => (
          <g key={name} opacity={rowIn}>
            <Drawn stage={panelStages[i]} drawing={drawStructure(s)} structure={s} />
            <Caption box={row[i].caption} label={name} size={size} />
          </g>
        ))}
    </svg>
  );
}
