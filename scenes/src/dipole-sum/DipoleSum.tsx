// dipole-sum: a pure function of (t, state); see manifest.ts. Each arrow lies along its bond, from
// the δ+ atom toward the δ− atom. Added, every arrow slides (in 3D) to its place in a tip-to-tail
// chain centred on the central atom, and the sum is drawn: a thick net arrow, or a dashed ring
// with "net: zero".
import type { Vec3 } from "@astratron/content/molecule";
import { frameSize, safeArea, type Box } from "../frame.ts";
import { CYAN, DATA_FONT, INK, MAGENTA, MUTED, LINE } from "../lewis.ts";
import { clamp, easeInOut, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { sceneView } from "../shapes-3d/shapes.ts";
import { fitScale, place, ScaleBar, ShapeView, type Placed } from "../shapes-3d/ShapeView.tsx";
import { FORMULA, SETS, summed, type DipoleSumState } from "./manifest.ts";

/** Arrow length on screen per unit of electronegativity difference, in Å (a rough guide, not to scale). */
const ARROW_PER_UNIT = 0.9;
/** How each molecule is turned so its shape reads (degrees about the vertical, then the tilt toward you). */
const POSE: Record<string, [number, number]> = {
  water: [0, 12],
  co2: [0, 12],
  ccl4: [25, 14],
  ch2cl2: [32, 14],
  nh3: [20, 14],
  bf3: [20, 55],
  chcl3: [25, 14],
  hcn: [0, 12],
  methane: [25, 14],
};
/** The tip-to-tail chain is drawn larger than the molecule, so short arrows still read. */
const CHAIN_ZOOM = 1.6;
/** Seconds the arrows take to slide tip to tail once added. */
const SLIDE: [number, number] = [0.4, 2.2];

const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const times = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

function panels(n: number, area: Box, portrait: boolean): Box[] {
  const cols = portrait ? (n > 2 ? 2 : 1) : Math.min(n, 3);
  const rows = Math.ceil(n / cols);
  const w = area.w / cols;
  const h = area.h / rows;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    // A short last row is centred.
    const x0 = area.x + ((cols - inRow) * w) / 2;
    return { x: x0 + (i % cols) * w, y: area.y + row * h, w, h };
  });
}

function Arrow({ from, to, width, colour, cross }: { from: Placed; to: Placed; width: number; colour: string; cross: boolean }) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 1) return null;
  const [ux, uy] = [(to.x - from.x) / len, (to.y - from.y) / len];
  const head = Math.min(len * 0.45, width * 4.2);
  const [bx, by] = [to.x - ux * head, to.y - uy * head];
  const [nx, ny] = [-uy, ux];
  const cx = from.x + ux * Math.min(len * 0.2, width * 3);
  const cy = from.y + uy * Math.min(len * 0.2, width * 3);
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={bx} y2={by} stroke={colour} strokeWidth={width} strokeLinecap="round" />
      {cross && <line x1={cx + nx * width * 2} y1={cy + ny * width * 2} x2={cx - nx * width * 2} y2={cy - ny * width * 2} stroke={colour} strokeWidth={width * 0.8} />}
      <polygon points={`${to.x},${to.y} ${bx + nx * head * 0.5},${by + ny * head * 0.5} ${bx - nx * head * 0.5},${by - ny * head * 0.5}`} fill={colour} />
    </g>
  );
}

