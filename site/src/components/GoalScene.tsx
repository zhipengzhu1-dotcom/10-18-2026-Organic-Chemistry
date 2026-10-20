// A goal-state Manipulate Step's Scene (#78): the Student works the Scene itself. The Scene draws
// its handles and drop targets as focusable buttons (`data-handle` / `data-target`); this frame
// turns pointer drags, taps and the keyboard into moves, asks the Scene's own rules
// (`manifest.interact.drop`) what a move does, and hands accepted moves to the engine.
//   Pointer: drag a handle onto a target, or tap a handle then tap a target.
//   Keyboard: Tab to a handle, Enter (or Space); Tab to a target, Enter. Escape lets go.
// A drop on nothing lets the handle slide back; a refused drop says why, at once.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { sceneRegistry, type SceneInput, type SceneState } from "@astratron/scenes";
import type { Cited } from "@astratron/content/data";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface Props {
  sceneId: string;
  state: SceneState;
  cited: Record<string, Cited>;
  /** Draw the next move ghosted (after the Student has been idle twice). */
  nudge: boolean;
  /** No more moves (the last goal is reached). */
  locked: boolean;
  /** An accepted move: the states it changes. */
  onMove: (patch: SceneState) => void;
}

/** A tap that moves less than this (px) picks up rather than drags. */
const DRAG_PX = 8;

export default function GoalScene({ sceneId, state, cited, nudge, locked, onMove }: Props) {
  const { manifest, Component } = sceneRegistry[sceneId];
  const reducedMotion = useReducedMotion() ?? false;
  const frame = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<string>();
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const down = useRef<{ x: number; y: number; handle: string; dragging: boolean } | null>(null);
  const [said, setSaid] = useState("");
  const [refused, setRefused] = useState("");

  const input: SceneInput | undefined = locked
    ? undefined
    : { held, pointer, nudge: nudge ? manifest.interact?.next(state) : undefined };

  /** The frame coordinates of a point on screen (the Scene's SVG viewBox). */
  function toFrame(clientX: number, clientY: number) {
    const svg = frame.current?.querySelector("svg");
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return undefined;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** Drops `handle` on `target`; false when nothing is there to take it (the handle slides back). */
  function drop(handle: string, target: string | undefined): boolean {
    setHeld(undefined);
    setPointer(undefined);
    const result = manifest.interact?.drop(state, { handle, target: target ?? "" }) ?? null;
    if (!result) {
      setRefused("");
      return false;
    }
    if ("refused" in result) {
      setRefused(result.refused);
      setSaid(result.refused);
      return true;
    }
    setRefused("");
    setSaid(result.say);
    onMove(result.state as SceneState);
    // The moved handle may be gone; keep focus in the Scene.
    frame.current?.focus();
    return true;
  }

  const handleOf = (el: EventTarget | null) => (el as Element | null)?.closest?.("[data-handle]")?.getAttribute("data-handle") ?? undefined;
  const targetOf = (el: EventTarget | null) => (el as Element | null)?.closest?.("[data-target]")?.getAttribute("data-target") ?? undefined;

  function pick(handle: string) {
    setHeld((h) => (h === handle ? undefined : handle));
    setRefused("");
    setSaid(held === handle ? "Let go." : "Picked up. Now choose where to drop it.");
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (locked || e.button !== 0) return;
    const handle = handleOf(e.target);
    const target = targetOf(e.target);
    if (handle) {
      e.preventDefault();
      down.current = { x: e.clientX, y: e.clientY, handle, dragging: false };
      frame.current?.setPointerCapture?.(e.pointerId);
    } else if (held && target) drop(held, target);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = down.current;
    if (!d) return;
    if (!d.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_PX) return;
    d.dragging = true;
    setHeld(d.handle);
    setPointer(toFrame(e.clientX, e.clientY));
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = down.current;
    down.current = null;
    if (!d) return;
    if (!d.dragging) {
      pick(d.handle);
      return;
    }
    // The target under the pointer (the dragged handle is drawn there too, so look through it);
    // another handle can be a target too (one CH₃ piece dropped on the other).
    const below = document.elementsFromPoint(e.clientX, e.clientY);
    const under = below.map(targetOf).find(Boolean) ?? below.map(handleOf).find((h) => h && h !== d.handle);
    drop(d.handle, under);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (locked) return;
    if (e.key === "Escape") {
      setHeld(undefined);
      setPointer(undefined);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const handle = handleOf(e.target);
    const target = targetOf(e.target);
    if (!handle && !target) return;
    e.preventDefault();
    // Holding something: drop it here (on a target, or on another handle that takes it), else pick this up.
    if (held && handle !== held && drop(held, target ?? handle)) return;
    if (handle) pick(handle);
  }

  return (
    <figure className="scene scene-goal-figure">
      <div
        ref={frame}
        className="scene-frame scene-goal"
        role="group"
        aria-label={manifest.describe(state, 0, cited)}
        tabIndex={-1}
        style={{ aspectRatio: "16 / 9", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          down.current = null;
          setHeld(undefined);
          setPointer(undefined);
        }}
        onKeyDown={onKeyDown}
      >
        <Component t={0} state={state} aspect="16:9" reducedMotion={reducedMotion} cited={cited} input={input} />
      </div>
      <p className="scene-say" aria-live="polite">
        {refused}
      </p>
      <p className="sr" aria-live="polite">
        {refused ? "" : said}
      </p>
    </figure>
  );
}
