// push-replay (Lesson 6 spec): plays a list of pushes on an atom-mapped start.
// Each arrow draws itself while a pair of electrons rides it, then the drawing
// updates (bonds, lone pairs, charges); it ends on the result. A pure function
// of t (ADR 0001), so the site clock and a video renderer draw the same frames.
// Its inputs are a Step's own fields (start, pushes), not settable states, so it
// isn't in the Scene registry: the Draw-arrows view plays it with the site clock.
import { arrowhead, pushLabel, replay, toStructure } from "@astratron/content/arrows";
import type { Hidden, Push, Structure } from "@astratron/content";
import { useMemo } from "react";
import { clamp, easeInOut } from "../motion.ts";
import { pushArrow } from "../structure/arrows.ts";
import { drawStructure } from "../structure/render.ts";

/** Seconds per arrow, and the hold on the result at the end. */
export const PUSH_SECONDS = 1.4;
const HOLD = 1;

export interface PushReplayProps {
  t: number;
  start: Structure;
  pushes: Push[];
  hide?: Hidden[];
  reducedMotion: boolean;
}

/** One run: every arrow in turn, then a hold on the result. */
export const replayDuration = (pushes: Push[]) => pushes.length * PUSH_SECONDS + HOLD;

/** Screen-reader text: the arrows, then what the drawing shows at t. */
export function describeReplay(start: Structure, pushes: Push[], t: number): string {
  const frames = replay(start, pushes);
  const arrows = frames.flatMap((f) => (f.push ? [pushLabel(f.molecule, f.push)] : []));
  const done = t >= arrows.length * PUSH_SECONDS;
  const list = arrows.length === 1 ? `Arrow: ${arrows[0]}.` : `Arrows: ${arrows.join("; ")}.`;
  return `${list} ${done ? "The drawing now shows the result." : "Playing the arrows on the start."}`;
}

export default function PushReplay({ t, start, pushes, hide = [], reducedMotion }: PushReplayProps) {
  const frames = useMemo(() => replay(start, pushes), [start, pushes]);
  const drawings = useMemo(() => frames.map((f) => drawStructure(toStructure(f.molecule), hide)), [frames, hide]);
  const steps = frames.length - 1;
  // Under reduced motion each arrow appears whole, with no riding electrons.
  const k = clamp(Math.floor(t / PUSH_SECONDS), 0, steps);
  const p = reducedMotion ? 1 : easeInOut(clamp((t - k * PUSH_SECONDS) / (PUSH_SECONDS * 0.7), 0, 1));
  const shown = k < steps ? k : steps;
  const drawing = drawings[shown];
  const inner = drawing.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

  // Arrows already played stay drawn faintly; the current one draws itself.
  const arrows = frames.slice(0, Math.min(k + 1, steps)).flatMap((f, i) => {
    const head = f.push && arrowhead(f.molecule, f.push);
    const arrow = head && pushArrow(drawing, toStructure(f.molecule), { from: f.push!.from, to: head.to }, head.place);
    return arrow ? [{ ...arrow, i }] : [];
  });

  return (
    <svg viewBox={drawing.viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="push-replay">
      <defs>
        <marker id="push-replay-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--at-electron, #5ee7ff)" />
        </marker>
      </defs>
      <g dangerouslySetInnerHTML={{ __html: inner }} />
      {arrows.map((a) => {
        const current = a.i === k;
        const length = current ? p : 1;
        const electron = a.at(length);
        return (
          <g key={a.i} opacity={current ? 1 : 0.45}>
            <path
              d={a.d}
              fill="none"
              stroke="var(--at-electron, #5ee7ff)"
              strokeWidth={2.5}
              pathLength={1}
              strokeDasharray={`${length} 1`}
              markerEnd={length >= 1 ? "url(#push-replay-head)" : undefined}
            />
            {current && !reducedMotion && length < 1 && (
              <g fill="var(--at-electron, #5ee7ff)">
                <circle cx={electron.x - 3} cy={electron.y} r={2.6} />
                <circle cx={electron.x + 3} cy={electron.y} r={2.6} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
