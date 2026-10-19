// Draw arrows: the Student drags a lone pair or a bond and lets go on a drop
// target; electrons follow the finger, leaving a curved arrow. Each push is
// handed to `onPush` (the engine grades it) and the structure is redrawn from
// what comes back. Keyboard: Tab through sources, Enter picks one, Tab through
// its targets, Enter pushes, Esc cancels, Delete undoes the last arrow. A tap
// on a source picks it the same way, for touch without dragging.
//
// Controlled and engine-free, so the homepage hero push (#73) can use it with
// `@astratron/content/arrows` directly.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Hidden, Push, Structure, StructureView } from "@astratron/content";
import {
  arrowhead,
  dropTargets,
  moleculeOf,
  pushLabel,
  replay,
  sources,
  toStructure,
  type DropTarget,
  type Flag,
  type Outcome,
  type PlacedPush,
} from "@astratron/content/arrows";
import { drawStructure, type Point } from "@astratron/scenes";
import { anchor, curve, pushArrow, spotOf, toSegment } from "@astratron/scenes/arrows";
import "./structure.css";

export interface DrawArrowsProps {
  /** The atom-mapped start; atom ids are the map. */
  start: Structure;
  /** The pushes placed so far (the engine's accepted and shown pushes). */
  pushes: PlacedPush[];
  /** The drawing now: the start with every placed push applied. */
  structure: Structure;
  hide?: Hidden[];
  /** In-between flags to ring and say. */
  flags: Flag[];
  /** What the last action did, to read aloud. */
  last?: Outcome;
  /** The target drawn dimmed beside (wide) or above (narrow) the start. */
  target?: StructureView;
  /** No more pushes: done, or grading isn't ready yet. */
  locked: boolean;
  onPush: (push: Push) => void;
  /** Delete undoes the last arrow; the parent also shows an "Undo arrow" button (the Step player puts it in its footer). */
  onUndo: () => void;
}

/** Pointer radius (SVG units ≈ px at natural size) that grabs an atom's lone pairs, and a bond's half-width. */
const GRAB_ATOM = 24;
const GRAB_BOND = 14;
/** How close the finger must come to a drop spot to land on it. */
const LAND = 30;
const SPOT_R = 13;
/** Every source and drop target is at least this wide at natural size (the 48 px tap-target rule). */
const TARGET = 50;
/** Movement that turns a press into a drag. */
const DRAG_PX = 8;

const NO_ELECTRONS = "Start at a lone pair or a bond.";

interface Spot extends DropTarget {
  x: number;
  y: number;
}

