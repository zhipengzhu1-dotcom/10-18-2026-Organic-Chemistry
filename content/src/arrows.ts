// Draw arrows: electron pushing on our own molecule graph (DECISIONS: no
// RDKit.js at runtime). Pure and browser-safe ("@astratron/content/arrows"):
// the content build checks Steps with it, the Step player engine grades with
// it, and the homepage hero push (#73) can drive it directly.
//
// The graph keeps what electrons can change: lone pairs per atom and bond
// orders per atom pair. Hydrogens never move, so each atom's H count is fixed
// from the start; formal charges are always derived, never tracked:
//   charge = valence − 2·lone pairs − bond orders − H.
// Grading is by result: a push is accepted when it moves toward an accepted
// result (its electrons leave a place that has more than the result has, and
// land where the result has more), so every valid route counts.
import type { Push, PushHint, Structure, StructureBond } from "./model.ts";
import { formalCharge, VALENCE } from "./valence.ts";

export interface MoleculeAtom {
  id: string;
  el: string;
  x: number;
  y: number;
  /** Hydrogens not drawn as atoms (written with the letter, or a line-angle carbon's implied H's). Fixed. */
  h: number;
  lp: number;
}

/** The electron state of a drawing. `bonds` maps an atom pair key ("a1|a2", sorted) to its bond. */
export interface Molecule {
  /** The structure it came from (style, labels, letters and drawing options are kept from it). */
  base: Structure;
  atoms: MoleculeAtom[];
  bonds: Map<string, { id: string; a: string; b: string; order: number }>;
}

/** Where a pair of electrons sits: a lone pair on an atom, or one pair of the bond between two atoms. */
export type Place = { lp: string } | { pair: [string, string] };

/** One push in canonical form: its electrons move from one Place to another. */
export interface Move {
  from: Place;
  to: Place;
}

const pairKey = (p: string, q: string) => (p < q ? `${p}|${q}` : `${q}|${p}`);
const placeKey = (p: Place) => ("lp" in p ? `lp:${p.lp}` : `pair:${pairKey(...p.pair)}`);

/** The molecule graph of a structure. Implied H's of line-angle carbons are worked out from the drawn charge. */
export function moleculeOf(s: Structure): Molecule {
  const bonds = new Map<string, { id: string; a: string; b: string; order: number }>();
  for (const b of s.bonds) bonds.set(pairKey(b.a, b.b), { id: b.id, a: b.a, b: b.b, order: b.order });
  const sum = bondSums(s.bonds);
  const atoms = s.atoms.map((a) => {
    // A carbon that writes its H's (a lettered CH₂, `h: 2`) has exactly those; a corner has the implied ones.
    const implied =
      s.style === "line-angle" && a.el === "C" && a.h === undefined ? Math.max(0, VALENCE.C - Math.abs(a.charge ?? 0) - (sum.get(a.id) ?? 0)) : 0;
    return { id: a.id, el: a.el, x: a.x, y: a.y, h: (a.h ?? 0) + implied, lp: a.lp ?? 0 };
  });
  return { base: s, atoms, bonds };
}

function bondSums(bonds: Iterable<{ a: string; b: string; order: number }>): Map<string, number> {
  const sum = new Map<string, number>();
  for (const b of bonds) for (const end of [b.a, b.b]) sum.set(end, (sum.get(end) ?? 0) + b.order);
  return sum;
}

/** Formal charge of every atom: valence − 2·lone pairs − bond orders − H. */
export function charges(m: Molecule): Map<string, number> {
  const sum = bondSums(m.bonds.values());
  return new Map(m.atoms.map((a) => [a.id, formalCharge(a.el, a.lp, sum.get(a.id) ?? 0, a.h)]));
}

/** Electrons around every atom: its lone pairs plus every bond it shares (H's included), counted in electrons. */
export function electrons(m: Molecule): Map<string, number> {
  const sum = bondSums(m.bonds.values());
  return new Map(m.atoms.map((a) => [a.id, 2 * a.lp + 2 * ((sum.get(a.id) ?? 0) + a.h)]));
}

