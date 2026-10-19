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
