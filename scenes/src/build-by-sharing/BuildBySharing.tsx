// build-by-sharing: a pure function of (t, state, input); see manifest.ts.
import type { ReactNode } from "react";
import { frameSize } from "../frame.ts";
import type { SceneProps } from "../types.ts";
import { DATA_FONT, DotsBeside, Hit, Letter, SharedPair, TEXT_FONT, dir, electron, ink, line, muted, type Pt } from "../dots/dots.tsx";
import { VALENCE } from "@astratron/content/valence";
import { SIDES, SIDE_NAMES, TRAY, type SharingState, type Side } from "./manifest.ts";
import { layoutSharing } from "./layout.ts";

const COMPASS: Record<Side, number> = { n: -90, e: 0, s: 90, w: 180 };
/** Seconds between pairs lighting up in the pair-by-pair count. */
const PAIR_BEAT = 0.6;

export default function BuildBySharing({ t, state, aspect, reducedMotion, input }: SceneProps<SharingState>) {
  const { width, height } = frameSize(aspect);
  const L = layoutSharing(aspect);
  const live = !!input;
  const held = input?.held;
  const out: ReactNode[] = [];

  /** Where a held handle is drawn: under the pointer while dragged. */
  const placed = (id: string, home: Pt): Pt => (held === id && input?.pointer ? input.pointer : home);

  if (state.stage !== "2") {
    const c = L.carbon;
    const bondedSides = SIDES.filter((s) => state[s] === "H");
    const lit = (i: number) => state.count !== "pairs" || reducedMotion || t >= PAIR_BEAT * (i + 1);
    out.push(<Letter key="C" at={c} el="C" size={L.letter} />);
    SIDES.forEach((side) => {
      const v = dir(COMPASS[side]);
      const slot = { x: c.x + v.x * L.reach, y: c.y + v.y * L.reach };
      if (state[side] === "H") {
        const i = bondedSides.indexOf(side);
        out.push(<Letter key={`H${side}`} at={slot} el="H" size={L.letter} />);
        out.push(
          <g key={`pair${side}`}>
            {SharedPair({ a: c, b: slot, r: L.dot, opacity: lit(i) ? 1 : 0.35 })}
          </g>,
        );
        if (state.count === "pairs" && lit(i))
          out.push(
            <circle key={`ring${side}`} cx={(c.x + slot.x) / 2} cy={(c.y + slot.y) / 2} r={L.dot * 3.4} fill="none" stroke={electron} strokeWidth={5} />,
          );
        out.push(<Hit key={`h-${side}`} at={slot} r={L.hit} role="target" id={`h-${side}`} label={`Hydrogen bonded on carbon's ${SIDE_NAMES[side]} side`} live={live} />);
      } else {
        out.push(<g key={`dot${side}`}>{DotsBeside({ at: c, deg: COMPASS[side], d: L.letter * 0.62, r: L.dot, count: 1 })}</g>);
        out.push(<circle key={`slot${side}`} cx={slot.x} cy={slot.y} r={L.letter * 0.55} fill="none" stroke={line} strokeWidth={4} strokeDasharray="14 12" />);
        out.push(<Hit key={`dot-${side}`} at={slot} r={L.hit} role="target" id={`dot-${side}`} label={`Carbon's single dot, ${SIDE_NAMES[side]}`} live={live} />);
      }
    });
    out.push(<Hit key="carbon" at={c} r={L.hit} role="target" id="carbon" label="The carbon atom" live={live} />);

    // The tray: H atoms not yet bonded, one dot each (only while carbon is being built, not in a drawing to count).
    if (state.count === "live") out.push(
      <text key="tray" aria-hidden="true" x={L.trayLabel.x} y={L.trayLabel.y} fill={muted} fontSize={L.letter * 0.42} textAnchor="middle" style={{ fontFamily: TEXT_FONT }}>
        Tray
      </text>,
    );
    for (let k = bondedSides.length + 1; state.count === "live" && k <= TRAY; k++) {
      const id = `tray-${k}`;
      const at = placed(id, L.tray[k - 1]);
      out.push(
        <g key={id}>
          <Letter at={at} el="H" size={L.letter} />
          {DotsBeside({ at, deg: 0, d: L.letter * 0.62, r: L.dot, count: 1, kind: "e tray-e" })}
          <Hit at={at} r={L.hit} role="handle" id={id} label={`Hydrogen atom ${k - bondedSides.length} of ${TRAY - bondedSides.length} in the tray`} live={live} held={held === id} />
        </g>,
      );
    }

    // The count around carbon.
    if (state.count !== "hidden") {
      const shown = state.count === "pairs" ? 2 * bondedSides.filter((_, i) => lit(i)).length : VALENCE.C + bondedSides.length;
      const label = state.count === "pairs" ? `Shared pairs × 2 = ${shown}` : `Around C: ${shown}`;
      out.push(
        <text key="count" aria-hidden="true" x={L.count.x} y={L.count.y} fill={ink} fontSize={L.letter * 0.5} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {label}
        </text>,
      );
    }
  } else {
    const joined = state.joined === "yes";
    const pieces = (["left", "right"] as const).map((side) => {
      const p = L.pieces[side];
      const home = joined ? p.joined : p.apart;
      return { side, at: placed(`piece-${side}`, home), hs: p.hydrogens, toward: p.toward };
    });
    for (const { side, at, hs, toward } of pieces) {
      out.push(<Letter key={`C${side}`} at={at} el="C" size={L.letter} />);
      for (const deg of hs) {
        const v = dir(deg);
        const h = { x: at.x + v.x * L.reach, y: at.y + v.y * L.reach };
        out.push(<Letter key={`H${side}${deg}`} at={h} el="H" size={L.letter} />);
        out.push(<g key={`p${side}${deg}`}>{SharedPair({ a: at, b: h, r: L.dot })}</g>);
      }
      if (!joined) {
        out.push(<g key={`d${side}`}>{DotsBeside({ at, deg: toward, d: L.letter * 0.62, r: L.dot, count: 1 })}</g>);
        const v = dir(toward);
        const slot = { x: at.x + v.x * L.reach, y: at.y + v.y * L.reach };
        out.push(<Hit key={`dot-${side}`} at={slot} r={L.hit} role="target" id={`dot-${side}`} label={`The ${side} piece's single dot`} live={live} />);
        out.push(
          <Hit key={`piece-${side}`} at={at} r={L.hit} role="handle" id={`piece-${side}`} label={`The ${side} CH₃ piece`} live={live} held={held === `piece-${side}`} />,
        );
      }
    }
    if (joined) out.push(<g key="cc">{SharedPair({ a: pieces[0].at, b: pieces[1].at, r: L.dot })}</g>);
    if (state.count !== "hidden") {
      const each = joined ? 2 * VALENCE.C : 2 * VALENCE.C - 1;
      out.push(
        <text key="count" aria-hidden="true" x={L.count.x} y={L.count.y} fill={ink} fontSize={L.letter * 0.5} textAnchor="middle" style={{ fontFamily: DATA_FONT }}>
          {joined ? `C₂H₆ · around each C: ${each}` : `Around each C: ${each}`}
        </text>,
      );
    }
  }

  // The nudge: the next move, ghosted.
  const nudge = input?.nudge;
  if (nudge) {
    const from = L.handleAt(nudge.handle, state);
    const to = L.targetAt(nudge.target, state);
    if (from && to)
      out.push(
        <g key="nudge" opacity={0.6}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={electron} strokeWidth={6} strokeDasharray="20 16" />
          <circle cx={to.x} cy={to.y} r={L.letter * 0.6} fill="none" stroke={electron} strokeWidth={6} strokeDasharray="20 16" />
        </g>,
      );
  }

  // Live, the drawing holds the Scene's buttons: role "none" keeps it from reading as an unnamed
  // picture (whose children a screen reader may skip), so the buttons sit in the named Scene group.
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%" role={live ? "none" : undefined} aria-hidden={live ? undefined : "true"} style={{ display: "block" }}>
      {out}
    </svg>
  );
}