/** The drawing of a molecule: the base structure with the current bonds, lone pairs and charges. */
export function toStructure(m: Molecule): Structure {
  const q = charges(m);
  const byId = new Map(m.base.atoms.map((a) => [a.id, a]));
  const kept = new Map(m.base.bonds.map((b) => [b.id, b]));
  return {
    ...m.base,
    atoms: m.atoms.map((a) => {
      const { charge: _c, lp: _lp, ...rest } = byId.get(a.id)!;
      const charge = q.get(a.id) ?? 0;
      return { ...rest, ...(charge && { charge }), ...(a.lp && { lp: a.lp }) };
    }),
    bonds: [...m.bonds.values()].map((b): StructureBond => {
      const old = kept.get(b.id);
      const { stereo: _s, label: _l, ...plain } = old ?? { id: b.id, a: b.a, b: b.b, order: 1 as const };
      // A wedge or a label describes the bond as first drawn; keep them only while its order is unchanged.
      return old && old.order === b.order ? old : { ...plain, order: b.order as 1 | 2 | 3 };
    }),
  };
}

/** The bond id a new bond between two atoms gets. */
const newBondId = (p: string, q: string) => `b-${[p, q].sort().join("-")}`;

function bondById(m: Molecule, id: string) {
  for (const b of m.bonds.values()) if (b.id === id) return b;
  return undefined;
}
const atomById = (m: Molecule, id: string) => m.atoms.find((a) => a.id === id);

