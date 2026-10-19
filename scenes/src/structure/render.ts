// The site's own 2D structure renderer. It draws every lone pair as two cyan
// dots and every charged atom as a letter with its sign. RDKit.js only lays
// structures out (content/src/layout.ts); it never draws. Pure: a structure
// in, an SVG string out, so it runs at build time (pre-rendered SVG), in the
// browser, and for Manim's SVG import alike.
import type { Hidden, Structure, StructureAtom } from "@astratron/content";

/** Drawn length of one bond, in SVG units (≈ CSS px at natural size). */
export const BOND_PX = 60; // cited-data: ok, drawing scale in px, not a bond length
const PAD = 36;
const FONT = 20;
const CHAR_W = FONT * 0.6; // JetBrains Mono advance width
const LETTER_GAP = 12; // bonds stop this far short of a letter
const LP_DIST = 17;
const LP_SPREAD = 4.5;
const DOT_R = 2.4;
/** Lewis style: distance between the shared pairs of a double or triple bond. */
const PAIR_GAP = 9;
/** A ring double bond's inner line: how far inside the ring, and how much shorter at each end. */
const RING_INNER = 7;
const RING_INSET = 8;
const HASH_STROKE = 1.5;
const LINE_STROKE = 2;
/** How far (radians) the charge sign keeps from bonds and lone pairs before it leaves the upper right. */
/** Write "HO" rather than "OH" when the neighbours lie to the right by more than this (mean cosine). */
const H_LEFT_BIAS = 0.1;
const SIGN_CLEARANCE = (35 * Math.PI) / 180;

export interface Point {
  x: number;
  y: number;
}
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Drawing {
  svg: string;
  viewBox: string;
  width: number;
  height: number;
  /** Atom centres, in the SVG's coordinates. */
  atoms: Record<string, Point>;
  /** Bonds centre to centre, in the SVG's coordinates. */
  bonds: Record<string, Segment>;
  /** Where each drawn lone pair sits (the midpoint of its two dots), in the SVG's coordinates. */
  lonePairs: (Point & { atom: string })[];
}

/** What a Step points at in a drawing: atoms ringed, bonds outlined (a shape, never colour alone). */
export interface Highlight {
  ring?: string[];
  outline?: string[];
  /** A right-angle mark at the middle atom, between its bonds to the other two (a drawing mark, e.g. the flat Lewis CH₄'s). */
  corner?: [string, string, string];
  /** Orbital marks (Lesson 8 s11): a lone pair labelled (e.g. "HOMO"), or an empty p orbital outlined and labelled. Drawing aids only. */
  marks?: OrbitalMark[];
}

/** `lone-pair`: the atom's (first) lone pair gets `text` just below it. `empty-p`: a faint dashed two-lobe outline on the atom, clear of its bonds, with `text` past one lobe. */
export interface OrbitalMark {
  atom: string;
  kind: "lone-pair" | "empty-p";
  text: string;
}

/** A dangling bond's loose end (SMILES's dummy atom): drawn as nothing, its bond runs right to it. */
const LOOSE_END = "*";
const RING_R = 22;
/** Side of the right-angle mark, px. */
const CORNER = 12;
const LOOSE_PAD = 4;
const OUTLINE_STROKE = 14;
const OUTLINE_PER_LINE = 6;
const OUTLINE_OPACITY = 0.35;
/** Empty p outline: each lobe's centre this far from the atom, its half-length and half-width (px). */
const LOBE_OFFSET = 24;
const LOBE_LONG = 13;
const LOBE_WIDE = 8;
const MARK_FONT = FONT * 0.6;

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => (n > 1 ? [...String(n)].map((d) => SUB[+d]).join("") : "");
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Highlights, plus per-part fades for Scenes. */
export interface DrawOptions extends Highlight {
  /**
   * Atom or bond id → opacity (0–1) for everything drawn for it; `<atom id>.lp` fades only that atom's
   * lone pairs. Scenes fade parts in and out with it.
   */
  fade?: Record<string, number>;
}

