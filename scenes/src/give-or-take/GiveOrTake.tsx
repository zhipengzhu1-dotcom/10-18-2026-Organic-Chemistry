// give-or-take: a pure function of (state, cited); see manifest.ts. No idle motion: a
// Manipulate Step loops its Scene, so nothing here depends on t.
import { frameSize, safeArea } from "../frame.ts";
import type { SceneProps } from "../types.ts";
import { AtomDots, DATA_FONT, TEXT_FONT, boss, electron, ink, line, muted } from "../dots/dots.tsx";
import { ATOMS, number, routes, type GiveOrTakeState } from "./manifest.ts";

export default function GiveOrTake({ state, aspect, cited }: SceneProps<GiveOrTakeState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  const r = routes(state.atom, cited);

  // One axis for every atom's Give bar, so the stops compare: the longest is the row's largest sum.
  const most = Math.max(...ATOMS.map((a) => Number(routes(a, cited).give.energy?.value ?? 0)), 1);
  const atom = wide ? { x: area.x + 260, y: area.y + 330 } : { x: width / 2, y: area.y + 300 };
  const panel = wide
    ? { x: area.x + 620, y: area.y + 40, w: area.w - 620 }
    : { x: area.x, y: area.y + 720, w: area.w };
  const barW = panel.w * 0.62;
  const scale = (e: number) => Math.max(10, (e / most) * barW);
  const big = wide ? 64 : 52;
  const body = wide ? 46 : 36;
  const row = wide ? 210 : 260;

  const give = Number(r.give.energy?.value ?? 0);
  const released = r.take.released ? Number(r.take.released.value) : undefined;
  const heldBack = r.take.count - (released === undefined ? 0 : 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <AtomDots at={atom} el={state.atom} n={r.outer} size={220} r={20} />
      <text x={atom.x} y={atom.y + 250} fill={ink} fontSize={big} textAnchor="middle" style={{ fontFamily: TEXT_FONT }}>
        {r.name}
      </text>
      <text x={atom.x} y={atom.y + 330} fill={muted} fontSize={body} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
        {`${r.outer} outer electrons`}
      </text>

      <text x={panel.x} y={panel.y} fill={muted} fontSize={body} style={{ fontFamily: TEXT_FONT }}>
        one atom, alone in empty space
      </text>

      {/* Give: lose every outer electron. */}
      <g transform={`translate(0 ${panel.y + 110})`}>
        <text x={panel.x} y={0} fill={ink} fontSize={big} style={{ fontFamily: DATA_FONT }}>
          {`Give ${r.give.count}`}
        </text>
        <rect className="give" x={panel.x} y={30} width={scale(give)} height={64} fill={boss} />
        <text x={panel.x + scale(give) + 24} y={78} fill={ink} fontSize={body} style={{ fontFamily: DATA_FONT }}>
          {r.give.energy ? `${number(r.give.energy)} eV` : ""}
        </text>
      </g>

      {/* Take: gain 8 − outer. Only a bound first electron gets a bar, dashed: energy given off. */}
      <g transform={`translate(0 ${panel.y + 110 + row})`}>
        <text x={panel.x} y={0} fill={ink} fontSize={big} style={{ fontFamily: DATA_FONT }}>
          {`Take ${r.take.count}`}
        </text>
        {released !== undefined && r.take.released && (
          <>
            <rect className="released" x={panel.x} y={30} width={scale(released)} height={64} fill="none" stroke={electron} strokeWidth={6} strokeDasharray="14 10" />
            <text x={panel.x + scale(released) + 24} y={78} fill={ink} fontSize={body} style={{ fontFamily: DATA_FONT }}>
              {`${number(r.take.released)} eV released`}
            </text>
          </>
        )}
        {heldBack > 0 && (
          <g transform={`translate(0 ${released !== undefined ? 96 : 30})`}>
            <rect x={panel.x} y={0} width={panel.w} height={64} rx={12} fill="none" stroke={line} strokeWidth={4} strokeDasharray="8 10" />
            <text x={panel.x + 24} y={44} fill={muted} fontSize={body * 0.85} style={{ fontFamily: released !== undefined ? DATA_FONT : TEXT_FONT }}>
              {released !== undefined
                ? `✗ ${heldBack} more: a lone atom won't hold this one`
                : "✗ a lone atom won't hold even one"}
            </text>
          </g>
        )}
      </g>

      <text x={width / 2} y={height - area.y - 10} fill={electron} fontSize={big} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
        {`Electrons to move, cheaper way: ${r.move}`}
      </text>
    </svg>
  );
}
