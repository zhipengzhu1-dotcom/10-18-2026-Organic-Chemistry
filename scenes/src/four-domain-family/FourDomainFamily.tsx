// four-domain-family: a pure function of (t, state); see manifest.ts. The three molecules turn
// one full turn together about the vertical and settle side on; scrubbing turns all three.
import { frameSize, safeArea } from "../frame.ts";
import { DATA_FONT, INK, LINE, MUTED } from "../lewis.ts";
import { easeInOut, progress } from "../motion.ts";
import type { SceneProps } from "../types.ts";
import { buildShape } from "../shapes-3d/shapes.ts";
import { fitScale, ScaleBar, ShapeView } from "../shapes-3d/ShapeView.tsx";
import { sceneView } from "../shapes-3d/shapes.ts";
import { FAMILY, MODEL_ANGLE, TURN_SECONDS, type FourDomainState } from "./manifest.ts";

/** Side on: the view the Scene opens on and settles in (degrees about the vertical). */
const SIDE_ON = 20;

export default function FourDomainFamily({ t, state, aspect, reducedMotion, cited }: SceneProps<FourDomainState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const portrait = aspect === "9:16";
  const turned = reducedMotion ? 1 : easeInOut(progress(t, 0, TURN_SECONDS));
  const view = sceneView(SIDE_ON - 360 * (1 - turned));
  const shapes = FAMILY.map((m) => buildShape(m.key, cited));
  const font = portrait ? 40 : 34;
  const textRows = state.labels === "names" ? 1.6 : 2.8;
  // Landscape: three panels in a row. Portrait: three stacked rows, the text beside each molecule.
  const footer = font * 2.6;
  const panels = FAMILY.map((_, i) =>
    portrait
      ? { x: area.x, y: area.y + ((area.h - footer) / 3) * i, w: area.w * 0.58, h: (area.h - footer) / 3 }
      : { x: area.x + (area.w / 3) * i, y: area.y, w: area.w / 3, h: area.h - footer - font * textRows },
  );
  const px = Math.min(...shapes.map((s, i) => fitScale(s, panels[i], 1.15)));
  const modelY = area.y + area.h - font * 0.8;

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
      {FAMILY.map((m, i) => {
        const box = panels[i];
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const tx = portrait ? box.x + box.w + font * 0.4 : cx;
        const ty = portrait ? cy - font * (textRows / 2 - 0.6) : box.y + box.h + font * 0.9;
        const anchor = portrait ? "start" : "middle";
        const [name, shape] = [shapes[i].title, shapes[i].shape];
        return (
          <g key={m.key}>
            <rect x={box.x + 8} y={box.y + 8} width={box.w - 16} height={box.h - 16} rx={24} fill="none" stroke={LINE} strokeWidth={2} />
            <ShapeView shape={shapes[i]} view={view} cx={cx} cy={cy} px={px} cited={cited} lonePairs font={font} id={`fdf-${m.key}`} />
            <text x={tx} y={ty} fill={INK} fontSize={font} fontWeight={700} textAnchor={anchor} dominantBaseline="central">
              {name}
            </text>
            <text x={tx} y={ty + font * 1.2} fill={INK} fontSize={font * 0.8} textAnchor={anchor} dominantBaseline="central">
              {shape}
            </text>
            {state.labels !== "names" && (
              <text x={tx} y={ty + font * 2.3} fill={MUTED} fontSize={font * 0.8} textAnchor={anchor} dominantBaseline="central">
                {`${m.angleName} ${cited[m.angle]?.display ?? ""}`}
              </text>
            )}
          </g>
        );
      })}
      <line x1={area.x} y1={modelY} x2={area.x + area.w * (portrait ? 0.45 : 0.62)} y2={modelY} stroke={MUTED} strokeWidth={3} strokeDasharray="14 10" />
      <text x={area.x + area.w * (portrait ? 0.47 : 0.64)} y={modelY} fill={MUTED} fontSize={font * 0.8} dominantBaseline="central">
        {`model: ${cited[MODEL_ANGLE]?.display ?? ""}`}
      </text>
      <ScaleBar x={area.x + area.w * (portrait ? 0.03 : 0.84)} y={modelY - (portrait ? font * 1.4 : 0)} px={px} font={font * 0.7} />
    </svg>
  );
}
