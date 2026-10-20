// The Step player's stage as the Tutor sees and moves it (#107): `readStage` summarises what is
// on screen for the Tutor context, `moveStage` carries out a reply's stage actions through the
// player's own controls (the Scene player's buttons and Scrub, the Scene control), so Scene
// state and screen-reader text update as if the Student did it. Rings are the one thing the
// Tutor draws itself. It never dispatches engine Actions: no answer, Check or Continue.
// By hand only (no DOM in the unit tests); `atomsOnStage` is the one list both sides index.
import type { Stage } from "./context.ts";
import type { StageAction } from "./contract.ts";

const SVG = "http://www.w3.org/2000/svg";
const RING = "tutor-ring";

const scrubOf = (root: ParentNode) => root.querySelector<HTMLInputElement>('.player input[aria-label="Scrub"]');
const rangeOf = (root: ParentNode) => root.querySelector<HTMLInputElement>(".player .scene-control input[type=range]");
const stepperOf = (root: ParentNode) => root.querySelector<HTMLElement>(".player .scene-stepper");

/**
 * The labelled atoms the Student can see on the Step's drawings, in page order. Atoms inside a
 * Scene frame are left out: the Scene redraws them every frame.
 */
function atomsOnStage(root: ParentNode): SVGTextElement[] {
  return [...root.querySelectorAll<SVGTextElement>(".player-body .structure text.atom")].filter(
    (t) => !t.closest(".scene-frame") && t.getClientRects().length > 0 && !!t.textContent?.trim(),
  );
}

const drawingOf = (t: Element): Stage["atoms"][number]["in"] =>
  t.closest(".arrows-target") ? "target (look only)" : t.closest(".arrows-structure, .tap-structure") ? "working drawing" : "figure";

export function readStage(root: ParentNode = document): Stage {
  const range = rangeOf(root);
  const stepper = stepperOf(root);
  const control = range
    ? { label: range.getAttribute("aria-label") ?? "", min: +range.min, max: +range.max, value: +range.value }
    : stepper
      ? { label: stepper.getAttribute("aria-label") ?? "", min: +stepper.dataset.min!, max: +stepper.dataset.max!, value: +stepper.dataset.value! }
      : null;
  return {
    scene: !!scrubOf(root),
    control,
    atoms: atomsOnStage(root).map((t) => ({ label: t.textContent!.trim(), in: drawingOf(t) })),
  };
}

/** Sets a range input the way a drag would, so React's onChange runs. */
function slide(input: HTMLInputElement, value: number) {
  if (input.disabled) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const nextFrame = () => new Promise((done) => requestAnimationFrame(done));

/** Presses a stepper's − / + until it shows `value` (each press re-renders, so wait a frame between). */
async function stepTo(stepper: HTMLElement, value: number) {
  for (let i = 0; i < 64; i++) {
    const now = +stepper.dataset.value!;
    if (!stepper.isConnected || Math.abs(now - value) < 1e-9) return;
    const [minus, plus] = stepper.querySelectorAll<HTMLButtonElement>(".scene-step");
    const button = value > now ? plus : minus;
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    button.click();
    await nextFrame();
  }
}

/** Removes every ring the Tutor drew. */
export function clearRings(root: ParentNode = document) {
  root.querySelectorAll(`.${RING}`).forEach((r) => r.remove());
}

/**
 * Rings an atom label: a solid cyan circle plus four crosshair ticks, so the cue isn't colour
 * alone (Tap's picked ring pairs its cyan with a ✓; the ticks say "look here", not "picked").
 */
function ring(t: SVGTextElement) {
  const svg = t.ownerSVGElement;
  if (!svg) return;
  const b = t.getBBox();
  const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
  const r = Math.max(b.width, b.height) * 0.7 + 4;
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("class", RING);
  g.setAttribute("aria-hidden", "true");
  const circle = document.createElementNS(SVG, "circle");
  for (const [k, v] of Object.entries({ cx, cy, r })) circle.setAttribute(k, String(v));
  g.appendChild(circle);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tick = document.createElementNS(SVG, "line");
    const [from, to] = [r + 3, r + 9];
    for (const [k, v] of Object.entries({ x1: cx + dx * from, y1: cy + dy * from, x2: cx + dx * to, y2: cy + dy * to })) tick.setAttribute(k, String(v));
    g.appendChild(tick);
  }
  svg.appendChild(g);
}

/** Carries out a reply's stage actions (already validated by the route) on the page. */
export async function moveStage(actions: StageAction[], root: ParentNode = document) {
  // A new set of rings replaces the old one.
  if (actions.some((a) => a.type === "highlight" || a.type === "clear")) clearRings(root);
  const button = (label: string) => root.querySelector<HTMLButtonElement>(`.player .scene-btn[aria-label="${label}"]`);
  const atoms = atomsOnStage(root);
  for (const a of actions) {
    if (a.type === "play") button("Play")?.click();
    if (a.type === "pause") button("Pause")?.click();
    if (a.type === "replay") button("Replay")?.click();
    if (a.type === "seek") {
      const scrub = scrubOf(root);
      if (scrub) slide(scrub, +scrub.min + a.at * (+scrub.max - +scrub.min));
    }
    if (a.type === "set") {
      const range = rangeOf(root);
      const stepper = stepperOf(root);
      if (range) slide(range, a.value);
      else if (stepper) await stepTo(stepper, a.value);
    }
    if (a.type === "highlight" && atoms[a.atom]) ring(atoms[a.atom]);
  }
}
