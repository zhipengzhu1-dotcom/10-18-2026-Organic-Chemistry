// The structure files Lesson 5's Scenes draw. Scenes render in the browser
// and in video with no file access, so they carry a copy of these
// (structures.json), written by `pnpm --filter @astratron/scenes run
// sync:structures` and checked against the content files by the tests.
export const FG_STRUCTURE_IDS = [
  // group-spotlight
  "fg-acetic-acid",
  "fg-amoxicillin",
  "fg-ethinylestradiol",
  "fg-aspartame",
  "fg-capsaicin",
  // group-cards
  "fg-piece-alkene",
  "fg-piece-alkyne",
  "fg-benzene",
  "fg-piece-alkyl-halide",
  "fg-ethanol",
  "fg-phenol",
  "fg-piece-ether",
  "fg-piece-sulfide",
  "fg-methylamine",
  "fg-acetaldehyde",
  "fg-acetone",
  "fg-methyl-acetate",
  "fg-acetamide",
] as const;

export type FgStructureId = (typeof FG_STRUCTURE_IDS)[number];
