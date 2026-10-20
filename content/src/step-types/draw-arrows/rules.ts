// Draw arrows: the Student pushes electrons on the atom-mapped start, one arrow
// at a time; each push is graded the moment it is made, by the structure it
// gives (the rules live in ../../arrows.ts; `act` is a thin entry over them).
// Two tries per push (its Hint, then the push is shown); done when the drawing
// is an accepted result.
import { arrowsAct, arrowsStart, arrowsView, type ArrowsAction, type ArrowsState, type Flag } from "../../arrows.ts";
import type { Cited } from "../../data.ts";
import type { GradedVisuals, MoleculeUse, Phase, SceneUse, Structure, StructureView } from "../../model.ts";
import { gradedText, hintText, reveal, type Feedback, type PlayState, type Played, type StepRules } from "../play.ts";

/** One curved arrow: `from` an atom id (its lone pair) or a bond id; `to` an atom id or a bond id. */
export interface Push {
  from: string;
  to: string;
}

/**
 * A Draw-arrows Hint, matched on the wrong push: `from` = it starts at one of these (atom ids =
 * their lone pair, bond ids, `sigma` = any single bond); `to` = it lands on one of these.
 */
export interface PushHint {
  from?: string[];
  to?: string[];
  text: string;
}

/**
 * Draw arrows: the Student pushes electrons on the atom-mapped start, one arrow at a time. Each push
 * is applied to our own molecule graph and accepted when it moves toward an accepted result
 * (`@astratron/content/arrows`). Two tries per push; the Step is done when the drawing is a result.
 */
export interface DrawArrowsStep extends GradedVisuals {
  id: string;
  phase: Phase;
  type: "draw-arrows";
  prompt: string;
  /** The atom-mapped start the Student pushes on (atom ids are the map). */
  start: StructureView;
  /** The target drawn dimmed beside (or above) the start; absent when the Step hides it (open or "no target"). */
  target?: StructureView;
  /** Every accepted result (same atom ids as the start). */
  results: Structure[];
  /** The correct pushes, in an order that works: shown on a second wrong try and in the reveal. */
  answer: Push[];
  /** Copy for in-between states; `{atom}` and `{electrons}` are filled in. Defaults apply when absent. */
  inBetween?: { over?: string; short?: string };
  correct?: string;
  hints?: PushHint[];
  reveal: string;
  problemId?: string;
  scene?: SceneUse;
  citations?: Cited[];
  /** The molecule the Step names: Explore in 3D (#71). */
  molecule?: MoleculeUse;
}

/** The pushes so far, the drawing they give and its in-between flags. */
export interface ArrowsScreen extends ArrowsState {
  /** The start with every placed push applied: bonds, lone pairs and charges as they are now. */
  structure: Structure;
  /** Atoms over their octet or newly short of it (none once done). */
  flags: Flag[];
}

/**
 * `tries` counts wrong pushes, plus one when done, so 1 means no push was wrong (first try).
 * `arrows.tries` is something else: wrong tries on the push being made now.
 */
export interface DrawArrowsState extends PlayState {
  arrows: ArrowsScreen;
}

/** One curved arrow, graded the moment it is drawn, or undoing the last one. */
export type DrawArrowsAnswer = ArrowsAction;

const takesPush = (answer: object): answer is DrawArrowsAnswer => "push" in answer || "undo" in answer;

// Before the answer key arrives a Draw-arrows Step has no results yet: it draws, but grades nothing.
const taskOf = (step: DrawArrowsStep) => ({ ...step, start: step.start.structure, results: step.results ?? [] });

function arrowsScreen(step: DrawArrowsStep, state: ArrowsState): ArrowsScreen {
  const { structure, flags } = arrowsView(taskOf(step), state);
  return { ...state, structure, flags };
}

const startArrows = (step: DrawArrowsStep): DrawArrowsState => ({ tries: 0, done: false, arrows: arrowsScreen(step, arrowsStart()) });

/** Done with every push the Student's own → the Correct line; a push had to be shown → the reveal. */
function actArrows(step: DrawArrowsStep, state: DrawArrowsState, input: object): Played<DrawArrowsState> | undefined {
  if (!takesPush(input)) return undefined;
  const next = arrowsAct(taskOf(step), state.arrows, input);
  if (next === state.arrows) return undefined;
  const last = next.last!;
  let feedback: Feedback | null = null;
  if (next.done) feedback = next.pushes.some((p) => p.shown) ? reveal(step) : { kind: "correct", text: step.correct ?? "" };
  else if (last.kind === "wrong") feedback = { kind: "hint", text: last.hint };
  else if (last.kind === "shown") feedback = { kind: "shown", text: `Here is that push: ${last.label}.` };
  return { state: { tries: next.wrong + (next.done ? 1 : 0), done: next.done, arrows: arrowsScreen(step, next) }, feedback };
}

export const drawArrows = {
  secret: ["answer", "correct", "hints", "reveal", "results", "inBetween", "revealScene"] as const,
  blank: { answer: [], results: [], reveal: "" },
  // The start is redrawn live in the browser as pushes land; its first drawing and the
  // target are pre-rendered. In-between copy stays plain: it is also read aloud.
  render: (s, { md, draw }) => ({
    ...s,
    ...gradedText(s, md),
    start: draw(s.start),
    ...(s.target && { target: draw(s.target) }),
    hints: hintText(s.hints, md),
  }),
  start: startArrows,
  takes: takesPush,
  act: actArrows,
} satisfies StepRules<DrawArrowsStep, DrawArrowsState, DrawArrowsAnswer>;
