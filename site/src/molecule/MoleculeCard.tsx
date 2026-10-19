// The 3D Step card (#68): a real molecule in a framed card inside the Step. Drag, the arrow keys or
// ↺/↻ turn it; + and − zoom; tap atoms (or [ / ] and Enter) to measure: two give a distance, three
// the angle at the middle atom, a fourth starts again, and tapping a picked atom un-picks it. The
// value is drawn on the molecule and shown as a readout, and a live region reads it. Ball & stick
// ⟷ True scale, a 1 Å scale bar, and a Describe button that reads the arrangement.
//
// Without WebGL2 the card shows a still drawn from the same coordinates, with the same text, so the
// Step can still be finished. The WebGL layer (three.js + React-Three-Fiber) is loaded lazily.
// Reusable outside the Step player: give it a resolved MoleculeUse (see notes/68-3d.md).
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { MoleculeUse } from "@astratron/content";
import { atomNames, describeMolecule, measure, readout, togglePick, turn, type Matrix3 } from "@astratron/content/molecule";
import { atomAt, fitScale, placeAtoms } from "./layout.ts";
import { MoleculeOverlay, MoleculeStill } from "./MoleculeDrawing.tsx";

const MoleculeCanvas = lazy(() => import("./MoleculeCanvas.tsx"));

/** One press of an arrow key or ↺/↻ turns the molecule this many degrees. */
const TURN_STEP = 15;
/** Degrees per pixel dragged. */
const DRAG_RATE = 0.6;
/** A press that moves less than this many px is a tap, not a drag. */
const TAP_SLOP = 5;
const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

const ELEMENT_NAMES: Record<string, string> = {
  H: "hydrogen",
  B: "boron",
  C: "carbon",
  N: "nitrogen",
  O: "oxygen",
  F: "fluorine",
  P: "phosphorus",
  S: "sulfur",
  Cl: "chlorine",
  Br: "bromine",
  I: "iodine",
};

export interface MoleculeCardProps {
  molecule: MoleculeUse;
  /** Extra three.js objects drawn with the molecule (Å, about its centre), e.g. orbital lobes (#70). */
  children?: ReactNode;
}

