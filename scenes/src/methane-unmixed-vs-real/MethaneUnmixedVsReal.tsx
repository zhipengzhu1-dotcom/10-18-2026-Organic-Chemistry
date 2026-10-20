// methane-unmixed-vs-real: a pure function of (t, state); see manifest.ts.
import { frameSize, safeArea, type Box } from "../frame.ts";
import { Carbon, Chip, ink, OrbitalDefs, orbitalLobes, tipOf, type OrbitalAt } from "../hybrid-model/draw.tsx";
import { lobeProfile, project, type Vec3, type ViewTurn } from "../hybrid-model/model.ts";
import type { SceneProps } from "../types.ts";
import { A_HCH, R_CH, type MethanePanelState } from "./manifest.ts";

const TURN: ViewTurn = { yaw: 35, pitch: -18 };
const REAL_TURN: ViewTurn = { yaw: 20, pitch: 20 };

function Hydrogen({ x, y, r, colour, dashed = false }: { x: number; y: number; r: number; colour: string; dashed?: boolean }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={dashed ? "none" : colour}
        stroke={dashed ? ink("ink") : "#140f2b"}
        strokeWidth={Math.max(2, r * 0.1)}
        strokeDasharray={dashed ? `${r * 0.3} ${r * 0.22}` : undefined}
      />
      <text x={x} y={y} fill={dashed ? ink("ink") : "#140f2b"} fontSize={r * 1.1} fontWeight={700} textAnchor="middle" dominantBaseline="central">
        H
      </text>
    </g>
  );
}

