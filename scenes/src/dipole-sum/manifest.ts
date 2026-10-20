// dipole-sum (Lesson 3, s11's reveal and u1-3d-polar-molecules' reveal): each polar bond carries a
// bond-dipole crossed arrow (Lesson 1 style: + tail at δ+, head toward δ−). Added, the arrows slide
// tip to tail in 3D and the sum is drawn: a thick net arrow, or a ring "net: zero" when they
// cancel. Shapes are rebuilt from cited bond lengths and angles; arrow lengths follow the cited
// Pauling electronegativity differences ("length: a rough guide, not to scale"). No dipole-moment
// values are shown. The live, rotatable version is the 3D Step card's `dipoles` option (s11).
import type { Cited } from "@astratron/content/data";
import { bondDipoles, netDipole, type Vec3 } from "@astratron/content/molecule";
import type { SceneManifest } from "../types.ts";
import { buildShape, colourRef, shapeRefs, type Shape } from "../shapes-3d/shapes.ts";

export type DipoleSumState = { molecule: string; added: number };

/** One molecule per option, plus the two sets the Lesson shows side by side. */
export const SETS: Record<string, string[]> = {
  water: ["water"],
  co2: ["co2"],
  ccl4: ["ccl4"],
  ch2cl2: ["ch2cl2"],
  nh3: ["nh3"],
  bf3: ["bf3"],
  "water-co2": ["water", "co2"],
  "polar-check": ["water", "co2", "ccl4", "ch2cl2", "nh3"],
  // Practice Problem u1-3d-polar-hcn (#87): its four cards in order.
  chcl3: ["chcl3"],
  hcn: ["hcn"],
  ch4: ["methane"],
  "polar-hcn": ["chcl3", "bf3", "hcn", "methane"],
};

export const FORMULA: Record<string, string> = {
  water: "H₂O",
  co2: "CO₂",
  ccl4: "CCl₄",
  ch2cl2: "CH₂Cl₂",
  nh3: "NH₃",
  bf3: "BF₃",
  chcl3: "CHCl₃",
  hcn: "HCN",
  methane: "CH₄",
};
/** Where the net arrow points, in words. */
const TOWARD: Record<string, string> = {
  water: "oxygen",
  co2: "",
  ccl4: "",
  ch2cl2: "the chlorines",
  nh3: "nitrogen",
  bf3: "",
  chcl3: "the chlorines",
  hcn: "nitrogen",
  methane: "",
};
/** The Practice Problems spec's sentences for u1-3d-polar-hcn's reveal, once added (used only when the sum agrees). */
const POLAR_HCN: Record<string, string> = {
  chcl3:
    "Chloroform: tetrahedral. Three C–Cl arrows point toward the chlorines and a small C–H arrow points toward carbon; added, they leave a net arrow toward the chlorines. Polar.",
  bf3: "Boron trifluoride: flat. Three equal arrows; they cancel, net zero. Nonpolar.",
  hcn: "Hydrogen cyanide: a straight line. The C–H arrow points toward carbon and the C≡N arrow toward nitrogen, the same direction; added, a net arrow toward nitrogen. Polar.",
  methane: "Methane: tetrahedral. Four equal arrows; they cancel, net zero. Nonpolar.",
};
const ELEMENTS = ["H", "B", "C", "N", "O", "F", "Cl"];
export const enRef = (el: string) => `electronegativity-pauling/${el}`;
const COUNT = ["no", "one", "two", "three", "four"];

export interface Summed {
  shape: Shape;
  /** Each bond dipole: from atom, to atom, ΔEN. */
  arrows: { from: number; to: number; size: number }[];
  net: { vector: Vec3; size: number; zero: boolean };
}

/** A molecule's shape, its bond dipoles and their sum, from the cited values. */
export function summed(key: string, cited: Record<string, Cited>): Summed {
  const shape = buildShape(key, cited);
  const en = Object.fromEntries(ELEMENTS.map((el) => [el, Number(cited[enRef(el)]?.value)]));
  const molecule = {
    title: shape.title,
    atoms: shape.atoms.map((a) => ({ element: a.element, x: a.pos[0], y: a.pos[1], z: a.pos[2] })),
    bonds: shape.bonds.map(([a, b, order]) => ({ a, b, order })),
  };
  const arrows = bondDipoles(molecule, en);
  return { shape, arrows, net: netDipole(molecule, arrows) };
}