/** True when this browser can draw WebGL2 (three.js needs it). */
export function canDrawWebGL(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export default function MoleculeCard({ molecule, children }: MoleculeCardProps) {
  const id = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 358, height: 220 });
  const [gl, setGl] = useState<boolean | null>(null);
  const [rotation, setRotation] = useState<Matrix3>(molecule.orientation);
  const [zoom, setZoom] = useState(1);
  const [trueScale, setTrueScale] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [said, setSaid] = useState("");
  const drag = useRef<{ x: number; y: number; x0: number; y0: number; moved: boolean } | null>(null);

  useEffect(() => setGl(canDrawWebGL()), []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ width: r.width, height: r.height });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const names = useMemo(() => atomNames(molecule.atoms), [molecule]);
  const scale = fitScale(molecule, size.width, size.height) * zoom;
  const placed = placeAtoms(molecule, rotation, { ...size, scale, trueScale });
  const measurement = measure(molecule, picks);
  const shown = measurement && readout(measurement, names);
  /** Turning and zooming need the live 3D view; the no-WebGL still stays put. */
  const turnable = gl !== false;

  function say(text: string) {
    // A repeated message is still announced: the live region's text has to change.
    setSaid((before) => (before === text ? `${text} ` : text));
  }
  function spin(axis: "x" | "y", degrees: number) {
    if (turnable) setRotation((r) => turn(r, axis, degrees));
  }
  function pick(atom: number) {
    const next = togglePick(picks, atom);
    setPicks(next);
    const m = measure(molecule, next);
    const name = names[atom];
    const spoken = m ? readout(m, names).spoken : "";
    if (!next.includes(atom)) say(`${name} un-picked.${spoken ? ` ${spoken}` : ""}`);
    else say(spoken || `${name} picked. Pick another atom.`);
  }
  function moveCursor(by: number) {
    const n = molecule.atoms.length;
    const next = cursor === null ? (by > 0 ? 0 : n - 1) : (cursor + by + n) % n;
    setCursor(next);
    say(`${names[next]}, ${ELEMENT_NAMES[molecule.atoms[next].element] ?? molecule.atoms[next].element}${picks.includes(next) ? ", picked" : ""}.`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const turns: Record<string, ["x" | "y", number]> = {
      ArrowLeft: ["y", -TURN_STEP],
      ArrowRight: ["y", TURN_STEP],
      ArrowUp: ["x", -TURN_STEP],
      ArrowDown: ["x", TURN_STEP],
    };
    if (turns[e.key]) spin(...turns[e.key]);
    else if (e.key === "+" || e.key === "=") setZoom((z) => (turnable ? Math.min(ZOOM_MAX, z * ZOOM_STEP) : z));
    else if (e.key === "-" || e.key === "−" || e.key === "_") setZoom((z) => (turnable ? Math.max(ZOOM_MIN, z / ZOOM_STEP) : z));
    else if (e.key === "]") moveCursor(1);
    else if (e.key === "[") moveCursor(-1);
    else if ((e.key === "Enter" || e.key === " ") && cursor !== null) pick(cursor);
    else if (e.key === "Escape" && picks.length) {
      setPicks([]);
      say("Picks cleared.");
    } else return;
    e.preventDefault();
  }

  function point(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  const mode = trueScale ? "true scale (van der Waals radii)" : "ball and stick";
  return (
    <figure className="molecule">
      <div className="molecule-stage" ref={stage}>
        <div
          className="molecule-frame"
          role="application"
          tabIndex={0}
          aria-roledescription="3D model"
          aria-label={`${molecule.title}, ${mode}`}
          aria-describedby={`${id}-help`}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > TAP_SLOP) d.moved = true;
            if (d.moved && turnable)
              setRotation((r) => turn(turn(r, "y", (e.clientX - d.x) * DRAG_RATE), "x", (e.clientY - d.y) * DRAG_RATE));
            d.x = e.clientX;
            d.y = e.clientY;
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d || d.moved) return;
            const { x, y } = point(e);
            const atom = atomAt(placed, x, y);
            if (atom !== undefined) pick(atom);
          }}
          onPointerCancel={() => (drag.current = null)}
        >
          {gl ? (
            <Suspense fallback={<MoleculeStill molecule={molecule} placed={placed} trueScale={trueScale} size={size} />}>
              <MoleculeCanvas molecule={molecule} rotation={rotation} scale={scale} trueScale={trueScale}>
                {children}
              </MoleculeCanvas>
            </Suspense>
          ) : (
            <MoleculeStill molecule={molecule} placed={placed} trueScale={trueScale} size={size} />
          )}
          <MoleculeOverlay molecule={molecule} placed={placed} picks={picks} cursor={cursor} measurement={measurement} size={size} />
        </div>
        <p className="molecule-readout" aria-hidden="true">
          {shown ? (
            <>
              <span className="molecule-value">{shown.value}</span> <span className="molecule-what">{shown.what}</span>
            </>
          ) : gl === false ? (
            <span className="molecule-what">Still image: this device can't show 3D.</span>
          ) : null}
        </p>
        <div className="molecule-scalebar" aria-hidden="true">
          <i style={{ width: `${scale}px` }} />
          <span>1 Å</span>
        </div>
        {turnable && (
          <div className="molecule-turn">
            <button type="button" className="molecule-btn" aria-label="Turn left" onClick={() => spin("y", -TURN_STEP)}>
              ↺
            </button>
            <button type="button" className="molecule-btn" aria-label="Turn right" onClick={() => spin("y", TURN_STEP)}>
              ↻
            </button>
          </div>
        )}
      </div>
      <div className="molecule-tools">
        <span className="seg molecule-seg" role="group" aria-label="Atom size">
          <button type="button" aria-pressed={!trueScale} onClick={() => setTrueScale(false)}>
            Ball &amp; stick
          </button>
          <button type="button" aria-pressed={trueScale} onClick={() => setTrueScale(true)}>
            True scale
          </button>
        </span>
        <button
          type="button"
          className="molecule-btn molecule-describe"
          onClick={() => say(describeMolecule({ title: molecule.title, atoms: molecule.atoms, bonds: molecule.bonds, describe: molecule.describe }, rotation))}
        >
          Describe
        </button>
      </div>
      <p id={`${id}-help`} className="sr">
        {turnable ? "Drag or use the arrow keys to turn it; plus and minus zoom. " : ""}
        Square brackets move between atoms and Enter picks one: two atoms give a distance, three the angle at the middle
        atom. Describe reads the arrangement.
      </p>
      <p className="sr" aria-live="polite">
        {said}
      </p>
    </figure>
  );
}
