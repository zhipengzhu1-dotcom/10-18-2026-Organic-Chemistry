// The 3D card's SVG layers, drawn from the same projection as the WebGL canvas (layout.ts):
// - MoleculeStill: atoms and bonds as shaded circles and lines, back to front. It is the
//   pre-rendered still shown on devices without WebGL, and while the WebGL layer loads.
// - MoleculeOverlay: every atom's letter, the picked atoms, the keyboard cursor and the measurement
//   drawn on the molecule.
import type { MoleculeUse } from "@astratron/content";
import { atomNames, inkOn, readout, type Measurement } from "@astratron/content/molecule";
import type { PlacedAtom } from "./layout.ts";

interface Size {
  width: number;
  height: number;
}

export function MoleculeStill({ molecule, placed, trueScale, size }: { molecule: MoleculeUse; placed: PlacedAtom[]; trueScale: boolean; size: Size }) {
  const back = [...placed].sort((a, b) => a.z - b.z);
  return (
    <svg className="molecule-still" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
      <defs>
        {Object.entries(molecule.elements).map(([el, style]) => (
          <radialGradient key={el} id={`still-${el}`} cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="white" stopOpacity="0.85" />
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
  /** Atom names for the measurement tag (a Step's `labels` replace the per-element ones). */
  names?: string[];
}

export function MoleculeOverlay({ molecule, placed, picks, cursor, measurement, size, names: given }: OverlayProps) {
  const names = given ?? atomNames(molecule.atoms);
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

interface Point2 {
  x: number;
  y: number;
}

interface MarksProps {
  molecule: MoleculeUse;
  placed: PlacedAtom[];
  size: Size;
  /** Draw the page sheet (a translucent plane in the screen plane through the sheet's middle atom). */
  sheet: boolean;
  /** Once settled on the page: which side of the page each atom on the middle one is. */
  sides: { atom: number; side: "toward" | "away" }[];
  /** Bond-dipole arrows (and, once added, their sum or the ring where they cancel), in px. */
  dipoles?: { arrows: { from: Point2; to: Point2 }[]; net?: { from: Point2; to: Point2 }; ring?: Point2 };
}

/** An arrow with a crossed tail (+ at the δ+ end), or a plain thick one for the net pull. */
function Arrow({ from, to, crossed, className }: { from: Point2; to: Point2; crossed: boolean; className: string }) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 2) return null;
  const [ux, uy] = [(to.x - from.x) / len, (to.y - from.y) / len];
  const head = Math.min(12, len * 0.4);
  const [bx, by] = [to.x - ux * head, to.y - uy * head];
  const [nx, ny] = [-uy, ux];
  const [cx, cy] = [from.x + ux * Math.min(8, len * 0.2), from.y + uy * Math.min(8, len * 0.2)];
  return (
    <g className={className}>
      <line x1={from.x} y1={from.y} x2={bx} y2={by} />
      {crossed && <line x1={cx + nx * 6} y1={cy + ny * 6} x2={cx - nx * 6} y2={cy - ny * 6} />}
      <polygon points={`${to.x},${to.y} ${bx + nx * head * 0.55},${by + ny * head * 0.55} ${bx - nx * head * 0.55},${by - ny * head * 0.55}`} />
    </g>
  );
}

/** The "net: zero" mark where cancelling arrows meet: its ring's radius and its label's drop, in px. */
const NET_ZERO = { ring: 14, below: 30 };

/**
 * Lesson 3's marks over the card (#81): the page sheet, the atom labels a Step gives (beside the
 * letters, which always stay), "toward you: wedge" / "away: dash" once the page view settles, and
 * the bond-dipole arrows with their sum ("net: zero" when they cancel).
 */
export function CardMarks({ molecule, placed, size, sheet, sides, dipoles }: MarksProps) {
  const centre = molecule.pageSheet ? placed[molecule.pageSheet[1]] : undefined;
  return (
    <svg className="molecule-overlay molecule-marks" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
      {sheet && centre && (
        <rect
          className="molecule-sheet"
          x={centre.x - size.width * 0.32}
          y={centre.y - size.height * 0.36}
          width={size.width * 0.64}
          height={size.height * 0.72}
        />
      )}
      {Object.entries(molecule.labels ?? {}).map(([i, label]) => {
        const a = placed[Number(i)];
        return a?.labelled ? (
          <text key={`label-${i}`} className="molecule-label" x={a.x + a.r + 3} y={a.y - a.r}>
            {label}
          </text>
        ) : null;
      })}
      {sides.map(({ atom, side }) => {
        // Seen face on, the two atoms straddling the page sit almost on top of each other: the
        // label of the one toward you goes above it, the other's below.
        const a = placed[atom];
        const toward = side === "toward";
        return (
          <text key={`side-${atom}`} className="molecule-side" x={a.x} y={toward ? a.y - a.r - 8 : a.y + a.r + 16}>
            {toward ? "toward you: wedge" : "away: dash"}
          </text>
        );
      })}
      {dipoles?.arrows.map((a, k) => <Arrow key={`dipole-${k}`} from={a.from} to={a.to} crossed className="molecule-dipole" />)}
      {dipoles?.net && <Arrow from={dipoles.net.from} to={dipoles.net.to} crossed={false} className="molecule-dipole molecule-net" />}
      {dipoles?.ring && (
        <g className="molecule-net-zero">
          <circle cx={dipoles.ring.x} cy={dipoles.ring.y} r={NET_ZERO.ring} />
          <text x={dipoles.ring.x} y={dipoles.ring.y + NET_ZERO.below}>
            net: zero
          </text>
        </g>
      )}
    </svg>
  );
}
