// Curved-arrow geometry on a drawn structure: where each push's tail starts,
// where its arrowhead (and so its drop target) sits, and the curve between.
// Pure, shared by the Draw-arrows Step view (site) and the push-replay Scene.
// Drop targets sit where the arrowhead is drawn (Lesson spec template): on the
// bond for lone pair → bond and bond → bond, beside the atom for bond → atom,
// and in the gap on the far atom's side for a new bond to another molecule.
import type { Push, Structure } from "@astratron/content";
import type { DropTarget } from "@astratron/content/arrows";
import type { Drawing, Point } from "./render.ts";

/** How far beside an atom a bond → atom arrowhead lands, and how far short of an atom a new-bond arrowhead stops. */
const BESIDE = 24;
const GAP = 30;
/** How far from an atom's centre a lone-pair tail starts (where its dots are drawn). */
const LP_TAIL = 16;
/** How much an arrow bows to one side, as a share of its length. */
const BOW = 0.35;

const unit = (from: Point, to: Point): Point => {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
};
const mid = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/** The two atoms of a bond id, from the structure (or a new bond's id, `b-<atom>-<atom>`). */
export function bondEnds(structure: Structure, id: string): [string, string] | undefined {
  const b = structure.bonds.find((x) => x.id === id);
  if (b) return [b.a, b.b];
  const made = /^b-(a\d+)-(a\d+)$/.exec(id);
  return made ? [made[1], made[2]] : undefined;
}

/** A point standing for a source or target id: an atom's centre, or a bond's midpoint. */
export function anchor(drawing: Drawing, structure: Structure, id: string): Point | undefined {
  if (drawing.atoms[id]) return drawing.atoms[id];
  const ends = bondEnds(structure, id);
  return ends && drawing.atoms[ends[0]] && drawing.atoms[ends[1]] ? mid(drawing.atoms[ends[0]], drawing.atoms[ends[1]]) : undefined;
}

/** Where a drop target's arrowhead sits for a push from `from`. */
export function spotOf(drawing: Drawing, structure: Structure, from: string, target: Pick<DropTarget, "id" | "place">): Point | undefined {
  const at = anchor(drawing, structure, target.id);
  const source = anchor(drawing, structure, from);
  if (!at || !source) return undefined;
  if (target.place === "on-bond") return at;
  if (target.place === "beside-atom") {
    // Away from the bond the pair leaves, so the head sits beside the atom, not on it.
    const u = unit(source, at);
    return { x: at.x + u.x * BESIDE, y: at.y + u.y * BESIDE };
  }
  const u = unit(at, source);
  return { x: at.x + u.x * GAP, y: at.y + u.y * GAP };
}

/** The tail of a push: beside the atom toward the head for a lone pair, the bond's midpoint for a bond. */
export function tailOf(drawing: Drawing, structure: Structure, from: string, head: Point): Point | undefined {
  const at = anchor(drawing, structure, from);
  if (!at) return undefined;
  if (!drawing.atoms[from]) return at;
  const u = unit(at, head);
  return { x: at.x + u.x * LP_TAIL, y: at.y + u.y * LP_TAIL };
}

/** A quadratic curve from tail to head, bowed to the left of travel; `t` (0–1) draws only its first part. */
export function curve(tail: Point, head: Point): { d: string; at: (t: number) => Point; control: Point } {
  const len = Math.hypot(head.x - tail.x, head.y - tail.y);
  const u = unit(tail, head);
  const m = mid(tail, head);
  const control = { x: m.x + u.y * len * BOW, y: m.y - u.x * len * BOW };
  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * tail.x + 2 * (1 - t) * t * control.x + t * t * head.x,
    y: (1 - t) * (1 - t) * tail.y + 2 * (1 - t) * t * control.y + t * t * head.y,
  });
  const r = (n: number) => Math.round(n * 10) / 10;
  return { d: `M${r(tail.x)},${r(tail.y)} Q${r(control.x)},${r(control.y)} ${r(head.x)},${r(head.y)}`, at, control };
}

/** The arrow of a placed push on a drawing: its curve, or undefined when an end isn't drawn. */
export function pushArrow(drawing: Drawing, structure: Structure, push: Push, place: DropTarget["place"]) {
  const head = spotOf(drawing, structure, push.from, { id: push.to, place });
  const tail = head && tailOf(drawing, structure, push.from, head);
  return tail && head ? { tail, head, ...curve(tail, head) } : undefined;
}

/** Distance from a point to a segment. */
export function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
