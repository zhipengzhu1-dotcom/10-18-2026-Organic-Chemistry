// What a drawing implies from valence alone: the hydrogens a line-angle corner
// carries and the lone pairs each atom keeps. Pure, so the scenes module (a
// Scene that fills in H's) and the content build's checks share one rule.
// Browser import: "@astratron/content/valence".
import type { Structure } from "./model.ts";
import valenceElectrons from "../subjects/organic/data/valence-electrons.json" with { type: "json" };

/**
 * Valence electrons of the elements a drawing can hold: the one table drawings, Draw arrows and
 * Scenes share, read from the cited data file valence-electrons.json (ADR 0002; the content build
 * checks it and its source like any data file).
 */
export const VALENCE: Record<string, number> = Object.fromEntries(
  Object.entries(valenceElectrons.values).map(([key, v]) => [key.replace(/\.valence$/, ""), v.value]),
);

/** Formal charge: valence electrons − lone-pair electrons − bond orders − H's (an unknown element counts 0). */
export function formalCharge(el: string, lonePairs: number, bondOrders: number, hydrogens = 0): number {
  const paired = PAIR * lonePairs;
  return (VALENCE[el] ?? 0) - paired - bondOrders - hydrogens;
}

/** Electrons in a pair. */
const PAIR = 2;

/** Bonds a neutral carbon makes (its 4 valence electrons, each shared once). */
const CARBON_BONDS = VALENCE.C;

/** Sum of bond orders at each atom. */
function bondOrders(s: Structure): Map<string, number> {
  const sum = new Map<string, number>();
  for (const b of s.bonds) for (const end of [b.a, b.b]) sum.set(end, (sum.get(end) ?? 0) + b.order);
  return sum;
}

/**
 * H's that are there but not drawn: each line-angle corner (a carbon without its
 * letter written) gets enough to make four bonds. A written C carries only the
 * H's written with it, and in Lewis and Kekulé drawings every H is an atom.
 */
export function impliedHydrogens(s: Structure): Record<string, number> {
  const orders = bondOrders(s);
  const out: Record<string, number> = {};
  for (const a of s.atoms) {
    if (a.el !== "C" || s.style !== "line-angle" || a.letter) continue;
    out[a.id] = Math.max(0, CARBON_BONDS - (orders.get(a.id) ?? 0) - (a.h ?? 0) - Math.abs(a.charge ?? 0));
  }
  return out;
}

/** Every H the drawing stands for: H atoms, H's written with a letter (OH, CH₃) and implied corner H's. */
export function hydrogenCount(s: Structure): number {
  const implied = Object.values(impliedHydrogens(s)).reduce((n, h) => n + h, 0);
  return s.atoms.reduce((n, a) => n + (a.el === "H" ? 1 : 0) + (a.h ?? 0), implied);
}

/** Lone pairs an atom keeps: (valence electrons − charge − bonds − H's written with it − implied H's) / 2. */
export function expectedLonePairs(s: Structure): Record<string, number> {
  const orders = bondOrders(s);
  const implied = impliedHydrogens(s);
  const out: Record<string, number> = {};
  for (const a of s.atoms) {
    const valence = VALENCE[a.el];
    if (valence === undefined) continue;
    const used = (a.charge ?? 0) + (orders.get(a.id) ?? 0) + (a.h ?? 0) + (implied[a.id] ?? 0);
    out[a.id] = Math.max(0, Math.floor((valence - used) / 2));
  }
  return out;
}
