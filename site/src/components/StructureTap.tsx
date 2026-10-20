// A Tap-to-identify structure: the pre-rendered SVG with a layer of tappable
// targets on top. Each target is a toggle button (Tab to reach, Enter or Space
// to pick) named for screen readers. Picks are ringed with a tick, never by
// colour alone; the reveal rings the answer dashed.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { HitShape, TapStep } from "@astratron/content";
import "./structure.css";

interface Props {
  step: TapStep;
  picked: string[];
  /** Target ids to ring as the answer (after the reveal). */
  answer: string[];
  locked: boolean;
  onToggle: (id: string) => void;
}

const DRAG_PX = 10;
/** A little over a viewBox's own width, so hit areas round to at least 48 px. */
const naturalWidth = (viewBox: string) => Math.ceil(Number(viewBox.split(" ")[2]) * 1.05);
/** Width over height of a viewBox "0 0 w h". */
const aspect = (viewBox: string) => {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return Math.round((w / h) * 1000) / 1000;
};
/** The player's column (global.css). */
const COLUMN_PX = 640;
/** The smallest tap target, px (WCAG 2.5.5 as the design gate checks it). */
const TARGET_PX = 48;
/**
 * The width (px) at which the drawing's smallest hit circle is 48 px across, when that is wider than the
 * column: such a drawing (Met-enkephalin, #87) keeps that width and scrolls sideways. Undefined otherwise.
 */
function scrollWidth(viewBox: string, hits: Record<string, HitShape>): number | undefined {
  const radii = Object.values(hits).flatMap((h) => h.circles.map((c) => c.r));
  if (!radii.length) return undefined;
  const width = Math.ceil((Number(viewBox.split(" ")[2]) * TARGET_PX) / (2 * Math.min(...radii)));
  return width > COLUMN_PX ? width : undefined;
}
/** Half-width of a bond's hit band. */
const BAND = 12;

/** A rectangle of half-width `w` around a segment. */
function band(s: { x1: number; y1: number; x2: number; y2: number }, w: number): string {
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

export default function StructureTap({ step, picked, answer, locked, onToggle }: Props) {
  const drawn = step.structure.drawn!;
  const [dragged, setDragged] = useState(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  function key(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!locked) onToggle(id);
    }
  }
  function move(e: PointerEvent) {
    const d = downAt.current;
    if (step.tapOnly && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_PX) setDragged(true);
  }

  const natural = naturalWidth(drawn.viewBox);
  const wide = scrollWidth(drawn.viewBox, drawn.hits ?? {});
  const structure = (
    <div
      className="tap-structure"
      // On phones a tall drawing keeps to about a third of the screen's height (structure.css), so the Step
      // fits one screen, but never below natural size, where every hit area is 48 px.
      style={{
        ["--tap-natural" as string]: `${natural}px`,
        ["--tap-aspect" as string]: aspect(drawn.viewBox),
        ...(wide ? { minWidth: `${wide}px` } : {}),
      }}
      onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
      onPointerMove={move}
      onPointerUp={() => (downAt.current = null)}
    >
      <div className="structure-svg" dangerouslySetInnerHTML={{ __html: drawn.svg }} />
      <svg className="tap-layer" viewBox={drawn.viewBox} role="group" aria-label="Tappable atoms and bonds">
        {/* Targets come in reading order, which is also the Tab order. */}
        {step.targets.map((t) => (
            <g
              key={t.id}
              className={`target ${t.kind}`}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-label={t.label}
              aria-pressed={picked.includes(t.id)}
              aria-disabled={locked || undefined}
              data-target={t.id}
              onClick={() => !locked && onToggle(t.id)}
              onKeyDown={(e) => key(e, t.id)}
            >
              <Shape hit={drawn.hits![t.id]} className="hit" />
              {picked.includes(t.id) && <Ring hit={drawn.hits![t.id]} className="picked-ring" tick />}
              {answer.includes(t.id) && <Ring hit={drawn.hits![t.id]} className="answer-ring" />}
            </g>
        ))}
      </svg>
    </div>
  );
  return (
    <div className="tap">
      {step.tapOnly && (
        <p className="tap-only-cue" aria-live="polite">
          {dragged ? step.tapOnly.drag : step.tapOnly.idle}
        </p>
      )}
      {wide ? <div className="tap-scroll">{structure}</div> : structure}
    </div>
  );
}

function Shape({ hit, className }: { hit: HitShape; className: string }) {
  return (
    <>
      {hit.segments.map((s, i) => (
        <polygon key={`s${i}`} className={className} points={band(s, BAND)} fill="transparent" pointerEvents="all" />
      ))}
      {hit.circles.map((c, i) => (
        <circle key={`c${i}`} className={className} cx={c.x} cy={c.y} r={c.r} fill="transparent" pointerEvents="all" />
      ))}
    </>
  );
}

function Ring({ hit, className, tick }: { hit: HitShape; className: string; tick?: boolean }) {
  const first = hit.circles[0] ?? { x: (hit.segments[0].x1 + hit.segments[0].x2) / 2, y: (hit.segments[0].y1 + hit.segments[0].y2) / 2, r: 10 };
  return (
    <g className={className} pointerEvents="none">
      {hit.circles.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r - 3} fill="none" />
      ))}
      {hit.segments.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      ))}
      {tick && (
        <text x={first.x + first.r * 0.7} y={first.y - first.r * 0.7} fontSize={14} aria-hidden="true">
          ✓
        </text>
      )}
    </g>
  );
}