export function drawStructure(structure: Structure, hide: Hidden[] = [], highlight: DrawOptions = {}): Drawing {
  const fadeOf = (id: string) => {
    const o = highlight.fade?.[id];
    return o === undefined ? "" : ` opacity="${Math.round(Math.min(1, Math.max(0, o)) * 1000) / 1000}"`;
  };
  const showCharges = !hide.includes("charges");
  const showLonePairs = !hide.includes("lone-pairs");
  const scale = BOND_PX / typicalBondLength(structure);

  // Each atom keeps room for its letter, H's, charge and lone pairs; a loose end only for the line's cap.
  const marginX = (a: StructureAtom) => (a.el === LOOSE_END ? LOOSE_PAD : PAD + CHAR_W * 2);
  const marginY = (a: StructureAtom) => (a.el === LOOSE_END ? LOOSE_PAD : PAD);
  const minX = Math.min(...structure.atoms.map((a) => a.x * scale - marginX(a)));
  const minY = Math.min(...structure.atoms.map((a) => a.y * scale - marginY(a)));
  const maxX = Math.max(...structure.atoms.map((a) => a.x * scale + marginX(a)));
  const maxY = Math.max(...structure.atoms.map((a) => a.y * scale + marginY(a)));
  const width = r1(maxX - minX);
  const height = r1(maxY - minY);

  const at: Record<string, Point> = {};
  for (const a of structure.atoms) at[a.id] = { x: r1(a.x * scale - minX), y: r1(a.y * scale - minY) };

  const neighbours = new Map<string, string[]>(structure.atoms.map((a) => [a.id, []]));
  for (const b of structure.bonds) {
    neighbours.get(b.a)?.push(b.b);
    neighbours.get(b.b)?.push(b.a);
  }
  const lettered = (a: StructureAtom) =>
    a.el !== LOOSE_END &&
    (structure.style !== "line-angle" || a.el !== "C" || !!a.charge || !!a.letter || neighbours.get(a.id)!.length === 0);
  const byId = new Map(structure.atoms.map((a) => [a.id, a]));

  const parts: string[] = [];
  const bonds: Record<string, Segment> = {};
  const lonePairPoints: Drawing["lonePairs"] = [];
  const outlined = new Set(highlight.outline ?? []);

  /** The centre of the smallest ring through a bond (its atoms' mean position), or undefined if it is in no ring. */
  const ringCentre = (bondId: string): Point | undefined => {
    const bond = structure.bonds.find((x) => x.id === bondId)!;
    // Shortest path from one end to the other without the bond itself.
    const prev = new Map<string, string>([[bond.a, ""]]);
    const queue = [bond.a];
    while (queue.length && !prev.has(bond.b)) {
      const cur = queue.shift()!;
      for (const n of neighbours.get(cur)!) {
        if (prev.has(n) || (cur === bond.a && n === bond.b)) continue;
        prev.set(n, cur);
        queue.push(n);
      }
    }
    if (!prev.has(bond.b)) return undefined;
    const ring: string[] = [];
    for (let cur = bond.b; cur; cur = prev.get(cur)!) ring.push(cur);
    return { x: mean(ring.map((id) => at[id].x)), y: mean(ring.map((id) => at[id].y)) };
  };

  for (const b of structure.bonds) {
    const p = at[b.a];
    const q = at[b.b];
    bonds[b.id] = { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const ux = (q.x - p.x) / len;
    const uy = (q.y - p.y) / len;
    const trimA = lettered(byId.get(b.a)!) ? LETTER_GAP : 0;
    const trimB = lettered(byId.get(b.b)!) ? LETTER_GAP : 0;
    const s = { x: p.x + ux * trimA, y: p.y + uy * trimA };
    const e = { x: q.x - ux * trimB, y: q.y - uy * trimB };
    const nx = -uy;
    const ny = ux;
    if (outlined.has(b.id))
      parts.push(
        `<line class="bond-outline" x1="${r1(s.x)}" y1="${r1(s.y)}" x2="${r1(e.x)}" y2="${r1(e.y)}" stroke="currentColor" stroke-opacity="${OUTLINE_OPACITY}" stroke-width="${OUTLINE_STROKE + (b.order - 1) * OUTLINE_PER_LINE}" stroke-linecap="round"/>`,
      );

    if (structure.style === "lewis") {
      // Each shared pair is two dots across the bond; a double bond's pairs sit side by side along it.
      const mx = (s.x + e.x) / 2;
      const my = (s.y + e.y) / 2;
      for (let k = 0; k < b.order; k++) {
        const along = (k - (b.order - 1) / 2) * PAIR_GAP;
        for (const sgn of [1, -1]) {
          parts.push(
            `<circle class="bond-dot"${fadeOf(b.id)} cx="${r1(mx + ux * along + nx * LP_SPREAD * sgn)}" cy="${r1(my + uy * along + ny * LP_SPREAD * sgn)}" r="${DOT_R}" fill="var(--lone-pair, #0e9fbf)"/>`,
          );
        }
      }
      continue;
    }
    if (b.stereo === "wedge") {
      const w = 4;
      parts.push(
        `<polygon class="bond-wedge"${fadeOf(b.id)} points="${r1(s.x)},${r1(s.y)} ${r1(e.x + nx * w)},${r1(e.y + ny * w)} ${r1(e.x - nx * w)},${r1(e.y - ny * w)}" fill="currentColor"/>`,
      );
      continue;
    }
    if (b.stereo === "hash") {
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const cx = s.x + (e.x - s.x) * t;
        const cy = s.y + (e.y - s.y) * t;
        const w = 4 * t + 0.5;
        parts.push(
          `<line class="bond-hash"${fadeOf(b.id)} x1="${r1(cx + nx * w)}" y1="${r1(cy + ny * w)}" x2="${r1(cx - nx * w)}" y2="${r1(cy - ny * w)}" stroke="currentColor" stroke-width="${HASH_STROKE}"/>`,
        );
      }
      continue;
    }
    const line = (o: number, inset = 0) =>
      parts.push(
        `<line class="bond-line"${fadeOf(b.id)} x1="${r1(s.x + nx * o + ux * inset)}" y1="${r1(s.y + ny * o + uy * inset)}" x2="${r1(e.x + nx * o - ux * inset)}" y2="${r1(e.y + ny * o - uy * inset)}" stroke="currentColor" stroke-width="${LINE_STROKE}" stroke-linecap="round"/>`,
      );
    const centre = b.order === 2 ? ringCentre(b.id) : undefined;
    if (centre) {
      // A ring double bond: one line on the axis, a shorter second line on the ring's inner side.
      const side = Math.sign((centre.x - p.x) * nx + (centre.y - p.y) * ny) || 1;
      line(0);
      line(RING_INNER * side, RING_INSET);
      continue;
    }
    const offsets = b.order === 1 ? [0] : b.order === 2 ? [-3.5, 3.5] : [-5.5, 0, 5.5];
    for (const o of offsets) line(o);
  }

  for (const a of structure.atoms) {
    if (a.el === LOOSE_END) continue;
    const { x, y } = at[a.id];
    const neighbourDirs = neighbours.get(a.id)!.map((n) => Math.atan2(at[n].y - y, at[n].x - x));
    const occupied = [...neighbourDirs];
    const hLeft = neighbourDirs.length > 0 && mean(neighbourDirs.map(Math.cos)) > H_LEFT_BIAS;

    if (lettered(a)) {
      const hText = a.h ? `H${sub(a.h)}` : "";
      const label = hLeft ? hText + a.el : a.el + hText;
      const anchor = !hText ? "middle" : hLeft ? "end" : "start";
      const tx = !hText ? x : hLeft ? x + (a.el.length * CHAR_W) / 2 : x - (a.el.length * CHAR_W) / 2;
      parts.push(
        `<text class="atom"${fadeOf(a.id)} x="${r1(tx)}" y="${r1(y)}" text-anchor="${anchor}" dominant-baseline="central" font-size="${FONT}" fill="currentColor">${label}</text>`,
      );
      if (hText) occupied.push(hLeft ? Math.PI : 0);
    }

    const lonePairs = showLonePairs ? lonePairDirections(occupied, a.lp ?? 0) : [];

    if (showCharges && a.charge) {
      const mag = Math.abs(a.charge);
      const sign = (mag > 1 ? String(mag) : "") + (a.charge > 0 ? "+" : "−");
      // Upper right when clear of bonds and lone pairs, else the widest gap left.
      const taken = [...occupied, ...lonePairs];
      const preferred = -Math.PI / 4;
      const free = taken.every((d) => turnBetween(d, preferred) >= SIGN_CLEARANCE);
      const dir = free ? preferred : lonePairDirections(taken, 1)[0];
      const dist = free ? 16 : 22;
      const right = a.h && !hLeft && free ? CHAR_W * (1 + String(a.h).length) : 0;
      parts.push(
        `<text class="charge"${fadeOf(a.id)} x="${r1(x + Math.cos(dir) * dist + right)}" y="${r1(y + Math.sin(dir) * dist)}" text-anchor="middle" dominant-baseline="central" font-size="${FONT * 0.7}" fill="currentColor">${sign}</text>`,
      );
    }

    for (const dir of lonePairs) {
      const cx = x + Math.cos(dir) * LP_DIST;
      const cy = y + Math.sin(dir) * LP_DIST;
      const px = -Math.sin(dir) * LP_SPREAD;
      const py = Math.cos(dir) * LP_SPREAD;
      lonePairPoints.push({ atom: a.id, x: r1(cx), y: r1(cy) });
      for (const sgn of [1, -1]) {
        parts.push(
          `<circle class="lone-pair-dot"${fadeOf(highlight.fade?.[`${a.id}.lp`] === undefined ? a.id : `${a.id}.lp`)} cx="${r1(cx + px * sgn)}" cy="${r1(cy + py * sgn)}" r="${DOT_R}" fill="var(--lone-pair, #0e9fbf)"/>`,
        );
      }
    }
  }

  for (const id of highlight.ring ?? []) {
    const p = at[id];
    if (p)
      parts.push(
        `<circle class="atom-ring" cx="${p.x}" cy="${p.y}" r="${RING_R}" fill="none" stroke="currentColor" stroke-width="${LINE_STROKE}" stroke-dasharray="6 4"/>`,
      );
  }

  if (highlight.corner) {
    const [a, c, b] = highlight.corner.map((id) => at[id]);
    if (a && c && b) {
      const u = (p: Point) => {
        const len = Math.hypot(p.x - c.x, p.y - c.y) || 1;
        return { x: (p.x - c.x) / len, y: (p.y - c.y) / len };
      };
      const [ua, ub] = [u(a), u(b)];
      // Clear of the middle atom's letter, then a small square's two outer sides.
      const o = { x: c.x + (ua.x + ub.x) * LETTER_GAP * 0.6, y: c.y + (ua.y + ub.y) * LETTER_GAP * 0.6 };
      const pts = [
        { x: o.x + ua.x * CORNER, y: o.y + ua.y * CORNER },
        { x: o.x + (ua.x + ub.x) * CORNER, y: o.y + (ua.y + ub.y) * CORNER },
        { x: o.x + ub.x * CORNER, y: o.y + ub.y * CORNER },
      ];
      parts.push(
        `<polyline class="corner-mark" points="${pts.map((p) => `${r1(p.x)},${r1(p.y)}`).join(" ")}" fill="none" stroke="var(--lone-pair, #0e9fbf)" stroke-width="${LINE_STROKE}"/>`,
      );
    }
  }

  for (const mark of highlight.marks ?? []) {
    const p = at[mark.atom];
    if (!p) continue;
    if (mark.kind === "lone-pair") {
      const lp = lonePairPoints.find((l) => l.atom === mark.atom);
      if (!lp) continue;
      parts.push(
        `<text class="orbital-mark" x="${lp.x}" y="${r1(lp.y + 16)}" text-anchor="middle" dominant-baseline="hanging" font-size="${MARK_FONT}" fill="var(--lone-pair, #0e9fbf)">${mark.text}</text>`,
      );
      continue;
    }
    // The p orbital's axis: the line through the atom that keeps farthest from its bonds (upright on a tie).
    const bondDirs = (neighbours.get(mark.atom) ?? []).map((n) => Math.atan2(at[n].y - p.y, at[n].x - p.x));
    let axis = Math.PI / 2;
    let best = -1;
    for (let k = 0; k < 12; k++) {
      const theta = Math.PI / 2 + (k * Math.PI) / 12;
      const clear = Math.min(...bondDirs.map((d) => Math.min(turnBetween(d, theta), turnBetween(d, theta + Math.PI))), Math.PI);
      if (clear > best + 0.05) [axis, best] = [theta, clear]; // upright unless another axis is clearly clearer
    }
    const u = { x: Math.cos(axis), y: Math.sin(axis) };
    const deg = r1((axis * 180) / Math.PI);
    for (const sgn of [1, -1]) {
      const cx = r1(p.x + u.x * LOBE_OFFSET * sgn);
      const cy = r1(p.y + u.y * LOBE_OFFSET * sgn);
      parts.push(
        `<ellipse class="empty-p" cx="${cx}" cy="${cy}" rx="${LOBE_LONG}" ry="${LOBE_WIDE}" transform="rotate(${deg} ${cx} ${cy})" fill="none" stroke="var(--lone-pair, #0e9fbf)" stroke-opacity="0.7" stroke-width="${HASH_STROKE}" stroke-dasharray="4 3"/>`,
      );
    }
    // The label past the upper lobe.
    const up = u.y <= 0 ? 1 : -1;
    const reach = LOBE_OFFSET + LOBE_LONG + 10;
    parts.push(
      `<text class="orbital-mark" x="${r1(p.x + u.x * reach * up)}" y="${r1(p.y + u.y * reach * up)}" text-anchor="middle" dominant-baseline="central" font-size="${MARK_FONT}" fill="var(--lone-pair, #0e9fbf)">${mark.text}</text>`,
    );
  }

  const viewBox = `0 0 ${width} ${height}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" class="structure" viewBox="${viewBox}" width="${width}" height="${height}" aria-hidden="true" font-family="'JetBrains Mono', ui-monospace, monospace">` +
    parts.join("") +
    `</svg>`;
  return { svg, viewBox, width, height, atoms: at, bonds, lonePairs: lonePairPoints };
}

