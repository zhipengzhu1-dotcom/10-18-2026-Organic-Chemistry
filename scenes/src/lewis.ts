// Small Lewis structures for Scenes (Lesson 1): one centre atom with its
// partners spread evenly round it, drawn by the site's own renderer. A model
// drawing: no measured geometry, so no cited numbers; positions only space the
// letters out. No React here, so manifests can import it (see embed.tsx).
import type { Structure, StructureAtom } from "@astratron/content";
import type { Drawing } from "./structure/render.ts";
import type { Box } from "./frame.ts";

/** Outer-shell (valence) electrons of the neutral atom: counts, not measured data. */
export const VALENCE: Record<string, number> = { H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Cl: 7, Br: 7 };

/** A partner of the centre atom; `el: "*"` is a loose bond end (the rest of a molecule). */
export interface Partner {
  el: string;
  order?: 1 | 2 | 3;
  lp?: number;
}

/** The centre's formal charge: valence − lone-pair electrons − bonds. */
export function formalCharge(el: string, lp: number, partners: Partner[]): number {
  return VALENCE[el] - 2 * lp - partners.reduce((n, p) => n + (p.order ?? 1), 0);
}

/**
 * A centre atom (`a1`) with its partners (`a2`…) spread evenly from `turn` radians, and bonds
 * `b1`… in partner order. The centre's charge is its formal charge.
 */
export function star(id: string, el: string, lp: number, partners: Partner[], turn = 0): Structure {
  const spread = (2 * Math.PI) / partners.length;
  const unit = 1.5;
  const charge = formalCharge(el, lp, partners);
  const centre: StructureAtom = { id: "a1", el, x: 0, y: 0, ...(lp ? { lp } : {}), ...(charge ? { charge } : {}) };
  return {
    id,
    style: "full",
    atoms: [
      centre,
      ...partners.map((p, i) => ({
        id: `a${i + 2}`,
        el: p.el,
        x: unit * Math.cos(turn + i * spread),
        y: unit * Math.sin(turn + i * spread),
        ...(p.lp ? { lp: p.lp } : {}),
      })),
    ],
    bonds: partners.map((p, i) => ({ id: `b${i + 1}`, a: "a1", b: `a${i + 2}`, order: p.order ?? 1 })), // cited-data: ok, atom ids
  };
}

/** Where a drawing sits in the Scene: scaled to fit `box`, centred. */
export function fit(drawing: Drawing, box: Box): { scale: number; x: number; y: number } {
  const scale = Math.min(box.w / drawing.width, box.h / drawing.height);
  return { scale, x: box.x + (box.w - drawing.width * scale) / 2, y: box.y + (box.h - drawing.height * scale) / 2 };
}

/** Text in Scenes is set in the data face (digits and formulas must be, by the site's type rule). */
export const DATA_FONT = "var(--at-font-data, 'JetBrains Mono'), ui-monospace, monospace";
export const INK = "var(--at-ink, #f2f0ff)";
export const MUTED = "var(--at-ink-muted, #b8b4d8)";
export const LINE = "var(--at-line, #6b6890)";
export const CYAN = "var(--at-electron, #35d4ff)";
export const MAGENTA = "var(--at-boss, #ff4fd8)";
export const ORANGE = "var(--at-ignite, #ff9a3d)";
