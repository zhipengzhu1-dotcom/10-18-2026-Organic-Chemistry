// The structures Lesson 7's Scenes draw, mirrored from content/subjects/organic/structures/*.yaml
// (scenes/test/contributors.test.ts checks they match). Scenes are pure and browser-safe, so they
// can't read the content tree; every drawing still comes from the site's own renderer.
import type { Structure } from "@astratron/content";

export const methylamine: Structure = {
  id: "methylamine",
  style: "full",
  smiles: "[CH3:1][NH2:2]",
  source: "PubChem CID 6329",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "N", x: 1.5, y: 0, lp: 1 },
    { id: "a3", el: "H", x: 0, y: -1.5 },
    { id: "a4", el: "H", x: 0, y: 1.5 },
    { id: "a5", el: "H", x: -1.5, y: 0 },
    { id: "a6", el: "H", x: 2.25, y: 1.299 },
    { id: "a7", el: "H", x: 2.25, y: -1.299 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
    { id: "b3", a: "a1", b: "a4", order: 1 },
    { id: "b4", a: "a1", b: "a5", order: 1 },
    { id: "b5", a: "a2", b: "a6", order: 1 },
    { id: "b6", a: "a2", b: "a7", order: 1 },
  ],
};

export const acetamide: Structure = {
  id: "acetamide-neutral",
  style: "line-angle",
  smiles: "[CH3:1][C:2](=[O:3])[NH2:4]",
  source: "PubChem CID 178",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
    { id: "a3", el: "O", x: 1.299, y: -2.25, lp: 2 },
    { id: "a4", el: "N", x: 2.598, y: 0, h: 2, lp: 1 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 2 },
    { id: "b3", a: "a2", b: "a4", order: 1 },
  ],
};

export const acetamidePolar: Structure = {
  id: "acetamide-polar",
  style: "line-angle",
  smiles: "[CH3:1][C:2]([O-:3])=[NH2+:4]",
  source: "PubChem CID 178 (contributor)",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
    { id: "a3", el: "O", x: 1.299, y: -2.25, charge: -1, lp: 3 },
    { id: "a4", el: "N", x: 2.598, y: 0, charge: 1, h: 2 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
    { id: "b3", a: "a2", b: "a4", order: 2 },
  ],
};

export const methanimine: Structure = {
  id: "methanimine",
  style: "full",
  smiles: "[CH2:1]=[NH:2]",
  source: "PubChem CID 123139",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "N", x: 1.5, y: 0, lp: 1 },
    { id: "a3", el: "H", x: -0.75, y: -1.299 },
    { id: "a4", el: "H", x: -0.75, y: 1.299 },
    { id: "a5", el: "H", x: 2.25, y: 1.299 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 2 },
    { id: "b2", a: "a1", b: "a3", order: 1 },
    { id: "b3", a: "a1", b: "a4", order: 1 },
    { id: "b4", a: "a2", b: "a5", order: 1 },
  ],
};

export const acetone: Structure = {
  id: "acetone-neutral",
  style: "line-angle",
  smiles: "[CH3:1][C:2](=[O:3])[CH3:4]",
  source: "PubChem CID 180",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.299, y: -0.75, letter: true },
    { id: "a3", el: "O", x: 1.299, y: -2.25, lp: 2 },
    { id: "a4", el: "C", x: 2.598, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 2 },
    { id: "b3", a: "a2", b: "a4", order: 1 },
  ],
};

export const acetonePolar: Structure = {
  id: "acetone-polar",
  style: "line-angle",
  smiles: "[CH3:1][C+:2]([O-:3])[CH3:4]",
  source: "PubChem CID 180 (contributor)",
  atoms: [
    { id: "a1", el: "C", x: 0, y: 0 },
    { id: "a2", el: "C", x: 1.299, y: -0.75, charge: 1, letter: true },
    { id: "a3", el: "O", x: 1.299, y: -2.25, charge: -1, lp: 3 },
    { id: "a4", el: "C", x: 2.598, y: 0 },
  ],
  bonds: [
    { id: "b1", a: "a1", b: "a2", order: 1 },
    { id: "b2", a: "a2", b: "a3", order: 1 },
    { id: "b3", a: "a2", b: "a4", order: 1 },
  ],
};