/** The spec's own sentences for s11 (water, CO₂); a general one for the rest. */
function sentence(key: string, s: Summed, added: boolean, many: boolean, set?: string): string {
  const n = s.arrows.length;
  if (set === "polar-hcn" && added && POLAR_HCN[key]?.endsWith(s.net.zero ? " Nonpolar." : " Polar.")) return POLAR_HCN[key];
  if (!many && key === "water")
    return added
      ? "Water, bent. Two bond-dipole arrows point from each hydrogen toward oxygen. Added tip to tail, they give one net arrow pointing toward oxygen: water is polar."
      : "Water, bent. Two bond-dipole arrows point from each hydrogen toward oxygen.";
  if (!many && key === "co2")
    return added
      ? "Carbon dioxide, a straight line. Two equal bond-dipole arrows point from carbon toward each oxygen, in opposite directions. Added, they cancel: net zero, nonpolar."
      : "Carbon dioxide, a straight line. Two equal bond-dipole arrows point from carbon toward each oxygen, in opposite directions.";
  const head = `${s.shape.title}: ${s.shape.shape}.`;
  if (!added) return `${head} ${COUNT[n] ?? n} bond-dipole arrows, each pointing at its bond's δ− end.`;
  const result = s.net.zero ? "they cancel, net zero. Nonpolar." : `a net arrow pointing toward ${TOWARD[key]}. Polar.`;
  return `${head} ${n} bond-dipole arrows, added tip to tail: ${result}`;
}

export const dipoleSum: SceneManifest<DipoleSumState> = {
  id: "dipole-sum",
  title: "Do the bond dipoles add up?",
  states: {
    molecule: {
      kind: "choice",
      label: "Molecule",
      options: [
        { id: "water", label: "H₂O" },
        { id: "co2", label: "CO₂" },
        { id: "ccl4", label: "CCl₄" },
        { id: "ch2cl2", label: "CH₂Cl₂" },
        { id: "nh3", label: "NH₃" },
        { id: "bf3", label: "BF₃" },
        { id: "water-co2", label: "H₂O and CO₂" },
        { id: "polar-check", label: "H₂O, CO₂, CCl₄, CH₂Cl₂ and NH₃" },
        { id: "chcl3", label: "CHCl₃" },
        { id: "hcn", label: "HCN" },
        { id: "ch4", label: "CH₄" },
        { id: "polar-hcn", label: "CHCl₃, BF₃, HCN and CH₄" },
      ],
      default: "water",
    },
    // 0: arrows on their bonds; 1: added tip to tail (the video eases between them).
    added: { kind: "range", label: "Added", min: 0, max: 1, step: 1, default: 0 },
  },
  describe: ({ molecule, added }, _t, cited) => {
    const keys = SETS[molecule] ?? ["water"];
    // Without its cited values (e.g. a tool reading only the manifest) the Scene can't rebuild the shapes.
    if (!keys.every((k) => shapeRefs(k).every((ref) => cited[ref])))
      return `${keys.map((k) => FORMULA[k]).join(", ")}: a bond-dipole arrow on each polar bond.`;
    const many = keys.length > 1 && molecule === "polar-check";
    const text = keys.map((k) => sentence(k, summed(k, cited), added >= 1, many, molecule)).join(" ");
    return added >= 1 ? text : `${text} Press Add to put them tip to tail.`;
  },
  reducedMotion: "Opens paused on the final frame: with Add, the arrows already tip to tail and the result in words; nothing slides.",
  data: [...Object.keys(FORMULA).flatMap(shapeRefs), ...ELEMENTS.map(enRef), ...ELEMENTS.map(colourRef)],
  duration: 4,
  poster: { t: 4 },
  video: {
    duration: 8,
    timeline: [
      { at: 0, state: { molecule: "polar-check", added: 0 } },
      { at: 2, state: { added: 0 } },
      { at: 5, state: { added: 1 } },
    ],
    poster: 7.5,
    aspects: ["16:9", "9:16"],
  },
};