export default function DrawArrows({ start, pushes, structure, hide = [], flags, last, target, locked, onPush, onUndo }: DrawArrowsProps) {
  const drawing = useMemo(() => drawStructure(structure, hide), [structure, hide]);
  const molecule = useMemo(() => moleculeOf(structure), [structure]);
  const srcs = useMemo(() => sources(molecule), [molecule]);
  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; at: Point; moved: boolean } | null>(null);
  const [line, setLine] = useState("");
  const [said, setSaid] = useState("");
  const layer = useRef<SVGSVGElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const uid = `arrows${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Drawing units per screen pixel once the drawing is scaled down to fit (never below 1), so
  // grab radii and 48 px targets stay that size on screen.
  const [k, setK] = useState(1);
  useEffect(() => {
    const svg = layer.current;
    if (!svg) return;
    const measure = () => {
      const scale = svg.getScreenCTM()?.a;
      setK(scale ? Math.max(1, 1 / scale) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [drawing.viewBox]);

  const active = drag?.from ?? picked;
  const spots: Spot[] = useMemo(() => {
    if (!active) return [];
    return dropTargets(molecule, active).flatMap((t) => {
      const p = spotOf(drawing, structure, active, t);
      return p ? [{ ...t, ...p }] : [];
    });
  }, [active, molecule, drawing, structure]);
  const hovered = drag?.moved ? nearest(spots, drag.at, k) : undefined;

  // The arrows already placed, each drawn on the drawing as it was before that push.
  const placed = useMemo(() => {
    const frames = replay(start, pushes.map((p) => p.push));
    return pushes.flatMap((p, i) => {
      const before = frames[i]?.molecule;
      const head = before && arrowhead(before, p.push);
      if (!head) return [];
      const arrow = pushArrow(drawing, toStructure(before), { from: p.push.from, to: head.to }, head.place);
      return arrow ? [{ ...arrow, shown: p.shown, key: `${i}` }] : [];
    });
  }, [start, pushes, drawing]);

  // Read each push and its outcome aloud (the Hint itself is read by the feedback line).
  // Keyed on what changed, so redrawing the same Screen (e.g. on resume) says nothing new.
  const lastKey = last ? `${pushes.length}:${last.kind}:${last.label}` : "";
  useEffect(() => {
    if (!last) return;
    const flagText = flags.map((f) => f.text).join(" ");
    const what =
      last.kind === "accepted" ? `Pushed: ${last.label}.` :
      last.kind === "wrong" ? `${last.label}: not quite.` :
      last.kind === "shown" ? `Here is that push: ${last.label}.` :
      `Undid: ${last.label}.`;
    setSaid(`${what} ${flagText}`.trim());
    setLine("");
  }, [lastKey]);

  function cancel() {
    setPicked(null);
    setDrag(null);
    setLine("");
  }
  /** After a keyboard push, focus goes back to the source used (or the first one, if it is gone). */
  const refocus = useRef<string | null>(null);
  function push(to: string) {
    const from = active;
    const fromKeyboard = !!root.current?.contains(document.activeElement) && document.activeElement?.hasAttribute("data-spot");
    cancel();
    if (!from || locked) return;
    refocus.current = fromKeyboard ? from : null;
    onPush({ from, to });
  }
  useEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    const el = root.current?.querySelector<SVGGElement>(`[data-source="${id}"]`) ?? root.current?.querySelector<SVGGElement>("[data-source]");
    (el ?? root.current)?.focus();
  }, [lastKey, structure]);
  function pick(id: string) {
    if (locked) return;
    setPicked(id);
    setLine(`${labelOf(id)} → …`);
    setSaid(`Picked ${labelOf(id)}. Tab to a target and press Enter, or Escape to cancel.`);
  }
  const labelOf = (id: string) => srcs.find((s) => s.id === id)?.label ?? id;

  /** The pointer in the drawing's coordinates. */
  function point(e: PointerEvent): Point {
    const svg = layer.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function down(e: PointerEvent<SVGSVGElement>) {
    if (locked || e.button !== 0) return;
    const at = point(e);
    if (picked) {
      const spot = nearest(spots, at, k);
      if (spot) {
        e.preventDefault();
        push(spot.id);
        return;
      }
    }
    const grabbed = grab(at);
    if (grabbed === "empty-atom") {
      cancel();
      setLine(NO_ELECTRONS);
      setSaid(NO_ELECTRONS);
      return;
    }
    if (!grabbed) {
      cancel();
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPicked(null);
    setDrag({ from: grabbed, at, moved: false });
    setLine(`${labelOf(grabbed)} → …`);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const at = point(e);
    const startAt = anchor(drawing, structure, drag.from)!;
    const moved = drag.moved || Math.hypot(at.x - startAt.x, at.y - startAt.y) > DRAG_PX * 2 * k;
    setDrag({ ...drag, at, moved });
    const over = moved ? nearest(spots, at, k) : undefined;
    setLine(`${labelOf(drag.from)} → ${over ? over.label : "…"}`);
  }
  function up() {
    if (!drag) return;
    if (!drag.moved) {
      // A tap on a source picks it; then tap a dashed spot.
      setDrag(null);
      pick(drag.from);
      return;
    }
    if (hovered) push(hovered.id);
    else cancel();
  }

  /** What is under the pointer: an atom's lone pairs, a bond, an atom with nothing to give, or nothing. */
  function grab(at: Point): string | "empty-atom" | undefined {
    let best: { id: string; d: number } | undefined;
    for (const a of molecule.atoms) {
      const p = drawing.atoms[a.id];
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d <= GRAB_ATOM * k && (!best || d < best.d)) best = { id: a.id, d };
    }
    if (best) return molecule.atoms.find((a) => a.id === best!.id)!.lp > 0 ? best.id : "empty-atom";
    for (const b of structure.bonds) {
      const s = drawing.bonds[b.id];
      if (s && toSegment(at, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) <= GRAB_BOND * k) return b.id;
    }
    return undefined;
  }

  function keys(e: KeyboardEvent) {
    if (e.key === "Escape" && active) {
      e.preventDefault();
      const was = active;
      cancel();
      setSaid("Cancelled.");
      root.current?.querySelector<SVGGElement>(`[data-source="${was}"]`)?.focus();
    } else if ((e.key === "Delete" || e.key === "Backspace") && !locked) {
      e.preventDefault();
      cancel();
      onUndo();
    }
  }

  // Picking a source moves focus to its first target.
  useEffect(() => {
    if (picked) root.current?.querySelector<SVGGElement>("[data-spot]")?.focus();
  }, [picked]);

  const dragArrow = drag?.moved ? dragCurve(drawing, structure, drag.from, hovered ?? drag.at) : undefined;
  const flagged = new Set(flags.map((f) => f.atom));

  return (
    <div className="arrows" ref={root} onKeyDown={keys} tabIndex={-1}>
      <div className={`arrows-cards${target ? " with-target" : ""}`}>
        {target?.drawn && (
          <figure className="arrows-target" aria-label="Target">
            <figcaption>Target</figcaption>
            <div className="structure-svg" dangerouslySetInnerHTML={{ __html: target.drawn.svg }} />
          </figure>
        )}
        <div className="arrows-structure">
          {/* The line above the drawing: names source → target while dragging, readable beside the finger. */}
          {line && (
            <p className="push-line" aria-hidden="true">
              <span>{line}</span>
            </p>
          )}
          <div className="structure-svg" dangerouslySetInnerHTML={{ __html: drawing.svg }} />
          <svg
            ref={layer}
            className="arrows-layer"
            viewBox={drawing.viewBox}
            role="group"
            aria-label="Electron sources: lone pairs and bonds"
            aria-describedby={`${uid}-help`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={cancel}
          >
            <defs>
              {(["ink", "shown"] as const).map((kind) => (
                <marker
                  key={kind}
                  id={`${uid}-head-${kind}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path className={`arrowhead ${kind}`} d="M0,0 L10,5 L0,10 z" />
                </marker>
              ))}
            </defs>
            {[...flagged].map((id) => (
              <circle key={`flag-${id}`} className="flag-ring" cx={drawing.atoms[id].x} cy={drawing.atoms[id].y} r={20} />
            ))}
            {placed.map((a) => (
              <path
                key={a.key}
                className={`push-arrow${a.shown ? " shown" : ""}`}
                d={a.d}
                markerEnd={`url(#${uid}-head-${a.shown ? "shown" : "ink"})`}
              />
            ))}
            {dragArrow && (
              <>
                <path className="push-arrow dragging" d={dragArrow.d} markerEnd={`url(#${uid}-head-ink)`} />
                <circle className="riding-electron" cx={dragArrow.head.x - 3} cy={dragArrow.head.y} r={2.6} />
                <circle className="riding-electron" cx={dragArrow.head.x + 3} cy={dragArrow.head.y} r={2.6} />
              </>
            )}
            {/* Sources, in drawing order: lone pairs (on their atoms), then bonds. */}
            {srcs.map((s) => {
              const p = anchor(drawing, structure, s.id)!;
              const seg = drawing.bonds[s.id];
              return (
                <g
                  key={s.id}
                  className={`source ${s.kind}${active === s.id ? " active" : ""}`}
                  role="button"
                  tabIndex={locked || picked ? -1 : 0}
                  aria-label={s.label}
                  aria-pressed={active === s.id}
                  aria-disabled={locked || undefined}
                  data-source={s.id}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !locked) {
                      e.preventDefault();
                      pick(s.id);
                    }
                  }}
                >
                  {/* 48 px targets at natural size; what a press grabs is decided in grab(), atoms first. */}
                  {seg ? (
                    <polygon className="hit" points={band(seg, (TARGET / 2) * k)} />
                  ) : (
                    <circle className="hit" cx={p.x} cy={p.y} r={(TARGET / 2) * k} />
                  )}
                </g>
              );
            })}
            {spots.map((t) => (
              <g
                key={`spot-${t.id}`}
                className={`drop-spot${hovered?.id === t.id ? " over" : ""}`}
                role="button"
                tabIndex={picked ? 0 : -1}
                aria-label={`Push to ${t.label}`}
                data-spot={t.id}
                onClick={() => push(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    push(t.id);
                  }
                }}
              >
                <circle className="spot-hit" cx={t.x} cy={t.y} r={(TARGET / 2) * k} />
                <circle className="spot" cx={t.x} cy={t.y} r={SPOT_R} />
              </g>
            ))}
          </svg>
        </div>
      </div>
      {flags.length > 0 && (
        <ul className="arrow-flags">
          {flags.map((f) => (
            <li key={f.atom}>⚠ {f.text}</li>
          ))}
        </ul>
      )}
      <p className="sr" id={`${uid}-help`}>
        Drag a lone pair or a bond; each arrow is checked as you draw it. Keys: Tab, Enter, Tab, Enter, Esc,
        Delete.
      </p>
      <p aria-live="polite" className="sr">
        {said}
      </p>
    </div>
  );
}