/** Places each lone pair in the middle of the widest free angle around the atom. */
function lonePairDirections(occupied: number[], count: number): number[] {
  const dirs = [...occupied];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let dir: number;
    if (dirs.length === 0) dir = -Math.PI / 2;
    else {
      const sorted = dirs.map(norm).sort((p, q) => p - q);
      let best = 0;
      let bestGap = -1;
      for (let j = 0; j < sorted.length; j++) {
        const next = j + 1 < sorted.length ? sorted[j + 1] : sorted[0] + 2 * Math.PI;
        const gap = next - sorted[j];
        if (gap > bestGap + 1e-6) {
          bestGap = gap;
          best = sorted[j] + gap / 2;
        }
      }
      dir = best;
    }
    dirs.push(dir);
    out.push(dir);
  }
  return out;
}

const turnBetween = (p: number, q: number) => {
  const d = norm(p - q);
  return Math.min(d, 2 * Math.PI - d);
};
const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

function typicalBondLength(s: Structure): number {
  const pos = new Map(s.atoms.map((a) => [a.id, a]));
  const lengths = s.bonds
    .map((b) => {
      const p = pos.get(b.a);
      const q = pos.get(b.b);
      return p && q ? Math.hypot(q.x - p.x, q.y - p.y) : 0;
    })
    .filter((l) => l > 0)
    .sort((p, q) => p - q);
  return lengths.length ? lengths[Math.floor(lengths.length / 2)] : 1.5;
}