function header(box: Box, lines: string[], size: number) {
  return (
    <text x={box.x + box.w / 2} y={box.y + size} fill={ink("muted")} fontSize={size} fontFamily="var(--at-font-data, monospace)" textAnchor="middle">
      {lines.map((line, i) => (
        <tspan key={i} x={box.x + box.w / 2} dy={i === 0 ? 0 : size * 1.25}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Unmixed({ box, size, carbon, hydrogen }: { box: Box; size: number; carbon: string; hydrogen: string }) {
  const scale = Math.min(box.w, box.h) * 0.27;
  const x = box.x + box.w / 2;
  const y = box.y + box.h * 0.56;
  const axes: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const ps: OrbitalAt[] = axes.map((axis, i) => ({ kind: "p", axis, colour: "electron", x, y, scale, turn: TURN, key: `p${i}` }));
  const s: OrbitalAt = { kind: "s", axis: [1, 0, 0], colour: "electron", x, y, scale, turn: TURN, key: "s" };
  const lobes = [...orbitalLobes(s).map((d) => ({ ...d, z: -10 })), ...ps.flatMap(orbitalLobes), { z: 0.01, key: "C", node: <Carbon key="C" x={x} y={y} r={scale * 0.12} colour={carbon} /> }].sort(
    (a, b) => a.z - b.z,
  );
  const hr = scale * 0.13;
  const sReach = lobeProfile("s", "+").reach * scale;
  // The fourth H, on the round 2s, which points nowhere.
  const odd = { x: x - scale * 1.25, y: y + scale * 0.95 };
  return (
    <g data-panel="unmixed">
      {header(box, ["model: if carbon used its orbitals unmixed", "(not a real molecule)"], size * 0.72)}
      {lobes.map((d) => d.node)}
      {ps.map((o) => {
        const tip = tipOf(o, 1.08);
        return <Hydrogen key={`H${o.key}`} x={tip.x} y={tip.y} r={hr} colour={hydrogen} />;
      })}
      <line x1={x - sReach * 0.7} y1={y + sReach * 0.7} x2={odd.x + hr * 0.7} y2={odd.y - hr * 0.7} stroke={ink("ink")} strokeWidth={3} strokeDasharray="10 8" />
      <Hydrogen x={odd.x} y={odd.y} r={hr} colour={hydrogen} dashed />
      <text x={odd.x - hr * 2} y={odd.y} fill={ink("ink")} fontSize={size * 1.6} textAnchor="middle" dominantBaseline="central">
        ?
      </text>
      {ps.map((o) => {
        const tip = tipOf(o, 1.4);
        return <Chip key={`c${o.key}`} x={tip.x} y={tip.y} text="2p" colour="electron" size={size * 0.8} />;
      })}
      <Chip x={x + sReach * 0.2} y={y + sReach * 1.9} text="2s" colour="electron" size={size * 0.8} />
    </g>
  );
}

function Real({ box, size, carbon, hydrogen, length, angle }: { box: Box; size: number; carbon: string; hydrogen: string; length: { value: number; display: string }; angle: { value: number; display: string } }) {
  // Methane from its cited numbers: one H straight up the frame's y, three more at the cited
  // H–C–H angle from it, 120° apart around y (all six angles equal, as the data say).
  const theta = (angle.value * Math.PI) / 180; // cited-data: ok, degrees to radians
  const dirs: Vec3[] = [
    [0, 1, 0],
    ...[0, 1, 2].map((k) => {
      const phi = (k * 2 * Math.PI) / 3;
      return [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)] as Vec3;
    }),
  ];
  const pxPerA = (Math.min(box.w, box.h * 0.8) * 0.3) / length.value;
  const x = box.x + box.w / 2;
  const y = box.y + box.h * 0.56;
  const at = dirs.map((d) => project(d, REAL_TURN)).map(([px, py, pz]) => ({ x: x + px * length.value * pxPerA, y: y - py * length.value * pxPerA, z: pz }));
  const order = at.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);
  const cr = pxPerA * 0.32;
  const hr = pxPerA * 0.22;
  const tag = size * 0.8;
  return (
    <g data-panel="real">
      {header(box, ["measured"], size)}
      {order.filter((p) => p.z < 0).map((p) => <line key={`b${p.i}`} x1={x} y1={y} x2={p.x} y2={p.y} stroke="#c8c8d0" strokeWidth={cr * 0.3} strokeLinecap="round" />)}
      {order.filter((p) => p.z < 0).map((p) => <Hydrogen key={`h${p.i}`} x={p.x} y={p.y} r={hr} colour={hydrogen} />)}
      <Carbon x={x} y={y} r={cr} colour={carbon} />
      {order.filter((p) => p.z >= 0).map((p) => <line key={`b${p.i}`} x1={x + ((p.x - x) * cr) / Math.hypot(p.x - x, p.y - y)} y1={y + ((p.y - y) * cr) / Math.hypot(p.x - x, p.y - y)} x2={p.x} y2={p.y} stroke="#c8c8d0" strokeWidth={cr * 0.3} strokeLinecap="round" />)}
      {order.filter((p) => p.z >= 0).map((p) => <Hydrogen key={`h${p.i}`} x={p.x} y={p.y} r={hr} colour={hydrogen} />)}
      {at.map((p, i) => {
        // Each length sits beside its bond, pushed off the line.
        const mx = x + (p.x - x) * 0.62;
        const my = y + (p.y - y) * 0.62;
        const len = Math.hypot(p.x - x, p.y - y) || 1;
        const nx = -(p.y - y) / len;
        const ny = (p.x - x) / len;
        const off = tag * 1.4;
        return (
          <text key={`l${i}`} x={mx + nx * off} y={my + ny * off} fill={ink("ink")} fontSize={tag} fontFamily="var(--at-font-data, monospace)" textAnchor="middle" dominantBaseline="central">
            {length.display}
          </text>
        );
      })}
      <text x={x} y={box.y + box.h * 0.97} fill={ink("ignite")} fontSize={size} fontFamily="var(--at-font-data, monospace)" textAnchor="middle">
        {`all six H–C–H: ${angle.display}`}
      </text>
    </g>
  );
}

export default function MethaneUnmixedVsReal({ state, aspect, cited }: SceneProps<MethanePanelState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const carbon = String(cited["elements/C.colour"]?.value ?? ink("line"));
  const hydrogen = String(cited["elements/H.colour"]?.value ?? ink("ink"));
  const length = { value: Number(cited[R_CH]?.value ?? 1), display: cited[R_CH]?.display ?? "" };
  const angle = { value: Number(cited[A_HCH]?.value ?? 0), display: cited[A_HCH]?.display ?? "" };
  const both = state.panel === "both";
  const wide = aspect === "16:9";
  const size = Math.min(width, height) * 0.034;
  const boxes: Box[] = both
    ? wide
      ? [
          { x: area.x, y: area.y, w: area.w / 2, h: area.h },
          { x: area.x + area.w / 2, y: area.y, w: area.w / 2, h: area.h },
        ]
      : [
          { x: area.x, y: area.y, w: area.w, h: area.h / 2 },
          { x: area.x, y: area.y + area.h / 2, w: area.w, h: area.h / 2 },
        ]
    : [area, area];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <OrbitalDefs />
      </defs>
      {state.panel !== "real" && <Unmixed box={boxes[0]} size={size} carbon={carbon} hydrogen={hydrogen} />}
      {both && (
        <line
          x1={wide ? area.x + area.w / 2 : area.x}
          y1={wide ? area.y : area.y + area.h / 2}
          x2={wide ? area.x + area.w / 2 : area.x + area.w}
          y2={wide ? area.y + area.h : area.y + area.h / 2}
          stroke={ink("line")}
          strokeWidth={3}
        />
      )}
      {state.panel !== "unmixed" && <Real box={boxes[1]} size={size} carbon={carbon} hydrogen={hydrogen} length={length} angle={angle} />}
    </svg>
  );
}