/** A band of half-width `w` around a segment (a bond's hit area). */
function band(seg: { x1: number; y1: number; x2: number; y2: number }, w: number): string {
  // At least 2w long too, centred on the bond, so a short (scaled-down) bond is still a 48 px target.
  const len0 = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) || 1;
  const grow = Math.max(0, w - len0 / 2) / len0;
  const dx = (seg.x2 - seg.x1) * grow;
  const dy = (seg.y2 - seg.y1) * grow;
  const s = { x1: seg.x1 - dx, y1: seg.y1 - dy, x2: seg.x2 + dx, y2: seg.y2 + dy };
  const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
  const nx = (-(s.y2 - s.y1) / len) * w;
  const ny = ((s.x2 - s.x1) / len) * w;
  return [
    [s.x1 + nx, s.y1 + ny],
    [s.x2 + nx, s.y2 + ny],
    [s.x2 - nx, s.y2 - ny],
    [s.x1 - nx, s.y1 - ny],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

function nearest(spots: Spot[], at: Point, k: number): Spot | undefined {
  let best: { spot: Spot; d: number } | undefined;
  for (const spot of spots) {
    const d = Math.hypot(spot.x - at.x, spot.y - at.y);
    if (d <= LAND * k && (!best || d < best.d)) best = { spot, d };
  }
  return best?.spot;
}

/** The arrow following the finger: from the source to the pointer (or the spot it is over). */
function dragCurve(drawing: ReturnType<typeof drawStructure>, structure: Structure, from: string, head: Point) {
  const at = anchor(drawing, structure, from);
  if (!at) return undefined;
  const isAtom = !!drawing.atoms[from];
  const len = Math.hypot(head.x - at.x, head.y - at.y) || 1;
  const tail = isAtom ? { x: at.x + ((head.x - at.x) / len) * 16, y: at.y + ((head.y - at.y) / len) * 16 } : at;
  return { head, ...curve(tail, head) };
}
