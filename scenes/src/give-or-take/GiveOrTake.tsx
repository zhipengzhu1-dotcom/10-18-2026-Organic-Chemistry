// give-or-take: a pure function of (state, cited); see manifest.ts. No idle motion: a
// Manipulate Step loops its Scene, so nothing here depends on t. Type is large: on a phone
// the 1920-wide frame shows at about a fifth of its size.
import { frameSize, safeArea } from "../frame.ts";
import type { SceneProps } from "../types.ts";
import { AtomDots, DATA_FONT, HAND_FONT, TEXT_FONT, pink, pinkFill, blue, ink, line, muted } from "../dots/dots.tsx";
import { ATOMS, number, routes, type GiveOrTakeState } from "./manifest.ts";

export default function GiveOrTake({ state, aspect, cited }: SceneProps<GiveOrTakeState>) {
  const { width, height } = frameSize(aspect);
  const area = safeArea(aspect);
  const wide = aspect === "16:9";
  const r = routes(state.atom, cited);

  // One axis for every atom's Give bar, so the stops compare: the longest is the row's largest sum.
  const most = Math.max(...ATOMS.map((a) => Number(routes(a, cited).give.energy?.value ?? 0)), 1);
  const atom = wide ? { x: area.x + 280, y: area.y + 300 } : { x: width / 2, y: area.y + 250 };
  const panel = wide ? { x: area.x + 640, y: area.y + 60, w: area.w - 640 } : { x: area.x, y: area.y + 780, w: area.w };
  const size = { label: wide ? 96 : 84, value: wide ? 72 : 64, small: wide ? 52 : 48, flag: wide ? 54 : 46, counter: wide ? 84 : 58 };
  const barH = wide ? 84 : 76;
  const barW = panel.w * 0.6;
  const scale = (e: number) => Math.max(12, (e / most) * barW);
  const give = Number(r.give.energy?.value ?? 0);
  const released = r.take.released ? Number(r.take.released.value) : undefined;
  const heldBack = r.take.count - (released === undefined ? 0 : 1);
  const giveY = panel.y + (wide ? 150 : 130);
  const takeY = giveY + (wide ? 280 : 260);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
      <AtomDots at={atom} el={state.atom} n={r.outer} size={260} r={24} />
      <text x={atom.x} y={atom.y + 300} fill={ink} fontSize={size.label * 0.9} textAnchor="middle" style={{ fontFamily: HAND_FONT }}>
        {r.name}
      </text>
      <text x={atom.x} y={atom.y + 390} fill={muted} fontSize={size.small} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
        {`${r.outer} outer electrons`}
      </text>

      <text x={panel.x} y={panel.y} fill={muted} fontSize={size.small} style={{ fontFamily: TEXT_FONT }}>
        one atom, alone in empty space
      </text>

      {/* Give: lose every outer electron. */}
      <text x={panel.x} y={giveY} fill={ink} fontSize={size.label} style={{ fontFamily: DATA_FONT }}>
        {`Give ${r.give.count}`}
      </text>
      <rect className="give" x={panel.x} y={giveY + 30} width={scale(give)} height={barH} fill={pinkFill} stroke={pink} strokeWidth={5} />
      <text x={panel.x + scale(give) + 24} y={giveY + 30 + barH * 0.72} fill={ink} fontSize={size.value} style={{ fontFamily: DATA_FONT }}>
        {r.give.energy ? `${number(r.give.energy)} eV` : ""}
      </text>

      {/* Take: gain 8 − outer. Only a bound first electron gets a bar, dashed: energy given off, not a cost. */}
      <text x={panel.x} y={takeY} fill={ink} fontSize={size.label} style={{ fontFamily: DATA_FONT }}>
        {`Take ${r.take.count}`}
      </text>
      {released !== undefined && r.take.released && (
        <>
          <rect
            className="released"
            x={panel.x}
            y={takeY + 30}
            width={scale(released)}
            height={barH}
            fill="none"
            stroke={blue}
            strokeWidth={8}
            strokeDasharray="16 12"
          />
          <text x={panel.x + scale(released) + 24} y={takeY + 30 + barH * 0.72} fill={ink} fontSize={size.value} style={{ fontFamily: DATA_FONT }}>
            {`${number(r.take.released)} eV released`}
          </text>
        </>
      )}
      {heldBack > 0 && (
        <g transform={`translate(0 ${takeY + (released !== undefined ? 150 : 40)})`}>
          <rect x={panel.x} y={0} width={panel.w} height={size.flag * 2.6} rx={14} fill="none" stroke={line} strokeWidth={5} strokeDasharray="10 12" />
          <text x={panel.x + 28} y={size.flag * 1.15} fill={ink} fontSize={size.flag} style={{ fontFamily: released !== undefined ? DATA_FONT : TEXT_FONT }}>
            {released !== undefined ? `✗ ${heldBack} more:` : "✗"}
          </text>
          <text x={panel.x + 28} y={size.flag * 2.2} fill={ink} fontSize={size.flag} style={{ fontFamily: TEXT_FONT }}>
            {released !== undefined ? "a lone atom won't hold this one" : "a lone atom won't hold even one"}
          </text>
        </g>
      )}

      {wide ? (
        <text x={width / 2} y={height - area.y - 10} fill={ink} fontSize={size.counter} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {`Electrons to move, cheaper way: ${r.move}`}
        </text>
      ) : (
        // Too long for the 9:16 width on one line: two lines, so nothing crops.
        <text x={width / 2} y={height - area.y - 10 - size.counter * 1.25} fill={ink} fontSize={size.counter} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          <tspan x={width / 2}>Electrons to move,</tspan>
          <tspan x={width / 2} dy={size.counter * 1.25}>{`cheaper way: ${r.move}`}</tspan>
        </text>
      )}
    </svg>
  );
}
