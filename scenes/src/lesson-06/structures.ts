// Lesson 6 Scene molecules: copies of the content structure files (RDKit.js layouts),
// so the Scenes stay pure and browser-safe. A test checks they match the files;
// regenerate them from content/subjects/organic/structures/ if a file changes.
import type { Structure } from "@astratron/content";

export const lesson6Structures = {
  "formaldehyde": {
    id: "formaldehyde",
    style: "full",
    smiles: "[CH2:1]=[O:2]",
    atoms: [
      { id: "a1", el: "C", x: 0, y: 0 },
      { id: "a2", el: "O", x: 0, y: 1.5, lp: 2 },
      { id: "a3", el: "H", x: 1.299, y: -0.75 },
      { id: "a4", el: "H", x: -1.299, y: -0.75 },
    ],
    bonds: [
      { id: "b1", a: "a1", b: "a2", order: 2 },
      { id: "b2", a: "a1", b: "a3", order: 1 },
      { id: "b3", a: "a1", b: "a4", order: 1 },
    ],
  },
  "acetate": {
    id: "acetate",
    style: "line-angle",
    smiles: "[CH3:1][C:2](=[O:3])[O-:4]",
    source: "PubChem CID 175",
    atoms: [
      { id: "a1", el: "C", x: 0, y: 0 },
      { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
      { id: "a3", el: "O", x: 2.598, y: 0, lp: 2 },
      { id: "a4", el: "O", x: 1.299, y: -2.25, charge: -1, lp: 3 },
    ],
    bonds: [
      { id: "b1", a: "a1", b: "a2", order: 1 },
      { id: "b2", a: "a2", b: "a3", order: 2 },
      { id: "b3", a: "a2", b: "a4", order: 1 },
    ],
  },
  "acetic-acid": {
    id: "acetic-acid",
    style: "line-angle",
    smiles: "[CH3:1][C:2](=[O:3])[OH:4]",
    source: "PubChem CID 176",
    atoms: [
      { id: "a1", el: "C", x: 0, y: 0 },
      { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
      { id: "a3", el: "O", x: 2.598, y: 0, lp: 2 },
      { id: "a4", el: "O", x: 1.299, y: -2.25, h: 1, lp: 2 },
    ],
    bonds: [
      { id: "b1", a: "a1", b: "a2", order: 1 },
      { id: "b2", a: "a2", b: "a3", order: 2 },
      { id: "b3", a: "a2", b: "a4", order: 1 },
    ],
  },
  "allyl-cation": {
    id: "allyl-cation",
    style: "line-angle",
    smiles: "[CH2:1]=[CH:2][CH2+:3]",
    atoms: [
      { id: "a1", el: "C", x: 0, y: 0, letter: true },
      { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
      { id: "a3", el: "C", x: 2.598, y: 0, charge: 1, letter: true },
    ],
    bonds: [
      { id: "b1", a: "a1", b: "a2", order: 2 },
      { id: "b2", a: "a2", b: "a3", order: 1 },
    ],
  },
} satisfies Record<string, Structure>;
