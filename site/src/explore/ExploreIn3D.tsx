// "Explore in 3D" (#71): a button on any Step or Problem that names a molecule. It opens a
// full-screen dialog where the Student spins and zooms the molecule, drawn by 3Dmol.js
// (loaded only now, never with the page) in our cited colours and radii.
// Keyboard: arrow keys turn, + and − zoom, 0 resets, Esc closes. Screen readers get the
// molecule in words and every change announced. Under reduced motion nothing animates.
import { useEffect, useId, useRef, useState } from "react";
import type { ExploreMolecule } from "@astratron/content";
import SourceNote from "../components/SourceNote.tsx";
import { useReducedMotion } from "../components/ScenePlayer.tsx";
import { describeMolecule, type ExploreStyle } from "./scene.ts";
import type { ExploreViewer } from "./viewer-3dmol.ts";
import "./explore.css";

/** One key press or button turns the molecule this far. */
const TURN = 15;
const ZOOM = 1.25;
/** --at-dur-ui: the site's UI motion length. */
const ANIMATE_MS = 180;

const STYLE_SAID: Record<ExploreStyle, string> = {
  "ball-and-stick": "Ball and stick: atoms at 30% of their van der Waals radii, joined by bonds.",
  "space-filling": "Space-filling: atoms at their van der Waals radii.",
};

export default function ExploreIn3D({ molecule }: { molecule: ExploreMolecule }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" className="btn btn-secondary explore-open" onClick={() => setOpen(true)}>
        {inDataFace("Explore in 3D")}
      </button>
      <dialog
        ref={dialog}
        className="explore"
        aria-labelledby={`explore-${molecule.id}-title`}
        // Esc (cancel) and the close button both end here.
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {open && <ExploreView molecule={molecule} onClose={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

/** Sets every number (the 3 of 3D, atom counts) in the data face, as the type rules ask. */
function inDataFace(text: string) {
  return text.split(/(\d+D?)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="data">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function ExploreView({ molecule, onClose }: { molecule: ExploreMolecule; onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<ExploreStyle>("ball-and-stick");
  const [said, setSaid] = useState("");
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const viewer = useRef<ExploreViewer>(null);
  const help = useId();
  const words = useId();
  const animateMs = reducedMotion ? 0 : ANIMATE_MS;

  // 3Dmol.js arrives only now: a separate chunk, fetched when the view opens.
  useEffect(() => {
    if (reducedMotion === undefined) return;
    let live = true;
    import("./viewer-3dmol.ts")
      .then(({ mountViewer }) => {
        if (live && stage.current) viewer.current = mountViewer(stage.current, molecule, mode, animateMs);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      viewer.current?.dispose();
      viewer.current = null;
    };
    // The viewer is built once per opening; style changes go through setStyle.
  }, [molecule, reducedMotion]);

  function choose(m: ExploreStyle) {
    setMode(m);
    viewer.current?.setStyle(m);
    setSaid(STYLE_SAID[m]);
  }
  const turn = (axis: "x" | "y", degrees: number, words: string) => {
    viewer.current?.turn(axis, degrees);
    setSaid(words);
  };
  const zoom = (factor: number) => {
    viewer.current?.zoom(factor);
    setSaid(factor > 1 ? "Zoomed in." : "Zoomed out.");
  };
  const reset = () => {
    viewer.current?.reset();
    setSaid("View reset.");
  };
  const actions = {
    left: () => turn("y", -TURN, "Turned left."),
    right: () => turn("y", TURN, "Turned right."),
    up: () => turn("x", -TURN, "Turned up."),
    down: () => turn("x", TURN, "Turned down."),
  };

  function onKey(e: React.KeyboardEvent) {
    const act: Record<string, () => void> = {
      ArrowLeft: actions.left,
      ArrowRight: actions.right,
      ArrowUp: actions.up,
      ArrowDown: actions.down,
      "+": () => zoom(ZOOM),
      "=": () => zoom(ZOOM),
      "-": () => zoom(1 / ZOOM),
      "0": reset,
      Home: reset,
    };
    const run = act[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  }

  return (
    <div className="explore-body">
      <div className="explore-head">
        <h2 id={`explore-${molecule.id}-title`}>{inDataFace(`${molecule.title} in 3D`)}</h2>
        <button type="button" className="btn explore-close" aria-label="Close 3D view" onClick={onClose}>
          ✕
        </button>
      </div>

      <div
        ref={stage}
        className="explore-stage"
        role="application"
        tabIndex={0}
        aria-roledescription="3D view"
        aria-label={`3D view of ${molecule.title}`}
        aria-describedby={`${words} ${help}`}
        data-animate-ms={reducedMotion === undefined ? undefined : animateMs}
        onKeyDown={onKey}
      />
      {failed && (
        <p className="explore-failed">{inDataFace("This browser can't draw the 3D view. The description below lists every atom and bond.")}</p>
      )}
      <p id={words} className="explore-words">
        {inDataFace(describeMolecule(molecule))}
      </p>
      <p id={help} className="sr">
        Drag to spin and scroll to zoom, or use the arrow keys to turn, plus and minus to zoom, 0 to reset and Escape to close.
      </p>

      <div className="explore-controls">
        <div role="group" aria-label="Model" className="explore-row">
          <button type="button" className="btn" aria-pressed={mode === "ball-and-stick"} onClick={() => choose("ball-and-stick")}>
            Ball and stick
          </button>
          <button type="button" className="btn" aria-pressed={mode === "space-filling"} onClick={() => choose("space-filling")}>
            Space-filling
          </button>
        </div>
        <div role="group" aria-label="Turn and zoom" className="explore-row">
          <button type="button" className="btn" aria-label="Turn left" onClick={actions.left}>←</button>
          <button type="button" className="btn" aria-label="Turn right" onClick={actions.right}>→</button>
          <button type="button" className="btn" aria-label="Turn up" onClick={actions.up}>↑</button>
          <button type="button" className="btn" aria-label="Turn down" onClick={actions.down}>↓</button>
          <button type="button" className="btn" aria-label="Zoom in" onClick={() => zoom(ZOOM)}>+</button>
          <button type="button" className="btn" aria-label="Zoom out" onClick={() => zoom(1 / ZOOM)}>−</button>
          <button type="button" className="btn" onClick={reset}>Reset view</button>
        </div>
      </div>
      <p role="status" className="sr">
        {said}
      </p>

      <SourceNote cited={molecule.cited} notice={molecule.notice} />
    </div>
  );
}
