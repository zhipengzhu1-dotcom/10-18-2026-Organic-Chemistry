// Test helper: writes a small content tree to a temp dir so build tests can
// feed the content build good and deliberately broken trees.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";

export type Tree = Record<string, unknown>;

export function writeTree(tree: Tree): string {
  const root = mkdtempSync(join(tmpdir(), "astratron-content-"));
  for (const [path, body] of Object.entries(tree)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, typeof body === "string" ? body : stringify(body));
  }
  return root;
}

const explain = (id: string, phase = "build") => ({
  id,
  phase,
  type: "explain",
  text: `Explain ${id}`,
});

const choice = (id: string, extra: object = {}) => ({
  id,
  phase: "build",
  type: "multiple-choice",
  prompt: `Question ${id}`,
  options: [
    { id: "a", text: "Right" },
    { id: "b", text: "Common slip" },
    { id: "c", text: "Other" },
  ],
  answer: ["a"],
  correct: "Right, because.",
  hints: [
    { match: ["b"], text: "Hint for b." },
    { text: "Generic hint." },
  ],
  reveal: "It is a, because.",
  ...extra,
});

export const sampleSteps = () => [
  choice("s01", {
    phase: "hook",
    prediction: true,
    hints: undefined,
    correct: undefined,
  }),
  explain("s02"),
  choice("s03"),
  explain("s04"),
  explain("s05"),
  choice("s06"),
  explain("s07"),
  { id: "s08", phase: "check", problem: "p1" },
  { id: "s09", phase: "check", problem: "p2" },
  explain("s10", "wrap"),
];

export const problem = (id: string, extra: object = {}) => {
  const { id: _stepId, phase: _phase, ...interaction } = choice(id);
  return {
    id,
    unit: "u1",
    lesson: "l1",
    difficulty: 1,
    status: "approved",
    source: "Original",
    ...interaction,
    ...extra,
  };
};

export const lesson = (extra: object = {}) => ({
  id: "l1",
  slug: "first-lesson",
  title: "First Lesson",
  goal: "Do the first thing.",
  keyIdea: "The first thing.",
  steps: sampleSteps(),
  ...extra,
});

/** A minimal valid tree: one Subject, one Course, one Lesson, two Problems. */
export const validTree = (): Tree => ({
  "chem/subject.yaml": { title: "Chemistry" },
  "chem/courses/chem-1.yaml": {
    title: "Chemistry I",
    units: [
      {
        id: "u1",
        slug: "unit-one",
        title: "Unit One",
        status: "available",
        lessons: ["l1"],
      },
      { id: "u2", slug: "unit-two", title: "Unit Two", status: "coming-soon" },
    ],
  },
  "chem/lessons/l1.yaml": lesson(),
  "chem/problems/p1.yaml": problem("p1"),
  "chem/problems/p2.yaml": problem("p2"),
});

const nist = "NIST SRD 101; reuse with acknowledgement (https://www.nist.gov/open/license)";

/** An experimental molecule data file (real CCCBDB values for methane). */
export const methane = () => ({
  id: "methane",
  kind: "molecule",
  title: "Methane",
  geometry: "experimental",
  sources: {
    cccbdb: {
      kind: "experimental",
      citation: "NIST CCCBDB, SRD 101, Release 22 (May 2022), doi:10.18434/T47C7Z",
      licence: nist,
    },
    hirota1979: {
      kind: "experimental",
      citation: "Hirota, J. Mol. Spectrosc. 77, 213 (1979), doi:10.1016/0022-2852(79)90103-6",
      via: "cccbdb",
      licence: nist,
    },
    sverdlov1974: {
      kind: "experimental",
      citation: "Sverdlov, Kovner and Krainov, Vibrational Spectra of Polyatomic Molecules, Wiley (1974)",
      via: "cccbdb",
      licence: nist,
    },
  },
  values: {
    "r.CH": { label: "C–H", quantity: "bond-length", value: 1.087, unit: "Å", source: "hirota1979" },
    "a.HCH": { label: "H–C–H", quantity: "angle", value: 109.471, unit: "°", source: "sverdlov1974" },
  },
  atoms: {
    source: "cccbdb",
    list: [
      ["C", 0, 0, 0],
      ["H", 0.6276, 0.6276, 0.6276],
      ["H", 0.6276, -0.6276, -0.6276],
      ["H", -0.6276, 0.6276, -0.6276],
      ["H", -0.6276, -0.6276, 0.6276],
    ],
  },
});

/** A table data file (Jmol CPK colours for H and C). */
export const elements = () => ({
  id: "elements",
  kind: "table",
  title: "Elements",
  sources: {
    jmol: {
      kind: "reference",
      citation: "the Jmol CPK colour table, Jmol source org/jmol/c/PAL.java",
      licence: "LGPL 2.1 (Jmol)",
    },
  },
  values: {
    "H.colour": { label: "H colour", quantity: "colour", value: "#FFFFFF", source: "jmol" },
    "C.colour": { label: "C colour", quantity: "colour", value: "#909090", source: "jmol" },
  },
});

/** A computed molecule data file. Test fixture only: its numbers are placeholders, not chemistry. */
export const computedEthane = () => ({
  id: "ethane",
  kind: "molecule",
  title: "Ethane",
  geometry: "computed",
  sources: {
    ours: {
      kind: "computed",
      citation: "Test fixture calculation",
      licence: "CC BY-NC-SA 4.0",
      method: { program: "PySCF", version: "0.0.0", level: "B3LYP/cc-pVTZ", date: "2026-01-01" },
    },
  },
  values: {
    "r.CC": { label: "C–C", quantity: "bond-length", value: 1.5, unit: "Å", source: "ours" },
  },
});
