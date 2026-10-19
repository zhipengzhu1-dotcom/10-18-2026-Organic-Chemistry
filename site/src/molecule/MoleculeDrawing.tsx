// The 3D card's SVG layers, drawn from the same projection as the WebGL canvas (layout.ts):
// - MoleculeStill: atoms and bonds as shaded circles and lines, back to front. It is the
//   pre-rendered still shown on devices without WebGL, and while the WebGL layer loads.
// - MoleculeOverlay: every atom's letter, the picked atoms, the keyboard cursor and the measurement
//   drawn on the molecule.
import type { MoleculeUse } from "@astratron/content";
import { atomNames, readout, type Measurement } from "@astratron/content/molecule";
import type { PlacedAtom } from "./layout.ts";

interface Size {
  width: number;
  height: number;
}

/** Dark or light ink for a letter on an atom of this colour. */
function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "#140f2b" : "#ffffff";
}

export function MoleculeStill({ molecule, placed, trueScale, size }: { molecule: MoleculeUse; placed: PlacedAtom[]; trueScale: boolean; size: Size }) {
  const back = [...placed].sort((a, b) => a.z - b.z);
  return (
    <svg className="molecule-still" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
      <defs>
        {Object.entries(molecule.elements).map(([el, style]) => (
          <radialGradient key={el} id={`still-${el}`} cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="0.35" stopColor={style.colour} />
            <stop offset="1" stopColor={style.colour} stopOpacity="0.75" />
          </radialGradient>
        ))}
      </defs>
      {back.map((a) => (
        <g key={a.index}>
          {!trueScale &&
            molecule.bonds
              .filter((b) => b.a === a.index || b.b === a.index)
              .map((b) => {
                const other = placed[b.a === a.index ? b.b : b.a];
                // Each bond is drawn once, with its farther atom, so nearer atoms cover it.
                if (other.z < a.z || (other.z === a.z && other.index < a.index)) return null;
                return (
                  <line
                    key={`${b.a}-${b.b}`}
                    x1={a.x}
                    y1={a.y}
                    x2={other.x}
                    y2={other.y}
                    stroke="#c8c8d0"
                    strokeWidth={Math.max(3, a.r * 0.45)}
                    strokeLinecap="round"
                  />
                );
              })}
          <circle cx={a.x} cy={a.y} r={a.r} fill={`url(#still-${a.element})`} stroke="#140f2b" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

interface OverlayProps {
  molecule: MoleculeUse;
  placed: PlacedAtom[];
  picks: number[];
  cursor: number | null;
  measurement?: Measurement;
  size: Size;
}

export function MoleculeOverlay({ molecule, placed, picks, cursor, measurement, size }: OverlayProps) {
  const names = atomNames(molecule.atoms);
  const front = [...placed].sort((a, b) => a.z - b.z);
  return (
    <svg className="molecule-overlay" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
      {front.map((a) =>
        a.labelled ? (
          <text
            key={a.index}
            data-atom={a.index}
            x={a.x}
            y={a.y}
            className="molecule-letter"
            fill={inkOn(molecule.elements[a.element].colour)}
            fontSize={Math.max(11, Math.min(20, a.r * 0.9))}
          >
            {a.element}
          </text>
        ) : null,
      )}
      {picks.map((i) => (
        <circle key={`pick-${i}`} className="molecule-pick" cx={placed[i].x} cy={placed[i].y} r={placed[i].r + 4} />
      ))}
      {cursor !== null && (
        <circle className="molecule-cursor" cx={placed[cursor].x} cy={placed[cursor].y} r={placed[cursor].r + 9} />
      )}
      {measurement && <MeasurementTag m={measurement} placed={placed} names={names} />}
    </svg>
  );
}

function MeasurementTag({ m, placed, names }: { m: Measurement; placed: PlacedAtom[]; names: string[] }) {
  const { value } = readout(m, names);
  const p = m.atoms.map((i) => placed[i]);
  let line: string;
  let at: { x: number; y: number };
  if (m.kind === "distance") {
    const [a, b] = p;
    line = `M${a.x},${a.y} L${b.x},${b.y}`;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    at = { x: (a.x + b.x) / 2 - ((b.y - a.y) / len) * 20, y: (a.y + b.y) / 2 + ((b.x - a.x) / len) * 20 };
  } else {
    const [a, v, b] = p;
    const unit = (q: PlacedAtom) => {
      const len = Math.hypot(q.x - v.x, q.y - v.y) || 1;
      return { x: (q.x - v.x) / len, y: (q.y - v.y) / len };
    };
    const [ua, ub] = [unit(a), unit(b)];
    const R = 26;
    const sweep = ua.x * ub.y - ua.y * ub.x > 0 ? 1 : 0;
    line = `M${a.x},${a.y} L${v.x},${v.y} L${b.x},${b.y} M${v.x + ua.x * R},${v.y + ua.y * R} A${R},${R} 0 0 ${sweep} ${v.x + ub.x * R},${v.y + ub.y * R}`;
    const bis = { x: ua.x + ub.x, y: ua.y + ub.y };
    const bl = Math.hypot(bis.x, bis.y) || 1;
    at = { x: v.x + (bis.x / bl) * (R + 26), y: v.y + (bis.y / bl) * (R + 26) };
  }
  const width = value.length * 10 + 14;
  return (
    <g className={`molecule-tag molecule-tag-${m.kind}`}>
      <path d={line} />
      <rect x={at.x - width / 2} y={at.y - 13} width={width} height={26} />
      <text x={at.x} y={at.y}>
        {value}
      </text>
    </g>
  );
}