/** Atom ids in the same molecule (connected by bonds) as `id`. */
function fragmentOf(m: Molecule, id: string): Set<string> {
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const at = queue.pop()!;
    for (const b of m.bonds.values()) {
      const other = b.a === at ? b.b : b.b === at ? b.a : undefined;
      if (other && !seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return seen;
}

const bonded = (m: Molecule, p: string, q: string) => m.bonds.has(pairKey(p, q));

/**
 * Reads a push as a Move, or undefined when it isn't one (nothing to move, or a target the arrow
 * can't reach). Lone pair on X → a bond of X or a bonded atom: that bond gains a pair; → an atom
 * of another molecule: a new bond. Bond X–Y → X or Y: a lone pair there; → a bond sharing one
 * atom, or an atom bonded to one end: that pair slides over; → an atom of another molecule: a
 * new bond from the nearer end.
 */
export function moveOf(m: Molecule, push: Push): Move | undefined {
  const fromAtom = atomById(m, push.from);
  const fromBond = fromAtom ? undefined : bondById(m, push.from);
  const toAtom = atomById(m, push.to);
  const toBond = toAtom ? undefined : bondById(m, push.to);
  if (!toAtom && !toBond) return undefined;

  if (fromAtom) {
    if (fromAtom.lp < 1) return undefined;
    const x = fromAtom.id;
    const from: Place = { lp: x };
    if (toAtom) {
      // A bonded neighbour, or an atom of another molecule (a new bond across the gap).
      const reach = toAtom.id !== x && (bonded(m, x, toAtom.id) || !fragmentOf(m, x).has(toAtom.id));
      return reach ? { from, to: { pair: [x, toAtom.id] } } : undefined;
    }
    if (toBond!.a !== x && toBond!.b !== x) return undefined;
    return { from, to: { pair: [toBond!.a, toBond!.b] } };
  }
  if (!fromBond) return undefined;
  const { a: x, b: y } = fromBond;
  const from: Place = { pair: [x, y] };
  if (toBond) {
    if (toBond.id === fromBond.id) return undefined;
    const shared = [toBond.a, toBond.b].filter((e) => e === x || e === y);
    if (shared.length !== 1) return undefined;
    return { from, to: { pair: [toBond.a, toBond.b] } };
  }
  const z = toAtom!.id;
  if (z === x || z === y) return { from, to: { lp: z } };
  const byX = bonded(m, x, z);
  const byY = bonded(m, y, z);
  if (byX !== byY) return { from, to: { pair: [byX ? x : y, z] } };
  if (byX) return undefined; // a three-membered ring: ambiguous
  if (fragmentOf(m, x).has(z)) return undefined; // too far along its own molecule to reach
  const [px, py] = [atomById(m, x)!, atomById(m, y)!];
  const d = (a: MoleculeAtom) => Math.hypot(a.x - toAtom!.x, a.y - toAtom!.y);
  return { from, to: { pair: [d(px) <= d(py) ? x : y, z] } };
}

/** Electron pairs at a Place: lone pairs on the atom, or the bond order between the two atoms. */
function count(m: Molecule, p: Place): number {
  if ("lp" in p) return atomById(m, p.lp)?.lp ?? 0;
  return m.bonds.get(pairKey(...p.pair))?.order ?? 0;
}

/** The molecule after a push, or undefined when the push isn't a move. */
export function applyPush(m: Molecule, push: Push): Molecule | undefined {
  const move = moveOf(m, push);
  return move && applyMove(m, move);
}

function applyMove(m: Molecule, move: Move): Molecule | undefined {
  if (count(m, move.to) >= 3 && "pair" in move.to) return undefined; // no quadruple bonds
  const atoms = m.atoms.map((a) => ({ ...a }));
  const bonds = new Map([...m.bonds].map(([k, b]) => [k, { ...b }]));
  const shift = (p: Place, by: number) => {
    if ("lp" in p) {
      atoms.find((a) => a.id === p.lp)!.lp += by;
      return;
    }
    const key = pairKey(...p.pair);
    const bond = bonds.get(key);
    if (bond) {
      bond.order += by;
      if (bond.order === 0) bonds.delete(key);
    } else bonds.set(key, { id: newBondId(...p.pair), a: p.pair[0], b: p.pair[1], order: by });
  };
  shift(move.from, -1);
  shift(move.to, 1);
  return { ...m, atoms, bonds };
}

/** True when the move takes electrons from where the result has fewer and gives them where it has more. */
function toward(m: Molecule, move: Move, result: Molecule): boolean {
  return count(m, move.from) > count(result, move.from) && count(m, move.to) < count(result, move.to);
}

/**
 * A push that is a step toward the result: toward it, and the result can still be reached from
 * there by pushes that are each toward it. (Sliding a π pair toward a carbon that already holds
 * the pair it needs lowers the count of differences but leaves no legal way on: a dead end.)
 */
function stepToward(m: Molecule, move: Move, result: Molecule): boolean {
  if (!toward(m, move, result)) return false;
  const next = applyMove(m, move);
  return !!next && reachable(next, result, new Map());
}

function reachable(m: Molecule, result: Molecule, seen: Map<string, boolean>): boolean {
  if (sameMolecule(m, result)) return true;
  const key = moleculeKey(m);
  const known = seen.get(key);
  if (known !== undefined) return known;
  seen.set(key, false);
  for (const s of sources(m))
    for (const t of dropTargets(m, s.id)) {
      const move = moveOf(m, { from: s.id, to: t.id });
      if (!move || !toward(m, move, result)) continue;
      const next = applyMove(m, move);
      if (next && reachable(next, result, seen)) {
        seen.set(key, true);
        return true;
      }
    }
  return false;
}

const moleculeKey = (m: Molecule) =>
  m.atoms.map((a) => a.lp).join(",") + ";" + [...m.bonds.entries()].map(([k, b]) => `${k}:${b.order}`).sort().join(",");

/** Same lone pairs on every atom and the same bond orders between every pair. */
export function sameMolecule(p: Molecule, q: Molecule): boolean {
  if (p.atoms.some((a) => atomById(q, a.id)?.lp !== a.lp)) return false;
  const keys = new Set([...p.bonds.keys(), ...q.bonds.keys()]);
  return [...keys].every((k) => (p.bonds.get(k)?.order ?? 0) === (q.bonds.get(k)?.order ?? 0));
}

// ── What can be dragged, and where it can land ─────────────────────────────

export interface Source {
  /** An atom id (its lone pairs) or a bond id. */
  id: string;
  kind: "lone-pair" | "bond";
  label: string;
}

/** Electron sources in drawing order: every atom with a lone pair, then every bond. */
export function sources(m: Molecule): Source[] {
  return [
    ...m.atoms.filter((a) => a.lp > 0).map((a) => ({ id: a.id, kind: "lone-pair" as const, label: placeLabel(m, a.id) })),
    ...[...m.bonds.values()].map((b) => ({ id: b.id, kind: "bond" as const, label: placeLabel(m, b.id) })),
  ];
}

export interface DropTarget {
  /** An atom id or a bond id: the push's `to`. */
  id: string;
  /**
   * Where the arrowhead is drawn: on the bond (lone pair → bond, bond → next bond); beside the atom,
   * away from the bond (bond → atom); or in the gap on the atom's side, facing the source (a new
   * bond to another molecule).
   */
  place: "on-bond" | "beside-atom" | "gap";
  label: string;
}

/** Every drop target a source offers. Atoms of other molecules are offered only across the gap. */
export function dropTargets(m: Molecule, from: string): DropTarget[] {
  const atom = atomById(m, from);
  const bond = atom ? undefined : bondById(m, from);
  const ends = atom ? [atom.id] : bond ? [bond.a, bond.b] : [];
  if (!ends.length || (atom && atom.lp < 1)) return [];
  const own = fragmentOf(m, ends[0]);
  const out: DropTarget[] = [];
  if (bond) for (const e of ends) out.push({ id: e, place: "beside-atom", label: placeLabel(m, e, "target") });
  for (const b of m.bonds.values()) {
    if (b.id === from) continue;
    const shared = [b.a, b.b].filter((e) => ends.includes(e)).length;
    if (shared === 1) out.push({ id: b.id, place: "on-bond", label: placeLabel(m, b.id, "target") });
  }
  for (const a of m.atoms) if (!own.has(a.id)) out.push({ id: a.id, place: "gap", label: placeLabel(m, a.id, "target") });
  return out;
}

/**
 * Where a push's arrowhead is drawn, whichever way it was dropped: beside the atom that gains a
 * lone pair, on the bond that gains a pair, or in the gap before an atom of another molecule.
 */
export function arrowhead(m: Molecule, push: Push): { to: string; place: DropTarget["place"] } | undefined {
  const move = moveOf(m, push);
  if (!move) return undefined;
  if ("lp" in move.to) return { to: move.to.lp, place: "beside-atom" };
  const bond = m.bonds.get(pairKey(...move.to.pair));
  if (bond) return { to: bond.id, place: "on-bond" };
  const source = "lp" in move.from ? [move.from.lp] : move.from.pair;
  const far = move.to.pair.find((a) => !source.includes(a)) ?? move.to.pair[1];
  return { to: far, place: "gap" };
}

/** The molecules a list of pushes passes through: the start, then after each push (stopping at one that isn't a move). */
export function replay(start: Structure, pushes: Push[]): { molecule: Molecule; push?: Push }[] {
  let m = moleculeOf(start);
  const frames: { molecule: Molecule; push?: Push }[] = [];
  for (const push of pushes) {
    const next = applyPush(m, push);
    if (!next) break;
    frames.push({ molecule: m, push });
    m = next;
  }
  frames.push({ molecule: m });
  return frames;
}

// ── Names read aloud and shown above the card ───────────────────────────────

/** "O4", "C2": the element and the atom's map number. */
export const atomName = (m: Molecule, id: string) => `${atomById(m, id)?.el ?? "?"}${id.replace(/^a/, "")}`;

const BOND_SIGN = ["", "–", "=", "≡"];

/** "lone pair on O4", "π bond C2=O3", "σ bond C1–C2" (a source); an atom's name or "C2–O4 bond" (a target). */
export function placeLabel(m: Molecule, id: string, as: "source" | "target" = "source"): string {
  const atom = atomById(m, id);
  if (atom) return as === "source" && atom.lp > 0 ? `lone pair on ${atomName(m, id)}` : atomName(m, id);
  const b = bondById(m, id);
  if (!b) return id;
  const name = `${atomName(m, b.a)}${BOND_SIGN[b.order] ?? "–"}${atomName(m, b.b)}`;
  return as === "target" ? `${name} bond` : `${b.order > 1 ? "π" : "σ"} bond ${name}`;
}

/** "lone pair on O4 → C2": the line above the card and what screen readers hear. */
export function pushLabel(m: Molecule, push: Push): string {
  return `${placeLabel(m, push.from)} → ${placeLabel(m, push.to, "target")}`;
}

// ── In-between states ───────────────────────────────────────────────────────

export interface Flag {
  atom: string;
  kind: "over" | "short";
  electrons: number;
  text: string;
}

const DEFAULT_COPY = {
  over: "{atom} would have {electrons} e⁻. Something has to leave: this halfway drawing isn't a real structure.",
  short: "{atom} has only {electrons} e⁻. This halfway drawing isn't a real structure: keep going.",
};

/**
 * Atoms past their octet (H: 2), and atoms that started full and now fall short: the in-between
 * states a Student must not mistake for real structures.
 */
export function flagsOf(start: Molecule, m: Molecule, copy: { over?: string; short?: string } = {}): Flag[] {
  const before = electrons(start);
  const now = electrons(m);
  const flags: Flag[] = [];
  for (const a of m.atoms) {
    const full = a.el === "H" ? 2 : 8;
    const e = now.get(a.id) ?? 0;
    const kind = e > full ? "over" : e < full && (before.get(a.id) ?? 0) >= full ? "short" : undefined;
    if (!kind) continue;
    const text = (copy[kind] ?? DEFAULT_COPY[kind]).replaceAll("{atom}", atomName(m, a.id)).replaceAll("{electrons}", String(e));
    flags.push({ atom: a.id, kind, electrons: e, text });
  }
  return flags;
}

// ── A Draw-arrows session: the grading rules, free of any Lesson ─────────────

/** What grading needs: the start, the accepted results, a correct route, Hints and in-between copy. */
export interface ArrowsTask {
  start: Structure;
  results: Structure[];
  /** The correct pushes in an order that works; the first one still useful is the one shown after two wrong tries. */
  answer: Push[];
  hints?: PushHint[];
  inBetween?: { over?: string; short?: string };
}

export interface PlacedPush {
  push: Push;
  /** True when the Student was shown this push after two wrong tries. */
  shown: boolean;
}

export type Outcome =
  | { kind: "accepted"; push: Push; label: string }
  | { kind: "wrong"; push: Push; label: string; hint: string }
  /** The second wrong try on a push: the push the Student should have made is placed for them. */
  | { kind: "shown"; push: Push; label: string; wrong: Push }
  | { kind: "undone"; push: Push; label: string };

export interface ArrowsState {
  /** Pushes on the drawing, first to last. */
  pushes: PlacedPush[];
  /** Wrong tries on the push being made now (0 or 1; the second shows the push). */
  tries: number;
  /** Wrong pushes in total: the Problem is first-try only when this stays 0. */
  wrong: number;
  /** True once the drawing is an accepted result. */
  done: boolean;
  last?: Outcome;
}

export type ArrowsAction = { push: Push } | { undo: true };

export const arrowsStart = (): ArrowsState => ({ pushes: [], tries: 0, wrong: 0, done: false });

/** The drawing after the placed pushes, and the results still reachable from it. */
export function arrowsView(task: ArrowsTask, state: ArrowsState) {
  const first = moleculeOf(task.start);
  const results = task.results.map(moleculeOf);
  let m = first;
  let open = results.map((_, i) => i);
  for (const { push } of state.pushes) {
    const move = moveOf(m, push);
    if (!move) break;
    open = open.filter((i) => toward(m, move, results[i]));
    m = applyMove(m, move) ?? m;
  }
  const flags = state.done ? [] : flagsOf(first, m, task.inBetween);
  return { start: first, molecule: m, structure: toStructure(m), results, open, flags };
}

/** One push or undo. Returns the same state when the action can't be taken (not a move, nothing to undo, done). */
export function arrowsAct(task: ArrowsTask, state: ArrowsState, action: ArrowsAction): ArrowsState {
  if (state.done) return state;
  const view = arrowsView(task, state);
  const m = view.molecule;
  if ("undo" in action) {
    const last = state.pushes.at(-1);
    if (!last) return state;
    const pushes = state.pushes.slice(0, -1);
    const before = arrowsView(task, { ...state, pushes }).molecule;
    return { ...state, pushes, last: { kind: "undone", push: last.push, label: pushLabel(before, last.push) } };
  }
  const { push } = action;
  const move = moveOf(m, push);
  if (!move || !applyMove(m, move)) return state;
  const label = pushLabel(m, push);
  if (view.open.some((i) => stepToward(m, move, view.results[i]))) {
    return finish(task, { ...state, pushes: [...state.pushes, { push, shown: false }], tries: 0, last: { kind: "accepted", push, label } });
  }
  const wrong = state.wrong + 1;
  if (state.tries === 0) {
    const hint = task.hints?.find((h) => hintFits(m, h, push))?.text ?? "";
    return { ...state, tries: 1, wrong, last: { kind: "wrong", push, label, hint } };
  }
  const shown = nextPush(task, state);
  if (!shown) return { ...state, wrong, last: { kind: "wrong", push, label, hint: "" } };
  return finish(task, {
    ...state,
    wrong,
    tries: 0,
    pushes: [...state.pushes, { push: shown, shown: true }],
    last: { kind: "shown", push: shown, label: pushLabel(m, shown), wrong: push },
  });
}

function finish(task: ArrowsTask, state: ArrowsState): ArrowsState {
  const { molecule, results, open } = arrowsView(task, state);
  return { ...state, done: open.some((i) => sameMolecule(molecule, results[i])) };
}

/** A push toward a result still open: the first useful one of the answer, else any (preferring no in-between flag). */
export function nextPush(task: ArrowsTask, state: ArrowsState): Push | undefined {
  const { start, molecule: m, results, open } = arrowsView(task, state);
  const useful = (push: Push) => {
    const move = moveOf(m, push);
    return !!move && !!applyMove(m, move) && open.some((i) => stepToward(m, move, results[i]));
  };
  const authored = task.answer.find(useful);
  if (authored) return authored;
  const all = sources(m).flatMap((s) => dropTargets(m, s.id).map((t) => ({ from: s.id, to: t.id })));
  const ok = all.filter(useful);
  return ok.find((p) => flagsOf(start, applyPush(m, p)!).length === 0) ?? ok[0];
}

/** A push's Hint conditions: where it starts, and where it lands (an atom drop and the bond it makes match alike). */
function hintFits(m: Molecule, hint: PushHint, push: Push): boolean {
  const fromOk =
    !hint.from ||
    hint.from.some((f) => f === push.from || (f === "sigma" && bondById(m, push.from)?.order === 1));
  if (!fromOk) return false;
  if (!hint.to) return true;
  const made = moveOf(m, push);
  return hint.to.some((t) => {
    if (t === push.to) return true;
    const other = moveOf(m, { from: push.from, to: t });
    return !!made && !!other && placeKey(other.to) === placeKey(made.to);
  });
}