export default function DipoleSum({ t, state, aspect, reducedMotion, cited }: SceneProps<DipoleSumState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const portrait = aspect === "9:16";
  const keys = SETS[state.molecule] ?? SETS.water;
  const sums = keys.map((k) => summed(k, cited));
  const font = portrait ? 40 : keys.length > 3 ? 30 : 36;
  const footer = font * 2.4;
  const boxes = panels(keys.length, { ...area, h: area.h - footer }, portrait);
  const px = Math.min(...sums.map((s, i) => fitScale(s.shape, { ...boxes[i], h: boxes[i].h * 0.48 }, 1.05)));
  // Added: the slide runs from the Scene's start on the site; the video eases `added` itself.
  const slide = reducedMotion ? 1 : easeInOut(progress(t, SLIDE[0], SLIDE[1]));
  const p = clamp(state.added) * slide;
  const done = p >= 0.999;
  const arrowW = Math.max(5, px * 0.07);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ display: "block" }}
      fontFamily={DATA_FONT}
    >
      {keys.map((key, i) => {
        const s = sums[i];
        const box = boxes[i];
        const [spin, tilt] = POSE[key];
        const view = sceneView(spin, tilt);
        const cx = box.x + box.w / 2;
        // The molecule sits in the upper part of its panel; the tip-to-tail chain forms below it.
        const cy = box.y + box.h * 0.38;
        const chainY = box.y + box.h * 0.71;
        const pos = (k: number) => s.shape.atoms[k].pos;
        const vectors = s.arrows.map((a) => {
          const d = plus(pos(a.to), times(pos(a.from), -1));
          return times(d, (a.size * ARROW_PER_UNIT) / Math.hypot(...d));
        });
        const total = vectors.reduce(plus, [0, 0, 0] as Vec3);
        const base = times(total, -0.5);
        let at = base;
        const chain: Vec3[] = [];
        const onBonds = vectors.map((v, k) => {
          chain.push(at);
          at = plus(at, v);
          const mid = times(plus(pos(s.arrows[k].from), pos(s.arrows[k].to)), 0.5);
          return plus(mid, times(v, -0.5)); // cited-data: ok, centres the arrow on its bond
        });
        const ends = (starts: Vec3[]) => starts.map((st, k) => plus(st, vectors[k]));
        const [bondFrom, bondTo] = [onBonds, ends(onBonds)].map((pts) => place(pts, view, cx, cy, px));
        const [chainFrom, chainTo] = [chain, ends(chain)].map((pts) => place(pts, view, cx, chainY, px * CHAIN_ZOOM));
        const between = (a: Placed, b: Placed): Placed => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p });
        const [netFrom, netTo] = place([base, plus(base, total)], view, cx, chainY, px * CHAIN_ZOOM);
        return (
          <g key={key}>
            <rect x={box.x + 6} y={box.y + 6} width={box.w - 12} height={box.h - 12} rx={22} fill="none" stroke={LINE} strokeWidth={2} />
            <text x={cx} y={box.y + font * 1.2} fill={INK} fontSize={font} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {FORMULA[key]}
            </text>
            <ShapeView shape={s.shape} view={view} cx={cx} cy={cy} px={px} cited={cited} font={font * 0.8} id={`ds-${key}`} />
            {bondFrom.map((from, k) => (
              <Arrow key={`d-${k}`} from={between(from, chainFrom[k])} to={between(bondTo[k], chainTo[k])} width={arrowW} colour={CYAN} cross />
            ))}
            {done &&
              (s.net.zero ? (
                <g>
                  <circle cx={netFrom.x} cy={netFrom.y} r={px * 0.35} fill="none" stroke={MAGENTA} strokeWidth={arrowW} strokeDasharray="12 8" />
                  <text x={cx} y={box.y + box.h - font * 2.1} fill={MAGENTA} fontSize={font * 0.85} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                    net: zero
                  </text>
                </g>
              ) : (
                <Arrow from={netFrom} to={netTo} width={arrowW * 2.2} colour={MAGENTA} cross={false} />
              ))}
            {done && (
              <text x={cx} y={box.y + box.h - font * 1.0} fill={INK} fontSize={font * 0.9} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                {s.net.zero ? "nonpolar" : "polar"}
              </text>
            )}
          </g>
        );
      })}
      <text x={area.x + area.w / 2} y={area.y + area.h - footer * 0.62} fill={MUTED} fontSize={font * 0.7} textAnchor="middle" dominantBaseline="central">
        length: a rough guide, not to scale
      </text>
      <ScaleBar x={area.x + area.w / 2 - px / 2 - font} y={area.y + area.h - footer * 0.15} px={px} font={font * 0.7} />
    </svg>
  );
}
